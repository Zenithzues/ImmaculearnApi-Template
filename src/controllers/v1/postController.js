// import User from '../../models/user.js';
// import Space from '../../models/MySQL/SpaceModel.js';
// import Space from '../../models/MySQL/SpaceModel.js';
import Post from "../../models/MySQL/PostModel.js";
import Space from "../../models/MySQL/SpaceModel.js";
import { Logger } from "../../utils/Logger.js";

class PostController {
  constructor() {
    this.post = new Post();
    this.space = new Space();
    this.logger = new Logger("PostController");
  }

  async create_post(req, res) {
    try {
      const account_id = res.locals.account_id;

      // console.log(space_id, post_content);

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      const { space_uuid, post_content } = req.body || {};

      if (!post_content || !space_uuid)
        return res.json({
          success: false,
          message: "Invalid Request, Try Again!",
        });

      let space = await this.space.getBySpaceUuid(space_uuid);
      let space_id = null;
      let c_space_id = null;

      // console.log(space);
      if (space.length > 0) {
        space_id = space[0].space_id; // normal space
      } else {
        // 2️⃣ Lookup course space
        space = await this.space.getByCourseSpaceUuid(space_uuid);
        console.log(space);

        if (!space || space.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Space not found",
          });
        }
        c_space_id = space[0].space_id; // course space
      }

      const result = await this.post.createPost(
        account_id,
        space_id,
        c_space_id,
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
      const account_id = res.locals.account_id;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      const { space_uuid, post_content, post_id } = req.body || {};

      if (!post_content || !post_id || !space_uuid)
        return res.json({
          success: false,
          message: "Invalid Request, Try Again!",
        });

      let space = await this.space.getBySpaceUuid(space_uuid);
      let space_id = null;
      let c_space_id = null;

      // console.log(space);
      if (space.length > 0) {
        space_id = space[0].space_id; // normal space
      } else {
        // 2️⃣ Lookup course space
        space = await this.space.getByCourseSpaceUuid(space_uuid);
        console.log(space);

        if (!space || space.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Space not found",
          });
        }
        c_space_id = space[0].space_id; // course space
      }

      const result = await this.post.createComment(
        account_id,
        space_id,
        c_space_id,
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

  async get_all_post_by_space_uuid(req, res) {
    try {
      const account_id = res.locals.account_id;
      const space_uuid = req.params.space_uuid || 0;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      if (!space_uuid)
        return res.json({
          success: false,
          message: "Invalid Request, Try Again!",
        });

      let space = await this.space.getBySpaceUuid(space_uuid);
      let space_id = null;
      let c_space_id = null;

      // console.log(space);
      if (space.length > 0) {
        space_id = space[0].space_id; // normal space
      } else {
        // 2️⃣ Lookup course space
        space = await this.space.getByCourseSpaceUuid(space_uuid);
        console.log(space);

        if (!space || space.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Space not found",
          });
        }
        c_space_id = space[0].space_id; // course space
      }

      const result = await this.post.getAllPostBySpaceId(space_id, c_space_id);

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
      const account_id = res.locals.account_id;
      const post_id = req.params.post_id;

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

  async delete_post(req, res) {
    try {
      const account_id = res.locals.account_id;
      const post_id = req.params.post_id;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      if (!post_id)
        return res.json({
          success: false,
          message: "Invalid Request, Try Again!",
        });

      const result = await this.post.deletePost(post_id);

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
