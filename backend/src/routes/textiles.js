import express from 'express';
import prisma from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const items = await prisma.textile.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching textile inventory' });
    }
});

router.post('/', async (req, res) => {
    const { name, size, color, quantity, price, notes } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Le nom du produit est requis' });
    }

    try {
        const item = await prisma.textile.create({
            data: {
                name,
                size: size || null,
                color: color || null,
                quantity: quantity ? parseInt(quantity, 10) : 0,
                price: price ? parseFloat(price) : 0,
                notes: notes || null
            }
        });
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating textile product' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, size, color, quantity, price, notes } = req.body;

    try {
        const item = await prisma.textile.update({
            where: { id: parseInt(id) },
            data: {
                name,
                size,
                color,
                quantity: quantity !== undefined ? parseInt(quantity, 10) : undefined,
                price: price !== undefined ? parseFloat(price) : undefined,
                notes
            }
        });
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating textile product' });
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
        const existing = await prisma.textile.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Produit introuvable' });
        }

        const nextQuantity = Math.max(0, (existing.quantity || 0) + delta);
        const item = await prisma.textile.update({
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
        await prisma.textile.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting textile product' });
    }
});

export default router;
