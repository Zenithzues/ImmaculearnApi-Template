import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = "announcement/images";
    const ext = file.originalname.split(".").pop();
    const baseName = file.originalname.replace(/\.[^/.]+$/, "");

    let publicId = baseName;
    let counter = 0;

    while (true) {
      try {
        await cloudinary.api.resource(`${folder}/${publicId}`, {
          resource_type: "image",
        });
        counter++;
        publicId = `${baseName}(${counter})`;
      } catch (err) {
        // sometimes http_code is undefined
        if (err.http_code === 404 || err?.error?.message?.includes("not found"))
          break;
        else throw err;
      }
    }

    return {
      folder,
      resource_type: "image",
      use_filename: false,
      public_id: publicId,
      format: ext,
    };
  },
});

const upload = multer({ storage });

export default upload;
