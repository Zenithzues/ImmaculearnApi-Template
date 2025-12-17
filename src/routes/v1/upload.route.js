import { Router } from 'express';
import upload from '../../middlewares/upload.js';

const uploadRouter = new Router();

uploadRouter.post('/upload', upload.single('file'), (req, res) => {
  res.status(200).json({
    message: 'Upload successful',
    url: req.file.path,
    public_id: req.file.filename,
  });
});

export default uploadRouter;
