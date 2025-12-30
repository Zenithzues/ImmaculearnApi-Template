// src/routes/v1/chatRoutes.js
import { Router } from 'express';
// import ChatController from '../../controllers/v1/ChatController.js';
// import { authMiddleware, roleMiddleware } from '../../middleware/auth.middleware.js'; // Adjust path as needed
import ChatController from '../../controllers/v1/chatController.js';
import { authMiddleware, roleMiddleware } from '../../middlewares/auth.middleware.js';

const chatRouter = Router();
const chatController = new ChatController();

// Apply authentication to all routes
// chatRouter.use(authMiddleware);

// Optional: Apply default role check for all routes
// chatRouter.use(roleMiddleware(['student', 'professor', 'admin']));

// Room routes
chatRouter.post('/rooms', chatController.createRoom.bind(chatController));
chatRouter.get('/rooms', chatController.getRooms.bind(chatController));
chatRouter.get('/rooms/:roomId/participants', chatController.getRoomParticipants.bind(chatController));

// Message routes
chatRouter.post('/rooms/:roomId/messages', chatController.sendMessage.bind(chatController));
chatRouter.get('/rooms/:roomId/messages', chatController.getMessages.bind(chatController));
// chatRouter.post('/rooms/:roomId/messages', roleMiddleware(['student', 'professor', 'admin']), chatController.sendMessage.bind(chatController));
// chatRouter.get('/rooms/:roomId/messages', roleMiddleware(['student', 'professor', 'admin']), chatController.getMessages.bind(chatController));

export default chatRouter;