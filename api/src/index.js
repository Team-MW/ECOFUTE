import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import clientRoutes from './routes/clients.js';
import documentRoutes from './routes/documents.js';
import eventRoutes from './routes/events.js';
import salesRoutes from './routes/sales.js';
import userRoutes from './routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/clients', clientRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/users', userRoutes);

// Health Check
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', message: 'EcoFute Backend is running', time: new Date() });
});

// Serve static frontend files ONLY in development/local mode
// On Vercel, this is handled by vercel.json rewrites
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    // Local development fallback if needed
    // app.use(express.static(...));
}

// Start Server
// Start Server for Local/VPS (Not Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export default app;
