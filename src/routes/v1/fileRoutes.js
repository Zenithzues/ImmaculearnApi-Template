import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import FileController from '../../controllers/v1/fileController.js';
import authorization from '../../middlewares/authorization.js';
import authentication from '../../middlewares/authentication.js';

const fileRouter = new Router();

// Temp folder for initial storage
// const tmpFolder = path.join(process.cwd(), 'tmp');
const tmpFolder = path.join('src/data/tmp');


// Make sure tmp folder exists
if (!fs.existsSync(tmpFolder)) {
  fs.mkdirSync(tmpFolder, { recursive: true });
}

// Multer config: store first in tmp
const upload = multer({ dest: tmpFolder });

fileRouter.use(authorization);
fileRouter.use(authentication);

const fileController = new FileController();

// Bind methods to preserve "this"
fileRouter.post('/create', fileController.create.bind(fileController));
fileRouter.post('/draft', fileController.draft.bind(fileController));
fileRouter.post('/upload', fileController.upload.bind(fileController));
fileRouter.post('/delete', fileController.delete.bind(fileController));
fileRouter.get('/:space_id/list', fileController.list.bind(fileController));

export default fileRouter;
