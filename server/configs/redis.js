
import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";
import { isBenchmark } from './environment.js';

const redis = isBenchmark
    ? new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 5000,
        retryStrategy: () => null
    })
    : new UpstashRedis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN
    });

export const CACHE_KEYS = {
    UPCOMING_SHOWS: "shows:upcoming:v1"
};

export default redis;

export async function validateBenchmarkRedis() {
    if (!isBenchmark) return;
    if (redis.status === 'wait') await redis.connect();
    if (await redis.ping() !== 'PONG') throw new Error('Benchmark Redis ping failed');
}
