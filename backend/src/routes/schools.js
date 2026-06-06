import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// 1. GET ALL SCHOOLS WITH THEIR DEMARCHES
router.get('/', async (req, res) => {
    try {
        const schools = await prisma.school.findMany({
            include: {
                demarches: {
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(schools);
    } catch (error) {
        console.error("Fetch schools error:", error);
        res.status(500).json({ error: 'Server error fetching schools' });
    }
});

// 2. CREATE A SCHOOL
router.post('/', async (req, res) => {
    const { name, contactName, contactEmail, contactPhone, website } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'School name is required' });
    }

    try {
        const school = await prisma.school.create({
            data: {
                name,
                contactName,
                contactEmail,
                contactPhone,
                website
            },
            include: {
                demarches: true
            }
        });
        res.json(school);
    } catch (error) {
        console.error("Create school error:", error);
        res.status(500).json({ error: 'Error creating school' });
    }
});

// 3. UPDATE A SCHOOL
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, contactName, contactEmail, contactPhone, website } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'School name is required' });
    }

    try {
        const school = await prisma.school.update({
            where: { id: parseInt(id) },
            data: {
                name,
                contactName,
                contactEmail,
                contactPhone,
                website
            },
            include: {
                demarches: true
            }
        });
        res.json(school);
    } catch (error) {
        console.error("Update school error:", error);
        res.status(500).json({ error: 'Error updating school' });
    }
});

// 4. DELETE A SCHOOL
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.school.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'School deleted successfully' });
    } catch (error) {
        console.error("Delete school error:", error);
        res.status(500).json({ error: 'Error deleting school' });
    }
});

// 5. CREATE A DEMARCHE FOR A SCHOOL
router.post('/:schoolId/demarches', async (req, res) => {
    const { schoolId } = req.params;
    const { title, description, status, dueDate } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Demarche title is required' });
    }

    try {
        const demarche = await prisma.demarche.create({
            data: {
                title,
                description,
                status: status || 'À faire',
                dueDate: dueDate ? new Date(dueDate) : null,
                schoolId: parseInt(schoolId)
            }
        });
        res.json(demarche);
    } catch (error) {
        console.error("Create demarche error:", error);
        res.status(500).json({ error: 'Error creating demarche' });
    }
});

// 6. UPDATE A DEMARCHE
router.put('/:schoolId/demarches/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, status, dueDate } = req.body;

    try {
        const demarche = await prisma.demarche.update({
            where: { id: parseInt(id) },
            data: {
                title,
                description,
                status,
                dueDate: dueDate ? new Date(dueDate) : null
            }
        });
        res.json(demarche);
    } catch (error) {
        console.error("Update demarche error:", error);
        res.status(500).json({ error: 'Error updating demarche' });
    }
});

// 7. DELETE A DEMARCHE
router.delete('/:schoolId/demarches/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.demarche.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Demarche deleted successfully' });
    } catch (error) {
        console.error("Delete demarche error:", error);
        res.status(500).json({ error: 'Error deleting demarche' });
    }
});

export default router;
