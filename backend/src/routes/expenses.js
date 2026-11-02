import express from 'express';
import multer from 'multer';
import streamifier from 'streamifier';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../db.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const adminEmails = ['ecomaxifute@gmail.com', 'sofianelamine772@gmail.com'];

const requireAdmin = async (req, res, next) => {
    try {
        if (!req.auth || !req.auth.userId) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }
        const user = await clerk.users.getUser(req.auth.userId);
        const email = user.emailAddresses?.[0]?.emailAddress;
        if (!adminEmails.includes(email)) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        next();
    } catch (err) {
        console.error('Expenses auth error:', err);
        res.status(500).json({ error: 'Authentication error' });
    }
};

const uploadToCloudinary = (file) => {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');

    return new Promise((resolve, reject) => {
        const options = {
            folder: 'ecofute_expenses',
            resource_type: (isImage || isPdf) ? 'image' : 'raw',
            access_mode: 'public',
            type: 'upload'
        };

        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (result) resolve(result);
            else reject(error);
        });
        streamifier.createReadStream(file.buffer).pipe(stream);
    });
};

router.use(ClerkExpressWithAuth());
router.use(requireAdmin);

router.get('/', async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching expenses' });
    }
});

router.post('/', upload.single('file'), async (req, res) => {
    const { title, amount, date, type, notes } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        let fileData = {};
        if (req.file) {
            const result = await uploadToCloudinary(req.file);
            fileData = {
                fileName: req.file.originalname,
                fileUrl: result.secure_url,
                fileType: req.file.mimetype,
                fileSize: (result.bytes / 1024 / 1024).toFixed(2) + ' MB'
            };
        }

        const expense = await prisma.expense.create({
            data: {
                title,
                amount: amount ? parseFloat(amount) : 0,
                date: date ? new Date(date) : new Date(),
                type: type || 'facture',
                notes: notes || null,
                ...fileData
            }
        });
        res.json(expense);
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ error: error.message || 'Error creating expense' });
    }
});

router.put('/:id', upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const { title, amount, date, type, notes } = req.body;

    try {
        const data = {
            title,
            amount: amount !== undefined ? parseFloat(amount) : undefined,
            date: date ? new Date(date) : undefined,
            type,
            notes
        };

        if (req.file) {
            const result = await uploadToCloudinary(req.file);
            data.fileName = req.file.originalname;
            data.fileUrl = result.secure_url;
            data.fileType = req.file.mimetype;
            data.fileSize = (result.bytes / 1024 / 1024).toFixed(2) + ' MB';
        }

        const expense = await prisma.expense.update({
            where: { id: parseInt(id) },
            data
        });
        res.json(expense);
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ error: 'Error updating expense' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.expense.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting expense' });
    }
});

export default router;
