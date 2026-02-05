import express from 'express';
import multer from 'multer';
import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';
import prisma from '../db.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. UPLOAD DOCUMENT
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { clientId, category } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: "No file provided" });

        const uploadFromBuffer = (buffer) => {
            return new Promise((resolve, reject) => {
                let cld_upload_stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "ecofute_documents",
                        resource_type: "auto",
                        access_mode: "public",
                        type: "upload"
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
        const displayName = category ? `[${category}] ${file.originalname}` : file.originalname;

        const doc = await prisma.document.create({
            data: {
                name: displayName,
                type: result.format || 'unknown',
                size: (result.bytes / 1024 / 1024).toFixed(2) + ' MB',
                url: result.secure_url,
                clientId: parseInt(clientId)
            }
        });

        res.json(doc);
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Error uploading document" });
    }
});

// 2. DELETE DOCUMENT
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } });

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // Extract public_id
        const urlParts = doc.url.split('/');
        const fileNameWithExt = urlParts[urlParts.length - 1];
        const fileName = fileNameWithExt.split('.')[0];
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
