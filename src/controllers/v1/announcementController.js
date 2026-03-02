// import User from '../../models/user.js';
// import Space from '../../models/MySQL/SpaceModel.js';
// import Space from '../../models/MySQL/SpaceModel.js';
// import Post from "../../models/MySQL/PostModel.js";
import { Logger } from "../../utils/Logger.js";
import AnnouncementModel from "../../models/MySQL/AnnouncementModel.js";

class AnnouncementController {
  constructor() {
   
    this.announcementModel = new AnnouncementModel();
    this.logger = new Logger("AnnouncementController");
  }

  async create_announcement(req, res) {
    try {
      const created_by = res.locals.admin_id || 1;
      const { title, content, target_audience = 'ALL', publish_option = 'NOW', scheduled_at } = req.body || {};

      if (!created_by)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      if (!title || !content)
        return res.status(400).json({
          success: false,
          message: "Title and content are required!",
        });

      if (publish_option === 'SCHEDULED' && !scheduled_at) {
        return res.status(400).json({
          success: false,
          message: "Scheduled time is required when publish option is SCHEDULED!",
        });
      }

      const result = await this.announcementModel.createAnnouncement(
        title,
        content,
        target_audience,
        publish_option,
        scheduled_at,
        created_by
      );

      return res.status(201).json({
        success: true,
        message: `Successfully created announcement with ID ${result[0].insertId}`,
        data: {
          announce_id: result[0].insertId,
          title: title,
          content: content,
          target_audience: target_audience,
          publish_option: publish_option,
          scheduled_at: scheduled_at,
          created_by: created_by
        }
      });
    } catch (err) {
      this.logger.error("Error in create_announcement", { error: err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async get_announcements(req, res) {
    try {
      const { limit = 10, offset = 0, target_audience } = req.query;
      
      const announcements = await this.announcementModel.getAnnouncements(
        parseInt(limit),
        parseInt(offset),
        target_audience
      );

      return res.status(200).json({
        success: true,
        message: "Announcements retrieved successfully",
        data: {
          announcements: announcements,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: announcements.length
          }
        }
      });
    } catch (err) {
      this.logger.error("Error in get_announcements", { error: err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async get_announcement_by_id(req, res) {
    try {
      const { announce_id } = req.params;
      
      if (!announce_id) {
        return res.status(400).json({
          success: false,
          message: "Announcement ID is required!",
        });
      }

      const announcement = await this.announcementModel.getAnnouncementById(announce_id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: "Announcement not found!",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Announcement retrieved successfully",
        data: announcement
      });
    } catch (err) {
      this.logger.error("Error in get_announcement_by_id", { error: err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async update_announcement(req, res) {
    try {
      const { announce_id } = req.params;
      const { title, content, target_audience, publish_option, scheduled_at } = req.body || {};

      if (!announce_id) {
        return res.status(400).json({
          success: false,
          message: "Announcement ID is required!",
        });
      }

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: "Title and content are required!",
        });
      }

      if (publish_option === 'SCHEDULED' && !scheduled_at) {
        return res.status(400).json({
          success: false,
          message: "Scheduled time is required when publish option is SCHEDULED!",
        });
      }

      const result = await this.announcementModel.updateAnnouncement(
        announce_id,
        title,
        content,
        target_audience,
        publish_option,
        scheduled_at
      );

      if (result[0].affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Announcement not found!",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Announcement updated successfully",
        data: {
          announce_id: parseInt(announce_id),
          updated_fields: {
            title: title,
            content: content,
            target_audience: target_audience,
            publish_option: publish_option,
            scheduled_at: scheduled_at
          }
        }
      });
    } catch (err) {
      this.logger.error("Error in update_announcement", { error: err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async delete_announcement(req, res) {
    try {
      const { announce_id } = req.params;

      if (!announce_id) {
        return res.status(400).json({
          success: false,
          message: "Announcement ID is required!",
        });
      }

      const result = await this.announcementModel.deleteAnnouncement(announce_id);

      if (result[0].affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Announcement not found!",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Announcement deleted successfully",
        data: {
          announce_id: parseInt(announce_id),
          deleted: true
        }
      });
    } catch (err) {
      this.logger.error("Error in delete_announcement", { error: err });
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  
  

}

export default AnnouncementController;
