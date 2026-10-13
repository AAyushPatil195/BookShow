import { randomUUID } from "node:crypto";
import redis from "../configs/redis.js";
import { isBenchmark } from '../configs/environment.js';

export const BOOKING_LOCK_TTL_SECONDS = 15;

const getBookingLockKey = (showId) => {
    return `booking-lock:${showId}`;
};

// Acquire a lock for one show
export const acquireBookingLock = async (showId) => {
    if (!showId) {
        throw new Error("showId is required to acquire booking lock");
    }

    const key = getBookingLockKey(showId);
    const token = randomUUID();

    const result = isBenchmark
    ? await redis.set(key, token, "EX", BOOKING_LOCK_TTL_SECONDS, "NX")
    : await redis.set(key, token, {
        nx: true,
        ex: BOOKING_LOCK_TTL_SECONDS
    });

    // Redis returns null when another request already owns the lock
    if (result !== "OK") {
        return null;
    }

    return { key, token };
};

// Delete the lock only when this request still owns it
export const releaseBookingLock = async (lock) => {
    if (!lock?.key || !lock?.token) {
        return false;
    }

    const releaseScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
    `;

    const result = isBenchmark
    ? await redis.eval(releaseScript, 1, lock.key, lock.token)
    : await redis.eval(releaseScript, [lock.key], [lock.token]);

    return Number(result) === 1;
};
