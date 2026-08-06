import { Kafka, logLevel } from "kafkajs";

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
    .split(",")
    .map((broker) => broker.trim());

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "quickshow-api",
    brokers,
    logLevel: logLevel.WARN
});

export const KAFKA_TOPICS = {
    BOOKING_EVENTS: "booking-events"
};

export default kafka;