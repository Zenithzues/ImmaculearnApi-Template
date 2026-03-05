import { Router } from "express";

// import AccountController from "../../controllers/v1/accountController.js";
import authorization from "../../middlewares/authorization.js";
// import authentication from "../../middlewares/authentication.js";
import AdminController from "../../controllers/v1/adminController.js";
import adminAuth from "../../middlewares/adminAuth.js";

const adminRouter = new Router();
const admin = new AdminController();

// Public routes (no authorization required)
adminRouter.post("/login", admin.login.bind(admin));

// Apply JWT authentication to protected routes
adminRouter.get("/refresh", admin.refresh.bind(admin));
adminRouter.get("/profile", admin.profile.bind(admin));
adminRouter.post("/logout", admin.logout.bind(admin));

// Apply authorization to admin management routes
adminRouter.use(authorization);

adminRouter.post("/create", admin.create.bind(admin));

// adminRouter.use(adminAuth);
adminRouter.get("/academic/all", admin.get_all_academic.bind(admin));
adminRouter.post("/academic", admin.create_academic.bind(admin));
adminRouter.patch("/academic/update", admin.update_academic.bind(admin));

export default adminRouter;
