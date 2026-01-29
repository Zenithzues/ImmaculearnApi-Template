import FileModel from "../../models/MySQL/FileModel.js";
import { uploadFileToCloudinary } from "../../services/cloudUploadService.js";
import { createDocxFromHtml, createFile, updateDraft } from "../../services/fileService.js";


class FileController {
  constructor() {
    this.fileModel = new FileModel();
  }

  async create(req, res) {
    try {
      const { title, space_id, content = '' } = req.body;
      const owner_id = res.locals.account_id;

      console.log(title, space_id)

      if (!title || !space_id) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
      }


      const file = await createFile({
        title,
        space_id,
        owner_id,
        content
      });

      console.log(file)

      res.json({ success: true, data: file, message: "Successfully Create" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async draft(req, res) {
    try {
      const { file_id, content } = req.body;
      if (!file_id) return res.status(400).json({ success: false, message: 'file_id required' });
      
      // const draft = await this.fileModel.saveDraft( file_id, content );

      const draft = await updateDraft({file_id, content})

      res.json({ success: true, message: 'Draft saved', draft });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }


  // async upload(req, res) {
  //   try {
  //     const { file_id } = req.body;

  //     if (!file_id) {
  //       return res.status(400).json({ success: false, message: 'file_id required' });
  //     }

  //     const cloud = await uploadFileToCloudinary(file_id);

  //     res.json({ success: true, cloud });
  //   } catch (err) {
  //     res.status(500).json({ success: false, message: err.message });
  //   }
  // }

  async upload(req, res) {
    try {
      const { file_id } = req.body;

      if (!file_id) {
        return res.status(400).json({ success: false, message: 'file_id required' });
      }

      // 1️⃣ Get file info from DB
      const file = await this.fileModel.findById(file_id);
      if (!file) return res.status(404).json({ success: false, message: 'File not found' });


      // 2️⃣ Convert HTML draft → DOCX
      const { path: docxPath, filename: docxFilename } = await createDocxFromHtml(file);

      // 3️⃣ Upload DOCX to Cloudinary
      const cloudResult = await uploadFileToCloudinary(file_id, docxPath, docxFilename);

      res.json({ success: true, cloud: cloudResult });

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // async open(req, res) {

  // }


  // Get all files
  async list(req, res) {
    try {
      const {space_id} = req.params || {};
      const files = await this.fileModel.findAllBySpaceId(space_id);

      console.log(files)
      return res.json({ success: true, data: files });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.toString() });
    }
  }

  // Delete a file by ID
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await this.fileModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      res.json({ success: true, message: 'File deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.toString() });
    }
  }
}


export default FileController;