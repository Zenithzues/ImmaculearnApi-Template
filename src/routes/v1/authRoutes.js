// import express from 'express';
import { Router } from 'express';
import { AuthController } from '../../controllers/v1/authController.js';
import authorization from '../../middlewares/authorization.js';
import authentication from '../../middlewares/authentication.js';

const authRouter = new Router();
const authController = new AuthController();

authRouter.use(authorization);

authRouter.post('/login', authController.login.bind(authController));
authRouter.post('/refresh', authController.refresh.bind(authController));
authRouter.get('/protected', authController.protectedRoute.bind(authController));

export default authRouter;
