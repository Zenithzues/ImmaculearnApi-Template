import { mysqlConnection } from "../../config/mysqlConnection.js";
import { Logger } from "../../utils/Logger.js";

class Post {
  constructor() {
    this.db = mysqlConnection;
    this.logger = new Logger("PostModel");
  }

  async createPost(account_id, space_id, post_content) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      const postQuery = `INSERT INTO post(account_id, space_id, post_content, created_at) VALUES(?, ?, ?, NOW())`;

      const result = await conn.execute(postQuery, [
        account_id,
        space_id,
        post_content,
      ]);

      await conn.commit();

      return result;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Error Creating Post", { account_id, space_id, err });
      throw err;
    } finally {
      conn.release();
    }
  }

  async createComment(account_id, space_id, post_content, parent_id) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      const postQuery = `INSERT INTO post(account_id, space_id, post_content, parent_id, created_at) VALUES(?, ?, ?, ?, NOW())`;

      const result = await conn.execute(postQuery, [
        account_id,
        space_id,
        post_content,
        parent_id,
      ]);

      await conn.commit();

      return result;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Error Creating Comment", {
        account_id,
        space_id,
        err,
      });
      throw err;
    } finally {
      conn.release();
    }
  }

  async getAllPostBySpaceId(space_id) {
    try {
      const result = await this.db.execute(
        `
           SELECT 
                p.post_id, 
                p.account_id, 
                p.post_content, 
                COUNT(c.post_id) AS reply_count,
                p.created_at,
                CASE 
                    WHEN st.account_id IS NOT NULL THEN 
                        CONCAT(st.student_fn, ' ', st.student_ln)
                    WHEN pr.account_id IS NOT NULL THEN 
                        CONCAT(pr.prof_fn, ' ', pr.prof_ln)
                    ELSE NULL
                END AS user_full_name,
                CASE 
                    WHEN st.account_id IS NOT NULL THEN st.student_fn
                    WHEN pr.account_id IS NOT NULL THEN pr.prof_fn
                    ELSE NULL
                END AS first_name,
                CASE 
                    WHEN st.account_id IS NOT NULL THEN st.student_ln
                    WHEN pr.account_id IS NOT NULL THEN pr.prof_ln
                    ELSE NULL
                END AS last_name,
                acc.profile_pic
            FROM post p
            LEFT JOIN post c ON c.parent_id = p.post_id
            LEFT JOIN accounts acc ON acc.account_id = p.account_id
            LEFT JOIN students st ON st.account_id = p.account_id
            LEFT JOIN professors pr ON pr.account_id = p.account_id
            WHERE p.space_id = ? AND p.parent_id = 0
            GROUP BY 
                p.post_id, 
                p.account_id, 
                p.post_content, 
                p.created_at,
                user_full_name,
                first_name,
                last_name,
                acc.profile_pic
            ORDER BY p.created_at DESC;

            `,
        [space_id],
      );

      return result;
    } catch (err) {
      this.logger.error("Error Getting Post", { space_id, err });
      throw err;
    }
  }

  async getAllCommentByPostId(parent_id) {
    this.logger.debug(typeof space_id);
    try {
      const result = await this.db.execute(
        `
           SELECT 
                p.post_id, 
                p.account_id, 
                p.post_content, 
                COUNT(c.post_id) AS reply_count,
                p.created_at,
                CASE 
                    WHEN st.account_id IS NOT NULL THEN 
                        CONCAT(st.student_fn, ' ', st.student_ln)
                    WHEN pr.account_id IS NOT NULL THEN 
                        CONCAT(pr.prof_fn, ' ', pr.prof_ln)
                    ELSE NULL
                END AS user_full_name,
                CASE 
                    WHEN st.account_id IS NOT NULL THEN st.student_fn
                    WHEN pr.account_id IS NOT NULL THEN pr.prof_fn
                    ELSE NULL
                END AS student_fn,
                CASE 
                    WHEN st.account_id IS NOT NULL THEN st.student_ln
                    WHEN pr.account_id IS NOT NULL THEN pr.prof_ln
                    ELSE NULL
                END AS ln,
                acc.profile_pic
            FROM post p
            LEFT JOIN post c ON c.parent_id = p.post_id
            LEFT JOIN accounts acc ON acc.account_id = p.account_id
            LEFT JOIN students st ON st.account_id = p.account_id
            LEFT JOIN professors pr ON pr.account_id = p.account_id
            WHERE p.parent_id = ?
            GROUP BY 
                p.post_id, 
                p.account_id, 
                p.post_content, 
                p.created_at,
                user_full_name,
                student_fn,
                ln,
                acc.profile_pic
            ORDER BY p.created_at ASC;

            `,
        [parent_id],
      );

      return result;
    } catch (err) {
      this.logger.error("Error Getting Post", { space_id, err });
      throw err;
    }
  }
}

export default Post;
