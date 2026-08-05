import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { clerkMiddleware } from '@clerk/express';
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import showRouter from './routes/showRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import userRouter from './routes/userRoutes.js';
import { stripeWebhook } from './controllers/stripeWebhook.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

const app = express();
const port = 3000;

await connectDB();

// Stripe webhooks route
app.use('/api/stripe', express.raw({type: 'application/json'}), stripeWebhook)

// MiddleWares
app.use(express.json()) // To parse all requests using JSON method
app.use(cors())
app.use(clerkMiddleware())

// API Routes
app.get('/', (req, res)=> res.send('Hello, Server is live !!!'))
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use('/api/show', apiRateLimiter, showRouter);
app.use('/api/booking', apiRateLimiter, bookingRouter);
// admin
app.use('/api/admin', apiRateLimiter, adminRouter);
// user
app.use('/api/user', apiRateLimiter, userRouter)

app.listen(port, ()=> console.log(`Server is listening at http://localhost:${port}`))