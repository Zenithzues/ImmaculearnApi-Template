// import express from 'express';
import { Router } from "express";
import authorization from "../../middlewares/authorization.js";
import authentication from "../../middlewares/authentication.js";
import { TaskController } from "../../controllers/v1/taskController.js";

const taskRouter = new Router();
const taskController = new TaskController();

taskRouter.use(authorization);
taskRouter.use(authentication);

taskRouter.post("/", taskController.create_task.bind(taskController));
taskRouter.patch("/update", taskController.update_task.bind(taskController));
taskRouter.get(
  "/:space_uuid",
  taskController.get_task_by_space_uuid.bind(taskController),
);
taskRouter.get(
  "/question-answer/:task_id",
  taskController.get_question_answer_by_task_id.bind(taskController),
);
taskRouter.get("/", taskController.get_all_task.bind(taskController));

// taskRouter.get(
//   "/:task_id/respondents",
//   taskController.get_all_respondents_by_task_id.bind(taskController),
// );

taskRouter.get(
  "/:task_id/respondents",
  taskController.get_all_respondents_by_task_id.bind(taskController),
);

taskRouter.get(
  "/:task_id/task-completed",
  taskController.get_all_user_completed_task_by_task_id.bind(taskController),
);

taskRouter.get(
  "/:task_id/response/:student_id",
  taskController.get_task_respondent_by_student_id.bind(taskController),
);

taskRouter.get(
  "/questions/:task_id",
  taskController.get_questions_by_task_id.bind(taskController),
);

taskRouter.post(
  "/answer",
  taskController.submit_task_answer.bind(taskController),
);
taskRouter.post("/upload", taskController.upload_task.bind(taskController));
taskRouter.post("/draft", taskController.draft_task.bind(taskController));
taskRouter.get(
  "/upload/:space_id",
  taskController.get_uploaded_tasks_by_space_id.bind(taskController),
);
taskRouter.get(
  "/draft/:space_id",
  taskController.get_drafted_tasks_by_space_id.bind(taskController),
);

export default taskRouter;
