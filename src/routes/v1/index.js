import { Router } from 'express';

import homeRouter from './homeRoutes.js';
import accountRouter from './accountRoutes.js';
import fileRouter from './fileRoutes.js';
import authRouter from './authRoutes.js';
import uploadRouter from './upload.route.js';

const v1 = new Router();

v1.use('/account', accountRouter);
v1.use('/auth', authRouter);
v1.use('/files', fileRouter);
v1.use('/api', uploadRouter);
v1.use('/', homeRouter);

export default v1;
