// src/routes/v1/chatRoutes.js
import { Router } from 'express'
import ChatController from '../../controllers/v1/chatController.js'
import { authMiddleware, roleMiddleware } from '../../middlewares/auth.middleware.js'

const chatRouter = Router()
const chatController = new ChatController()

chatRouter.use(authMiddleware)

// =======================
// Rooms
// =======================

chatRouter.post(
  '/rooms',
  roleMiddleware(['student', 'professor', 'admin']),
  chatController.createRoom.bind(chatController)
)

chatRouter.get(
  '/rooms',
  chatController.getRooms.bind(chatController)
)

chatRouter.get(
  '/rooms/:roomId',
  chatController.getRoomDetails.bind(chatController)
)

chatRouter.delete(
  '/rooms/:roomId',
  roleMiddleware(['professor', 'admin']),
  chatController.deleteRoom.bind(chatController)
)

// =======================
// CRDT Snapshots
// =======================

chatRouter.get(
  '/rooms/:roomId/snapshot',
  chatController.getRoomSnapshot.bind(chatController)
)

// =======================
// Participants
// =======================

chatRouter.get(
  '/rooms/:roomId/participants',
  chatController.getRoomParticipants.bind(chatController)
)

chatRouter.post(
  '/rooms/:roomId/participants',
  chatController.addParticipants.bind(chatController)
)

chatRouter.delete(
  '/rooms/:roomId/participants/:userId',
  chatController.removeParticipant.bind(chatController)
)

export default chatRouter
