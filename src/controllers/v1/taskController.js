import jwt from "jsonwebtoken";
import crypto from "crypto";
import { generateAccessToken } from "../../utils/tokens.js";
import { UserToken } from "../../models/MySQL/UserToken.js";
// import User from '../../models/MySQL/UserModel.js';
import { Logger } from "../../utils/Logger.js";
// import { hybridDatabase } from "../../core/HybridDatabase.js";
import { Validator } from "../../utils/Validator.js";
import User from "../../models/MySQL/UserModel.js";
import Task from "../../models/MySQL/TaskModel.js";
import Space from "../../models/MySQL/SpaceModel.js";
import { createFile } from "../../services/fileService.js";

export class TaskController {
  constructor() {
    this.task = new Task();
    this.space = new Space();
    this.logger = new Logger("TaskController");
  }

  async create_task(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id) {
        return res.status(401).json({
          success: false,
          message: "UnAuthenticated User.",
        });
      }

      const { space_uuid, taskData } = req.body || {};
      console.log(space_uuid, taskData);
      if (!taskData || !space_uuid) {
        return res.status(400).json({
          success: false,
          message: "Missing task data or space_uuid.",
        });
      }

      if (!taskData.lesson_id)
        return res
          .status(400)
          .json({ success: false, message: "Must have Related Lesson" });

      let space = await this.space.getBySpaceUuid(space_uuid);
      let c_space_id = null;
      let space_id = null;

      if (space.length > 0) {
        space_id = space[0].space_id; // normal space
      } else {
        space = await this.space.getByCourseSpaceUuid(space_uuid);
        if (!space)
          return res
            .status(404)
            .json({ success: false, message: "Space not found" });

        c_space_id = space[0].space_id; // course space
      }

      // Call model to insert task + questions + choices

      const taskId = await this.task.createTask(taskData, space_id, c_space_id);

      res.json({
        success: true,
        message: "Successfully created task",
        task_id: taskId,
      });
    } catch (err) {
      this.logger.error("Error in TaskController.createTask", err);
      res.status(500).json({
        success: false,
        message: err.message || "Create task failed.",
      });
    }
  }

  async update_task(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id) {
        return res.status(401).json({
          success: false,
          message: "UnAuthenticated User.",
        });
      }

      const { taskData } = req.body || {};
      if (!taskData.task_id) {
        return res.status(400).json({
          success: false,
          message: "task id required.",
        });
      }

      // Call model to insert task + questions + choices
      const taskId = await this.task.updateTaskByTaskId(taskData);

      res.json({
        success: true,
        message: "Successfully created task",
        task_id: taskId,
      });
    } catch (err) {
      this.logger.error("Error in TaskController.createTask", err);
      res.status(500).json({
        success: false,
        message: err.message || "Create task failed.",
      });
    }
  }

  async get_all_task(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id) {
        return res.status(401).json({
          success: false,
          message: "UnAuthenticated User.",
        });
      }

      // 3️⃣ Call Task model to fetch tasks
      const tasks = await this.task.getAllTasks(account_id);

      res.json({
        success: true,
        message: "Successfully fetched tasks",
        data: tasks, // array of tasks with unified space_id
      });
    } catch (err) {
      this.logger.error("Error in TaskController.get_task_by_space_uuid", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch tasks",
      });
    }
  }

  async get_all_respondents_by_task_id(req, res) {
    try {
      const account_id = res.locals.account_id || 1;
      if (!account_id) {
        return res.status(401).json({
          success: false,
          message: "UnAuthenticated User.",
        });
      }

      const task_id = req.params.task_id;

      if (!task_id && typeof task_id !== "number")
        return res
          .status(400)
          .json({ success: false, message: "Invalid Task ID." });

      const taskInfo = await this.task.getTaskByTaskId(task_id);

      if (taskInfo.created_by !== account_id)
        return res.status(400).json({
          success: false,
          message: "You are not the owner of the task.",
        });

      // 3️⃣ Call Task model to fetch tasks
      const tasks = await this.task.getAllRespondentsByTaskId(task_id);

      res.json({
        success: true,
        message: "Successfully fetched tasks",
        data: tasks, // array of tasks with unified space_id
      });
    } catch (err) {
      this.logger.error("Error in TaskController.get_task_by_space_uuid", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch tasks",
      });
    }
  }

  async get_all_user_completed_task_by_task_id(req, res) {
    try {
      const account_id = res.locals.account_id || 1;
      if (!account_id) {
        return res.status(401).json({
          success: false,
          message: "UnAuthenticated User.",
        });
      }

      const task_id = req.params.task_id;

      if (!task_id && typeof task_id !== "number")
        return res
          .status(400)
          .json({ success: false, message: "Invalid Task ID." });

      const taskInfo = await this.task.getTaskByTaskId(task_id);

      if (taskInfo.created_by !== account_id)
        return res.status(400).json({
          success: false,
          message: "You are not the owner of the task.",
        });

      // 3️⃣ Call Task model to fetch tasks
      const tasks = await this.task.getAllUserCompletedTaskByTaskId(task_id);

      res.json({
        success: true,
        message: "Successfully fetched tasks",
        data: tasks, // array of tasks with unified space_id
      });
    } catch (err) {
      this.logger.error("Error in TaskController.get_task_by_space_uuid", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch tasks",
      });
    }
  }

  async get_task_respondent_by_student_id(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id) {
        return res.status(401).json({
          success: false,
          message: "UnAuthenticated User.",
        });
      }

      const student_id = req.params.student_id;
      const task_id = req.params.task_id;

      if (!student_id || !task_id || Number(student_id) !== account_id)
        return res
          .status(400)
          .json({ success: false, message: "Invalid Request." });

      // 3️⃣ Call Task model to fetch tasks
      const tasks = await this.task.getResponseByStudentIdAndTaskId(
        student_id,
        task_id,
      );

      if (!tasks)
        return res.status(404).json({
          success: false,
          message: "All Student must answer before viewing score",
        });

      res.json({
        success: true,
        message: "Successfully fetched tasks",
        data: tasks, // array of tasks with unified space_id
      });
    } catch (err) {
      this.logger.error("Error in TaskController.get_task_by_space_uuid", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch tasks",
      });
    }
  }

  async get_task_by_space_uuid(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id) {
        return res.status(401).json({
          success: false,
          message: "UnAuthenticated User.",
        });
      }

      const space_uuid = req.params.space_uuid || "";

      console.log(space_uuid);

      // 1️⃣ Lookup normal space
      let space = await this.space.getBySpaceUuid(space_uuid);
      let space_id = null;
      let c_space_id = null;

      // console.log(space);
      if (space.length > 0) {
        space_id = space[0].space_id; // normal space
      } else {
        // 2️⃣ Lookup course space
        space = await this.space.getByCourseSpaceUuid(space_uuid);

        if (!space || space.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Space not found",
          });
        }
        c_space_id = space[0].space_id; // course space
      }

      // 3️⃣ Call Task model to fetch tasks
      const tasks = await this.task.getTaskBySpaceUUID(
        space_id,
        c_space_id,
        account_id,
      );

      res.json({
        success: true,
        message: "Successfully fetched tasks",
        data: tasks, // array of tasks with unified space_id
      });
    } catch (err) {
      this.logger.error("Error in TaskController.get_task_by_space_uuid", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch tasks",
      });
    }
  }

  async get_questions_by_task_id(req, res) {
    try {
      const account_id = res.locals.account_id;

      if (!account_id) {
        return res.status(401).json({
          success: false,
          message: "UnAuthenticated User.",
        });
      }

      const task_id = req.params.task_id;

      if (!task_id) {
        return res.status(400).json({
          success: false,
          message: "Invalid task id.",
        });
      }

      // Fetch questions from model
      const questions = await this.task.getQuestionsByTaskId(task_id);

      return res.json({
        success: true,
        message: "Successfully fetched questions",
        data: questions,
      });
    } catch (err) {
      this.logger.error(
        "Error in TaskController.get_questions_by_task_id",
        err,
      );
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch questions",
      });
    }
  }

  async submit_task_answer(req, res) {
    try {
      const account_id = res.locals.account_id;
      const { task_id, answers } = req.body;

      if (!account_id || !task_id || !Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          message: "Invalid request",
        });
      }

      const result = await this.task.submitTaskAnswer({
        task_id,
        account_id,
        answers,
      });

      return res.json({
        success: true,
        message: "Task submitted successfully",
        data: result,
      });
    } catch (err) {
      this.logger.error("Error submitting task", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Submission failed",
      });
    }
  }

  async upload_task(req, res) {
    try {
      const {
        space_id,
        title,
        instruction,
        scoring,
        status,
        due_date,
        groupsData,
      } = req.body || {};

      const account_id = res.locals.account_id;

      if (
        !space_id ||
        !title ||
        !instruction ||
        !scoring ||
        !due_date ||
        !groupsData?.length
      ) {
        return res.status(401).json({
          success: false,
          message: "Missing criteria for task! Try again.",
        });
      }

      const result = await this.task.create(
        space_id,
        title,
        instruction,
        scoring,
        status,
        due_date,
        groupsData,
      );

      if (!result.taskId || result.group_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Failed to Create Task.",
        });
      }

      const createdFiles = [];

      // Match each group with its corresponding group_id
      for (let i = 0; i < groupsData.length; i++) {
        const group = groupsData[i];
        const groupId = result.group_ids[i]; // Get the matching group_id

        const file = await createFile({
          title: group.group_name || `Group ${i + 1}`,
          space_id,
          owner_id: account_id,
          group_id: groupId, // Use the specific group_id
          content: instruction,
        });

        createdFiles.push({
          group: group.group_name || `Group ${i + 1}`,
          file_id: file.file_id,
          group_id: groupId,
        });
      }

      return res.json({
        success: true,
        message: "Task Created Successfully!",
        data: {
          task_id: result.taskId,
          title: title,
          groups: createdFiles,
        },
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message || "Upload tasks Failed.",
      });
    }
  }

  async draft_task(req, res) {
    try {
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message || "Draft tasks Failed.",
      });
    }
  }

  async get_uploaded_tasks_by_space_id(req, res) {
    try {
      const { space_id } = req.params;

      if (!space_id) {
        return res.status(400).json({
          success: false,
          message: "space_id is required",
        });
      }

      console.log(`Fetching tasks for space_id: ${space_id}`);

      // TODO: Replace with real database call
      const tasks = await this.task.getUploadedTasksBySpaceId(space_id); // Example placeholder

      return res.json({
        success: true,
        data: tasks,
      });
    } catch (err) {
      console.error(
        `Error fetching tasks for space_id ${req.params.space_id}:`,
        err,
      );
      res.status(500).json({
        success: false,
        message: err.message || "Failed to get uploaded tasks.",
      });
    }
  }

  async get_drafted_tasks_by_space_id(req, res) {
    try {
      const { space_id } = req.params;

      if (!space_id) {
        return res.status(400).json({
          success: false,
          message: "space_id is required",
        });
      }

      console.log(`Fetching tasks for space_id: ${space_id}`);

      // TODO: Replace with real database call
      // const tasks = await this.task.getDraftedTasksBySpaceId(space_id); // Example placeholder

      return res.json({
        success: true,
        data: [],
      });
    } catch (err) {
      console.error(
        `Error fetching tasks for space_id ${req.params.space_id}:`,
        err,
      );
      res.status(500).json({
        success: false,
        message: err.message || "Failed to get drafted tasks.",
      });
    }
  }

  async get_question_answer_by_task_id(req, res) {
    try {
      const account_id = res.locals.account_id;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "Unauthenticated professor." });

      const task_id = req.params.task_id;

      if (!task_id)
        return res
          .status(400)
          .json({ success: false, message: "Task ID required" });

      const task = await this.task.getTaskByTaskId(task_id);

      if (!task || task.length === 0)
        return res
          .status(404)
          .json({ success: false, messsage: "Task not found" });

      if (task.created_by !== account_id)
        return res.status(400).json({
          success: false,
          message: "Invalid request, You are not the owner of the task!",
        });

      const taskQuestionAndAnswer =
        await this.task.getQuestionAndAnswerByTaskId(task_id);

      if (!taskQuestionAndAnswer || taskQuestionAndAnswer.length === 0)
        return res.json({
          success: true,
          message: "No Question and Answer found.",
          data: [],
        });

      return res.json({
        success: true,
        message: `Successfully Get Question and Answer with task id ${task_id}`,
        data: taskQuestionAndAnswer,
      });
    } catch (err) {
      console.error(
        `Error fetching Questions for task_id ${req.params.task_id}:`,
        err,
      );
      res.status(500).json({
        success: false,
        message: err.message || "Failed to get Questions for task id.",
      });
    }
  }

  //   async get_all_uploaded_tasks(req, res) {
  //     try {

  //     } catch(err) {
  //       res.status(400).json({
  //         success: false,
  //         message: err.message || 'Get all Uploaded tasks Failed.'
  //       });
  //     }
  //   }

  //   async get_all_drafted_tasks(req, res) {
  //     try {

  //     } catch(err) {
  //       res.status(400).json({
  //         success: false,
  //         message: err.message || 'Get all Drafted tasks Failed.'
  //       });
  //     }
  //   }

  async register(req, res) {
    const timer = this.logger.startTimer("register");

    try {
      const { email, password } = req.body;

      this.logger.info("Registration attempt", { email, ip: req.ip });

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // 1. Check if email is registered in student/professor tables
      const emailCheck = await this.user.findByEmail(email);
      if (!emailCheck) {
        return res.status(400).json({
          success: false,
          message: "Email not registered as student or professor",
        });
      }

      // 2. Validate Gmail requirement
      const emailValidation = Validator.validateEmailWithFeedback(email);
      if (!emailValidation.valid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.message,
        });
      }

      // 3. Validate password
      if (!Validator.validatePassword(password)) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        });
      }

      // 4. Create user account
      const result = await this.user.create(email, password);
      const accountId = result.insertId;

      // 5. Sync user to Supabase
      // await hybridDatabase.syncUserToSupabase(accountId.toString());

      // 6. Generate tokens
      const accessToken = generateAccessToken(accountId, emailCheck.role);
      const refreshToken = crypto.randomBytes(40).toString("hex");
      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // 7. Store refresh token
      await this.userTokenModel.create(accountId, hashedRefresh);

      // 8. Set cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        samesite: "Strict",
        //samesite: "None",
        maxAge: 1 * 60 * 1000,
      });

      res.cookie(
        "refreshToken",
        JSON.stringify({
          refreshToken,
          role: emailCheck.role,
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          samesite: "Strict",
          //samesite: "None",
          //samesite: "None",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        },
      );

      this.logger.userActivity(accountId, "register", {
        success: true,
        ip: req.ip,
        role: emailCheck.role,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          account_id: accountId,
          email: email,
          role: emailCheck.role,
        },
      });
    } catch (error) {
      this.logger.logError(error, {
        operation: "register",
        email: req.body?.email,
        ip: req.ip,
      });

      // Handle duplicate email error
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || "Registration failed",
      });
    } finally {
      timer.end();
    }
  }
}
