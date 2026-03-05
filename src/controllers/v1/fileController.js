import { uploadFileToCloudinary } from "../../services/cloudUploadService.js";
import {
  createDocxFromHtml,
  createFile,
  updateDraft,
} from "../../services/fileService.js";

import MysqlFileModel from "../../models/MySQL/FileModel.js";
import FileModelSupabase from "../../models/Supabase/FileModel.js";
import AdminModel from "../../models/MySQL/AdminModel.js";
import Space from "../../models/MySQL/SpaceModel.js";
import { Logger } from "../../utils/Logger.js";

class FileController {
  constructor() {
    this.space = new Space();
    this.acadTerm = new AdminModel();
    this.mysqlFileModel = new MysqlFileModel();
    this.supabaseModel = new FileModelSupabase("IMMACULEARN");
    this.logger = new Logger();
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

      // const draft = await this.mysqlFileModel.saveDraft( file_id, content );

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
      const file = await this.mysqlFileModel.findById(file_id);
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
      const files = await this.mysqlFileModel.findAllBySpaceId(space_id);

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
      const deleted = await this.mysqlFileModel.delete(id);

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
      const account_id = res.locals.account_id;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User." });

      const academic = await this.acadTerm.getLatestAcademicTerm();
      if (!academic)
        return res.status(404).json({
          success: false,
          message:
            "The Academic Period Not Started Yet. Contact the Administrator.",
        });

      const { space_uuid, lesson_name } = req.body || {};

      console.log(req.body);

      if (!lesson_name)
        return res
          .status(400)
          .json({ success: false, message: "Must have Lesson Name" });

      if (!space_uuid)
        return res
          .status(400)
          .json({ success: false, message: "space_uuid is required" });

      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });

      // --- Determine space type ---
      let space = await this.space.getBySpaceUuid(space_uuid);
      let c_space_id = null;
      let space_id = null;

      console.log(space);

      if (space.length > 0) {
        space_id = space[0].space_id; // normal space
      } else {
        space = await this.space.getByCourseSpaceUuid(space_uuid);
        if (!space)
          return res
            .status(404)
            .json({ success: false, message: "Space not found" });

        c_space_id = space[0].space_id; // course space
      }

      // --- Create lesson ---
      const lesson_id = await this.mysqlFileModel.createLesson(
        academic.acad_term_id,
        c_space_id,
        space_id,
        lesson_name,
      );

      const file = req.file;

      // --- Generate unique filename ---
      const uniqueName = `${account_id}-${academic.acad_term_id}-${Date.now()}-${file.originalname}`;
      const storage_path = `SPACES/${space_uuid}/RESOURCES/${uniqueName}`;

      // --- Upload to Supabase ---
      const uploadedPath = await this.supabaseModel.uploadFile(
        file.buffer,
        storage_path,
        file.mimetype,
      );
      const publicUrl = this.supabaseModel.getPublicUrl(uploadedPath);

      // --- Create file record in MySQL ---
      const file_id = await this.mysqlFileModel.createFile(
        c_space_id,
        space_id,
        lesson_id,
        file.originalname, // orig_file_name
        storage_path, // Supabase path
        publicUrl, // public URL
        file.size,
        file.mimetype,
      );

      return res.json({
        success: true,
        file_id,
        path: uploadedPath,
        url: publicUrl,
        space_uuid,
        lesson_id,
        space_type: c_space_id ? "course_space" : "normal_space",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async list_resources_by_space_uuid(req, res) {
    console.log("LIST RESOURCES");
    try {
      const account_id = res.locals.account_id;
      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User." });
      // const account_

      const space_uuid = req.params.space_uuid || "";
      let space = await this.space.getBySpaceUuid(space_uuid);
      // let c_space_id = null;
      // let space_id = null;
      let files;

      if (space.length > 0) {
        files = await this.mysqlFileModel.listResourcesBySpaceId(
          space[0].space_id,
        );

        console.log(space);
      } else {
        space = await this.space.getByCourseSpaceUuid(space_uuid);
        if (!space)
          return res
            .status(404)
            .json({ success: false, message: "Invalid Space UUID" });
        files = await this.mysqlFileModel.listResourcesByCourseSpaceId(
          space[0].space_id,
        );
      }

      console.log(space);

      // const files = await this.supabaseModel.listFilesBySpaceUUID(
      //   account_id,
      //   space_uuid,
      // );
      return res.json({ success: true, data: files });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteResource(req, res) {
    try {
      const account_id = res.locals.account_id;

      if (!account_id) {
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User." });
      }

      const { file_id, lesson_id } = req.body;

      if (!file_id || !lesson_id) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Request." });
      }

      // 1. Fetch file (joined to lesson for safety)
      const file = await this.mysqlFileModel.getFileByIdAndLesson(
        file_id,
        lesson_id,
      );

      if (!file) {
        return res
          .status(404)
          .json({ success: false, message: "File not found." });
      }

      const { storage_path, owner_id } = file;

      // 2. Ownership check
      if (Number(owner_id) !== Number(account_id)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied." });
      }

      // 3. Delete DB record
      // await this.mysqlFileModel.deleteFile(file_id, lesson_id);
      await this.mysqlFileModel.deleteLesson(lesson_id);

      // 4. Delete from Supabase
      await this.supabaseModel.deleteFileByPath(storage_path);

      return res.json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      this.logger.error("Error deleting file", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default FileController;
