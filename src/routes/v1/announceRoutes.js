import { Router } from "express";
import AnnouncementController from "../../controllers/v1/announcementController.js";


const router = Router();
const announcementController = new AnnouncementController();

// Create a new announcement
router.post("/create", announcementController.create_announcement.bind(announcementController));

// Get all announcements with optional filtering
router.get("/", announcementController.get_announcements.bind(announcementController));

// Get a specific announcement by ID
router.get("/:announce_id", announcementController.get_announcement_by_id.bind(announcementController));

// Update an announcement by ID
router.put("/:announce_id", announcementController.update_announcement.bind(announcementController));

// Delete an announcement by ID
router.delete("/:announce_id", announcementController.delete_announcement.bind(announcementController));

export default router;
