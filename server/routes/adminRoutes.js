import express from 'express'
import { protectAdmin } from '../middleware/auth.js';
import { getAllBookings, getAllShows, getDashboardData, isAdmin } from '../controllers/adminController.js';

const adminRouter = express.Router();

adminRouter.use(protectAdmin)

adminRouter.get('/is-admin', isAdmin);
adminRouter.get('/dashboard', getDashboardData);
adminRouter.get('/all-shows', getAllShows);
adminRouter.get('/all-bookings', getAllBookings);

export default adminRouter;