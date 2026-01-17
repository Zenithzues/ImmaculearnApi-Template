import { Router } from 'express';

import homeRouter from './homeRoutes.js';
import accountRouter from './accountRoutes.js';
// import fileRouter from './fileRoutes.js';
import authRouter from './authRoutes.js';
import regemailRouter from './registerStudentEmaillRoutes.js';
import regprofemailRouter from './registerProfEmaillRoutes.js';

const v1 = new Router();

v1.use('/account', accountRouter);
v1.use('/auth', authRouter);
// v1.use('/files', fileRouter);
v1.use('/', homeRouter);

v1.use('/register_student', regemailRouter);
v1.use('/register_prof', regprofemailRouter);

export default v1;
