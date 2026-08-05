import express from 'express'
import { createBooking, getOccupiedSeats } from '../controllers/bookingController.js';
import { bookingCreationRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createBookingBodySchema, showIdParamsSchema } from '../validators/requestSchemas.js';

const bookingRouter = express.Router();

bookingRouter.post(
    '/create',
    bookingCreationRateLimiter,
    validateRequest({ body: createBookingBodySchema }),
    createBooking
);
bookingRouter.get(
    '/seats/:showId',
    validateRequest({ params: showIdParamsSchema }),
    getOccupiedSeats
);

export default bookingRouter;
