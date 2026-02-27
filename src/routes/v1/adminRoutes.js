import { Router } from "express";

// import AccountController from "../../controllers/v1/accountController.js";
import authorization from "../../middlewares/authorization.js";
// import authentication from "../../middlewares/authentication.js";
import AdminController from "../../controllers/v1/adminController.js";
import adminAuth from "../../middlewares/adminAuth.js";

const adminRouter = new Router();
const admin = new AdminController();

// Ensure that all endpoints implements authorization
adminRouter.use(authorization);

adminRouter.post("/login", admin.login.bind(admin));
adminRouter.post("/create", admin.create.bind(admin));
adminRouter.get("/refresh", admin.refresh.bind(admin));
// adminRouter.post("/", admin.create.bind(admin));
// adminRouter.get("/", authentication, admin.profile.bind(admin));
// adminRouter.get("/oauth/redirect", authentication, admin.profile.bind(admin));

// adminRouter.use(adminAuth);
adminRouter.get("/academic/all", admin.get_all_academic.bind(admin));
adminRouter.post("/academic/start", admin.create_academic.bind(admin));
adminRouter.patch("/academic/edit", admin.create_academic.bind(admin));
adminRouter.get("/profile", admin.profile.bind(admin));

export default adminRouter;
