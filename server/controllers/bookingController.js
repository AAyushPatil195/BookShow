import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js"
import stripe from 'stripe'

import {
    acquireBookingLock,
    releaseBookingLock
} from "../services/bookingLockService.js";

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
// export const createBooking = async (req, res) => {
//     try {
//         const { userId } = req.auth();
//         const { showId, selectedSeats } = req.body;
//         const { origin } = req.headers;
//         // check seats availability 
//         const isAvailable = await checkSeatsAvailibility(showId, selectedSeats)
//         if(!isAvailable) return res.json({ success: false, message: 'Selected seats are not available'});

//         const showData = await Show.findById(showId).populate('movie');

//         //creat a new booking
//         const  booking = await Booking.create({
//             user: userId,
//             show: showId,
//             amount: showData.showPrice * selectedSeats.length,
//             bookedSeats: selectedSeats
//         });

//         selectedSeats.map((seat) => {
//             showData.occupiedSeats[seat] = userId;
//         })
//         showData.markModified('occupiedSeats');

//         await showData.save();

//         //Initialise Stripe Gateway 
//         const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)
//             // creating line items for stripe
//         const line_items = [{
//             price_data: {
//                 currency: 'eur',
//                 product_data: {
//                     name: showData.movie.title
//                 },
//                 unit_amount: Math.floor(booking.amount)*100
//             },
//             quantity: 1
//         }]
//             // Payment session
//         const session = await stripeInstance.checkout.sessions.create({
//             success_url: `${origin}/loading/my-bookings`, // Origin -> FE URL
//             cancel_url: `${origin}/my-bookings`,
//             line_items: line_items,
//             mode: 'payment',
//             metadata: {
//                 bookingId: booking._id.toString()
//             },
//             expires_at: Math.floor(Date.now()/1000)+ 30*60  // 30 minutes
//         })
//         booking.paymentLink = session.url
//         await booking.save();

//         // Trigger event -> Run inngest function to check payment status after 10mins, else delete booking
//         await inngest.send({
//             name: 'app/checkpayment',
//             data: {
//                 bookingId: booking._id.toString()
//             }
//         })

//         res.json({success: true, url: session.url})

//     } catch (error) {
//         console.log(error.message)
//         return res.json({success: false, message: error.message})
//     }
// }
// ----> REDIS
export const createBooking = async (req, res) => {
    let bookingLock = null;

    try {
        const { userId } = req.auth();
        const { showId, selectedSeats } = req.body;
        const { origin } = req.headers;

        // Basic backend validation
        if (
            !showId ||
            !Array.isArray(selectedSeats) ||
            selectedSeats.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Show and selected seats are required"
            });
        }

        /*
         * Acquire Redis lock.
         * If Redis itself is unavailable, fail safely instead of risking
         * two simultaneous MongoDB updates.
         */
        try {
            bookingLock = await acquireBookingLock(showId);
        } catch (redisError) {
            console.error("Redis lock acquisition failed:", redisError.message);

            return res.status(503).json({
                success: false,
                message: "Booking service is temporarily unavailable"
            });
        }

        // Another request currently owns this show's lock
        if (!bookingLock) {
            return res.status(409).json({
                success: false,
                message: "Another booking is being processed. Please try again."
            });
        }

        let showData;
        let booking;

        /*
         * Critical section:
         * only one request for this show can execute this block at a time.
         */
        try {
            const isAvailable = await checkSeatsAvailibility(
                showId,
                selectedSeats
            );

            if (!isAvailable) {
                return res.status(409).json({
                    success: false,
                    message: "Selected seats are not available"
                });
            }

            showData = await Show.findById(showId).populate("movie");

            if (!showData) {
                return res.status(404).json({
                    success: false,
                    message: "Show not found"
                });
            }

            booking = await Booking.create({
                user: userId,
                show: showId,
                amount: showData.showPrice * selectedSeats.length,
                bookedSeats: selectedSeats
            });

            selectedSeats.forEach((seat) => {
                showData.occupiedSeats[seat] = userId;
            });

            showData.markModified("occupiedSeats");
            await showData.save();

        } finally {
            /*
             * This executes for success, return statements and thrown errors.
             * If Redis release fails, the lock still expires after 15 seconds.
             */
            try {
                const released = await releaseBookingLock(bookingLock);

                if (!released) {
                    console.warn(
                        `Booking lock was already expired: ${bookingLock.key}`
                    );
                }
            } catch (redisError) {
                console.error(
                    "Redis lock release failed:",
                    redisError.message
                );
            }
        }

        /*
         * The seats are now recorded in MongoDB, so Stripe does not need
         * to execute while the short Redis lock is held.
         */
        const stripeInstance = new stripe(
            process.env.STRIPE_SECRET_KEY
        );

        const line_items = [{
            price_data: {
                currency: "eur",
                product_data: {
                    name: showData.movie.title
                },
                unit_amount: Math.floor(booking.amount) * 100
            },
            quantity: 1
        }];

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-bookings`,
            cancel_url: `${origin}/my-bookings`,
            line_items,
            mode: "payment",
            metadata: {
                bookingId: booking._id.toString()
            },
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60
        });

        booking.paymentLink = session.url;
        await booking.save();

        // Existing Inngest cleanup flow remains unchanged
        await inngest.send({
            name: "app/checkpayment",
            data: {
                bookingId: booking._id.toString()
            }
        });

        return res.json({
            success: true,
            url: session.url
        });

    } catch (error) {
        console.error("Booking creation failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to create booking"
        });
    }
};

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