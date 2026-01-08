import { mysqlConnection } from '../../config/mysqlConnection.js';
import { Logger } from '../../utils/Logger.js';
import User from './UserModel.js';

class Space {
  constructor() {
    this.user = new User();
    this.db = mysqlConnection;
    this.logger = new Logger('SpaceModel');
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

  async getAllSpace(account_id) {
    try {
        const rows = await this.db.query(
            `
            SELECT 
                sp.space_uuid,
                sp.space_name,
                sp.description,
                sp.created_by,
                GROUP_CONCAT(spm.account_id) AS members
            FROM spaces sp
            LEFT JOIN space_members spm
                ON sp.space_id = spm.space_id
                AND spm.status = 'accepted'
            WHERE sp.created_by = ?
            GROUP BY 
                sp.space_uuid,
                sp.space_name,
                sp.description,
                sp.created_by;
            `,
            [account_id]
        );

        return rows;
    } catch(err) {
        this.logger.error('Error getting All Space', { account_id })
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
}




export default Space;