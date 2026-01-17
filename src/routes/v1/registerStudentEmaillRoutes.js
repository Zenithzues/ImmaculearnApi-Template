import { Router } from 'express';
import RegisterStudentEmailController from '../../controllers/v1/registerStudentEmailController.js';
import upload from '../../middlewares/upload.js';

const regemailRouter = new Router();
const regemail = new RegisterStudentEmailController();
// Health check
regemailRouter.get(
  '/',
  regemail.indexAction.bind(regemail)
);

// Single email registration
regemailRouter.post(
  '/email',
  regemail.registerEmailAction.bind(regemail)
);

// Bulk email upload (CSV / EXCEL)
regemailRouter.post(
  '/bulk_email',
  upload.single('file'),
  regemail.bulkRegisterAction.bind(regemail)
);


// Get all registered emails
regemailRouter.get(
  '/all_emails',
  regemail.getAllEmailsAction.bind(regemail)
);

export default regemailRouter;
