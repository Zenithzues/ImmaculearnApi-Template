import fs from 'fs/promises';
import cloudinary from '../config/cloudinary.js';
import FileModel from '../models/MySQL/FileModel.js';

export async function uploadFileToCloudinary(fileId, filePath, filename) {
  const fileModel = new FileModel();

  if (!filePath) {
    const file = await fileModel.findById(fileId);
    if (!file) throw new Error('File not found');
    filePath = file.path;
    filename = file.filename.replace(/\.[^/.]+$/, '');
  }

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'raw',
    folder: 'ImmacuLearn/uploads',
    public_id: filename.replace(/\.[^/.]+$/, ''),
  });

  await fileModel.updateCloudInfo(fileId, {
    cloud_url: result.secure_url,
    public_id: result.public_id,
    status: 'uploaded',
    size: result.bytes,
  });

  // Remove temp file
  await fs.unlink(filePath);

  return result;
}




export async function draftFileToCloudinary(fileId) {
  const fileModel = new FileModel();

  // 1. get file from DB
  const file = await fileModel.findById(fileId);
  if (!file) throw new Error('File not found');

  // 2. upload to cloudinary
  const result = await cloudinary.uploader.upload(file.path, {
    resource_type: 'raw',
    folder: 'ImmacuLearn/drafts',
    public_id: file.filename.replace(/\.[^/.]+$/, ''),
  });

  // 3. update DB (you should add these columns)
  await fileModel.updateCloudInfo(fileId, {
    cloud_url: result.secure_url,
    public_id: result.public_id,
    status: 'drafted'
  });

  // 4. optional: remove tmp file
  await fs.unlink(file.path);

  return result;
}


export async function downloadFromCloudinary(cldUrl, fileName) {
  await fs.mkdir(TMP_DIR, { recursive: true });
  const filePath = path.join(TMP_DIR, fileName);

  const response = await axios.get(cldUrl, { responseType: 'arraybuffer' });
  await fs.writeFile(filePath, response.data);

  return filePath;
}