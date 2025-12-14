import { Router } from 'express';
import multer from 'multer';
import FileController from '../../controllers/v1/fileController.js';
import authorization from '../../middlewares/authorization.js';
import authentication from '../../middlewares/authentication.js';

const fileRouter = new Router();
const upload = multer({ storage: multer.memoryStorage() });

fileRouter.use(authorization);
// fileRouter.use(authentication);

// Use static methods directly from class
fileRouter.post('/upload', upload.single('file'), FileController.upload);
fileRouter.post('/read', FileController.get);
fileRouter.post('/delete', FileController.delete);
fileRouter.post('/list', FileController.list);

export default fileRouter;
