import express from 'express';
import prisma from '../db.js';
import nodemailer from 'nodemailer';
import multer from 'multer';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const upload = multer();
const router = express.Router();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Middleware to check if the user is authenticated and is an admin (except for POST requests)
const requireAuthOrAdmin = async (req, res, next) => {
    try {
        if (!req.auth || !req.auth.userId) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }

        // POST requests are allowed for any authenticated user (e.g. creating sales from invoices, sending invoices)
        if (req.method === 'POST') {
            return next();
        }

        // Fetch user from Clerk to verify admin status for other methods (GET, PUT, DELETE)
        const user = await clerk.users.getUser(req.auth.userId);
        const email = user.emailAddresses?.[0]?.emailAddress;
        
        const adminEmails = ['ecomaxifute@gmail.com', 'sofianelamine772@gmail.com'];
        if (!adminEmails.includes(email)) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        
        next();
    } catch (err) {
        console.error("Sales auth middleware error:", err);
        res.status(500).json({ error: 'Authentication error' });
    }
};

router.use(ClerkExpressWithAuth());
router.use(requireAuthOrAdmin);

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

// 5. SEND INVOICE BY EMAIL
router.post('/send-invoice', upload.single('invoicePdf'), async (req, res) => {
    const { email, subject, body } = req.body;
    const file = req.file;

    if (!email || !file) {
        return res.status(400).json({ error: 'Email and PDF file are required' });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: subject,
            text: body,
            attachments: [
                {
                    filename: file.originalname,
                    content: file.buffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Email envoyé avec succès !' });
    } catch (error) {
        console.error("Email error:", error);
        res.status(500).json({ error: 'Erreur envoi email (Vérifiez les identifiants SMTP): ' + error.message });
    }
});

export default router;
