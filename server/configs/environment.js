import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import net from 'node:net';

// Evaluate before DB/Redis or any provider modules. Benchmark startup never reads .env.
export const isBenchmark = process.env.BENCHMARK_MODE === 'true';
if (!isBenchmark) {
    dotenv.config();
    if (process.env.BENCHMARK_MODE === 'true') {
        throw new Error('Set BENCHMARK_MODE in the process environment, never in .env');
    }
}

export function validateBenchmarkEnvironment(env = process.env) {
    if (env.NODE_ENV !== 'test') throw new Error('Benchmark mode requires NODE_ENV=test');
    const credentialNames = Object.keys(env).filter(name => env[name] &&
        /SECRET|TOKEN|PASSWORD|(?:^|_)PASS$|API_KEY|PRIVATE_KEY|CREDENTIAL|DSN|^(CLERK|STRIPE|INNGEST|KAFKA|SMTP|SENDER_EMAIL|TMDB|CLOUDINARY|UPSTASH|KV_REST)_?/i.test(name));
    if (credentialNames.length) {
        throw new Error(`Benchmark mode rejects external configuration: ${credentialNames.join(', ')}`);
    }
    const container = env.BENCHMARK_CONTAINER === 'true';
    if (container && !existsSync('/.dockerenv')) throw new Error('Container binding requires Docker');
    const parseLocalURL = name => {
        try { return new URL(env[name] || ''); }
        catch { throw new Error(`Benchmark requires a valid local ${name}`); }
    };
    const mongo = parseLocalURL('MONGODB_URI');
    const redis = parseLocalURL('REDIS_URL');
    const mongoEndpoints = container ? ['mongo:27017'] : ['127.0.0.1:27018', 'localhost:27018'];
    const redisEndpoints = container ? ['redis:6379'] : ['127.0.0.1:6380', 'localhost:6380'];
    for (const [url, protocol, endpoints] of [[mongo, 'mongodb:', mongoEndpoints], [redis, 'redis:', redisEndpoints]]) {
        if (url.protocol !== protocol || !endpoints.includes(url.host) || url.username || url.password ||
            (url.pathname && url.pathname !== '/') || url.search || url.hash) {
            throw new Error(`Benchmark requires a credential-free local ${protocol} endpoint`);
        }
    }
    if (env.BENCHMARK_CACHE_MODE && !['enabled', 'disabled', 'miss'].includes(env.BENCHMARK_CACHE_MODE)) {
        throw new Error('BENCHMARK_CACHE_MODE must be enabled, disabled, or miss');
    }
    return { container, mongo, redis };
}

export const benchmarkEnvironment = isBenchmark ? validateBenchmarkEnvironment() : null;

// Defense in depth: prevent SDKs, HTTP clients, fetch, SMTP, and Kafka from opening
// sockets outside the two local stores and local benchmark API. Compose
// keeps k6 on an internal network; only API/store containers have the bridge
// needed for loopback-published ports on Docker Desktop.
if (isBenchmark) {
    const allowed = new Set([
        benchmarkEnvironment.mongo.host, benchmarkEnvironment.redis.host,
        '127.0.0.1:3000', 'localhost:3000',
        ...(benchmarkEnvironment.container ? ['api:3000'] : [])
    ]);
    const originalConnect = net.Socket.prototype.connect;
    net.Socket.prototype.connect = function (...args) {
        const normalized = Array.isArray(args[0]) ? args[0] : args;
        const options = normalized[0];
        const host = typeof options === 'object' ? (options.host || 'localhost') :
            (typeof normalized[1] === 'string' ? normalized[1] : 'localhost');
        const port = typeof options === 'object' ? options.port : options;
        if (!allowed.has(`${host}:${port}`)) throw new Error('Benchmark outbound connection blocked');
        return originalConnect.apply(this, args);
    };
}

export function assertExternalServicesAllowed() {
    if (isBenchmark) throw new Error('External services are disabled in benchmark mode');
}
