import { Router } from 'express';
import RegisterProfEmailController from '../../controllers/v1/registerProfEmailController.js';
import upload from '../../middlewares/uploadexcel.js';

const regprofemailRouter = new Router();
const regprofemail = new RegisterProfEmailController();
// Health check
regprofemailRouter.get(
  '/',
  regprofemail.indexAction.bind(regprofemail)
);

// Single email registration
regprofemailRouter.post(
  '/email',
  regprofemail.registerEmailAction.bind(regprofemail)
);

// Bulk email upload (CSV / EXCEL)
regprofemailRouter.post(
  '/bulk_email',
  upload.single('file'),
  regprofemail.bulkRegisterAction.bind(regprofemail)
);


// Get all registered emails
regprofemailRouter.get(
  '/all_emails_prof',
  regprofemail.getAllEmailsAction.bind(regprofemail)
);

export default regprofemailRouter;