import {
    publishBookingEvent,
    disconnectKafkaProducer
} from "../services/kafkaProducerService.js";

const bookingId = `test-${Date.now()}`;

try {
    await publishBookingEvent({
        type: "booking.created",
        bookingId,
        payload: {
            userId: "test-user",
            seats: ["A1", "A2"]
        }
    });

    console.log("Kafka event published:", bookingId);
} catch (error) {
    console.error("Kafka test failed:", error);
    process.exitCode = 1;
} finally {
    await disconnectKafkaProducer();
}