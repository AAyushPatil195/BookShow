import kafka, { KAFKA_TOPICS } from "../configs/kafka.js";

const consumer = kafka.consumer({
    groupId: process.env.KAFKA_CONSUMER_GROUP_ID
        || "quickshow-booking-workers"
});

const startConsumer = async () => {
    await consumer.connect();

    await consumer.subscribe({
        topic: KAFKA_TOPICS.BOOKING_EVENTS,
        fromBeginning: false
    });

    console.log("Booking events consumer started");

    await consumer.run({
        eachMessage: async ({ partition, message }) => {
            if (!message.value) return;

            try {
                const event = JSON.parse(message.value.toString());

                console.log("Booking event consumed:", {
                    type: event.type,
                    bookingId: event.bookingId,
                    partition,
                    offset: message.offset
                });
            } catch (error) {
                console.error(
                    "Invalid booking event:",
                    error.message
                );
            }
        }
    });
};

const shutdown = async (signal) => {
    console.log(`${signal} received, stopping consumer`);
    await consumer.disconnect();
    process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startConsumer().catch((error) => {
    console.error("Booking consumer failed:", error);
    process.exit(1);
});