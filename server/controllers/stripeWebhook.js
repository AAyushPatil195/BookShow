import stripe from "stripe";
import Booking from "../models/Booking.js";

export const stripeWebhook = async (request, response) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)
    const sig = request.headers["stripe-signature"]
    
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(request.body, sig, proccess.env.STRIPE_WEBHOOK_SECRET)
    } catch (error) {
        return response.status(400).send(`webhook error: ${error.message}`)
    }

    try {
        switch(event.type){
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                const sessionList = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntent.id
                })
                const session = sessionList.data[0];
                const { bookingId } = session.metadata;

                await Booking.findByIdAndUpdate(bookingId, {
                    isPaid: true,
                    paymentLink: ""
                })
                break;
            }

            default: {
                console.log('Unhandled event type: ', event.type)
            }
        }

        response.json({recieved: true})
    } catch (error) {
        console.log("Webhook process error: ", error)
        response.status(500).send('Internal sever error')
    }
}