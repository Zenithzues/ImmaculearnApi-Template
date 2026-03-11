import { Router } from "express";

import PostController from "../../controllers/v1/postController.js";
import authorization from "../../middlewares/authorization.js";
import authentication from "../../middlewares/authentication.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const postRouter = new Router();
const post = new PostController();

postRouter.use(authorization);
postRouter.use(authentication);

postRouter.post("/", post.create_post.bind(post));

// postRouter.get('/', post.get_all_post_by_space_id.bind(post))
postRouter.get("/:space_uuid", post.get_all_post_by_space_uuid.bind(post));

postRouter.post("/comment", post.create_comment.bind(post));
postRouter.get("/comment/:post_id", post.get_all_comment_by_post_id.bind(post));
postRouter.delete("/:post_id", post.delete_post.bind(post));


export default postRouter;
