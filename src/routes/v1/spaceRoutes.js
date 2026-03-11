import { Router } from "express";

import SpaceController from "../../controllers/v1/spaceController.js";
import authorization from "../../middlewares/authorization.js";
import authentication from "../../middlewares/authentication.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const spaceRouter = new Router();
const space = new SpaceController();

spaceRouter.use(authorization);
spaceRouter.use(authentication);

/**
 * Create Space
 */
spaceRouter.post("/", space.create_space.bind(space));

spaceRouter.post("/course-space", space.create_course_space.bind(space));

/**
 * Get All Space Information by user id
 */
spaceRouter.get("/", space.get_all_space.bind(space));

spaceRouter.patch("/:space_uuid", space.update_space.bind(space));

/**
 * Get All Space Information
 */
spaceRouter.get("/all", space.get_all_space.bind(space));
spaceRouter.get(
  "/:space_uuid/join-requests",
  space.get_join_requests_by_space_id.bind(space),
);

/**
 * Get All Friends Space
 */
spaceRouter.get("/shared", space.get_all_friends_space.bind(space));

/**
 * Get All Prof Spaces
 */
spaceRouter.get("/course-spaces", space.get_all_course_spaces.bind(space));

/**
 * User Join Space
 */
spaceRouter.post("/join", space.joinSpace.bind(space));

spaceRouter.post("/join-by-link", space.join_space_by_link.bind(space));
spaceRouter.post(
  "/add-by-owner",
  space.add_user_in_space_by_reg_email.bind(space),
);

/**
 * ACCEPTING REQUEST TO JOIN IN SPACE //
 */
spaceRouter.patch("/join-direct/accept", space.join_space_directly.bind(space));
spaceRouter.patch(
  "/join-by-link/accept",
  space.accept_user_by_joining_link.bind(space),
);

/**
 * DECLINING REQUEST TO JOIN IN SPACE
 */
spaceRouter.patch(
  "/join-direct/decline",
  space.decline_space_invitation.bind(space),
);
spaceRouter.patch("/join-by-link/decline", space.decline_request.bind(space));

spaceRouter.get(
  "/:space_uuid/join-by-link",
  space.get_join_space_by_link.bind(space),
);

spaceRouter.get(
  "/pending-request/all",
  space.get_all_join_space_by_link.bind(space),
);
spaceRouter.get(
  "/pending-invitation/all",
  space.get_all_space_invitations.bind(space),
);

/**
 * Owner Request Process
 */
spaceRouter.patch(
  "/:space_uuid/accept/:user_id",
  space.process_join_request_by_user_id.bind(space),
);
spaceRouter.patch(
  "/:space_uuid/decline/:user_id",
  space.decline_request.bind(space),
);
// spaceRouter.get('/:space_id', space.get_space_by_id.bind(space));

spaceRouter.delete("/:space_uuid/leave", space.leave_space.bind(space));
spaceRouter.delete("/:space_uuid", space.delete_space.bind(space));

/**
 * Remove User From Space
 */
spaceRouter.delete(
  "/:space_id/:user_id",
  space.remove_user_from_space.bind(space),
);

spaceRouter.get(
  "/remarks/:space_uuid/:user_id",
  space.get_user_remarks_by_space_uuid.bind(space),
);
spaceRouter.get(
  "/remarks/:space_uuid",
  space.get_remarks_by_space_uuid.bind(space),
);
spaceRouter.post("/remarks", space.add_remarks.bind(space));

spaceRouter.patch("/:space_uuid/archive", space.set_archiving.bind(space));
spaceRouter.get("/archived", space.get_all_course_space_archived.bind(space));
export default spaceRouter;
