import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// 1. GET ALL EVENTS
router.get('/', async (req, res) => {
    try {
        const { type } = req.query;
        const where = {};

        if (type) {
            where.type = type;
        } else {
            // Default behavior if no type specified: get all or just general?
            // To be safe and backward compatible, let's return all.
            // But actually, for clean separation, maybe we want 'general' to be the default for Calendar.vue calls if they don't specify?
            // No, Calendar.vue calls without params currently, so let's keep it returning all unless specified.
            // Wait, the user wants separation. If I change the backend logic, existing calls might break or change behavior.
            // I will update the frontend to explicitly ask for what it wants.
        }

        const events = await prisma.event.findMany({
            where,
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
    // Check if it's a batch create request
    if (Array.isArray(req.body)) {
        try {
            const operations = req.body.map(event =>
                prisma.event.create({
                    data: {
                        title: event.title,
                        date: new Date(event.date),
                        time: event.time,
                        description: event.description,
                        color: event.color,
                        assignedTo: event.assignedTo,
                        type: event.type || 'general'
                    }
                })
            );

            // Execute all creations in a transaction
            const results = await prisma.$transaction(operations);
            return res.json(results);
        } catch (error) {
            console.error("Batch create event error:", error);
            return res.status(500).json({ error: 'Error creating events batch' });
        }
    }

    // Single Event Creation
    const { title, date, time, description, color, assignedTo, type } = req.body;

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
                color,
                assignedTo,
                type: type || 'general'
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
    const { title, date, time, description, color, assignedTo, type } = req.body;

    try {
        const event = await prisma.event.update({
            where: { id: parseInt(id) },
            data: {
                title,
                date: date ? new Date(date) : undefined,
                time,
                description,
                color,
                assignedTo,
                type
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
