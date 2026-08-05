import express from 'express'
import { addShow, getAllShows, getNowPlayingMovies, getShow } from '../controllers/showController.js';
import { protectAdmin } from '../middleware/auth.js';
import { adminMutationRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { addShowBodySchema, movieIdParamsSchema } from '../validators/requestSchemas.js';

const showRouter = express.Router();

showRouter.get('/now-playing', protectAdmin, getNowPlayingMovies);
showRouter.post(
    '/add',
    protectAdmin,
    adminMutationRateLimiter,
    validateRequest({ body: addShowBodySchema }),
    addShow
);
showRouter.get('/all-shows', getAllShows);
showRouter.get(
    '/:movieId',
    validateRequest({ params: movieIdParamsSchema }),
    getShow
);

export default showRouter
