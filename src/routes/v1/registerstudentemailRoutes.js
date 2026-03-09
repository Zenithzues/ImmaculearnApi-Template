import { Router } from 'express';
import RegisterStudentEmailController from '../../controllers/v1/registerStudentEmailController.js';
import upload from '../../middlewares/uplodaExcel.js';
import authorization from '../../middlewares/authorization.js';
import authentication from '../../middlewares/authentication.js';

const regemailRouter = new Router();
const regemail = new RegisterStudentEmailController();


regemailRouter.use(authorization);
regemailRouter.use(authentication);
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
  '/all_emails_student',
  regemail.getAllEmailsAction.bind(regemail)
);

// Delete email and all associated records
regemailRouter.delete(
  '/delete/:email',
  regemail.deleteEmailAction.bind(regemail)
);
 
export default regemailRouter;