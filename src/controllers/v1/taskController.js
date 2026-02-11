import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateAccessToken } from '../../utils/tokens.js';
import { UserToken } from '../../models/MySQL/UserToken.js';
// import User from '../../models/MySQL/UserModel.js';
import { Logger } from '../../utils/Logger.js';
import { hybridDatabase } from '../../core/HybridDatabase.js';
import { Validator } from '../../utils/Validator.js';
import User from '../../models/MySQL/UserModel.js';
import Task from '../../models/MySQL/TaskModel.js';
import { createFile } from '../../services/fileService.js';

export class TaskController {
  constructor() {
    this.task = new Task();
    this.logger = new Logger('TaskController');
  }


  async upload_task(req, res) {
    try {
        const { space_id, title, instruction, scoring, status, due_date, groupsData } = req.body || {};

        const account_id = res.locals.account_id || 1;

        if (!space_id || !title || !instruction || !scoring || !due_date || !groupsData?.length) {
            return res.status(401).json({
                success: false,
                message: "Missing criteria for task! Try again."
            });
        }

        console.log(req.body)

        const result = await this.task.create(
            space_id,
            title,
            instruction,
            scoring,
            status,
            due_date,
            groupsData
        );

        if (!result.taskId || result.group_ids.length === 0) {
            return res.status(400).json({
                success: false, 
                message: "Failed to Create Task."
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
                content: instruction
            });

            createdFiles.push({
                group: group.group_name || `Group ${i + 1}`,
                file_id: file.file_id,
                group_id: groupId
            });
        }

        return res.json({
            success: true,
            message: "Task Created Successfully!",
            data: {
                task_id: result.taskId,
                title: title,
                groups: createdFiles
            }
        });

    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message || "Upload tasks Failed."
        });
    }
  }


  async draft_task(req, res) {
    try {

    } catch(err) {
      res.status(400).json({
        success: false,
        message: err.message || 'Draft tasks Failed.'
      });
    }
  }

  async get_uploaded_tasks_by_space_id(req, res) {
    try {
      const { space_id } = req.params;

      if (!space_id) {
        return res.status(400).json({
          success: false,
          message: 'space_id is required'
        });
      }

      console.log(`Fetching tasks for space_id: ${space_id}`);

      // TODO: Replace with real database call
      const tasks = await this.task.getUploadedTasksBySpaceId(space_id); // Example placeholder

      return res.json({
        success: true,
        data: tasks
      });
    } catch (err) {
      console.error(`Error fetching tasks for space_id ${req.params.space_id}:`, err);
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to get uploaded tasks.'
      });
    }
  }

  async get_drafted_tasks_by_space_id(req, res) {
    try {
      const { space_id } = req.params;

      if (!space_id) {
        return res.status(400).json({
          success: false,
          message: 'space_id is required'
        });
      }

      console.log(`Fetching tasks for space_id: ${space_id}`);

      // TODO: Replace with real database call
      const tasks = await this.task.getDraftedTasksBySpaceId(space_id); // Example placeholder

      return res.json({
        success: true,
        data: tasks
      });
    } catch (err) {
      console.error(`Error fetching tasks for space_id ${req.params.space_id}:`, err);
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to get drafted tasks.'
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
    const timer = this.logger.startTimer('register');
    
    try {
      const { email, password } = req.body;
      
      this.logger.info('Registration attempt', { email, ip: req.ip });

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // 1. Check if email is registered in student/professor tables
      const emailCheck = await this.user.findByEmail(email);
      if (!emailCheck) {
        return res.status(400).json({
          success: false,
          message: 'Email not registered as student or professor'
        });
      }

      // 2. Validate Gmail requirement
      const emailValidation = Validator.validateEmailWithFeedback(email);
      if (!emailValidation.valid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.message
        });
      }

      // 3. Validate password
      if (!Validator.validatePassword(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
        });
      }

      // 4. Create user account
      const result = await this.user.create(email, password);
      const accountId = result.insertId;

      // 5. Sync user to Supabase
      await hybridDatabase.syncUserToSupabase(accountId.toString());
      
      // 6. Generate tokens
      const accessToken = generateAccessToken(accountId, emailCheck.role);
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // 7. Store refresh token
      await this.userTokenModel.create(accountId, hashedRefresh);

      // 8. Set cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', JSON.stringify({ 
        refreshToken, 
        role: emailCheck.role 
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      this.logger.userActivity(accountId, 'register', {
        success: true,
        ip: req.ip,
        role: emailCheck.role,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          account_id: accountId,
          email: email,
          role: emailCheck.role
        }
      });

    } catch (error) {
      this.logger.logError(error, {
        operation: 'register',
        email: req.body?.email,
        ip: req.ip
      });

      // Handle duplicate email error
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    } finally {
      timer.end();
    }
  }
}