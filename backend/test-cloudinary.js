import cloudinary from './src/config/cloudinary.js';
import streamifier from 'streamifier';

const dummyBuffer = Buffer.from('hello world');
const uploadFromBuffer = (buffer) => {
    return new Promise((resolve, reject) => {
        const cld_upload_stream = cloudinary.uploader.upload_stream(
            {
                folder: "ecofute_documents",
                resource_type: "raw",
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

uploadFromBuffer(dummyBuffer)
    .then(console.log)
    .catch(console.error);
