import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodemailer.js";
import stripe from "stripe";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest functions to save user data to database
const syncUserCreation = inngest.createFunction(
   { id: 'sync-user-from-clerk', triggers: [{event: 'clerk/user.created'}]},
    async ({ event }) => {
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + " " + last_name,
            image: image_url
        }
        await User.create(userData)
    }
)

// Inngest functions to delete user data from database
const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-with-clerk', triggers: [{event: 'clerk/user.deleted'}]},
    async ({ event }) => {
        const {id} = event.data
        await User.findByIdAndDelete(id)
    }
)

// Inngest functions to update user data to database
const syncUserUpdation = inngest.createFunction(
    {id: 'update-user-from-clerk', triggers: [{event: 'clerk/user.updated'}]},
    async ({ event }) => {
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + " " + last_name,
            image: image_url
        }
        await User.findByIdAndUpdate(id, userData)
    }
)

// Inngest function to cancel booking & release seats of show after 10minutes of booking created if payment not done
const releaseSeatsAndDeleteBookings = inngest.createFunction(
    {id: 'release-seats-delete-booking',
    triggers: [{event: 'app/checkpayment'}]},  // only when this event is triggered this function will be executed
    async ({ event, step }) => {
        // scheduling 
        const tenMinutesLater = new Date(Date.now() + 10*60*1000);
        await step.sleepUntil('wait-for-10-minutes', tenMinutesLater);
        await step.run('check-payment-status', async () => {
            const bookingId = event.data.bookingId;
            const booking = await Booking.findById(bookingId)
            // check if paymemt is done, if not release & delete
            if(!booking.isPaid){
                if(booking.stripeSessionId){
                    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
                    const checkoutSession = await stripeInstance.checkout.sessions.retrieve(
                        booking.stripeSessionId
                    );

                    // A completed Checkout Session must not lose its seats while
                    // the payment webhook is still updating the booking.
                    if(checkoutSession.status === "complete") return;

                    // Stripe Checkout has a 30-minute minimum expiry. Expire the
                    // open session manually when the 10-minute seat hold ends.
                    if(checkoutSession.status === "open"){
                        await stripeInstance.checkout.sessions.expire(
                            booking.stripeSessionId
                        );
                    }
                }

                const show = await Show.findById(booking.show);
                booking.bookedSeats.forEach((seat)=>{
                    delete show.occupiedSeats[seat]
                })
                show.markModified('occupiedSeats')
                await show.save();
                await Booking.findByIdAndDelete(booking._id)
            }
        })
    }
)

// Inngest function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
    {
        id: "send-booking-confirmation-email",
        triggers: [{event: "app/show.booked"}]
    },
    async ({ event, step })=>{
        const { bookingId } = event.data;
        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: { path: 'movie', model: 'Movie' }
        }).populate('user');
        // send email
        await sendEmail({
            to: booking.user.email,
            subject: `Payment confirmation: "${booking.show.movie.title}" booked!`,
            body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
                        <h2>Hi ${booking.user.name}</h2>
                        <p>Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> is confirmed! </p>
                        <p>
                        <strong>Date:</strong>${new Date(booking.show.showDateTime).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}
                        </p>
                        <p>Thanks for booking with us!</p>
                </div>`
        })
    }
)


export const functions = [
    syncUserCreation, 
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBookings,
    sendBookingConfirmationEmail
];