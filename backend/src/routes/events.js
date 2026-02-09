import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// 1. GET ALL EVENTS
router.get('/', async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            orderBy: { date: 'asc' }
        });
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching events' });
    }
});

// 2. CREATE EVENT
router.post('/', async (req, res) => {
    const { title, date, time, description, color } = req.body;

    if (!title || !date) {
        return res.status(400).json({ error: 'Title and date are required' });
    }

    try {
        const event = await prisma.event.create({
            data: {
                title,
                date: new Date(date), // Ensure date is parsed
                time,
                description,
                color
            }
        });
        res.json(event);
    } catch (error) {
        console.error("Create event error:", error);
        res.status(500).json({ error: 'Error creating event' });
    }
});

// 3. UPDATE EVENT
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, date, time, description, color } = req.body;

    try {
        const event = await prisma.event.update({
            where: { id: parseInt(id) },
            data: {
                title,
                date: date ? new Date(date) : undefined,
                time,
                description,
                color
            }
        });
        res.json(event);
    } catch (error) {
        console.error("Update event error:", error);
        res.status(500).json({ error: 'Error updating event' });
    }
});

// 4. DELETE EVENT
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.event.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Event deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting event' });
    }
});

export default router;
