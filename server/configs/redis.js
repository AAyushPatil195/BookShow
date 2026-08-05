import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN
});

export const CACHE_KEYS = {
    UPCOMING_SHOWS: "shows:upcoming:v1"
};

export default redis;