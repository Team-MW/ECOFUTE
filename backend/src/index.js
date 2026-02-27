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

// Middleware CORS — autorise le frontend local et Vercel en production
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    process.env.FRONTEND_URL, // ex: https://ecofute-frontend.vercel.app
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Autoriser les requêtes sans origin (Postman, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Autoriser tous les sous-domaines *.vercel.app en preview
        if (origin.endsWith('.vercel.app')) return callback(null, true);
        callback(new Error(`CORS bloqué pour l'origine : ${origin}`));
    },
    credentials: true,
}));
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

// Serve static frontend files in production
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true') {
    app.use(express.static(path.join(__dirname, '../../frontend/dist')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
    });
}

// Start Server
// Start Server for Local/VPS (Not Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export default app;
