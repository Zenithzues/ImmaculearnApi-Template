import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FirebaseStorageService {
  constructor(serviceAccountPath, bucketName) {
    const serviceAccount = path.join(__dirname, serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName,
    });

    this.bucket = admin.storage().bucket();
  }

  // Upload file
  async uploadFile(fileBuffer, destinationPath) {
    const file = this.bucket.file(destinationPath);
    await file.save(fileBuffer, { resumable: false });
    return destinationPath;
  }

  // Get signed URL for private access
  async getFileSignedUrl(filePath, expires = 3600) {
    const file = this.bucket.file(filePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expires * 1000,
    });
    return url;
  }

  // Delete a file
  async deleteFile(filePath) {
    const file = this.bucket.file(filePath);
    await file.delete();
    return true;
  }

  // List files in a folder / prefix
  async listFiles(prefix = '') {
    const [files] = await this.bucket.getFiles({ prefix });
    return files.map(f => f.name);
  }
}

// Export an instance
export const storageService = new FirebaseStorageService(
  '../core/serviceAccountKey.json',
  `${process.env.FIREBIRD_ACCOUNT_ID}.appspot.com`
);
