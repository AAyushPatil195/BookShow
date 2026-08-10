import express from 'express'
import { createBooking, getOccupiedSeats } from '../controllers/bookingController.js';
import { protectUser } from '../middleware/auth.js';

const bookingRouter = express.Router();

bookingRouter.post('/create', protectUser, createBooking);
bookingRouter.get('/seats/:showId', getOccupiedSeats);

export default bookingRouter;
