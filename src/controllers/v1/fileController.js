import FileModel from "../../models/MySQL/FileModel.js";
import { uploadFileToCloudinary } from "../../services/cloudUploadService.js";
import {
  createDocxFromHtml,
  createFile,
  updateDraft,
} from "../../services/fileService.js";

import FileModelSupabase from "../../models/Supabase/fileModel.js";
import AdminModel from "../../models/MySQL/AdminModel.js";

class FileController {
  constructor() {
    this.acadTerm = new AdminModel();
    this.fileModel = new FileModel();
    this.supabaseModel = new FileModelSupabase("IMMACULEARN");
  }

  async create(req, res) {
    try {
      const { title, space_id, content = "" } = req.body;
      const owner_id = res.locals.account_id;

      console.log(title, space_id);

      if (!title || !space_id) {
        return res
          .status(400)
          .json({ success: false, message: "Missing fields" });
      }

      const file = await createFile({
        title,
        space_id,
        owner_id,
        content,
      });

      console.log(file);

      res.json({ success: true, data: file, message: "Successfully Create" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async draft(req, res) {
    try {
      const { file_id, content } = req.body;
      if (!file_id)
        return res
          .status(400)
          .json({ success: false, message: "file_id required" });

      // const draft = await this.fileModel.saveDraft( file_id, content );

      const draft = await updateDraft({ file_id, content });

      res.json({ success: true, message: "Draft saved", draft });
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
        return res
          .status(400)
          .json({ success: false, message: "file_id required" });
      }

      // 1️⃣ Get file info from DB
      const file = await this.fileModel.findById(file_id);
      if (!file)
        return res
          .status(404)
          .json({ success: false, message: "File not found" });

      // 2️⃣ Convert HTML draft → DOCX
      const { path: docxPath, filename: docxFilename } =
        await createDocxFromHtml(file);

      // 3️⃣ Upload DOCX to Cloudinary
      const cloudResult = await uploadFileToCloudinary(
        file_id,
        docxPath,
        docxFilename,
      );

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
      const { space_id } = req.params || {};
      const files = await this.fileModel.findAllBySpaceId(space_id);

      console.log(files);
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
        return res
          .status(404)
          .json({ success: false, message: "File not found" });
      }

      res.json({ success: true, message: "File deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.toString() });
    }
  }

  /******
   * THIS IS FOR SUPABASE BUCKET
   */

  async upload_resources(req, res) {
    try {
      const account_id = res.locals.account_id || 1;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User." });
      // const academic = await this.acadTerm.getLatestAcademicTerm();
      const academic = await this.acadTerm.getLatestAcademicTerm();

      if (!academic)
        return res.status(404).json({
          success: false,
          message:
            "the Academic Period Not Started Yet. Contact the Administrator.",
        });

      const space_uuid = req.body.space_uuid; // 👈 get space_uuid
      console.log("BODY:", req.body);
      console.log(space_uuid);
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      if (!space_uuid) {
        return res.status(400).json({
          success: false,
          message: "space_uuid is required",
        });
      }

      const file = req.file;

      const uniqueName = `${account_id}-${academic.acad_term_id}-${Date.now()}-${file.originalname}`;

      // 👇 Now file is inside space folder
      const destinationPath = `SPACES/${space_uuid}/RESOURCES/${uniqueName}`;

      const uploadedPath = await this.supabaseModel.uploadFile(
        file.buffer,
        destinationPath,
        file.mimetype,
      );

      const publicUrl = this.supabaseModel.getPublicUrl(uploadedPath);

      return res.json({
        success: true,
        path: uploadedPath,
        url: publicUrl,
        space_uuid,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async list_resources_by_space_uuid(req, res) {
    console.log("LIST RESOURCES");
    try {
      const account_id = res.locals.account_id || 1;
      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User." });
      // const account_

      const space_uuid = req.params.space_uuid || "";
      const files = await this.supabaseModel.listFilesBySpaceUUID(
        account_id,
        space_uuid,
      );
      return res.json({ success: true, data: files });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteResource(req, res) {
    try {
      const account_id = res.locals.account_id || 1; // make sure it's a string

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User." });

      const { filename } = req.body;

      // Validate filename exists
      if (!filename) {
        return res
          .status(400)
          .json({ success: false, message: "filename required" });
      }

      // Check ownership: filename should start with account_id
      if (!filename.startsWith(`${account_id}-`)) {
        return res
          .status(403)
          .json({ success: false, message: "Invalid request: Not your file" });
      }

      await this.supabaseModel.deleteFileByName(filename);

      return res.json({ success: true, message: "File deleted" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default FileController;
