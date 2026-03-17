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

    const allowedCategories = [
      "quiz",
      "individual-activity",
      "group-activity",
      "exam",
    ];

    if (!allowedCategories.includes(taskData.task_category)) {
      throw new Error("Invalid task category");
    }

    try {
      await conn.beginTransaction();

      const [taskResult] = await conn.query(
        `INSERT INTO tasks
      (space_id, c_space_id, task_category, task_title, task_instruction, lesson_id, total_items_score, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          space_id || null,
          c_space_id || null,
          taskData.task_category,
          taskData.task_title,
          taskData.task_instruction,
          taskData.lesson_id,
          taskData.total_score || taskData.task_score,
          new Date(taskData.due_date),
        ],
      );

      const taskId = taskResult.insertId;

      /*
      ============================
      GROUP ACTIVITY PROCESS
      ============================
    */
      if (taskData.task_category === "group-activity") {
        if (Array.isArray(taskData.groups) && taskData.groups.length) {
          // Insert groups
          const groupRows = taskData.groups.map((g) => [taskId, g.group_name]);
          const [groupResult] = await conn.query(
            `INSERT INTO task_groups (task_id, group_name) VALUES ?`,
            [groupRows],
          );

          // Get the inserted group IDs
          const insertedGroupIds = [];
          let currentId = groupResult.insertId;
          for (let i = 0; i < taskData.groups.length; i++) {
            insertedGroupIds.push(currentId + i);
          }

          // Insert group members
          const memberRows = [];
          taskData.groups.forEach((g, idx) => {
            const groupId = insertedGroupIds[idx];
            g.members.forEach((m) => {
              memberRows.push([groupId, m.account_id, m.role]);
            });
          });

          if (memberRows.length) {
            await conn.query(
              `INSERT INTO task_group_members (group_id, account_id, member_role) VALUES ?`,
              [memberRows],
            );
          }
        }

        await conn.commit();
        return taskId;
      }

      /*
      ============================
      QUIZ / EXAM / INDIVIDUAL
      ============================
    */

      if (!taskData.questions?.length) {
        await conn.commit();
        return taskId;
      }

      const questionRows = taskData.questions.map((q, idx) => [
        taskId,
        q.question_type,
        q.question,
        q.identification_answer || null,
        q.point,
        idx + 1,
      ]);

      const [questionResult] = await conn.query(
        `INSERT INTO task_questions
      (task_id, question_type, question, identification_answer, point, position)
      VALUES ?`,
        [questionRows],
      );

      const firstQuestionId = questionResult.insertId;

      const questionIds = taskData.questions.map(
        (_, idx) => firstQuestionId + idx,
      );

      const choiceRows = [];

      taskData.questions.forEach((q, qIdx) => {
        if (
          (q.question_type === "mcq" || q.question_type === "true-false") &&
          Array.isArray(q.choices)
        ) {
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
          `INSERT INTO task_choices
        (question_id, letter_identifier, choice_answer, is_right_answer)
        VALUES ?`,
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

  async updateTaskByTaskId(taskData) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      const {
        task_id,
        task_title,
        task_instruction,
        task_category,
        due_date,
        total_score,
        lesson_id,
        questions,
      } = taskData;

      const dueDate = due_date
        ? new Date(due_date)
            .toLocaleString("sv-SE", {
              timeZone: "Asia/Manila",
              hour12: false,
            })
            .replace("T", " ")
        : null;

      // Update main task
      await conn.execute(
        `UPDATE tasks 
       SET task_title=?, task_instruction=?, task_category=?, due_date=?, total_items_score=?, lesson_id=? 
       WHERE task_id=?`,
        [
          task_title,
          task_instruction,
          task_category,
          dueDate,
          total_score,
          lesson_id,
          task_id,
        ],
      );

      // Delete old questions and choices
      await conn.execute(`DELETE FROM task_questions WHERE task_id=?`, [
        task_id,
      ]);

      // Insert new questions with position
      for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];

        const [questionResult] = await conn.execute(
          `INSERT INTO task_questions 
        (task_id, question, question_type, point, identification_answer, position)
        VALUES (?, ?, ?, ?, ?, ?)`,
          [
            task_id,
            q.question,
            q.question_type,
            q.point,
            q.identification_answer || null,
            idx + 1, // position
          ],
        );

        const question_id = questionResult.insertId;

        // Insert choices if MCQ
        if (
          (q.question_type === "mcq" || q.question_type === "true-false") &&
          q.choices
        ) {
          for (const c of q.choices) {
            await conn.execute(
              `INSERT INTO task_choices
            (question_id, letter_identifier, choice_answer, is_right_answer)
            VALUES (?, ?, ?, ?)`,
              [
                question_id,
                c.letter_identifier,
                c.choice_answer,
                c.isRightAnswer,
              ],
            );
          }
        }
      }

      await conn.commit();
      return task_id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async getTaskByTaskId(task_id) {
    try {
      const task = await this.db.execute(
        `
      SELECT 
        t.task_id,
        t.space_id,
        t.c_space_id,
        t.task_category,
        t.task_title,
        t.task_instruction,
        t.lesson_id,
        t.total_items_score,
        t.due_date,
        t.created_at,
        t.updated_at,
        COALESCE(cs.created_by, s.created_by) AS created_by
      FROM tasks t
      LEFT JOIN course_spaces cs 
        ON t.c_space_id = cs.c_space_id
      LEFT JOIN spaces s 
        ON t.space_id = s.space_id
      WHERE t.task_id = ?
      `,
        [task_id],
      );

      return task[0];
    } catch (err) {
      this.logger.error("Error in Task.getTaskByTaskId", err);
      throw err;
    }
  }

  async getQuestionAndAnswerByTaskId(task_id) {
    try {
      const result = await this.db.execute(
        `
      SELECT
        q.question_id,
        q.task_id,
        q.question_type,
        q.question,
        q.identification_answer,
        q.point,
        q.position,
        q.expected_count,
        c.choice_id,
        c.letter_identifier,
        c.choice_answer,
        c.is_right_answer
      FROM task_questions q
      LEFT JOIN task_choices c 
        ON q.question_id = c.question_id
      WHERE q.task_id = ?
      ORDER BY q.position ASC, c.letter_identifier ASC
      `,
        [task_id],
      );

      const rows = result; // your SQL result

      const questions = Object.values(
        rows.reduce((acc, row) => {
          if (!acc[row.question_id]) {
            acc[row.question_id] = {
              question_id: row.question_id,
              task_id: row.task_id,
              question_type: row.question_type,
              question: row.question,
              identification_answer: row.identification_answer,
              point: row.point,
              position: row.position,
              expected_count: row.expected_count,
              choices: [],
            };
          }

          if (row.choice_id) {
            acc[row.question_id].choices.push({
              choice_id: row.choice_id,
              letter_identifier: row.letter_identifier,
              choice_answer: row.choice_answer,
              is_right_answer: row.is_right_answer,
            });
          }

          return acc;
        }, {}),
      );

      // console.log(questions);

      return questions;
    } catch (err) {
      this.logger.error("Error in Task.getQuestionAndAnswerByTaskId", err);
      throw err;
    }
  }

  /**
   * Fetch all questions with choices and respondents' answers for a task
   * @param {number} task_id
   * @returns {Promise<Array>} array of questions with choices and answers
   */
  async getAllRespondentsByTaskId(task_id) {
    try {
      const result = await this.db.execute(
        `
        SELECT
          q.question_id,
          q.task_id,
          q.question_type,
          q.question,
          q.identification_answer,
          q.point,
          q.position,
          q.expected_count,
          c.choice_id,
          c.letter_identifier,
          c.choice_answer,
          c.is_right_answer,
          a.answer_id,
          a.account_id,
          a.choice_id AS answered_choice_id,
          a.answer_text,
          a.answered_at,
          s.student_fn,
          s.student_ln,
          CONCAT(s.student_fn, ' ', s.student_ln) AS full_name
        FROM task_questions q
        LEFT JOIN task_choices c
          ON q.question_id = c.question_id
        LEFT JOIN task_answers a
          ON q.question_id = a.question_id
        LEFT JOIN students s
          ON a.account_id = s.account_id
        WHERE q.task_id = ?
        ORDER BY q.position ASC, c.letter_identifier ASC, a.answered_at ASC;
        `,
        [task_id],
      );

      const rows = result;

      // Transform rows into nested structure: questions -> choices + answers
      const questions = Object.values(
        rows.reduce((acc, row) => {
          if (!acc[row.question_id]) {
            acc[row.question_id] = {
              question_id: row.question_id,
              task_id: row.task_id,
              question_type: row.question_type,
              question: row.question,
              identification_answer: row.identification_answer,
              point: row.point,
              position: row.position,
              expected_count: row.expected_count,
              choices: [],
              answers: [],
            };
          }

          // Add choice if it exists and not already added
          if (row.choice_id) {
            const exists = acc[row.question_id].choices.some(
              (ch) => ch.choice_id === row.choice_id,
            );
            if (!exists) {
              acc[row.question_id].choices.push({
                choice_id: row.choice_id,
                letter_identifier: row.letter_identifier,
                choice_answer: row.choice_answer,
                is_right_answer: row.is_right_answer,
              });
            }
          }

          // Add answer if it exists and not already added
          if (row.answer_id) {
            const exists = acc[row.question_id].answers.some(
              (ans) => ans.answer_id === row.answer_id,
            );
            if (!exists) {
              acc[row.question_id].answers.push({
                answer_id: row.answer_id,
                account_id: row.account_id,
                respondent_name: row.respondent_name,
                respondent_email: row.respondent_email,
                choice_id: row.answered_choice_id,
                answer_text: row.answer_text,
                answered_at: row.answered_at,
              });
            }
          }

          return acc;
        }, {}),
      );

      return questions;
    } catch (err) {
      this.logger.error("Error in TaskModel.getAllRespondentsByTaskId", err);
      throw err;
    }
  }

  async getAllUserCompletedTaskByTaskId(task_id) {
    try {
      const result = await this.db.execute(
        `
      SELECT
          s.account_id,
          CONCAT(s.student_ln, ', ', s.student_fn) AS full_name,
          t.total_items_score,
          q.question_id,
          q.question,
          q.question_type,
          q.identification_answer,
          q.point,
          q.position,
          c.choice_id,
          c.letter_identifier,
          c.choice_answer,
          c.is_right_answer,
          a.answer_id,
          a.answer_text,
          a.choice_id AS selected_choice_id,
          a.answered_at,
          qs.is_correct,
          qs.score AS question_score,
          totals.total_score
      FROM students s
      LEFT JOIN task_answers a
          ON a.account_id = s.account_id
          AND a.task_id = ?
      LEFT JOIN task_question_score qs
          ON qs.account_id = s.account_id
          AND qs.question_id = a.question_id
          AND qs.task_id = a.task_id
      LEFT JOIN task_questions q
          ON q.task_id = ?
      LEFT JOIN task_choices c
          ON c.question_id = q.question_id
      LEFT JOIN tasks t
          ON t.task_id = q.task_id
      LEFT JOIN (
          SELECT account_id, SUM(score) AS total_score
          FROM task_question_score
          WHERE task_id = ?
          GROUP BY account_id
      ) totals
          ON totals.account_id = s.account_id
      WHERE s.account_id IN (
          SELECT DISTINCT account_id
          FROM task_answers
          WHERE task_id = ?
      )
      ORDER BY s.account_id, q.position ASC, c.letter_identifier ASC;
      `,
        [task_id, task_id, task_id, task_id],
      );

      const students = {};
      const questions = {};

      for (const row of result) {
        // ---------- STUDENT DATA ----------
        if (!students[row.account_id]) {
          students[row.account_id] = {
            account_id: row.account_id,
            student_name: row.full_name,
            score: Number(row.total_score || 0),
            total_items_score: Number(row.total_items_score || 0),
            completed_at: row.answered_at,
            answers: {},
          };
        }

        // ---------- STUDENT ANSWERS ----------
        if (row.question_type === "identification" && row.answer_text) {
          students[row.account_id].answers[row.question_id] = row.answer_text;
        } else if (row.selected_choice_id) {
          if (row.choice_id === row.selected_choice_id) {
            students[row.account_id].answers[row.question_id] =
              row.letter_identifier;
          }
        }

        // ---------- QUIZ QUESTIONS ----------
        if (!questions[row.question_id]) {
          questions[row.question_id] = {
            position: row.position,
            question_id: row.question_id,
            question: row.question,
            question_type: row.question_type,
            answers: [],
          };
        }

        // Add unique MCQ / True-False choices
        if (row.choice_id) {
          const exists = questions[row.question_id].answers.find(
            (c) => c.letter_identifier === row.letter_identifier,
          );
          if (!exists) {
            questions[row.question_id].answers.push({
              letter_identifier: row.letter_identifier,
              choice_answer: row.choice_answer,
              is_correct: Boolean(row.is_right_answer),
            });
          }
        }

        // Add identification correct answer
        if (!row.choice_id && row.question_type === "identification") {
          if (questions[row.question_id].answers.length === 0) {
            questions[row.question_id].answers.push({
              choice_answer: row.identification_answer,
              is_correct: true,
            });
          }
        }
      }

      return {
        students: Object.values(students),
        questions: Object.values(questions),
      };
    } catch (err) {
      this.logger.error(
        "Error in TaskModel.getAllUserCompletedTaskByTaskId",
        err,
      );
      throw err;
    }
  }

  async checkIfAllStudentResponse(task_id) {
    try {
      const result = await this.db.execute(
        `
      SELECT 
        COUNT(DISTINCT sm.account_id) = COUNT(DISTINCT ta.account_id) AS all_responded
      FROM tasks t

      LEFT JOIN space_members sm
        ON (
          (t.c_space_id IS NOT NULL AND sm.c_space_id = t.c_space_id)
          OR
          (t.c_space_id IS NULL AND sm.space_id = t.space_id)
        )

      LEFT JOIN task_answers ta
        ON ta.task_id = t.task_id
        AND ta.account_id = sm.account_id

      WHERE t.task_id = ?
      `,
        [task_id],
      );

      return Boolean(result[0].all_responded);
    } catch (err) {
      this.logger.error("Error in TaskModel.checkIfAllStudentResponse", err);
      throw err;
    }
  }

  async getResponseByStudentIdAndTaskId(account_id, task_id) {
    // Check if all students have completed the task
    const isAllResponseToTask = await this.checkIfAllStudentResponse(task_id);
    if (!isAllResponseToTask) return false;

    // Execute query
    const result = await this.db.execute(
      `
    SELECT
        s.account_id,
        CONCAT(s.student_ln, ', ', s.student_fn) AS full_name,
        t.total_items_score,
        q.question_id,
        q.question,
        q.question_type,
        q.identification_answer,
        q.point,
        q.position,
        c.choice_id,
        c.letter_identifier,
        c.choice_answer,
        c.is_right_answer,
        a.answer_id,
        a.answer_text,
        a.choice_id AS selected_choice_id,
        a.answered_at,
        qs.is_correct,
        qs.score AS question_score,
        totals.total_score
    FROM students s
    LEFT JOIN task_answers a
        ON a.account_id = s.account_id
        AND a.task_id = ?
    LEFT JOIN task_question_score qs
        ON qs.account_id = s.account_id
        AND qs.question_id = a.question_id
        AND qs.task_id = a.task_id
    LEFT JOIN task_questions q
        ON q.task_id = ?
    LEFT JOIN task_choices c
        ON c.question_id = q.question_id
    LEFT JOIN tasks t
        ON t.task_id = q.task_id
    LEFT JOIN (
        SELECT account_id, SUM(score) AS total_score
        FROM task_question_score
        WHERE task_id = ?
        GROUP BY account_id
    ) totals
        ON totals.account_id = s.account_id
    WHERE s.account_id IN (
        SELECT DISTINCT account_id
        FROM task_answers
        WHERE task_id = ?
    )
    ORDER BY s.account_id, q.position ASC, c.letter_identifier ASC;
    `,
      [task_id, task_id, task_id, task_id], // FIXED parameter order
    );

    const questions = {};
    const student_answers = {};
    let score = 0;
    let total_items_score = 0;

    for (const row of result) {
      // Capture overall scores
      score = Number(row.total_score || 0);
      total_items_score = Number(row.total_items_score || 0);

      // Initialize question object if not exists
      if (!questions[row.question_id]) {
        questions[row.question_id] = {
          question_id: row.question_id,
          position: row.position,
          question: row.question,
          type: row.question_type,
          answers: [],
        };
      }

      // Add choices for MCQ or True-False
      if (row.choice_id) {
        const exists = questions[row.question_id].answers.find(
          (c) => c.letter_identifier === row.letter_identifier,
        );

        if (!exists) {
          questions[row.question_id].answers.push({
            choice_id: row.choice_id,
            letter_identifier: row.letter_identifier,
            answer_text: row.choice_answer,
            is_correct: Boolean(row.is_right_answer),
          });
        }
      }

      // Add identification answer (correct answer reference)
      if (!row.choice_id && row.question_type === "identification") {
        if (
          questions[row.question_id].answers.length === 0 &&
          row.identification_answer
        ) {
          questions[row.question_id].answers.push({
            answer_text: row.identification_answer,
            is_correct: true,
          });
        }
      }

      // Map student answers for MCQ / True-False
      if (row.selected_choice_id) {
        const selectedChoice = questions[row.question_id].answers.find(
          (c) => c.choice_id === row.selected_choice_id,
        );
        if (selectedChoice) {
          student_answers[row.question_id] = selectedChoice.letter_identifier;
        }
      }

      // Map student answers for Identification / Short-Answer
      if (row.answer_text && row.question_type === "identification") {
        student_answers[row.question_id] = row.answer_text;
      }

      // Fallback True-False choices if none exist in DB
      if (
        row.question_type === "true-false" &&
        questions[row.question_id].answers.length === 0
      ) {
        questions[row.question_id].answers.push(
          { letter_identifier: "T", answer_text: "True", is_correct: true },
          { letter_identifier: "F", answer_text: "False", is_correct: false },
        );
      }
    }

    return {
      questions: Object.values(questions),
      student_answers,
      score,
      total_items_score,
    };
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
          t.total_items_score,
          t.due_date,
          t.created_at,
          t.updated_at,

          -- Subquery for question count
          COALESCE(q_counts.question_count, 0) AS question_count,

          -- Student score info
          ts.account_id,
          ts.score,
          ts.max_score,

          -- Subquery to check if student has answered
          COALESCE(ta_has.has_answered, 0) AS has_answered

      FROM tasks t

      -- Access control joins
      LEFT JOIN space_members sm_space 
          ON sm_space.space_id = t.space_id 
          AND sm_space.account_id = ?

      LEFT JOIN space_members sm_course 
          ON sm_course.c_space_id = t.c_space_id 
          AND sm_course.account_id = ?

      LEFT JOIN spaces s ON s.space_id = t.space_id
      LEFT JOIN course_spaces cs ON cs.c_space_id = t.c_space_id

      -- Subquery: count questions per task
      LEFT JOIN (
          SELECT task_id, COUNT(*) AS question_count
          FROM task_questions
          GROUP BY task_id
      ) q_counts ON q_counts.task_id = t.task_id

      -- Student answers check
      LEFT JOIN (
          SELECT task_id, 1 AS has_answered
          FROM task_answers
          WHERE account_id = ?
          GROUP BY task_id
      ) ta_has ON ta_has.task_id = t.task_id

      -- Student score
      LEFT JOIN task_score ts
          ON ts.task_id = t.task_id
          AND ts.account_id = ?

      WHERE
          sm_space.account_id IS NOT NULL
          OR sm_course.account_id IS NOT NULL
          OR s.created_by = ?
          OR cs.created_by = ?

      ORDER BY t.created_at DESC;
    `;

      const params = [
        account_id, // ta.account_id
        account_id, // ts.account_id
        account_id, // sm.account_id
        account_id, // s.created_by
        account_id, // cs.created_by
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
          t.total_items_score,
          t.due_date,
          t.created_at,
          t.updated_at,

          COUNT(q.question_id) AS question_count,

          -- Use MAX or MIN for these since they come from non-grouped columns
          MAX(ts.account_id) AS account_id,
          MAX(ts.score) AS score,
          MAX(ts.max_score) AS max_score,

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

      GROUP BY 
          t.task_id,
          t.task_category,
          t.task_title,
          t.task_instruction,
          t.lesson_id,
          t.total_items_score,
          t.due_date,
          t.created_at,
          t.updated_at,
          -- Add COALESCE expression to GROUP BY
          COALESCE(t.space_id, t.c_space_id)

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
        q.point,
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
            point: row.point,
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

    try {
      await conn.beginTransaction();

      let totalScore = 0;
      let maxScore = answers.length;

      // 1️⃣ Save all answers
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
            ans.choice_id != null && !isNaN(ans.choice_id)
              ? Number(ans.choice_id)
              : null,
            ans.answer_text ?? null,
          ],
        );
      }

      // 2️⃣ Auto-grade MCQs
      const mcqGraded = await conn.execute(
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

      for (const row of mcqGraded[0]) {
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

      // 3️⃣ Auto-grade text answers
      const textAnswers = await conn.execute(
        `
      SELECT
        ta.question_id,
        ta.answer_text,
        tq.identification_answer
      FROM task_answers ta
      JOIN task_questions tq
        ON tq.question_id = ta.question_id
      WHERE ta.task_id = ?
        AND ta.account_id = ?
        AND ta.choice_id IS NULL
        AND ta.answer_text IS NOT NULL
    `,
        [task_id, account_id],
      );

      for (const row of textAnswers[0]) {
        const studentAnswer = row.answer_text?.trim().toLowerCase() || "";

        const possibleAnswers =
          row.identification_answer
            ?.split(",")
            .map((ans) => ans.trim().toLowerCase()) || [];

        const isCorrect = possibleAnswers.includes(studentAnswer);

        const score = isCorrect ? 1 : 0;
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
          [task_id, row.question_id, account_id, isCorrect, score],
        );
      }

      // 4️⃣ Save final task score
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

      return { score: totalScore, max_score: maxScore };
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
            SELECT id, title, description, total_items_score, due_date, created_at FROM tasks
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
            SELECT id, title, description, total_items_score, due_date, created_at FROM tasks
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
