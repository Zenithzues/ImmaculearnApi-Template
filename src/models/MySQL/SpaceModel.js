import { mysqlConnection } from "../../config/mysqlConnection.js";
import { Logger } from "../../utils/Logger.js";
import User from "./UserModel.js";

class Space {
  constructor() {
    this.user = new User();
    this.db = mysqlConnection;
    this.logger = new Logger("SpaceModel");
  }

  // Helper method to determine space type
  async getSpaceType(space_id) {
    try {
      // Check if it's a course space
      const [courseSpace] = await this.db.execute(
        `SELECT c_space_id as space_id, 'course' as type FROM course_spaces WHERE c_space_id = ? LIMIT 1`,
        [space_id],
      );

      if (courseSpace) {
        return { type: "course", spaceId: space_id };
      }

      // Check if it's a regular space
      const [regularSpace] = await this.db.execute(
        `SELECT space_id, 'regular' as type FROM spaces WHERE space_id = ? LIMIT 1`,
        [space_id],
      );

      if (regularSpace) {
        return { type: "regular", spaceId: space_id };
      }

      return null;
    } catch (err) {
      this.logger.error("Error determining space type", { space_id, err });
      throw err;
    }
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

  async getByCourseSpaceUuid(c_space_uuid) {
    try {
      const courseSpace = await this.db.execute(
        `
        SELECT c_space_id AS space_id, c_space_name AS space_name, created_by FROM course_spaces
        WHERE c_space_uuid = ?
        `,
        [c_space_uuid],
      );

      return courseSpace;
    } catch (err) {
      this.logger.error("Error getting Course Space ID", { c_space_uuid, err });
      throw err;
    }
  }

  async getBySpaceId(space_id, type = null) {
    try {
      let result;

      if (type === "course") {
        [result] = await this.db.execute(
          `
          SELECT c_space_uuid as space_uuid, c_space_name as space_name, description, created_by
          FROM course_spaces
          WHERE c_space_id = ?
          LIMIT 1
          `,
          [space_id],
        );
      } else {
        [result] = await this.db.execute(
          `
          SELECT space_uuid, space_name, description, created_by
          FROM spaces
          WHERE space_id = ?
          LIMIT 1
          `,
          [space_id],
        );
      }

      return result || [];
    } catch (err) {
      this.logger.error("Failed to get Space", { space_id, type });
      throw err;
    }
  }

  async createSpace(
    account_id,
    space_name,
    space_description,
    space_cover,
    space_settings,
  ) {
    try {
      const query = `INSERT INTO spaces (space_uuid, space_name, description, space_cover, settings, created_by, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, NOW())`;
      const result = await this.db.execute(query, [
        space_name,
        space_description,
        space_cover,
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

      return {
        success: true,
        space_uuid: row[0].space_uuid,
        insertId: result.insertId,
        type: "regular",
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
    acad_term_id,
    space_name,
    space_description,
    space_section,
    space_cover,
    space_day,
    space_time_start,
    space_time_end,
    space_yr_lvl,
    space_settings,
  ) {
    try {
      const query = `
      INSERT INTO course_spaces (acad_term_id, c_space_uuid, c_space_name, c_space_description, c_space_section, c_space_cover, c_space_day, c_space_time_start, c_space_time_end, c_space_yr_lvl, c_space_settings, created_by, created_at) 
      VALUES (?, UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      const result = await this.db.execute(query, [
        acad_term_id,
        space_name,
        space_description,
        space_section,
        space_cover,
        space_day,
        space_time_start,
        space_time_end,
        space_yr_lvl,
        space_settings,
        account_id,
      ]);

      const row = await this.db.execute(
        `SELECT c_space_uuid
         FROM course_spaces 
         WHERE c_space_id = ?
        `,
        [result.insertId],
      );

      return {
        success: true,
        space_uuid: row[0].c_space_uuid,
        insertId: result.insertId,
        type: "course",
      };
    } catch (error) {
      this.logger.error("Error creating course Space", {
        space_name,
        error,
      });
      throw error;
    }
  }

  async joinSpaceByLink(account_id, space_id) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // Determine space type
      const spaceType = await this.getSpaceType(space_id);
      if (!spaceType) {
        throw new Error("Space not found");
      }

      const spaceIdField =
        spaceType.type === "course" ? "c_space_id" : "space_id";

      // 1️⃣ Check if already a member
      const [existingMember] = await connection.execute(
        `SELECT 1 FROM space_members WHERE ${spaceIdField} = ? AND account_id = ?`,
        [space_id, account_id],
      );

      if (existingMember.length) {
        throw new Error("You are already a member of this space");
      }

      // 2️⃣ Check if an invitation already exists
      const [existingInvite] = await connection.execute(
        `SELECT invitation_id FROM space_invitations
         WHERE ${spaceIdField} = ? 
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
        // 4️⃣ Create a new invitation with appropriate space_id field
        const insertFields =
          spaceType.type === "course"
            ? `(c_space_id, invited_account_id, invited_by_account_id, join_type, invitation_status, invited_at, expires_at)`
            : `(space_id, invited_account_id, invited_by_account_id, join_type, invitation_status, invited_at, expires_at)`;

        await connection.execute(
          `INSERT INTO space_invitations ${insertFields}
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
    try {
      const spaceType = await this.getSpaceType(space_id);
      if (!spaceType) {
        return [];
      }

      const spaceIdField =
        spaceType.type === "course" ? "si.c_space_id" : "si.space_id";

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
        WHERE ${spaceIdField} = ?
          AND si.join_type = 'link_request'
          AND si.invitation_status = 'pending'
      `;

      const rows = await this.db.execute(query, [space_id]);
      return rows;
    } catch (err) {
      this.logger.error(
        "Error fetching pending link requests with student info",
        {
          space_id,
          err,
        },
      );
      throw err;
    }
  }

  async getPendingCourseLinkRequests(c_space_id) {
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
        WHERE si.c_space_id = ?
          AND si.join_type = 'link_request'
          AND si.invitation_status = 'pending'
      `;

      const rows = await this.db.execute(query, [c_space_id]);
      return rows;
    } catch (err) {
      this.logger.error(
        "Error fetching pending course link requests with student info",
        {
          c_space_id,
          err,
        },
      );
      throw err;
    }
  }

  async getAllPendingLinkRequests(account_id) {
    try {
      const query = `
        SELECT
            si.invitation_id,
            si.invited_account_id AS account_id,
            si.invited_by_account_id AS owner_id,
            COALESCE(si.space_id, si.c_space_id) AS space_id,
            
            sp.space_uuid,
            sp.space_name,
            
            csp.c_space_uuid,
            csp.c_space_name,


            si.invited_at,
            si.expires_at,
            a.profile_pic,
            a.email,
            CONCAT(st.student_fn, ' ', st.student_ln) AS fullname

        FROM space_invitations si

        LEFT JOIN spaces sp
            ON si.space_id = sp.space_id

        LEFT JOIN course_spaces csp
            ON si.c_space_id = csp.c_space_id

        LEFT JOIN accounts a
            ON si.invited_account_id = a.account_id

        LEFT JOIN students st
            ON si.invited_account_id = st.account_id

        WHERE
            (
                sp.created_by = ?
                OR csp.created_by = ?
            )
            AND si.join_type = 'link_request'
            AND si.invitation_status = 'pending'
      `;

      const rows = await this.db.execute(query, [account_id, account_id]);
      return rows;
    } catch (err) {
      this.logger.error(
        "Error fetching all pending link requests with student info",
        {
          account_id,
          err,
        },
      );
      throw err;
    }
  }

  async getDirectInvitationsForAccount(account_id) {
    try {
      // Get the email of the account
      const accountRows = await this.db.execute(
        `SELECT email FROM accounts WHERE account_id = ?`,
        [account_id],
      );

      if (!accountRows.length) return [];

      const account_email = accountRows[0].email;

      // Get all pending direct invitations sent to this email for both space types
      const query = `
        SELECT
            si.invitation_id,
            COALESCE(si.space_id, si.c_space_id) AS space_id,
            sp.space_uuid,
            sp.space_name,
            csp.c_space_uuid,
            csp.c_space_name,
            si.invited_by_account_id AS owner_id,
            si.invited_at,
            si.expires_at,
            a.profile_pic AS owner_profile_pic,
            a.email AS owner_email,
            CASE 
                WHEN st.account_id IS NOT NULL 
                    THEN CONCAT(st.student_fn, ' ', st.student_ln)
                WHEN pr.account_id IS NOT NULL 
                    THEN CONCAT(pr.prof_fn, ' ', pr.prof_ln)
                ELSE NULL
            END AS owner_fullname,
            CASE 
                WHEN si.space_id IS NOT NULL THEN 'regular'
                WHEN si.c_space_id IS NOT NULL THEN 'course'
            END AS space_type
        FROM space_invitations si
        LEFT JOIN spaces sp
            ON si.space_id = sp.space_id
        LEFT JOIN course_spaces csp
            ON si.c_space_id = csp.c_space_id
        LEFT JOIN accounts a
            ON si.invited_by_account_id = a.account_id
        LEFT JOIN students st
            ON si.invited_by_account_id = st.account_id
        LEFT JOIN professors pr
            ON si.invited_by_account_id = pr.account_id
        WHERE si.join_type = 'direct'
          AND si.invitation_status = 'pending'
          AND si.invited_email = ?
        ORDER BY si.invited_at DESC
      `;

      const rows = await this.db.execute(query, [account_email]);
      return rows;
    } catch (err) {
      this.logger.error(
        "Error fetching direct invitations for account notifications",
        {
          account_id,
          err,
        },
      );
      throw err;
    }
  }

  async approveLinkJoinRequest(space_id, invited_account_id) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const spaceType = await this.getSpaceType(space_id);
      if (!spaceType) {
        throw new Error("Space not found");
      }

      const spaceIdField =
        spaceType.type === "course" ? "c_space_id" : "space_id";

      // Find pending link request
      const invites = await connection.execute(
        `
        SELECT * FROM space_invitations
        WHERE ${spaceIdField} = ?
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

      // Insert into space_members with appropriate space_id field
      const memberInsert =
        spaceType.type === "course"
          ? `INSERT INTO space_members (c_space_id, account_id, status) VALUES (?, ?, 'accepted')`
          : `INSERT INTO space_members (space_id, account_id, status) VALUES (?, ?, 'accepted')`;

      await connection.execute(memberInsert, [space_id, invited_account_id]);

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

  async declineJoinRequest(space_id, invited_account_id) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const spaceType = await this.getSpaceType(space_id);
      if (!spaceType) {
        throw new Error("Space not found");
      }

      const spaceIdField =
        spaceType.type === "course" ? "c_space_id" : "space_id";

      // Find pending link request
      const invites = await connection.execute(
        `
        SELECT * FROM space_invitations
        WHERE ${spaceIdField} = ?
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
        SET invitation_status = 'declined'
        WHERE invitation_id = ?
        `,
        [invitation.invitation_id],
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error declining request", {
        space_id,
        invited_account_id,
        err,
      });
      throw err;
    } finally {
      connection.release();
    }
  }

  async declineSpaceInvitation(account_id, space_id) {
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
      const spaceType = await this.getSpaceType(space_id);

      if (!spaceType) {
        throw new Error("Space not found");
      }

      const spaceIdField =
        spaceType.type === "course" ? "c_space_id" : "space_id";

      // Find valid DIRECT invitation
      const invites = await connection.execute(
        `
        SELECT *
        FROM space_invitations
        WHERE ${spaceIdField} = ?
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

      // Update invitation
      await connection.execute(
        `
        UPDATE space_invitations
        SET invitation_status = 'declined'
        WHERE invitation_id = ?
        `,
        [invitation.invitation_id],
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error declining space invitation", {
        account_id,
        space_id,
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

      const spaceType = await this.getSpaceType(space_id);
      if (!spaceType) {
        throw new Error("Space not found");
      }

      const spaceIdField =
        spaceType.type === "course" ? "c_space_id" : "space_id";

      // Check if already a member
      const [members] = await connection.execute(
        `
      SELECT sm.*, a.account_id
      FROM space_members sm
      LEFT JOIN accounts a
        ON a.account_id = sm.account_id
      WHERE sm.${spaceIdField} = ? AND a.email = ?
      `,
        [space_id, email],
      );

      if (members.length) {
        throw new Error("User is already a member of this space");
      }

      // Check existing invitation
      const [invites] = await connection.execute(
        `
      SELECT invitation_id, invitation_status
      FROM space_invitations
      WHERE ${spaceIdField} = ?
        AND invited_email = ?
      LIMIT 1
      `,
        [space_id, email],
      );

      if (invites.length) {
        const invite = invites[0];

        if (invite.invitation_status === "pending") {
          throw new Error("Pending invitation already exists for this email");
        }

        // Update existing invitation (declined / expired → pending again)
        await connection.execute(
          `
        UPDATE space_invitations
        SET invitation_status = 'pending',
            invited_by_account_id = ?,
            invited_at = NOW(),
            expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)
        WHERE invitation_id = ?
        `,
          [owner_id, invite.invitation_id],
        );
      } else {
        // Insert new invitation
        const insertFields =
          spaceType.type === "course"
            ? `(c_space_id, invited_email, invited_by_account_id, join_type, invitation_status, invited_at, expires_at)`
            : `(space_id, invited_email, invited_by_account_id, join_type, invitation_status, invited_at, expires_at)`;

        await connection.execute(
          `
        INSERT INTO space_invitations ${insertFields}
        VALUES (?, ?, ?, 'direct', 'pending', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))
        `,
          [space_id, email, owner_id],
        );
      }

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
      const spaceType = await this.getSpaceType(space_id);
      if (!spaceType) {
        throw new Error("Space not found");
      }

      const spaceIdField =
        spaceType.type === "course" ? "c_space_id" : "space_id";

      const row = await this.db.execute(
        `
        INSERT INTO space_members (${spaceIdField}, account_id, status)
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
      const spaceType = await this.getSpaceType(space_id);

      if (!spaceType) {
        throw new Error("Space not found");
      }

      const spaceIdField =
        spaceType.type === "course" ? "c_space_id" : "space_id";

      // Find valid DIRECT invitation
      const invites = await connection.execute(
        `
        SELECT *
        FROM space_invitations
        WHERE ${spaceIdField} = ?
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

      // Insert into space_members as accepted with appropriate space_id field
      const memberInsert =
        spaceType.type === "course"
          ? `INSERT INTO space_members (c_space_id, account_id, status) VALUES (?, ?, 'accepted')`
          : `INSERT INTO space_members (space_id, account_id, status) VALUES (?, ?, 'accepted')`;

      await connection.execute(memberInsert, [space_id, account_id]);

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

            CONCAT(
              '[',
              GROUP_CONCAT(DISTINCT
                CONCAT(
                  '{',
                    '"account_id":', acc.account_id, ',',
                    '"email":"', IFNULL(acc.email,''), '",',
                    '"profile_pic":"', IFNULL(acc.profile_pic,''), '",',
                    '"full_name":"', IFNULL(
                        COALESCE(
                          CONCAT(st.student_fn,' ',st.student_ln), 
                          CONCAT(pr.prof_fn,' ',pr.prof_ln)
                        ), ''
                    ), '",',
                    '"birth_date":"', IFNULL(COALESCE(st.student_bd, pr.prof_bd), ''), '",',
                    '"gender":"', IFNULL(COALESCE(st.student_gender, pr.prof_gender), ''), '",',
                    '"course":"', IFNULL(st.student_course, ''), '",',
                    '"year_level":"', IFNULL(st.student_yr_lvl, ''), '",',
                    '"department":"', IFNULL(pr.prof_department, ''), '",',
                    '"role":"',
                      CASE 
                        WHEN acc.account_id = sp.created_by THEN 'creator'
                        WHEN st.account_id IS NOT NULL THEN 'student'
                        ELSE 'professor'
                      END,
                    '"',
                  '}'
                )
              ),
              ']'
            ) AS members

        FROM spaces sp

        /* Join accepted members */
        LEFT JOIN space_members spm 
          ON sp.space_id = spm.space_id 
          AND spm.status = 'accepted'

        /* Join accounts (members + creator) */
        LEFT JOIN accounts acc 
          ON acc.account_id = spm.account_id 
          OR acc.account_id = sp.created_by

        LEFT JOIN students st 
          ON acc.account_id = st.account_id

        LEFT JOIN professors pr 
          ON acc.account_id = pr.account_id

        WHERE sp.space_type = 'normal'
          AND (
              sp.created_by = ?
              OR EXISTS (
                  SELECT 1 
                  FROM space_members sm 
                  WHERE sm.space_id = sp.space_id 
                    AND sm.account_id = ?
                    AND sm.status = 'accepted'
              )
          )

        /* Primary key grouping (clean & safe) */
        GROUP BY sp.space_id

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
            csp.c_space_id,
            csp.c_space_uuid,
            csp.c_space_name,
            csp.c_space_description,
            csp.c_space_cover,
            csp.c_space_day,
            csp.c_space_time_start,
            csp.c_space_time_end,
            csp.c_space_yr_lvl,
            csp.c_space_section,
            csp.created_by,
            CONCAT(
              '{"name":"', creator_prof.prof_fn, ' ', creator_prof.prof_ln,
              '","avatar":"', IFNULL(creator_acc.profile_pic, ''), '"}'
            ) AS professor,
            CONCAT('[', 
                GROUP_CONCAT(
                    CONCAT(
                        '{"account_id":', acc.account_id,
                        '","profile_pic":"', IFNULL(acc.profile_pic, ''),
                        '","full_name":"', IFNULL(
                            COALESCE(
                                CONCAT(st.student_fn, ' ', st.student_ln),
                                CONCAT(pr.prof_fn, ' ', pr.prof_ln)
                            ), ''
                        ),
                        '","role":"', CASE 
                            WHEN acc.account_id = csp.created_by THEN 'creator'
                            WHEN st.account_id IS NOT NULL THEN 'student'
                            ELSE 'professor'
                        END,
                        '"}'
                    )
                    SEPARATOR ','
                ), 
            ']') AS members,
            at.acad_term_name,
            at.semester

        FROM course_spaces csp
        LEFT JOIN space_members spm
            ON csp.c_space_id = spm.c_space_id 
            AND spm.status = 'accepted'
        LEFT JOIN accounts acc
            ON acc.account_id = spm.account_id
        LEFT JOIN students st
            ON acc.account_id = st.account_id
        LEFT JOIN professors pr
            ON acc.account_id = pr.account_id
        LEFT JOIN professors creator_prof
            ON creator_prof.account_id = csp.created_by
        LEFT JOIN accounts creator_acc
            ON creator_acc.account_id = csp.created_by
        LEFT JOIN academic_term at
            ON csp.acad_term_id = at.acad_term_id
        WHERE csp.is_archive = 0 AND EXISTS (
              SELECT 1 
              FROM professors p 
              WHERE p.account_id = csp.created_by
          )
          AND NOT EXISTS (
              SELECT 1
              FROM space_members sm
              INNER JOIN professors p2 
                  ON sm.account_id = p2.account_id
              WHERE sm.c_space_id = csp.c_space_id
                AND sm.status = 'accepted'
                AND sm.account_id != csp.created_by
          )
          AND (
                csp.created_by = ?
                OR EXISTS (
                    SELECT 1
                    FROM space_members sm2
                    WHERE sm2.c_space_id = csp.c_space_id
                    AND sm2.account_id = ?
                    AND sm2.status = 'accepted'
                )
            )
        GROUP BY
          csp.c_space_id,
          csp.c_space_uuid,
          csp.c_space_name,
          csp.c_space_description,
          csp.c_space_cover,
          csp.c_space_day,
          csp.c_space_time_start,
          csp.c_space_time_end,
          csp.c_space_yr_lvl,
          csp.created_by,
          at.acad_term_name,
          at.semester,
          creator_prof.prof_fn,
          creator_prof.prof_ln,
          creator_acc.profile_pic
        ORDER BY csp.created_at DESC;
        `,
        [account_id, account_id],
      );

      // Safely parse the members JSON string into actual array
      rows.forEach((space) => {
        try {
          const membersStr = space.members || "[]";
          const profStr = space.professor || "[]";
          space.members = JSON.parse(membersStr);
          space.professor = JSON.parse(profStr);
        } catch (e) {
          space.members = [];
          this.logger.warn("Failed to parse members JSON", {
            space_id: space.c_space_id,
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
            sp.space_cover,
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
        WHERE sp.space_type = 'normal' 
          AND sp.created_by = ?
        GROUP BY sp.space_uuid, sp.space_name, sp.description, sp.space_cover, sp.created_by;
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

      return rows;
    } catch (err) {
      this.logger.error("Error getting join requests", { account_id });
      throw err;
    }
  }

  async processJoinRequest(account_id, user_id, space_uuid, status) {
    try {
      let query;

      const space = await this.db.execute(
        `
        SELECT space_id FROM spaces
        WHERE space_uuid = ? AND created_by = ?;
        `,
        [space_uuid, account_id],
      );

      if (!space[0] || !space[0].length) {
        throw new Error("Space not found or you don't have permission");
      }

      const space_id = space[0][0].space_id;

      query = `
        UPDATE space_members
        SET status = ?, added_at = NOW()
        WHERE space_id = ? AND account_id = ?
      `;

      const row = await this.db.execute(query, [status, space_id, user_id]);

      return {
        row,
        space_id,
        message:
          status === "accepted"
            ? "Accepted Request Successfully"
            : "Declined Request Successfully",
      };
    } catch (err) {
      this.logger.error("Error Processing Request to Join", {
        account_id,
        err,
      });
      throw err;
    }
  }

  async deleteSpace(space_uuid) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // First determine if it's a regular or course space
      const [regularSpace] = await connection.execute(
        "SELECT space_id FROM spaces WHERE space_uuid = ?",
        [space_uuid],
      );

      const [courseSpace] = await connection.execute(
        "SELECT c_space_id FROM course_spaces WHERE c_space_uuid = ?",
        [space_uuid],
      );

      if (regularSpace && regularSpace.length) {
        const space_id = regularSpace[0].space_id;

        // Delete space members
        await connection.execute(
          "DELETE FROM space_members WHERE space_id = ?",
          [space_id],
        );

        // Delete space invitations
        await connection.execute(
          "DELETE FROM space_invitations WHERE space_id = ?",
          [space_id],
        );

        // Delete the space itself
        await connection.execute("DELETE FROM spaces WHERE space_uuid = ?", [
          space_uuid,
        ]);
      } else if (courseSpace && courseSpace.length) {
        const c_space_id = courseSpace[0].c_space_id;

        // Delete space members
        await connection.execute(
          "DELETE FROM space_members WHERE c_space_id = ?",
          [c_space_id],
        );

        // Delete space invitations
        await connection.execute(
          "DELETE FROM space_invitations WHERE c_space_id = ?",
          [c_space_id],
        );

        // Delete the course space itself
        await connection.execute(
          "DELETE FROM course_spaces WHERE c_space_uuid = ?",
          [space_uuid],
        );
      } else {
        throw new Error("Space not found");
      }

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error deleting space:", err);
      throw err;
    } finally {
      connection.release();
    }
  }

  async removeUserFromSpace(user_id, space_id) {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      const spaceType = await this.getSpaceType(space_id);
      if (!spaceType) {
        throw new Error("Space not found");
      }

      const spaceIdField =
        spaceType.type === "course" ? "c_space_id" : "space_id";

      // Delete member from space
      const result = await conn.execute(
        `DELETE FROM space_members WHERE account_id = ? AND ${spaceIdField} = ?`,
        [user_id, space_id],
      );

      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Error removing user from space", {
        user_id,
        space_id,
        error: err,
      });
      throw err;
    } finally {
      conn.release();
    }
  }

  async leaveSpaceByUserId(account_id, space_uuid) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // First determine if it's a regular or course space
      const regularSpace = await connection.execute(
        "SELECT space_id FROM spaces WHERE space_uuid = ?",
        [space_uuid],
      );

      const courseSpace = await connection.execute(
        "SELECT c_space_id FROM course_spaces WHERE c_space_uuid = ?",
        [space_uuid],
      );

      if (regularSpace && regularSpace[0].length) {
        const space_id = regularSpace[0][0].space_id;

        // Delete space members
        await connection.execute(
          "DELETE FROM space_members WHERE account_id = ? AND space_id = ?",
          [account_id, space_id],
        );
      } else if (courseSpace && courseSpace[0].length) {
        const c_space_id = courseSpace[0][0].c_space_id;

        // Delete space members
        await connection.execute(
          "DELETE FROM space_members WHERE account_id = ? AND c_space_id = ?",
          [account_id, c_space_id],
        );
      } else {
        throw new Error("Space not found");
      }

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error deleting space:", err);
      throw err;
    } finally {
      connection.release();
    }
  }

  /****
   * THIS IS FOR PROFESSOR ADDING GRADE
   */
  async addRemarksToStudentById(
    acad_term_id,
    student_id,
    prof_id,
    space_uuid,
    prelim = null,
    midterm = null,
    prefinals = null,
    finals = null,
  ) {
    // Build update data dynamically

    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // Get the course space ID
      const courseSpaceRows = await connection.execute(
        "SELECT c_space_id FROM course_spaces WHERE c_space_uuid = ? AND created_by = ?",
        [space_uuid, prof_id],
      );

      if (courseSpaceRows[0].length === 0) {
        throw new Error("Course space not found.");
      }

      const c_space_id = courseSpaceRows[0][0].c_space_id;

      // Check if remark already exists
      const existingRemark = await connection.execute(
        "SELECT * FROM remarks WHERE c_space_id = ? AND account_id = ?",
        [c_space_id, student_id],
      );

      if (existingRemark[0].length > 0) {
        // Update existing remark

        await connection.execute(
          `UPDATE remarks SET prelim = ?, midterm = ? , prefinals = ? , finals = ? WHERE c_space_id = ? AND account_id = ?`,
          [prelim, midterm, prefinals, finals, c_space_id, student_id],
        );
      } else {
        // Insert new remark
        await connection.execute(
          `INSERT INTO remarks (acad_term_id, c_space_id, prof_id, account_id, prelim, midterm, prefinals, finals, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            acad_term_id,
            c_space_id,
            prof_id,
            student_id,
            prelim,
            midterm,
            prefinals,
            finals,
          ],
        );
      }

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error in remarksAddByStudentId:", err);
      throw err;
    } finally {
      connection.release();
    }
  }

  async getRemarksBySpaceUUID(prof_id, space_uuid) {
    // Build update data dynamically

    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // Get the course space ID
      const courseSpaceRows = await connection.execute(
        "SELECT c_space_id FROM course_spaces WHERE c_space_uuid = ? AND created_by = ?",
        [space_uuid, prof_id],
      );

      if (courseSpaceRows[0].length === 0) {
        throw new Error("Course space not found.");
      }

      const c_space_id = courseSpaceRows[0][0].c_space_id;

      // Check if remark already exists
      const remarks = await connection.execute(
        `SELECT 
            sm.account_id,
            CONCAT(s.student_fn, ' ', s.student_ln) AS fullname,
            r.prelim,
            r.midterm,
            r.prefinals,
            r.finals
        FROM space_members sm
        INNER JOIN students s
            ON s.account_id = sm.account_id
        LEFT JOIN remarks r
            ON r.account_id = sm.account_id
            AND r.c_space_id = sm.c_space_id
        WHERE sm.c_space_id = ?;
        `,

        [c_space_id],
      );

      const formatted = remarks[0].map((row) => ({
        account_id: row.account_id,
        fullname: row.fullname,
        grades: {
          prelim: row.prelim === "0.00" ? null : row.prelim,
          midterm: row.midterm === "0.00" ? null : row.midterm,
          prefinals: row.prefinals === "0.00" ? null : row.prefinals,
          finals: row.finals === "0.00" ? null : row.finals,
        },
      }));

      await connection.commit();
      return formatted;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error in remarksAddByStudentId:", err);
      throw err;
    } finally {
      connection.release();
    }
  }

  async getUserRemarksBySpaceUUID(prof_id, user_id, space_uuid) {
    const connection = await this.db.getConnection();

    try {
      // Get course space ID
      const courseSpaceRows = await connection.execute(
        `SELECT c_space_id 
       FROM course_spaces 
       WHERE c_space_uuid = ?`,
        [space_uuid],
      );

      if (courseSpaceRows[0].length === 0) {
        throw new Error("Course space not found.");
      }

      const c_space_id = courseSpaceRows[0][0].c_space_id;

      const remarks = await connection.execute(
        `SELECT 
          r.account_id,
          CONCAT(s.student_fn, ' ', s.student_ln) AS fullname,
          r.prelim,
          r.midterm,
          r.prefinals,
          r.finals
       FROM remarks r
       INNER JOIN students s
         ON s.account_id = r.account_id
       WHERE r.c_space_id = ? 
         AND r.account_id = ?`,
        [c_space_id, user_id],
      );

      return remarks[0].map((row) => ({
        account_id: row.account_id,
        fullname: row.fullname,
        grades: {
          prelim: row.prelim === "0.00" ? null : row.prelim,
          midterm: row.midterm === "0.00" ? null : row.midterm,
          prefinals: row.prefinals === "0.00" ? null : row.prefinals,
          finals: row.finals === "0.00" ? null : row.finals,
        },
      }));
    } catch (err) {
      this.logger.error("Error in getUserRemarksBySpaceUUID:", err);
      throw err;
    } finally {
      connection.release();
    }
  }

  async toggleArchiving(account_id, space_uuid) {
    const connection = await this.db.getConnection(); // get a transaction connection
    try {
      await connection.beginTransaction();

      // 2️⃣ Try course space
      const [rows] = await connection.query(
        `SELECT c_space_id, is_archive 
        FROM course_spaces 
        WHERE c_space_uuid = ? AND created_by = ? FOR UPDATE`,
        [space_uuid, account_id],
      );

      if (rows.length > 0) {
        const newState = rows[0].is_archive ? 0 : 1;

        await connection.query(
          `UPDATE course_spaces 
         SET is_archive = ? 
         WHERE c_space_id = ? AND created_by = ?`,
          [newState, rows[0].c_space_id, account_id],
        );

        await connection.commit();
        connection.release();

        return {
          space_id: rows[0].c_space_id,
          is_archived: newState,
          type: "course_space",
        };
      }

      // 3️⃣ Not found
      await connection.rollback();
      connection.release();
      return null;
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err; // let controller handle 500
    }
  }

  async getAllCourseSpaceArchived(account_id) {
    try {
      const rows = await this.db.execute(
        `
        SELECT 
            csp.c_space_id,
            csp.c_space_uuid,
            csp.c_space_name,
            csp.c_space_description,
            csp.c_space_day,
            csp.c_space_time_start,
            csp.c_space_time_end,
            csp.c_space_yr_lvl,
            csp.created_by,
            CONCAT(
              '{"name":"', creator_prof.prof_fn, ' ', creator_prof.prof_ln,
              '","avatar":"', IFNULL(creator_acc.profile_pic, ''), '"}'
            ) AS professor,
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
                            WHEN acc.account_id = csp.created_by THEN 'creator'
                            WHEN st.account_id IS NOT NULL THEN 'student'
                            ELSE 'professor'
                        END,
                        '"}'
                    )
                    SEPARATOR ','
                ), 
            ']') AS members,
            at.acad_term_name,
            at.semester

        FROM course_spaces csp
        LEFT JOIN space_members spm
            ON csp.c_space_id = spm.c_space_id 
            AND spm.status = 'accepted'
        LEFT JOIN accounts acc
            ON acc.account_id = spm.account_id
        LEFT JOIN students st
            ON acc.account_id = st.account_id
        LEFT JOIN professors pr
            ON acc.account_id = pr.account_id
        LEFT JOIN professors creator_prof
            ON creator_prof.account_id = csp.created_by
        LEFT JOIN accounts creator_acc
            ON creator_acc.account_id = csp.created_by
        LEFT JOIN academic_term at
            ON csp.acad_term_id = at.acad_term_id
        WHERE csp.is_archive = 1 AND EXISTS (
              SELECT 1 
              FROM professors p 
              WHERE p.account_id = csp.created_by
          )
          AND NOT EXISTS (
              SELECT 1
              FROM space_members sm
              INNER JOIN professors p2 
                  ON sm.account_id = p2.account_id
              WHERE sm.c_space_id = csp.c_space_id
                AND sm.status = 'accepted'
                AND sm.account_id != csp.created_by
          )
          AND (
                csp.created_by = ?
                OR EXISTS (
                    SELECT 1
                    FROM space_members sm2
                    WHERE sm2.c_space_id = csp.c_space_id
                    AND sm2.account_id = ?
                    AND sm2.status = 'accepted'
                )
            )
        GROUP BY
          csp.c_space_id,
          csp.c_space_uuid,
          csp.c_space_name,
          csp.c_space_day,
          csp.c_space_time_start,
          csp.c_space_time_end,
          csp.c_space_yr_lvl,
          csp.created_by,
          at.acad_term_name,
          at.semester,
          creator_prof.prof_fn,
          creator_prof.prof_ln,
          creator_acc.profile_pic
        ORDER BY csp.created_at DESC;
        `,
        [account_id, account_id],
      );

      // Safely parse the members JSON string into actual array
      rows.forEach((space) => {
        try {
          const membersStr = space.members || "[]";
          space.members = JSON.parse(membersStr);
        } catch (e) {
          space.members = [];
          this.logger.warn("Failed to parse members JSON", {
            space_id: space.c_space_id,
            raw: space.members,
            error: e.message,
          });
          throw e;
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

  async updateSpace(account_id, space_uuid, updates) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      console.log("DEBUG: updateSpace called with:", {
        account_id,
        space_uuid,
        updates,
      });

      // Check if it's a course space first
      const [courseSpace] = await connection.execute(
        "SELECT c_space_id FROM course_spaces WHERE c_space_uuid = ? AND created_by = ?",
        [space_uuid, account_id],
      );

      console.log(
        "DEBUG: courseSpace check:",
        courseSpace.length > 0 ? "Found course space" : "Not a course space",
      );

      let result;

      if (courseSpace.length > 0) {
        // Update course space
        console.log("DEBUG: Updating course space");
        [result] = await connection.execute(
          `
          UPDATE course_spaces
           SET 
             c_space_name = COALESCE(?, c_space_name),
             c_space_description = COALESCE(?, c_space_description),
             c_space_day = COALESCE(?, c_space_day),
             c_space_time_start = COALESCE(?, c_space_time_start),
             c_space_time_end = COALESCE(?, c_space_time_end),
             c_space_yr_lvl = COALESCE(?, c_space_yr_lvl)
           WHERE c_space_uuid = ? AND created_by = ?
          `,
          [
            updates.space_name ?? null,
            updates.space_description ?? null,
            updates.space_day ?? null,
            updates.space_time_start ?? null,
            updates.space_time_end ?? null,
            updates.space_yr_lvl ?? null,
            space_uuid,
            account_id,
          ],
        );
      } else {
        // Check and update regular space
        console.log("DEBUG: Checking for regular space");
        const [regularSpace] = await connection.execute(
          "SELECT space_id FROM spaces WHERE space_uuid = ? AND created_by = ?",
          [space_uuid, account_id],
        );

        console.log(
          "DEBUG: regularSpace check:",
          regularSpace.length > 0 ? "Found regular space" : "No space found",
        );

        if (regularSpace.length > 0) {
          console.log("DEBUG: Updating regular space");
          [result] = await connection.execute(
            `
            UPDATE spaces
             SET 
               space_name = COALESCE(?, space_name),
               description = COALESCE(?, description)
             WHERE space_uuid = ? AND created_by = ?
            `,
            [
              updates.space_name ?? null,
              updates.space_description ?? null, // Use space_description to match request data
              space_uuid,
              account_id,
            ],
          );
          console.log("DEBUG: Regular space update result:", result);
        } else {
          console.log("DEBUG: Space not found or access denied");
          throw new Error("Space not found or access denied.");
        }
      }

      console.log("DEBUG: Committing transaction");
      await connection.commit();

      if (result.affectedRows === 0) {
        console.log("DEBUG: No rows affected");
        throw new Error("Space not found or access denied.");
      }

      console.log("DEBUG: Update successful");
      return { success: true, message: "Space updated successfully." };
    } catch (err) {
      console.log("DEBUG: Error in updateSpace:", err);
      await connection.rollback();
      this.logger.error("Error updating space", {
        account_id,
        space_uuid,
        err: err.message || err,
      });
      throw err;
    } finally {
      connection.release();
    }
  }
}

export default Space;
