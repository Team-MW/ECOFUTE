import express from 'express';
import multer from 'multer';
import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';
import prisma from '../db.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 0. GET ALL DOCUMENTS (for Drive)
router.get('/', async (req, res) => {
    try {
        const { clientId, folder, category, isArchived, search } = req.query;

        const where = {};

        // Filter by Client
        if (clientId) {
            where.clientId = parseInt(clientId);
        } else if (req.query.global === 'true') {
            // If expressly asking for global docs (no client), or just all docs?
            // "Drive interne" might want to see EVERYTHING or just non-client docs?
            // Usually Drive shows everything structured.
            // If clientId is NOT provided, and we are not filtering, we might return all.
            // But if we want *only* text docs (no client), we'd need a flag.
            // For now, let's allow returning all if no filters.
        }

        // Folder filter
        if (folder) where.folder = folder;

        // Category filter
        if (category) where.category = category;

        // Archive filter
        if (isArchived !== undefined) {
            where.isArchived = isArchived === 'true';
        }

        // Search
        if (search) {
            where.name = { contains: search };
        }

        const docs = await prisma.document.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { client: { select: { firstName: true, lastName: true, company: true } } }
        });

        res.json(docs);
    } catch (error) {
        console.error("Get Docs Error:", error);
        res.status(500).json({ error: "Error fetching documents" });
    }
});

// 1. UPLOAD DOCUMENT
router.post('/', upload.single('file'), async (req, res) => {
    try {
        // Multer populates req.body with text fields
        const { clientId, category, folder, name } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: "No file provided" });

        // Cloudinary Upload Stream
        const uploadFromBuffer = (buffer) => {
            return new Promise((resolve, reject) => {
                const cld_upload_stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "ecofute_documents",
                        resource_type: "auto",
                        access_mode: "public"
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                streamifier.createReadStream(buffer).pipe(cld_upload_stream);
            });
        };

        const result = await uploadFromBuffer(file.buffer);

        // Determine final name
        const finalName = name || file.originalname;

        const doc = await prisma.document.create({
            data: {
                name: finalName,
                type: result.format || file.mimetype,
                size: (result.bytes / 1024 / 1024).toFixed(2) + ' MB',
                url: result.secure_url,
                clientId: (clientId && !isNaN(parseInt(clientId))) ? parseInt(clientId) : null,
                category: category || "Autre",
                folder: folder || null
            }
        });

        res.json(doc);
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Error uploading document: " + error.message });
    }
});

// 2. UPDATE DOCUMENT (Archive, Move, Rename)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category, folder, isArchived } = req.body;

    try {
        const data = {};
        if (name) data.name = name;
        if (category) data.category = category;
        if (folder !== undefined) data.folder = folder; // Allow setting to null? If so need check
        if (isArchived !== undefined) data.isArchived = isArchived;

        const doc = await prisma.document.update({
            where: { id: parseInt(id) },
            data
        });
        res.json(doc);
    } catch (error) {
        console.error("Update Doc Error:", error);
        res.status(500).json({ error: "Error updating document" });
    }
});

// 3. DELETE DOCUMENT
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } });

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // Extract public_id for Cloudinary
        // URL format: https://res.cloudinary.com/cloudName/image/upload/vVersion/ecofute_documents/filename.ext
        // We need 'ecofute_documents/filename' (without ext usually for auto? or with?)
        // Cloudinary usually needs public_id without extension for images, but with raw?
        // Let's rely on the previous logic which seemed to work or refine it.
        // Previous logic:
        // const urlParts = doc.url.split('/');
        // const fileNameWithExt = urlParts[urlParts.length - 1];
        // const fileName = fileNameWithExt.split('.')[0];
        // const publicId = `ecofute_documents/${fileName}`;

        // Better: store public_id in DB? For now, we parse.
        const urlParts = doc.url.split('/');
        const fileNameWithExt = urlParts[urlParts.length - 1];
        const fileName = fileNameWithExt.split('.').slice(0, -1).join('.'); // Handle dots in filename
        const publicId = `ecofute_documents/${fileName}`;

        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (err) {
            console.warn("Cloudinary delete warning:", err);
        }

        await prisma.document.delete({ where: { id: parseInt(id) } });

        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        console.error("Delete Document Error:", error);
        res.status(500).json({ error: 'Error deleting document' });
    }
});

export default router;
