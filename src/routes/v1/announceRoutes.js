import { Router } from "express";
import AnnouncementController from "../../controllers/v1/announcementController.js";
import upload from "../../middlewares/upload.js";

const router = Router();
const announcementController = new AnnouncementController();

// Create a new announcement
router.post(
  "/create",
  upload.array("images", 2),
  announcementController.create_announcement.bind(announcementController),
);

// Get student announcements - accessible to students
router.get(
  "/students",
  announcementController.get_student_announcements.bind(announcementController),
);

// Get professor announcements - accessible to professors
router.get(
  "/professor",
  announcementController.get_professor_announcements.bind(
    announcementController,
  ),
);

// Get professor announcements - accessible to professors (plural version)
router.get(
  "/professors",
  announcementController.get_professor_announcements.bind(
    announcementController,
  ),
);

// Get all announcements - accessible to both students and professors (ALL target audience)
router.get(
  "/all",
  announcementController.get_announcements.bind(announcementController),
);

// Get all announcements with optional filtering
router.get(
  "/",
  announcementController.get_announcements.bind(announcementController),
);

// Get a specific announcement by ID
router.get(
  "/:announce_id",
  announcementController.get_announcement_by_id.bind(announcementController),
);

// Update an announcement by ID
router.put(
  "/:announce_id",
  announcementController.update_announcement.bind(announcementController),
);

// Delete an announcement by ID
router.delete(
  "/delete/:announce_id",
  announcementController.delete_announcement.bind(announcementController),
);

export default router;
