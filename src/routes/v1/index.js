import { Router } from "express";

import homeRouter from "./homeRoutes.js";
import accountRouter from "./accountRoutes.js";
import fileRouter from "./fileRoutes.js";
import authRouter from "./authRoutes.js";
import uploadRouter from "./upload.route.js";
import chatRouter from "./chatRoutes.js";
import spaceRouter from "./spaceRoutes.js";
import taskRouter from "./taskRoutes.js";
import regemailRouter from "./registerstudentemailRoutes.js";
import regprofemailRouter from "./registerprofemailRoutes.js";
import postRouter from "./postRoutes.js";
import adminRouter from "./adminRoutes.js";
import announceRouter from "./announceRoutes.js";
import academicRouter from "./academicRoutes.js";

const v1 = new Router();

v1.use("/admin", adminRouter);
v1.use("/academic", academicRouter);
v1.use("/account", accountRouter);
v1.use("/auth", authRouter);
v1.use("/files", fileRouter);
v1.use("/api", uploadRouter);
v1.use("/chat", chatRouter);
v1.use("/spaces", spaceRouter);
v1.use("/tasks", taskRouter);
v1.use("/post", postRouter);
v1.use("/", homeRouter);

v1.use("/register_student", regemailRouter);
v1.use("/register_prof", regprofemailRouter);
v1.use("/announce", announceRouter);

export default v1;
