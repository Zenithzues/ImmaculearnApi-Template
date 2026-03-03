import { mysqlConnection } from "../../config/mysqlConnection.js";
import { Logger } from "../../utils/Logger.js";
import User from "./UserModel.js";

class Task {
  constructor() {
    this.user = new User();
    this.db = mysqlConnection;
    this.logger = new Logger("SpaceModel");
  }

  /**
   * Create a task with questions and choices (MCQ)
   * @param {Object} taskData - The task payload
   * @param {string} space_uuid - The space identifier
   * @returns {number} taskId
   */
  async createTask(taskData, space_id, c_space_id) {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      // Insert task with proper space_id or c_space_id
      const [taskResult] = await conn.query(
        `INSERT INTO tasks 
          (space_id, c_space_id, task_category, task_title, task_instruction, lesson_id, total_score, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          space_id || null,
          c_space_id || null,
          taskData.task_category,
          taskData.task_title,
          taskData.task_instruction,
          taskData.lesson_id,
          taskData.total_score,
          new Date(taskData.due_date),
        ],
      );

      const taskId = taskResult.insertId;

      if (!taskData.questions?.length) {
        await conn.commit();
        return taskId;
      }

      // Batch insert questions
      const questionRows = taskData.questions.map((q, idx) => [
        taskId,
        q.question_type,
        q.question,
        q.point,
        idx + 1, // position
      ]);

      const [questionResult] = await conn.query(
        `INSERT INTO task_questions (task_id, question_type, question, point, position) VALUES ?`,
        [questionRows],
      );

      const firstQuestionId = questionResult.insertId;
      const questionIds = taskData.questions.map(
        (_, idx) => firstQuestionId + idx,
      );

      // Batch insert choices (MCQ)
      const choiceRows = [];
      taskData.questions.forEach((q, qIdx) => {
        if (q.question_type === "mcq" && Array.isArray(q.choices)) {
          const questionId = questionIds[qIdx];
          q.choices.forEach((c) => {
            choiceRows.push([
              questionId,
              c.letter_identifier,
              c.choice_answer,
              c.isRightAnswer,
            ]);
          });
        }
      });

      if (choiceRows.length) {
        await conn.query(
          `INSERT INTO task_choices (question_id, letter_identifier, choice_answer, is_right_answer) VALUES ?`,
          [choiceRows],
        );
      }

      await conn.commit();
      return taskId;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Error in Task.createTask", err);
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Get tasks by space_id or course space, but always return single space_id
   * @param {number} space_id - normal space
   * @param {number} c_space_id - course space
   * @returns {Promise<Array>} List of tasks with unified space_id
   */
  async getAllTasks(account_id) {
    const conn = await this.db.getConnection();
    try {
      const sql = `
      SELECT 
        t.task_id,
        COALESCE(t.space_id, t.c_space_id) AS space_id,
        t.task_category,
        t.task_title,
        t.task_instruction,
        t.lesson_id,
        t.total_score,
        t.due_date,
        t.created_at,
        t.updated_at,

        COUNT(q.question_id) AS question_count,

        ts.account_id,
        ts.score,
        ts.max_score,

        CASE
          WHEN COUNT(ta.answer_id) > 0 THEN 1
          ELSE 0
        END AS has_answered

      FROM tasks t

      LEFT JOIN space_members sm
        ON (sm.space_id = t.space_id OR sm.c_space_id = t.c_space_id)

      LEFT JOIN spaces s
        ON s.space_id = t.space_id

      LEFT JOIN course_spaces cs
        ON cs.c_space_id = t.c_space_id

      LEFT JOIN task_questions q
        ON q.task_id = t.task_id

      LEFT JOIN task_answers ta
        ON ta.task_id = t.task_id
      AND ta.account_id = ?

      LEFT JOIN task_score ts
        ON ts.task_id = t.task_id
      AND ts.account_id = ?

      WHERE
        sm.account_id = ?
        OR s.created_by = ?
        OR cs.created_by = ?

      GROUP BY t.task_id
      ORDER BY t.created_at DESC
    `;

      const params = [
        account_id, // ta.account_id
        account_id, // ts.account_id
        account_id, // sm.account_id
        account_id, // s.created_by
        account_id, // cs.created_by
      ];

      const [rows] = await conn.execute(sql, params);
      return rows;
    } catch (err) {
      this.logger.error("Error in Task.getAllTasks", err);
      throw err;
    } finally {
      conn.release();
    }
  }

  async getTaskBySpaceUUID(space_id, c_space_id, account_id) {
    const conn = await this.db.getConnection();
    try {
      const whereClauses = [];
      const values = [];

      if (space_id) {
        whereClauses.push("t.space_id = ?");
        values.push(space_id);
      }
      if (c_space_id) {
        whereClauses.push("t.c_space_id = ?");
        values.push(c_space_id);
      }

      if (whereClauses.length === 0) return [];

      const sql = `
      SELECT 
        t.task_id,
        COALESCE(t.space_id, t.c_space_id) AS space_id,
        t.task_category,
        t.task_title,
        t.task_instruction,
        t.lesson_id,
        t.total_score,
        t.due_date,
        t.created_at,
        t.updated_at,

        COUNT(q.question_id) AS question_count,

        ts.account_id,
        ts.score,
        ts.max_score,

        CASE
          WHEN COUNT(ta.answer_id) > 0 THEN 1
          ELSE 0
        END AS has_answered

      FROM tasks t
      LEFT JOIN task_questions q
        ON q.task_id = t.task_id

      -- check if this student answered
      LEFT JOIN task_answers ta
        ON ta.task_id = t.task_id
       AND ta.account_id = ?

      -- final score if submitted
      LEFT JOIN task_score ts
        ON ts.task_id = t.task_id
       AND ts.account_id = ?

      WHERE ${whereClauses.join(" OR ")}

      GROUP BY t.task_id
      ORDER BY t.created_at DESC
    `;

      const params = [
        account_id ?? null,
        account_id ?? null,
        ...values.map((v) => v ?? null),
      ];

      const [rows] = await conn.execute(sql, params);
      return rows;
    } catch (err) {
      this.logger.error("Error in Task.getTaskBySpaceUUID", err);
      throw err;
    } finally {
      conn.release();
    }
  }

  async getQuestionsByTaskId(task_id) {
    try {
      const sql = `
      SELECT
        q.question_id,
        q.task_id,
        q.question,
        q.question_type,
        q.position AS order_no,
        c.choice_id,
        c.letter_identifier,
        c.choice_answer
      FROM task_questions q
      LEFT JOIN task_choices c
        ON c.question_id = q.question_id
      WHERE q.task_id = ?
      ORDER BY q.position ASC, c.choice_id ASC
    `;

      const rows = await this.db.execute(sql, [task_id]);

      // Normalize to nested structure
      const map = {};

      for (const row of rows) {
        if (!map[row.question_id]) {
          map[row.question_id] = {
            question_id: row.question_id,
            task_id: row.task_id,
            question: row.question,
            question_type: row.question_type,
            order_no: row.order_no,
            choices: [],
          };
        }

        if (row.choice_id) {
          map[row.question_id].choices.push({
            choice_id: row.choice_id,
            letter_identifier: row.letter_identifier,
            choice_answer: row.choice_answer,
          });
        }
      }

      return Object.values(map);
    } catch (err) {
      this.logger.error("Error fetching task questions", { err });
      throw err;
    }
  }

  async submitTaskAnswer({ task_id, account_id, answers }) {
    const conn = await this.db.getConnection();

    console.log(task_id, account_id, answers);

    try {
      await conn.beginTransaction();

      let totalScore = 0;
      let maxScore = answers.length;

      // 1️⃣ Save answers
      for (const ans of answers) {
        await conn.execute(
          `
          INSERT INTO task_answers
            (task_id, question_id, account_id, choice_id, answer_text)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            choice_id = VALUES(choice_id),
            answer_text = VALUES(answer_text),
            answered_at = CURRENT_TIMESTAMP
        `,
          [
            task_id,
            ans.question_id,
            account_id,
            ans.choice_id ?? null,
            ans.answer_text ?? null,
          ],
        );
      }

      // 2️⃣ Auto-grade MCQs
      const graded = await conn.execute(
        `
        SELECT
          ta.question_id,
          ta.account_id,
          tc.is_right_answer
        FROM task_answers ta
        JOIN task_choices tc
          ON tc.choice_id = ta.choice_id
        WHERE ta.task_id = ?
          AND ta.account_id = ?
      `,
        [task_id, account_id],
      );

      console.log(graded);

      for (const row of graded[0]) {
        const score = row.is_right_answer ? 1 : 0;
        totalScore += score;

        await conn.execute(
          `
          INSERT INTO task_question_score
            (task_id, question_id, account_id, is_correct, score)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            is_correct = VALUES(is_correct),
            score = VALUES(score)
        `,
          [task_id, row.question_id, account_id, row.is_right_answer, score],
        );
      }

      // 3️⃣ Save final task score
      await conn.execute(
        `
        INSERT INTO task_score
          (task_id, account_id, score, max_score)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          score = VALUES(score),
          max_score = VALUES(max_score),
          submitted_at = CURRENT_TIMESTAMP
      `,
        [task_id, account_id, totalScore, maxScore],
      );

      await conn.commit();

      return {
        score: totalScore,
        max_score: maxScore,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async create(
    space_id,
    title,
    instruction,
    scoring,
    status,
    due_date,
    groupsData,
  ) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Create Task
      const taskQuery = `
        INSERT INTO tasks (space_id, task_title, task_instruction, task_score, task_status, task_due)
        VALUES (?, ?, ?, ?, ?, ?)
        `;

      const [taskResult] = await conn.execute(taskQuery, [
        space_id,
        title,
        instruction,
        scoring,
        status,
        due_date,
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
          group.leader_id,
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

  async getUploadedTasksBySpaceId(space_id) {
    try {
      const uploadedQuery = `
            SELECT id, title, description, total_score, due_date, created_at FROM tasks
            WHERE id = ?
        `;
      const result = await this.db.execute(uploadedQuery, [space_id]);

      return result;
    } catch (err) {
      this.logger.error("Error getting Task ID", { space_id, err });
      throw err;
    }
  }

  async getDraftedTasksBySpaceId(space_id) {
    try {
      const draftedQuery = `
            SELECT id, title, description, total_score, due_date, created_at FROM tasks
            WHERE id = ?
        `;
      const result = await this.db.execute(draftedQuery, [space_id]);

      return result;
    } catch (err) {
      this.logger.error("Error getting Task ID", { space_id, err });
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
      this.logger.error("Error getting Task ID", { space_uuid, err });
      throw err;
    }
  }
}

export default Task;
