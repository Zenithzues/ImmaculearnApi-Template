import { mysqlConnection } from '../../config/mysqlConnection.js';
import { Logger } from '../../utils/Logger.js';
import User from './UserModel.js';

class Space {
  constructor() {
    this.user = new User();
    this.db = mysqlConnection;
    this.logger = new Logger('SpaceModel');
  }

  async getBySpaceUuid(space_uuid) {
    try {
        const space = await this.db.query(
            `
            SELECT space_id, space_name, created_by FROM spaces
            WHERE space_uuid = ?
            `, [space_uuid]
        )

        return space
    } catch(err) {
        this.logger.error('Error getting Space ID', { space_uuid, err });
        throw err;
    }
  }


  async getBySpaceId(space_id) {
    
    try {
        const [result,] = await this.db.execute(
            `
            SELECT space_uuid, space_name, description, created_by
            FROM spaces
            WHERE space_id = ?
            LIMIT 1
            `, [space_id]
        )

        return result || [];
    } catch(err) {
        // await this.db.rollback();
        this.logger.error('Failed to get Space', { space_id })
        throw err;
    }
  }

  async createSpace(account_id, space_name, space_description) {
    try {
      const query = `INSERT INTO spaces (space_uuid, space_name, description, created_by, created_at) VALUES (UUID(), ?, ?, ?, NOW())`;
      const result = await this.db.execute(query, [space_name, space_description , account_id]);

      const row = await this.db.query(
            `SELECT space_uuid
            FROM spaces 
            WHERE space_id = ?
            `,
            [result.insertId]
        );
    //   this.logger.info('Created Space', { space_name, space_description, account_id });
      
      return { 
            success: true, 
            space_uuid: row[0].space_uuid,
            insertId: result.insertId 
        };
    } catch (error) {
      this.logger.error('Error creating Space', { space_name, space_description, error });
      throw error;
    }
  }

  async joinSpace(account_id, space_id) {
    try {
        // const space_id = await this.getSpaceId(space_uuid);

        const row = await this.db.execute(`
            INSERT INTO space_members (space_id, account_id, status)
            VALUES (?, ?, 'pending')
            ON DUPLICATE KEY UPDATE 
            status = IF(status = 'accepted', status, 'pending')
        `, [space_id, account_id]);


        return row


    } catch(err) {
        this.logger.error('Error Joining Space', { account_id, space_id, err });
        throw err;
    }
  }


  async getAllFriendSpaces(account_id) {
    try {
        const rows = await this.db.query(
            `
            SELECT 
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
            WHERE sp.created_by = ? OR EXISTS (
                SELECT 1 FROM space_members sm 
                WHERE sm.space_id = sp.space_id AND sm.account_id = ?
            )
            GROUP BY sp.space_uuid, sp.space_name, sp.description, sp.created_by;
            `,
            [account_id, account_id]
        );

        // Parse JSON members
        rows.forEach(space => {
            try {
                space.members = JSON.parse(space.members || '[]');
            } catch(e) {
                space.members = [];
            }
        });

        return rows;
    } catch(err) {
        this.logger.error('Error Getting All Friend Spaces', { account_id, err });
        throw err;
    }
  }




  async getAllSpace(account_id) {
    try {
        const rows = await this.db.query(
            `
            SELECT 
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
            WHERE sp.created_by = ?
            GROUP BY sp.space_uuid, sp.space_name, sp.description, sp.created_by;
            `,
            [account_id]
        );

        // Parse members JSON safely
        rows.forEach(space => {
            try {
                space.members = JSON.parse(space.members || '[]');
            } catch(e) {
                space.members = [];
            }
        });

        return rows;
    } catch (err) {
        this.logger.error('Error getting All Space', { account_id, err });
        throw err;
    }
  }   



  async getJoinRequestsBySpaceId(account_id, space_uuid) {
    try {

        console.log(account_id, space_uuid)
        const rows = await this.db.query(
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
            [account_id, space_uuid]
        );

        console.log(rows)

        return rows;
    } catch(err) {
        this.logger.error('Error getting All Space', { account_id })
        throw err;
    }
  }


  async processJoinRequest(account_id, user_id, space_uuid, status) {
    try {

        await this.db.getConnection();
        let query;

        const space = await this.db.query(
            `
            SELECT space_id FROM spaces
            WHERE space_uuid = ? AND created_by = ?;
            `, [space_uuid, account_id]
        )


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
                `
            }
        }
        const row = await this.db.execute(query, [status, space[0].space_id, user_id]);

        return { row, space_id: space[0].space_id, message: status === "accepted" ? "Accepted Request Successfully" : "Declined Request Successfully"}

    } catch(err) {
        this.logger.error('Error Processing Request to Join', { account_id })
        throw err;
    }
  }

  async deleteSpace(space_uuid) {
    try {
        // Delete members
        await this.db.execute(
        "DELETE FROM space_members WHERE space_id = (SELECT space_id FROM spaces WHERE space_uuid = ?)",
        [space_uuid]
        );

        // Delete tasks (optional)
        // await this.db.execute(
        // "DELETE FROM tasks WHERE space_id = (SELECT space_id FROM spaces WHERE space_uuid = ?)",
        // [space_uuid]
        // );

        // Delete the space itself
        await this.db.execute("DELETE FROM spaces WHERE space_uuid = ?", [space_uuid]);

        return true;
    } catch(err) {
        console.error("Error deleting space:", err);
        throw err;
    }
    }

}




export default Space;