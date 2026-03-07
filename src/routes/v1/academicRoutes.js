import { Router } from "express";

import authorization from "../../middlewares/authorization.js";
import authentication from "../../middlewares/authentication.js";
import AcademicController from "../../controllers/v1/academicController.js";

const academicRouter = new Router();
const academic = new AcademicController();

academicRouter.use(authorization);

academicRouter.get("/latest", academic.get_latest_academic.bind(academic));
academicRouter.get("/active", academic.get_active_academic.bind(academic));
academicRouter.patch("/update", academic.update_academic.bind(academic));
academicRouter.post("/", academic.update_academic.bind(academic));
academicRouter.get("/", academic.get_all_academic.bind(academic));

export default academicRouter;
