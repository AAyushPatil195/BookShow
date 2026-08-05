import express from 'express'
import { getFavourites, getUserBookings, updateFavorite } from '../controllers/userController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { favouriteBodySchema } from '../validators/requestSchemas.js';

const userRouter = express.Router();

userRouter.get('/bookings', getUserBookings)
userRouter.post(
    '/update-favourite',
    validateRequest({ body: favouriteBodySchema }),
    updateFavorite
)
userRouter.get('/favourites', getFavourites)

export default userRouter;
