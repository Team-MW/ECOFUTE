import express from 'express';
import prisma from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const items = await prisma.serrurerie.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching locksmith inventory' });
    }
});

router.post('/', async (req, res) => {
    const { name, reference, quantity, price, notes } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Le nom du produit est requis' });
    }

    try {
        const item = await prisma.serrurerie.create({
            data: {
                name,
                reference: reference || null,
                quantity: quantity ? parseInt(quantity, 10) : 0,
                price: price ? parseFloat(price) : 0,
                notes: notes || null
            }
        });
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating locksmith product' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, reference, quantity, price, notes } = req.body;

    try {
        const item = await prisma.serrurerie.update({
            where: { id: parseInt(id) },
            data: {
                name,
                reference,
                quantity: quantity !== undefined ? parseInt(quantity, 10) : undefined,
                price: price !== undefined ? parseFloat(price) : undefined,
                notes
            }
        });
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating locksmith product' });
    }
});

router.post('/:id/stock', async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    const delta = parseInt(quantity, 10);

    if (Number.isNaN(delta) || delta === 0) {
        return res.status(400).json({ error: 'Quantité invalide' });
    }

    try {
        const existing = await prisma.serrurerie.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Produit introuvable' });
        }

        const nextQuantity = Math.max(0, (existing.quantity || 0) + delta);
        const item = await prisma.serrurerie.update({
            where: { id: parseInt(id) },
            data: { quantity: nextQuantity }
        });
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating stock' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.serrurerie.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting locksmith product' });
    }
});

export default router;
