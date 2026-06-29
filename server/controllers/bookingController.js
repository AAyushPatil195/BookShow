import Booking from "../models/Booking.js";
import Show from "../models/Show.js"

// Function to check availibilty of selected seats
const checkSeatsAvailibility = async (showId, selectedSeats) => {
    try {
        const showData = await Show.findById(showId);
        if(!showData) return false;

        const occupiedSeats = showData.occupiedSeats;
        const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat])
        // if(isAnySeatTaken) return false;
        // return true;
        return !isAnySeatTaken;
    } catch (error) {
        console.log(error.message);
        return false;
    }
}

// Create a booking
export const createBooking = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { showId, selectedSeats } = req.body;
        const { origin } = req.headers;
        // check seats availability 
        const isAvailable = await checkSeatsAvailibility(showId, selectedSeats)
        if(isAvailable) return res.json({ success: false, message: 'Selected seats are not available'});

        const showData = await Show.findById(showId).populate('movie');

        //creat a new booking
        const  booking = await Booking.create({
            user: userId,
            show: showId,
            amount: showData.showPrice * selectedSeats.length,
            bookedSeats: selectedSeats
        });

        selectedSeats.map((seat) => {
            showData.occupiedSeats[seat] = userId;
        })
        showData.markModified('occupiedSeats');

        await showData.save();

        //Initialise Stripe Gateway 

        res.json({success: true, message: 'Seats booked successfully'})

    } catch (error) {
        console.log(error.message)
        return res.json({success: false, message: error.message})
    }
}

// Get occupied seats data
export const getOccupiedSeats = async (req, res) => {
    try {
        // const {userId} = req.auth();
        const {showId} = req.params;
        const showData = await Show.findById(showId);
        const occupiedSeats = Object.keys(showData.occupiedSeats)

        return res.json({success: true, occupiedSeats})

    } catch (error) {
        console.log(error.message)
        return res.json({success: false, message: error.message})
    }
}