import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// 1. GET ALL SALES (with pagination and filtering by date later)
router.get('/', async (req, res) => {
    try {
        const sales = await prisma.sale.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(sales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching sales' });
    }
});

// 2. CREATE A SALE
router.post('/', async (req, res) => {
    const { title, description, amount, date, status } = req.body;

    if (!title || !amount) {
        return res.status(400).json({ error: 'Title and amount are required' });
    }

    try {
        // Parse date
        const saleDate = date ? new Date(date) : new Date();
        const saleAmount = parseFloat(amount);

        if (isNaN(saleAmount)) {
            return res.status(400).json({ error: 'Amount must be a number' });
        }

        const sale = await prisma.sale.create({
            data: {
                title,
                description,
                amount: saleAmount,
                date: saleDate,
                status: status || 'Payé'
            }
        });
        res.json(sale);
    } catch (error) {
        console.error("Create sale error:", error);
        res.status(500).json({ error: error.message || 'Error creating sale' });
    }
});

// 3. UPDATE A SALE
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, amount, date, status } = req.body;

    try {
        const data = {};
        if (title) data.title = title;
        if (description !== undefined) data.description = description;
        if (amount) data.amount = parseFloat(amount);
        if (date) data.date = new Date(date);
        if (status) data.status = status;

        const updatedSale = await prisma.sale.update({
            where: { id: parseInt(id) },
            data
        });
        res.json(updatedSale);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating sale' });
    }
});

// 4. DELETE A SALE
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.sale.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Sale deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting sale' });
    }
});

export default router;
