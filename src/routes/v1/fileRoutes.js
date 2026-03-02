import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import FileController from "../../controllers/v1/fileController.js";
import authorization from "../../middlewares/authorization.js";
import authentication from "../../middlewares/authentication.js";

const fileRouter = new Router();

// Temp folder for initial storage
// const tmpFolder = path.join(process.cwd(), 'tmp');
const tmpFolder = path.join("src/data/tmp");

// Make sure tmp folder exists
if (!fs.existsSync(tmpFolder)) {
  fs.mkdirSync(tmpFolder, { recursive: true });
}

// Multer config: store first in tmp
const allowed = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/pdf",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  // fileFilter: (req, file, cb) => {
  //   if (!allowed.includes(file.mimetype)) {
  //     return cb(new Error("Invalid file type"));
  //   }
  //   cb(null, true);
  // },
});

fileRouter.use(authorization);
fileRouter.use(authentication);

const fileController = new FileController();

fileRouter.get(
  "/resources/:space_uuid",
  fileController.list_resources_by_space_uuid.bind(fileController),
);

fileRouter.post(
  "/resources/",
  upload.single("file"),
  fileController.upload_resources.bind(fileController),
);

fileRouter.delete(
  "/resources",
  fileController.deleteResource.bind(fileController),
);

// Bind methods to preserve "this"
fileRouter.post("/create", fileController.create.bind(fileController));
fileRouter.post("/draft", fileController.draft.bind(fileController));
fileRouter.post("/upload", fileController.upload.bind(fileController));
fileRouter.post("/delete", fileController.delete.bind(fileController));
fileRouter.get("/:space_id/list", fileController.list.bind(fileController));

export default fileRouter;
