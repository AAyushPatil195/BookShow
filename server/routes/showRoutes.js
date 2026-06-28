import express from 'express'
import { addShow, getAllShows, getNowPlayingMovies, getShow } from '../controllers/showController.js';
import { protectAdmin } from '../middleware/auth.js';

const showRouter = express.Router();

showRouter.get('/now-playing', protectAdmin, getNowPlayingMovies);
showRouter.post('/add', protectAdmin, addShow);
showRouter.get('/all-shows', getAllShows);
showRouter.get('/:movieId', getShow);

export default showRouter