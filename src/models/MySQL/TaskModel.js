import { mysqlConnection } from '../../config/mysqlConnection.js';
import { Logger } from '../../utils/Logger.js';
import User from './UserModel.js';

class Task {
  constructor() {
    this.user = new User();
    this.db = mysqlConnection;
    this.logger = new Logger('SpaceModel');
  }

  async create(space_id, title, instruction, scoring, due_date, groupsData) {
    const conn = await this.db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Create Task
        const taskQuery = `
        INSERT INTO tasks (space_id, task_title, task_instruction, task_score, task_due)
        VALUES (?, ?, ?, ?, ?)
        `;

        const [taskResult] = await conn.execute(taskQuery, [
            space_id,
            title,
            instruction,
            scoring,
            due_date
        ]);

        const taskId = taskResult.insertId;

        // 2. Insert Groups + Members
        const taskGroupQuery = `
        INSERT INTO task_groups (task_id, group_name, leader_id)
        VALUES (?, ?, ?)
        `;

        const memberQuery = `
        INSERT INTO task_group_members (group_id, member_id)
        VALUES (?, ?)
        `;

        console.log(groupsData);

        const group_ids = [];
        
        // Process each group
        for (const group of groupsData) {
            // Create group
            const [groupResult] = await conn.execute(taskGroupQuery, [
                taskId,
                group.group_name || `Group ${group.id}`,
                group.leader_id
            ]);

            const groupId = groupResult.insertId;
            group_ids.push(groupId);

            // Insert members for this group (excluding the leader)
            if (group.members && group.members.length > 0) {
                for (const memberId of group.members) {
                    await conn.execute(memberQuery, [groupId, memberId]);
                }
            }
        }

        await conn.commit();

        return { taskId, group_ids };

    } catch (err) {
        await conn.rollback();
        this.logger.error("Error creating task", err);
        throw err;
    } finally {
        conn.release();
    }
  }


  async getBySpaceUuid(space_uuid) {
    try {
        const space = await this.db.execute(
            `
            SELECT space_id, space_name, created_by FROM spaces
            WHERE space_uuid = ?
            `, [space_uuid]
        )

        return space
    } catch(err) {
        this.logger.error('Error getting Task ID', { space_uuid, err });
        throw err;
    }
  }


}




export default Task;