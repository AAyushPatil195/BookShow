import express from 'express';
import { forwardAiChat } from '../controllers/aiController.js';
import { protectUser } from '../middleware/auth.js';


const aiRouter = express.Router();

aiRouter.post('/chat', protectUser, forwardAiChat);

export default aiRouter;
