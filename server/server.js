import { isBenchmark, benchmarkEnvironment } from './configs/environment.js';
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';
import bookingRouter from './routes/bookingRoutes.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import redis, { validateBenchmarkRedis } from './configs/redis.js';
import mongoose from 'mongoose';

const app = express();
const port = 3000;

await connectDB();
await validateBenchmarkRedis();

// Stripe webhooks route
if (!isBenchmark) {
    const { stripeWebhook } = await import('./controllers/stripeWebhook.js');
    app.use('/api/stripe', express.raw({type: 'application/json'}), stripeWebhook);
}

// MiddleWares
app.use(express.json()) // To parse all requests using JSON method
app.use(cors())
if (isBenchmark) {
    // Browser-origin requests cannot use synthetic authentication.
    app.use((req, res, next) => {
        if (req.headers.origin) return res.status(403).json({ success: false, message: 'Benchmark rejects browser origins' });
        next();
    });
    app.use((req, res, next) => {
        // Only for isolated local benchmarks.
        req.auth = () => ({
            userId: "benchmark-user"
        });
        next();
    });
} else {
    const { clerkMiddleware } = await import('@clerk/express');
    app.use(clerkMiddleware());
}

// API Routes
app.get('/', (req, res)=> res.send('Hello, Server is live !!!'))
app.use('/api/booking', apiRateLimiter, bookingRouter);
if (isBenchmark) {
    const { getAllShows } = await import('./controllers/showController.js');
    app.get('/api/show/all-shows', getAllShows);
    app.get('/health', async (req, res) => {
        try {
            await mongoose.connection.db.admin().command({ ping: 1 });
            await redis.ping();
            res.json({ benchmark: true, database: 'bookshow_benchmark', cacheMode: process.env.BENCHMARK_CACHE_MODE || 'enabled' });
        } catch {
            res.status(503).json({ success: false });
        }
    });
    app.use((req, res) => res.status(404).json({ success: false, message: 'Route disabled in benchmark mode' }));
} else {
    const [show, admin, user, { serve }, { inngest, functions }] = await Promise.all([
        import('./routes/showRoutes.js'), import('./routes/adminRoutes.js'), import('./routes/userRoutes.js'),
        import('inngest/express'), import('./inngest/index.js')
    ]);
    app.use('/api/inngest', serve({ client: inngest, functions }));
    app.use('/api/show', apiRateLimiter, show.default);
    app.use('/api/admin', apiRateLimiter, admin.default);
    app.use('/api/user', apiRateLimiter, user.default);
}

const host = isBenchmark ? (benchmarkEnvironment.container ? '0.0.0.0' : '127.0.0.1') : undefined;
const server = app.listen(port, host, () => console.log(`Server is listening on ${host || '*'}:${port}`));
if (isBenchmark) {
    const shutdown = () => server.close(async () => {
        await mongoose.disconnect();
        await redis.quit();
    });
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
}
