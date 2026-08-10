import express from 'express';
import { forwardAiChat, getRecentBookingsForAi, protectAiService } from '../controllers/aiController.js';
import { protectUser } from '../middleware/auth.js';


const aiRouter = express.Router();

aiRouter.get('/internal/recent-bookings', protectAiService, getRecentBookingsForAi);
aiRouter.post('/chat', protectUser, forwardAiChat);

export default aiRouter;
