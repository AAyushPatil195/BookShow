import { Ratelimit } from "@upstash/ratelimit";
import redis from "../configs/redis.js";

const getClientIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"];

    if (Array.isArray(forwardedFor)) {
        return forwardedFor[0];
    }

    if (typeof forwardedFor === "string") {
        return forwardedFor.split(",")[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || "unknown";
};

const getIdentifier = (req) => {
    const userId = req.auth?.()?.userId;
    return userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
};

const createRateLimiter = ({ requests, window, prefix }) => {
    const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(requests, window),
        prefix: `quickshow:ratelimit:${prefix}`,
        timeout: 1000,
        analytics: false
    });

    return async (req, res, next) => {
        try {
            const result = await ratelimit.limit(getIdentifier(req));
            const retryAfter = Math.max(
                0,
                Math.ceil((result.reset - Date.now()) / 1000)
            );

            res.set("RateLimit-Limit", String(result.limit));
            res.set("RateLimit-Remaining", String(result.remaining));
            res.set("RateLimit-Reset", String(Math.ceil(result.reset / 1000)));

            if (!result.success) {
                res.set("Retry-After", String(retryAfter));

                return res.status(429).json({
                    success: false,
                    message: "Too many requests. Please try again later.",
                    retryAfter
                });
            }

            next();
        } catch (error) {
            // Rate limiting is protective, so transient Redis failures should
            // not make the entire API unavailable.
            console.warn("Rate limiter unavailable:", error.message);
            next();
        }
    };
};

export const apiRateLimiter = createRateLimiter({
    requests: 120,
    window: "1 m",
    prefix: "api"
});

export const bookingCreationRateLimiter = createRateLimiter({
    requests: 10,
    window: "1 m",
    prefix: "booking-create"
});

export const adminMutationRateLimiter = createRateLimiter({
    requests: 10,
    window: "10 m",
    prefix: "admin-mutation"
});
