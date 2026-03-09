import { Router } from 'express';
import RegisterProfEmailController from '../../controllers/v1/registerProfEmailController.js';
import upload from '../../middlewares/uplodaExcel.js';
import authentication from '../../middlewares/authentication.js';
import authorization from '../../middlewares/authorization.js';

const regprofemailRouter = new Router();
const regprofemail = new RegisterProfEmailController();

regprofemailRouter.use(authorization);
regprofemailRouter.use(authentication);

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

regprofemailRouter.delete(
  '/delete/:email',
  regprofemail.deleteEmailAction.bind(regprofemail)
);

export default regprofemailRouter;