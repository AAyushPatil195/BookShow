import kafka, { KAFKA_TOPICS } from "../configs/kafka.js";

const producer = kafka.producer();
let connectionPromise = null;

const ensureProducerConnected = async () => {
    if (!connectionPromise) {
        connectionPromise = producer.connect().catch((error) => {
            connectionPromise = null;
            throw error;
        });
    }

    await connectionPromise;
};

export const publishBookingEvent = async ({
    type,
    bookingId,
    payload = {}
}) => {
    await ensureProducerConnected();

    await producer.send({
        topic: KAFKA_TOPICS.BOOKING_EVENTS,
        messages: [
            {
                key: String(bookingId),
                value: JSON.stringify({
                    type,
                    bookingId: String(bookingId),
                    occurredAt: new Date().toISOString(),
                    payload
                })
            }
        ]
    });
};

export const disconnectKafkaProducer = async () => {
    if (!connectionPromise) return;

    await connectionPromise;
    await producer.disconnect();
    connectionPromise = null;
};