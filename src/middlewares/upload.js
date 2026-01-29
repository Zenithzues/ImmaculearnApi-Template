import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = 'ImmacuLearn';
    const ext = file.originalname.split('.').pop();
    const baseName = file.originalname.replace(/\.[^/.]+$/, "");

    let publicId = baseName;
    let counter = 0;

    while (true) {
      try {
        // check if file exists
        await cloudinary.api.resource(`${folder}/${publicId}`, { resource_type: 'raw' });
        // exists → increment
        counter++;
        publicId = `${baseName}(${counter})`;
      } catch (err) {
        // if file not found → break
        if (err.http_code === 404) break;
        else throw err; // rethrow other errors
      }
    }

    return {
      folder,
      resource_type: 'raw',
      use_filename: false, // we handle filename with public_id
      public_id: publicId,
      format: ext,
    };
  },
});

const upload = multer({ storage });

export default upload;
