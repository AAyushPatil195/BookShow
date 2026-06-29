import express from 'express'
import { protectAdmin } from '../middleware/auth.js';
import { getAllBookings, getAllShows, getDashboardData, isAdmin } from '../controllers/adminController.js';

const adminRouter = express.Router();

application.use(protectAdmin)

adminRouter.get('/isAdmin', isAdmin);
adminRouter.get('/dashboard', getDashboardData);
adminRouter.get('/all-shows', getAllShows);
adminRouter.get('/all-bookings', getAllBookings);

export default adminRouter;