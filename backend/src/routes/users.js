import express from 'express';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// 1. LIST USERS
router.get('/', async (req, res) => {
    try {
        const users = await clerk.users.getUserList({
            limit: 50,
        });
        const simplifiedUsers = users.data.map(u => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.emailAddresses[0]?.emailAddress,
            // role: u.publicMetadata?.role || 'user', // Basic role storage
            createdAt: u.createdAt
        }));
        res.json(simplifiedUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// 2. CREATE USER
// For simplicity, we assume admin provides email + temp password.
// In reality, invitations are better, but this demonstrates "Admin Create".
router.post('/', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const user = await clerk.users.createUser({
            firstName,
            lastName,
            emailAddress: [email],
            password,
            skipPasswordChecks: false, // Enforce strong pw
            skipPasswordRequirement: false,
        });

        // Optionally update metadata
        // await clerk.users.updateUserMetadata(user.id, {
        //     publicMetadata: { role: 'employee' }
        // });

        res.json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.emailAddresses[0].emailAddress,
        });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
            error: error.errors?.[0]?.message || 'Failed to create user',
            details: error.errors
        });
    }
});

// 3. DELETE USER
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await clerk.users.deleteUser(id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
