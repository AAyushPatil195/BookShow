import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Movie from "../models/Movie.js";

// API controller function to get user bookings
export const getUserBookings = async (req, res) => {
    try {
        const user = req.auth().userId;
        const bookings = await Booking.find({user})
                                      .populate({
                                        path: 'show',
                                        populate: {path: 'movie'}
                                      })
                                      .sort({ createdAt: -1 });
                        
        res.json({ success: true, bookings })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// API controller function to add/remove favourite movie in CLERK User METADATA
export const updateFavorite = async (req, res) => {
    try {
        const { movieId } = req.body();
        const userId = req.auth().userId;
        const user = await clerkClient.users.getUser(userId);

        if(!user.privateMetadata.favourites) user.privateMetadata.favourites = []

        if(!user.privateMetadata.favourites.includes(movieId)){
            // Add movie to fav list
            user.privateMetadata.favourites.push(movieId)
        }else{
            // Remove movie from fav list
             user.privateMetadata.favourites = user.privateMetadata.favourites.filter((item)=> item!==movieId)
        }

        await clerkClient.users.updateUserMetadata(userId, {privateMetadata: user.privateMetadata})

        res.json({success: true, message: 'Favourite movies update successfully'})

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// API to get fav movies
export const getFavourites = async (req, res) => {
    try {
        const user = await clerkClient.users.getUser(req.auth().userId);
        const favourites = user.privateMetadata.favourites;

        // Get movies from database
        const movies = await Movie.find({ _id: {$in: favourites}})

        res.json({ success: true, movies });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}