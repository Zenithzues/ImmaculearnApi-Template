import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = 'ImmacuLearn';
    const ext = file.originalname.split('.').pop();
    const baseName = file.originalname.replace(/\.[^/.]+$/, "");
    // const userId = req.user ? req.user.id : 'guest';

    let publicId = `${baseName}`;
    let counter = 0;
    let exists = true;

    while (exists) {
      try {
        // check if file exists in folder
        await cloudinary.api.resource(`${folder}/${publicId}`, { resource_type: 'raw' });
        // file exists → increment counter
        counter++;
        publicId = `${baseName}(${counter})`;
      } catch (err) {
        // file does NOT exist → stop loop
        exists = false;
      }
    }

    return {
      folder,
      resource_type: 'raw',
      use_filename: false,
      public_id: publicId,
      format: ext,
    };
  },
});

const upload = multer({ storage });

export default upload;
