// import express from 'express';
import { Router } from 'express';
import authorization from '../../middlewares/authorization.js';
import authentication from '../../middlewares/authentication.js';
import { TaskController } from '../../controllers/v1/taskController.js';

const taskRouter = new Router();
const taskController = new TaskController();

taskRouter.use(authorization);


taskRouter.post('/upload', taskController.upload_task.bind(taskController));
taskRouter.get('/upload/:space_id', taskController.get_uploaded_tasks_by_space_id.bind(taskController));
taskRouter.post('/draft', taskController.draft_task.bind(taskController));
taskRouter.get('/draft/:space_id', taskController.get_drafted_tasks_by_space_id.bind(taskController));

export default taskRouter;
