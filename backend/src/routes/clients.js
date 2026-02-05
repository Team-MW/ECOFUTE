import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// 1. GET ALL CLIENTS
router.get('/', async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { createdAt: 'desc' },
            include: { documents: true }
        });
        res.json(clients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching clients' });
    }
});

// 2. CREATE CLIENT (Internal Only)
router.post('/', async (req, res) => {
    const { email, firstName, lastName, company } = req.body;

    if (!email || !firstName || !lastName) {
        return res.status(400).json({ error: 'Email, Firstname and Lastname are required' });
    }

    try {
        const existing = await prisma.client.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'A client with this email already exists' });
        }

        const client = await prisma.client.create({
            data: {
                email,
                firstName,
                lastName,
                company,
                status: 'En attente'
            }
        });

        res.json(client);
    } catch (error) {
        console.error("Create client error:", error);
        res.status(500).json({ error: error.message || 'Error creating client' });
    }
});

// 3. GET SINGLE CLIENT
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const client = await prisma.client.findUnique({
            where: { id: parseInt(id) },
            include: { documents: true }
        });
        if (!client) return res.status(404).json({ error: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching client' });
    }
});

// 4. DELETE CLIENT
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Delete related documents first
        await prisma.document.deleteMany({
            where: { clientId: parseInt(id) }
        });

        // Delete client
        await prisma.client.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true, message: 'Client deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting client' });
    }
});

export default router;
