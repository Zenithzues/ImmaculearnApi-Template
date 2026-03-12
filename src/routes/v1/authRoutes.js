// import express from 'express';
import { Router } from "express";
import { AuthController } from "../../controllers/v1/authController.js";
import authorization from "../../middlewares/authorization.js";
import authentication from "../../middlewares/authentication.js";

const authRouter = new Router();
const authController = new AuthController();

authRouter.use(authorization);

authRouter.get("/profile", authController.profile.bind(authController));

authRouter.post("/login", authController.login.bind(authController));
authRouter.post("/logout", authController.logout.bind(authController));
authRouter.get("/refresh", authController.refresh.bind(authController));
authRouter.get(
  "/protected",
  authController.protectedRoute.bind(authController),
);

export default authRouter;
