import { storageService } from '../../models/fileModel.js';

class FileController {
  // Upload a file
  static async upload(req, res) {
    console.log("REQ.FILE:", req.file);
    console.log("REQ.BODY:", req.body);

    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const userId = req.body.userId || 'guest';
        const destinationPath = `documents/${userId}/${req.file.originalname}`;

        await storageService.uploadFile(req.file.buffer, destinationPath);

        console.log("UPLOAD OK:", destinationPath);

        res.status(200).json({ message: 'File uploaded', path: destinationPath });
    } catch (error) {
        console.log("UPLOAD ERROR:", error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  }


  // Get a signed URL for download
  static async get(req, res) {
    try {
      const { filePath } = req.body;
      if (!filePath) return res.status(400).json({ message: 'filePath is required' });

      const url = await storageService.getFileSignedUrl(filePath);

      res.status(200).json({ url });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get file', error: error.message });
    }
  }

  // Delete a file
  static async delete(req, res) {
    try {
      const { filePath } = req.body;
      if (!filePath) return res.status(400).json({ message: 'filePath is required' });

      await storageService.deleteFile(filePath);

      res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Delete failed', error: error.message });
    }
  }

  // List files for a user or prefix
  static async list(req, res) {
    try {
      const userId = req.body.userId || '';
      const prefix = userId ? `documents/${userId}/` : '';
      const files = await storageService.listFiles(prefix);

      res.status(200).json({ files });
    } catch (error) {
      res.status(500).json({ message: 'Failed to list files', error: error.message });
    }
  }
}


export default FileController;