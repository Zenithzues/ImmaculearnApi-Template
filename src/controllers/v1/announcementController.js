import { Logger } from "../../utils/Logger.js";
import AnnouncementModel from "../../models/MySQL/AnnouncementModel.js";

class AnnouncementController {
  constructor() {
    this.announcementModel = new AnnouncementModel();
    this.logger = new Logger("AnnouncementController");
  }

  // ✅ CREATE
  async create_announcement(req, res) {
    try {
      const created_by = res.locals.admin_id || 1;
      const { title, content, target_audience = "ALL" } = req.body || {};

      const imageUrls = req.files ? req.files.map((file) => file.path) : [];

      console.log(imageUrls);

      if (!created_by)
        return res.status(401).json({
          success: false,
          message: "UnAuthenticated User!",
        });

      if (!title || !content)
        return res.status(400).json({
          success: false,
          message: "Title and content are required!",
        });

      const result = await this.announcementModel.createAnnouncement(
        title,
        content,
        target_audience,
        created_by,
        imageUrls,
      );

      return res.status(201).json({
        success: true,
        message: "Announcement created successfully",
        data: {
          announce_id: result.insertId,
          title,
          content,
          target_audience,
          created_by,
        },
      });
    } catch (err) {
      this.logger.error("Error in create_announcement", { err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  // ✅ GET LATEST 10
  async get_announcements(req, res) {
    try {
      const { target_audience } = req.query;

      const announcements =
        await this.announcementModel.getAnnouncements(target_audience);

      return res.status(200).json({
        success: true,
        message: "Announcements retrieved successfully",
        total: announcements.length,
        data: announcements,
      });
    } catch (err) {
      this.logger.error("Error in get_announcements", { err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  // ✅ GET BY ID
  async get_announcement_by_id(req, res) {
    try {
      const { announce_id } = req.params;

      if (!announce_id)
        return res.status(400).json({
          success: false,
          message: "Announcement ID is required!",
        });

      const announcement =
        await this.announcementModel.getAnnouncementById(announce_id);

      if (!announcement)
        return res.status(404).json({
          success: false,
          message: "Announcement not found!",
        });

      return res.status(200).json({
        success: true,
        data: announcement,
      });
    } catch (err) {
      this.logger.error("Error in get_announcement_by_id", { err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  // ✅ UPDATE
  async update_announcement(req, res) {
    try {
      const { announce_id } = req.params;
      const { title, content, target_audience } = req.body || {};

      if (!announce_id)
        return res.status(400).json({
          success: false,
          message: "Announcement ID is required!",
        });

      if (!title || !content)
        return res.status(400).json({
          success: false,
          message: "Title and content are required!",
        });

      const result = await this.announcementModel.updateAnnouncement(
        announce_id,
        title,
        content,
        target_audience,
      );

      if (result.affectedRows === 0)
        return res.status(404).json({
          success: false,
          message: "Announcement not found!",
        });

      return res.status(200).json({
        success: true,
        message: "Announcement updated successfully",
      });
    } catch (err) {
      this.logger.error("Error in update_announcement", { err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  // GET STUDENT ANNOUNCEMENTS
  async get_student_announcements(req, res) {
    try {
      const announcements =
        await this.announcementModel.getStudentAnnouncements();

      return res.status(200).json({
        success: true,
        message: "Student announcements retrieved successfully",
        total: announcements.length,
        data: announcements,
      });
    } catch (err) {
      this.logger.error("Error in get_student_announcements", { err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  // GET PROFESSOR ANNOUNCEMENTS
  async get_professor_announcements(req, res) {
    try {
      const announcements =
        await this.announcementModel.getProfessorAnnouncements();

      return res.status(200).json({
        success: true,
        message: "Professor announcements retrieved successfully",
        total: announcements.length,
        data: announcements,
      });
    } catch (err) {
      this.logger.error("Error in get_professor_announcements", { err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  // DELETE
  async delete_announcement(req, res) {
    try {
      const { announce_id } = req.params;

      if (!announce_id)
        return res.status(400).json({
          success: false,
          message: "Announcement ID is required!",
        });

      const result =
        await this.announcementModel.deleteAnnouncement(announce_id);

      if (result.affectedRows === 0)
        return res.status(404).json({
          success: false,
          message: "Announcement not found!",
        });

      return res.status(200).json({
        success: true,
        message: "Announcement deleted successfully",
      });
    } catch (err) {
      this.logger.error("Error in delete_announcement", { err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }
}

export default AnnouncementController;
