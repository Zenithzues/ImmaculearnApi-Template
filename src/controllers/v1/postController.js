// import User from '../../models/user.js';
// import Space from '../../models/MySQL/SpaceModel.js';
// import Space from '../../models/MySQL/SpaceModel.js';
import Post from "../../models/MySQL/PostModel.js";
import { Logger } from "../../utils/Logger.js";

class PostController {
  constructor() {
    this.post = new Post();
    this.logger = new Logger("PostController");
  }

  async create_post(req, res) {
    try {
      const account_id = res.locals.account_id || 1;
      const { space_id, post_content } = req.body || {};

      console.log(space_id, post_content);

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      if (!post_content || !space_id)
        return res.json({
          success: false,
          message: "Invalid Request, Try Again!",
        });

      const result = await this.post.createPost(
        account_id,
        space_id,
        post_content,
      );

      return res.json({
        success: true,
        message: `Successfully Posted with ID ${result[0].insertId}`,
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async create_comment(req, res) {
    try {
      const account_id = res.locals.account_id || 1;
      const { space_id, post_content, post_id } = req.body || {};

      console.log(space_id, post_content, post_id);

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      if (!post_content || !post_id || !space_id)
        return res.json({
          success: false,
          message: "Invalid Request, Try Again!",
        });

      const result = await this.post.createComment(
        account_id,
        space_id,
        post_content,
        post_id,
      );

      return res.json({
        success: true,
        message: `Successfully Posted a Comment with ID ${result[0].insertId}`,
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async get_all_post_by_space_id(req, res) {
    try {
      const account_id = res.locals.account_id || 1;
      const space_id = req.params.space_id || 0;

      console.log(space_id);

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      if (!space_id)
        return res.json({
          success: false,
          message: "Invalid Request, Try Again!",
        });

      const result = await this.post.getAllPostBySpaceId(space_id);

      return res.json({ success: true, data: result });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async get_all_comment_by_post_id(req, res) {
    try {
      const account_id = res.locals.account_id || 1;
      const post_id = req.params.post_id || 0;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      if (!post_id)
        return res.json({
          success: false,
          message: "Invalid Request, Try Again!",
        });

      const result = await this.post.getAllCommentByPostId(post_id);

      return res.json({ success: true, data: result });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }
}

export default PostController;
