import { mysqlConnection } from "../../config/mysqlConnection.js";
import { Logger } from "../../utils/Logger.js";
import User from "./UserModel.js";

class Space {
  constructor() {
    this.user = new User();
    this.db = mysqlConnection;
    this.logger = new Logger("SpaceModel");
  }

  async getBySpaceUuid(space_uuid) {
    try {
      const space = await this.db.execute(
        `
            SELECT space_id, space_name, created_by FROM spaces
            WHERE space_uuid = ?
            `,
        [space_uuid],
      );

      return space;
    } catch (err) {
      this.logger.error("Error getting Space ID", { space_uuid, err });
      throw err;
    }
  }

  async getBySpaceId(space_id) {
    try {
      const [result] = await this.db.execute(
        `
            SELECT space_uuid, space_name, description, created_by
            FROM spaces
            WHERE space_id = ?
            LIMIT 1
            `,
        [space_id],
      );

      return result || [];
    } catch (err) {
      // await this.db.rollback();
      this.logger.error("Failed to get Space", { space_id });
      throw err;
    }
  }

  async createSpace(account_id, space_name, space_description, space_settings) {
    try {
      const query = `INSERT INTO spaces (space_uuid, space_name, description, settings, created_by, created_at) VALUES (UUID(), ?, ?, ?, ?, NOW())`;
      const result = await this.db.execute(query, [
        space_name,
        space_description,
        space_settings,
        account_id,
      ]);

      const row = await this.db.execute(
        `SELECT space_uuid
            FROM spaces 
            WHERE space_id = ?
            `,
        [result.insertId],
      );
      //   this.logger.info('Created Space', { space_name, space_description, account_id });

      return {
        success: true,
        space_uuid: row[0].space_uuid,
        insertId: result.insertId,
      };
    } catch (error) {
      this.logger.error("Error creating Space", {
        space_name,
        space_description,
        error,
      });
      throw error;
    }
  }
  async createCourseSpace(
    account_id,
    space_name,
    space_description,
    space_settings,
  ) {
    try {
      const query = `INSERT INTO spaces (space_uuid, space_name, description, settings, space_type, created_by, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, NOW())`;
      const result = await this.db.execute(query, [
        space_name,
        space_description,
        space_settings,
        "course",
        account_id,
      ]);

      const row = await this.db.execute(
        `SELECT space_uuid
            FROM spaces 
            WHERE space_id = ?
            `,
        [result.insertId],
      );
      //   this.logger.info('Created Space', { space_name, space_description, account_id });

      return {
        success: true,
        space_uuid: row[0].space_uuid,
        insertId: result.insertId,
      };
    } catch (error) {
      this.logger.error("Error creating course Space", {
        space_name,
        space_description,
        error,
      });
      throw error;
    }
  }

  async joinSpaceByLink(account_id, space_id) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // 1️⃣ Check if already a member
      const [existingMember] = await connection.execute(
        `SELECT 1 FROM space_members WHERE space_id = ? AND account_id = ?`,
        [space_id, account_id],
      );

      if (existingMember.length) {
        throw new Error("You are already a member of this space");
      }

      // 2️⃣ Check if an invitation already exists
      const [existingInvite] = await connection.execute(
        `SELECT invitation_id FROM space_invitations
       WHERE space_id = ? 
         AND invited_account_id = ? 
         AND join_type = 'link_request'`,
        [space_id, account_id],
      );

      if (existingInvite.length) {
        // 3️⃣ Update existing invitation to pending
        await connection.execute(
          `UPDATE space_invitations
         SET invitation_status = 'pending', invited_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)
         WHERE invitation_id = ?`,
          [existingInvite[0].invitation_id],
        );
      } else {
        // 4️⃣ Create a new invitation
        await connection.execute(
          `INSERT INTO space_invitations
         (space_id, invited_account_id, invited_by_account_id, join_type, invitation_status, invited_at, expires_at)
         VALUES (?, ?, NULL, 'link_request', 'pending', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))`,
          [space_id, account_id],
        );
      }

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error joining space by link", {
        account_id,
        space_id,
        err,
      });
      throw err;
    } finally {
      connection.release();
    }
  }

  async getPendingLinkRequests(space_id) {
    const connection = await this.db.getConnection();

    try {
      const query = `
      SELECT
          si.invitation_id,
          si.invited_account_id AS account_id,
          si.invited_by_account_id AS owner_id,
          si.invited_at,
          si.expires_at,
          a.profile_pic,
          a.email,
          CONCAT(st.student_fn, ' ', st.student_ln) AS fullname
      FROM space_invitations si
      LEFT JOIN accounts a
          ON si.invited_account_id = a.account_id
      LEFT JOIN students st
          ON si.invited_account_id = st.account_id
      WHERE si.space_id = ?
        AND si.join_type = 'link_request'
        AND si.invitation_status = 'pending'
    `;

      const [rows] = await connection.execute(query, [space_id]);

      return rows; // array of pending invitations with student info
    } catch (err) {
      this.logger.error(
        "Error fetching pending link requests with student info",
        { space_id, err },
      );
      throw err;
    } finally {
      connection.release();
    }
  }

  async approveLinkJoinRequest(space_id, invited_account_id) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // Find pending link request
      const invites = await connection.execute(
        `
      SELECT * FROM space_invitations
      WHERE space_id = ?
        AND invited_account_id = ?
        AND join_type = 'link_request'
        AND invitation_status = 'pending'
      LIMIT 1
      `,
        [space_id, invited_account_id],
      );

      if (!invites[0].length) {
        throw new Error("No pending join request found");
      }

      const invitation = invites[0][0];

      // Update invitation
      await connection.execute(
        `
      UPDATE space_invitations
      SET invitation_status = 'accepted',
          accepted_at = NOW(),
          owner_approved_at = NOW()
      WHERE invitation_id = ?
      `,
        [invitation.invitation_id],
      );

      // Insert into space_members
      await connection.execute(
        `
      INSERT INTO space_members (space_id, account_id, status)
      VALUES (?, ?, 'accepted')
      ON DUPLICATE KEY UPDATE status = 'accepted'
      `,
        [space_id, invited_account_id],
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error approving link request", {
        space_id,
        invited_account_id,
        err,
      });
      throw err;
    } finally {
      connection.release();
    }
  }

  async inviteUserByEmail(owner_id, space_id, email) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // Check if already a member
      const members = await connection.execute(
        `
      SELECT sm.*, a.account_id 
      FROM space_members sm
      LEFT JOIN accounts a
        ON a.account_id = sm.account_id
      WHERE space_id = ? AND a.email = ?
        
      `,
        [space_id, email],
      );

      if (members[0].length) {
        throw new Error("User is already a member of this space");
      }

      // Check if invitation already exists
      const existingInvite = await connection.execute(
        `
      SELECT * FROM space_invitations
      WHERE space_id = ?
        AND invited_email = ?
        AND invitation_status = 'pending'
      `,
        [space_id, email],
      );

      if (existingInvite[0].length) {
        throw new Error("Pending invitation already exists for this email");
      }

      // Insert invitation
      await connection.execute(
        `
      INSERT INTO space_invitations
      (
        space_id,
        invited_email,
        invited_by_account_id,
        join_type,
        invitation_status,
        invited_at,
        expires_at
      )
      VALUES (?, ?, ?, 'direct', 'pending', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))
      `,
        [space_id, email, owner_id],
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error inviting user by email", {
        owner_id,
        space_id,
        email,
        err,
      });
      throw err;
    } finally {
      connection.release();
    }
  }

  async joinSpace(account_id, space_id) {
    try {
      // const space_id = await this.getSpaceId(space_uuid);

      const row = await this.db.execute(
        `
            INSERT INTO space_members (space_id, account_id, status)
            VALUES (?, ?, 'pending')
            ON DUPLICATE KEY UPDATE 
            status = IF(status = 'accepted', status, 'pending')
        `,
        [space_id, account_id],
      );

      return row;
    } catch (err) {
      this.logger.error("Error Joining Space", { account_id, space_id, err });
      throw err;
    }
  }

  async joinSpaceDirectly(account_id, space_id) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // Get user email
      const accounts = await connection.execute(
        `SELECT email FROM accounts WHERE account_id = ?`,
        [account_id],
      );

      if (!accounts[0].length) {
        throw new Error("Account not found");
      }

      const email = accounts[0][0].email;

      console.log(email);

      // Find valid DIRECT invitation
      const invites = await connection.execute(
        `
      SELECT *
      FROM space_invitations
      WHERE space_id = ?
        AND join_type = 'direct'
        AND invitation_status = 'pending'
        AND expires_at > NOW()
        AND (
              invited_account_id = ?
              OR invited_email = ?
            )
      LIMIT 1
      `,
        [space_id, account_id, email],
      );

      if (!invites[0].length) {
        throw new Error("No valid direct invitation found");
      }

      const invitation = invites[0][0];

      // Insert into space_members as accepted
      await connection.execute(
        `
      INSERT INTO space_members (space_id, account_id, status)
      VALUES (?, ?, 'accepted')
      ON DUPLICATE KEY UPDATE status = 'accepted'
      `,
        [space_id, account_id],
      );

      // Update invitation
      await connection.execute(
        `
      UPDATE space_invitations
      SET invitation_status = 'accepted',
          accepted_at = NOW(),
          owner_approved_at = NOW()
      WHERE invitation_id = ?
      `,
        [invitation.invitation_id],
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error joining space directly", {
        account_id,
        space_id,
        err,
      });
      throw err;
    } finally {
      connection.release();
    }
  }

  async getAllFriendSpaces(account_id) {
    try {
      const rows = await this.db.execute(
        `
            SELECT 
                sp.space_id,
                sp.space_uuid,
                sp.space_name,
                sp.description,
                sp.created_by AS creator,
                CONCAT('[', GROUP_CONCAT(
                    CONCAT(
                        '{"account_id":', acc.account_id,
                        ',"email":"', IFNULL(acc.email,''),
                        '","profile_pic":"', IFNULL(acc.profile_pic,''),
                        '","full_name":"', IFNULL(COALESCE(CONCAT(st.student_fn,' ',st.student_ln), CONCAT(pr.prof_fn,' ',pr.prof_ln)),''),
                        '","birth_date":"', IFNULL(COALESCE(st.student_bd, pr.prof_bd),''),
                        '","gender":"', IFNULL(COALESCE(st.student_gender, pr.prof_gender),''),
                        '","course":"', IFNULL(st.student_course,''),
                        '","year_level":"', IFNULL(st.student_yr_lvl,''),
                        '","department":"', IFNULL(pr.prof_department,''),
                        '","role":"', CASE 
                            WHEN acc.account_id = sp.created_by THEN 'creator'
                            WHEN st.account_id IS NOT NULL THEN 'student'
                            ELSE 'professor'
                        END,
                        '"}'
                    )
                ), ']') AS members
            FROM spaces sp
            LEFT JOIN space_members spm
                ON sp.space_id = spm.space_id AND spm.status = 'accepted' 
            LEFT JOIN accounts acc
                ON acc.account_id = spm.account_id OR acc.account_id = sp.created_by
            LEFT JOIN students st
                ON acc.account_id = st.account_id
            LEFT JOIN professors pr
                ON acc.account_id = pr.account_id
            WHERE sp.space_type = 'normal' AND sp.created_by = ? OR EXISTS (
                SELECT 1 FROM space_members sm 
                WHERE sm.space_id = sp.space_id AND sm.account_id = ?
            )
            GROUP BY sp.space_uuid, sp.space_name, sp.description, sp.created_by;
            `,
        [account_id, account_id],
      );

      // Parse JSON members
      rows.forEach((space) => {
        try {
          space.members = JSON.parse(space.members || "[]");
        } catch (e) {
          space.members = [];
        }
      });

      return rows;
    } catch (err) {
      this.logger.error("Error Getting All Friend Spaces", { account_id, err });
      throw err;
    }
  }

  async getAllCourseSpaces(account_id) {
    try {
      const rows = await this.db.execute(
        `
        SELECT 
            sp.space_id,
            sp.space_uuid,
            sp.space_name,
            sp.description,
            sp.space_type,
            sp.created_by,

            CONCAT('[', 
                GROUP_CONCAT(
                    CONCAT(
                        '{"account_id":', acc.account_id,
                        ',"email":"', IFNULL(acc.email, ''),
                        '","profile_pic":"', IFNULL(acc.profile_pic, ''),
                        '","full_name":"', IFNULL(
                            COALESCE(
                                CONCAT(st.student_fn, ' ', st.student_ln),
                                CONCAT(pr.prof_fn, ' ', pr.prof_ln)
                            ), ''
                        ),
                        '","birth_date":"', IFNULL(COALESCE(st.student_bd, pr.prof_bd), ''),
                        '","gender":"', IFNULL(COALESCE(st.student_gender, pr.prof_gender), ''),
                        '","course":"', IFNULL(st.student_course, ''),
                        '","year_level":"', IFNULL(st.student_yr_lvl, ''),
                        '","department":"', IFNULL(pr.prof_department, ''),
                        '","role":"', CASE 
                            WHEN acc.account_id = sp.created_by THEN 'creator'
                            WHEN st.account_id IS NOT NULL THEN 'student'
                            ELSE 'professor'
                        END,
                        '"}'
                    )
                    SEPARATOR ','
                ), 
            ']') AS members

        FROM spaces sp

        LEFT JOIN space_members spm
            ON sp.space_id = spm.space_id 
            AND spm.status = 'accepted'

        LEFT JOIN accounts acc
            ON acc.account_id = spm.account_id 
            OR acc.account_id = sp.created_by   -- ensures creator is included

        LEFT JOIN students st
            ON acc.account_id = st.account_id

        LEFT JOIN professors pr
            ON acc.account_id = pr.account_id

        WHERE sp.space_type = 'course'
          AND EXISTS (
              SELECT 1 
              FROM professors p 
              WHERE p.account_id = sp.created_by
          )

          -- Critical condition: no other professors in the space (except the creator)
          AND NOT EXISTS (
              SELECT 1
              FROM space_members sm
              INNER JOIN professors p2 
                  ON sm.account_id = p2.account_id
              WHERE sm.space_id = sp.space_id
                AND sm.status = 'accepted'
                AND sm.account_id != sp.created_by
          )

          AND (
                sp.created_by = ?
                OR EXISTS (
                    SELECT 1
                    FROM space_members sm2
                    WHERE sm2.space_id = sp.space_id
                    AND sm2.account_id = ?
                    AND sm2.status = 'accepted'
                )
            )


        GROUP BY 
            sp.space_id,
            sp.space_uuid,
            sp.space_name,
            sp.description,
            sp.created_by

        ORDER BY sp.created_at DESC;   -- optional: most recent first
        `,
        [account_id, account_id],
      );

      // Safely parse the members JSON string into actual array
      rows.forEach((space) => {
        try {
          // Replace any invalid/empty GROUP_CONCAT result
          const membersStr = space.members || "[]";
          space.members = JSON.parse(membersStr);
        } catch (e) {
          space.members = [];
          this.logger.warn("Failed to parse members JSON", {
            space_id: space.space_id,
            raw: space.members,
            error: e.message,
          });
        }
      });

      return rows;
    } catch (err) {
      this.logger.error("Error Getting All Course Spaces (students-only)", {
        account_id,
        err: err.message || err,
      });
      throw err;
    }
  }

  async getAllSpace(account_id) {
    try {
      const rows = await this.db.execute(
        `
            SELECT 
                sp.space_id,
                sp.space_uuid,
                sp.space_name,
                sp.description,
                sp.created_by,
                CONCAT('[', GROUP_CONCAT(
                    CONCAT(
                        '{"account_id":', acc.account_id,
                        ',"email":"', IFNULL(acc.email,''),
                        '","profile_pic":"', IFNULL(acc.profile_pic,''),
                        '","full_name":"', IFNULL(COALESCE(CONCAT(st.student_fn,' ',st.student_ln), CONCAT(pr.prof_fn,' ',pr.prof_ln)),''),
                        '","birth_date":"', IFNULL(COALESCE(st.student_bd, pr.prof_bd),''),
                        '","gender":"', IFNULL(COALESCE(st.student_gender, pr.prof_gender),''),
                        '","course":"', IFNULL(st.student_course,''),
                        '","year_level":"', IFNULL(st.student_yr_lvl,''),
                        '","department":"', IFNULL(pr.prof_department,''),
                        '","role":"', CASE WHEN st.account_id IS NOT NULL THEN 'student' ELSE 'professor' END,
                        '"}'
                    )
                ), ']') AS members
            FROM spaces sp
            LEFT JOIN space_members spm 
                ON sp.space_id = spm.space_id
                AND spm.status = 'accepted'
            LEFT JOIN accounts acc
                ON spm.account_id = acc.account_id
            LEFT JOIN students st
                ON acc.account_id = st.account_id
            LEFT JOIN professors pr
                ON acc.account_id = pr.account_id
            WHERE sp.space_type = 'normal' AND sp.created_by = ?
            GROUP BY sp.space_uuid, sp.space_name, sp.description, sp.created_by;
            `,
        [account_id],
      );

      // Parse members JSON safely
      rows.forEach((space) => {
        try {
          space.members = JSON.parse(space.members || "[]");
        } catch (e) {
          space.members = [];
        }
      });

      return rows;
    } catch (err) {
      this.logger.error("Error getting All Space", { account_id, err });
      throw err;
    }
  }

  async getJoinRequestsBySpaceId(account_id, space_uuid) {
    try {
      console.log(account_id, space_uuid);
      const rows = await this.db.execute(
        `
            SELECT
                a.account_id,
                a.profile_pic,
                a.email,
                CONCAT(st.student_fn, st.student_ln) as fullname,
                spm.added_at
            FROM spaces sp
            INNER JOIN space_members spm
                ON sp.space_id = spm.space_id
                AND spm.status = 'pending'
            LEFT JOIN accounts a
                ON spm.account_id = a.account_id
            LEFT JOIN students st
                ON spm.account_id = st.account_id
            WHERE sp.created_by = ? 
                AND sp.space_uuid = ?;
            `,
        [account_id, space_uuid],
      );

      console.log(rows);

      return rows;
    } catch (err) {
      this.logger.error("Error getting All Space", { account_id });
      throw err;
    }
  }

  async processJoinRequest(account_id, user_id, space_uuid, status) {
    try {
      await this.db.getConnection();
      let query;

      const space = await this.db.execute(
        `
            SELECT space_id FROM spaces
            WHERE space_uuid = ? AND created_by = ?;
            `,
        [space_uuid, account_id],
      );

      if (status === "accepted") {
        query = `
            UPDATE space_members
            SET status = ?, added_at = NOW()
            WHERE space_id = ? AND account_id = ?
            `;
      } else {
        if (status === "declined") {
          query = `
                UPDATE space_members
                SET status = ?, added_at = NOW()
                WHERE space_id = ? AND account_id = ?
                `;
        }
      }
      const row = await this.db.execute(query, [
        status,
        space[0].space_id,
        user_id,
      ]);

      return {
        row,
        space_id: space[0].space_id,
        message:
          status === "accepted"
            ? "Accepted Request Successfully"
            : "Declined Request Successfully",
      };
    } catch (err) {
      this.logger.error("Error Processing Request to Join", { account_id });
      throw err;
    }
  }

  async deleteSpace(space_uuid) {
    try {
      // Delete members
      await this.db.execute(
        "DELETE FROM space_members WHERE space_id = (SELECT space_id FROM spaces WHERE space_uuid = ?)",
        [space_uuid],
      );

      // Delete tasks (optional)
      // await this.db.execute(
      // "DELETE FROM tasks WHERE space_id = (SELECT space_id FROM spaces WHERE space_uuid = ?)",
      // [space_uuid]
      // );

      // Delete the space itself
      await this.db.execute("DELETE FROM spaces WHERE space_uuid = ?", [
        space_uuid,
      ]);

      return true;
    } catch (err) {
      console.error("Error deleting space:", err);
      throw err;
    }
  }

  async removeUserFromSpace(user_id, space_id) {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();
      // Delete members
      const result = await conn.execute(
        "DELETE FROM space_members WHERE account_id = ? and space_id = ?",
        [user_id, space_id],
      );

      // Delete the space itself
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Student onboarding failed", { user_id, error: err });
      throw err;
    } finally {
      conn.release();
    }
  }
}

export default Space;
