import express from 'express';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const adminEmails = ['ecomaxifute@gmail.com', 'sofianelamine772@gmail.com'];
const allowedRoles = ['admin', 'membre', 'alternant'];

const resolveRole = (user) => {
    const email = user.emailAddresses?.[0]?.emailAddress;
    if (adminEmails.includes(email)) return 'admin';
    const role = user.publicMetadata?.role;
    return allowedRoles.includes(role) ? role : 'membre';
};

const simplifyUser = (user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emailAddresses?.[0]?.emailAddress,
    color: user.publicMetadata?.color || '#3b82f6',
    role: resolveRole(user),
    createdAt: user.createdAt
});

// Middleware to check if the user is a real admin
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.auth || !req.auth.userId) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }
        
        // Fetch user from Clerk
        const user = await clerk.users.getUser(req.auth.userId);
        const email = user.emailAddresses?.[0]?.emailAddress;
        
        if (!adminEmails.includes(email)) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        
        next();
    } catch (err) {
        console.error("Auth middleware error:", err);
        res.status(500).json({ error: 'Authentication error' });
    }
};

router.use(ClerkExpressWithAuth());

// 1. LIST USERS — admin voit tout, les autres voient uniquement leur profil
router.get('/', async (req, res) => {
    try {
        if (!req.auth?.userId) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }

        const currentUser = await clerk.users.getUser(req.auth.userId);
        const currentEmail = currentUser.emailAddresses?.[0]?.emailAddress;

        if (!adminEmails.includes(currentEmail)) {
            return res.json([simplifyUser(currentUser)]);
        }

        const users = await clerk.users.getUserList({
            limit: 50,
        });
        res.json(users.data.map(simplifyUser));
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// 2. CREATE USER
router.post('/', requireAdmin, async (req, res) => {
    const { firstName, lastName, email, password, color, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const safeRole = role === 'alternant' ? 'alternant' : 'membre';

    try {
        const user = await clerk.users.createUser({
            firstName,
            lastName,
            emailAddress: [email],
            password,
            publicMetadata: {
                color: color || '#3b82f6',
                role: safeRole
            },
            skipPasswordChecks: false, // Enforce strong pw
            skipPasswordRequirement: false,
        });

        res.json(simplifyUser(user));
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
            error: error.errors?.[0]?.message || 'Failed to create user',
            details: error.errors
        });
    }
});

// 2.5 UPDATE USER (email, name, role, color)
router.put('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { role, color, email, firstName, lastName } = req.body;

    try {
        const existing = await clerk.users.getUser(id);
        const existingEmail = existing.emailAddresses?.[0]?.emailAddress;
        const isTargetAdmin = adminEmails.includes(existingEmail);

        if (firstName || lastName) {
            await clerk.users.updateUser(id, {
                firstName: firstName || existing.firstName,
                lastName: lastName || existing.lastName
            });
        }

        if (email && email !== existingEmail) {
            const created = await clerk.emailAddresses.createEmailAddress({
                userId: id,
                emailAddress: email.trim(),
                primary: true,
                verified: true
            });

            for (const address of existing.emailAddresses || []) {
                if (address.id !== created.id) {
                    try {
                        await clerk.emailAddresses.deleteEmailAddress(address.id);
                    } catch (err) {
                        console.error('Could not remove old email', err);
                    }
                }
            }
        }

        if (!isTargetAdmin && (role || color)) {
            const nextRole = role === 'alternant' ? 'alternant' : 'membre';
            await clerk.users.updateUserMetadata(id, {
                publicMetadata: {
                    ...existing.publicMetadata,
                    role: nextRole,
                    color: color || existing.publicMetadata?.color || '#3b82f6'
                }
            });
        }

        const updated = await clerk.users.getUser(id);
        res.json(simplifyUser(updated));
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
            error: error.errors?.[0]?.message || 'Failed to update user'
        });
    }
});

// 3. DELETE USER
router.delete('/:id', requireAdmin, async (req, res) => {
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
