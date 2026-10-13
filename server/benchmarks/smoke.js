import { isBenchmark, assertExternalServicesAllowed } from '../configs/environment.js';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import net from 'node:net';
import mongoose from 'mongoose';
import connectDB from '../configs/db.js';
import redis, { CACHE_KEYS, validateBenchmarkRedis } from '../configs/redis.js';
import { acquireBookingLock, releaseBookingLock, BOOKING_LOCK_TTL_SECONDS } from '../services/bookingLockService.js';
import { createBooking } from '../controllers/bookingController.js';
import Booking from '../models/Booking.js';
import '../models/Movie.js';
import Show from '../models/Show.js';

if (!isBenchmark) throw new Error('Smoke checks require benchmark mode');
const { ttlShow } = await import(process.env.BENCHMARK_CONTAINER === 'true' ? '/benchmarks/fixtures.js' : '../../benchmarks/fixtures.js');
const base = process.env.BENCHMARK_CONTAINER === 'true' ? 'http://api:3000' : 'http://127.0.0.1:3000';
async function call(path, options = {}) {
    return fetch(`${base}${path}`, { ...options, redirect: 'error' });
}
function invokeBooking(seat) {
    let status = 200;
    return new Promise((resolve, reject) => {
        const res = { status(code) { status = code; return this; }, json(body) { resolve({ status, body }); return this; } };
        createBooking({ auth: () => ({ userId: 'benchmark-user' }), body: { showId: ttlShow, selectedSeats: [seat] }, headers: {} }, res).catch(reject);
    });
}

try {
    await connectDB();
    await validateBenchmarkRedis();
    assert.throws(assertExternalServicesAllowed, /disabled/);
    assert.throws(() => new net.Socket().connect({ host: 'example.invalid', port: 443 }), /blocked/);
    await assert.rejects(fetch('https://example.invalid'), /fetch failed/);
    await assert.rejects(import('../configs/kafka.js'), /disabled/);
    await assert.rejects(import('../configs/nodemailer.js'), /disabled/);
    assert.equal((await call('/health')).status, 200);
    for (const path of ['/api/stripe', '/api/inngest', '/api/admin/dashboard', '/api/user/bookings', '/api/show/now-playing', '/api/show/add']) {
        assert.equal((await call(path, { method: 'POST' })).status, 404);
        assert.equal((await call(path)).status, 404);
    }
    assert.equal((await call('/health', { headers: { Origin: 'http://example.invalid' } })).status, 403);
    assert.equal((await call('/api/booking/create', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId: ttlShow, selectedSeats: ['A1', 'A1'] }) })).status, 400);

    await redis.del(CACHE_KEYS.UPCOMING_SHOWS);
    const firstRead = await call('/api/show/all-shows');
    const secondRead = await call('/api/show/all-shows');
    assert.equal(firstRead.headers.get('x-cache'), 'MISS');
    assert.equal(secondRead.headers.get('x-cache'), 'HIT');
    assert.deepEqual(await firstRead.json(), await secondRead.json());

    // Real 15s TTL and compare-and-delete ownership; never shorten the production TTL.
    const stale = await acquireBookingLock(ttlShow);
    assert(stale);
    assert.equal(await acquireBookingLock(ttlShow), null);
    const remaining = await redis.pttl(stale.key);
    assert(remaining > 0 && remaining <= BOOKING_LOCK_TTL_SECONDS * 1000);
    await delay(remaining + 200);
    const replacement = await acquireBookingLock(ttlShow);
    assert(replacement);
    assert.equal(await releaseBookingLock(stale), false);
    assert.equal(await redis.get(replacement.key), replacement.token);
    assert.equal((await invokeBooking('A1')).status, 409);
    assert.equal(await releaseBookingLock(replacement), true);

    // Keep an actual controller transaction's snapshot open past TTL, then let
    // a second controller request commit. The stale snapshot must retry/409,
    // using the unchanged Redis lock and MongoDB transaction code.
    const originalShowSave = Show.prototype.save;
    let entered;
    let resume;
    const atSave = new Promise(resolve => { entered = resolve; });
    const gate = new Promise(resolve => { resume = resolve; });
    let gated = false;
    Show.prototype.save = async function (...args) {
        if (String(this._id) === ttlShow && !gated) {
            gated = true;
            entered();
            await gate;
        }
        return originalShowSave.apply(this, args);
    };
    let pending;
    try {
        pending = invokeBooking('A1');
        await Promise.race([atSave, delay(10000).then(() => { throw new Error('Transaction did not reach save'); })]);
        await delay(BOOKING_LOCK_TTL_SECONDS * 1000 + 200);
        assert.equal((await invokeBooking('A1')).status, 201);
        resume();
        assert.equal((await pending).status, 409);
        const committed = await Booking.find({ show: ttlShow }).lean();
        assert.equal(committed.length, 1);
        assert.equal((await Show.findById(ttlShow)).occupiedSeats.A1, String(committed[0]._id));
    } finally {
        resume();
        if (pending) await pending;
        Show.prototype.save = originalShowSave;
    }

    // A failure after saving Show but before Booking must roll both back.
    const originalBookingSave = Booking.prototype.save;
    Booking.prototype.save = async function () { throw new Error('Injected smoke transaction failure'); };
    try { assert.equal((await invokeBooking('A2')).status, 500); }
    finally { Booking.prototype.save = originalBookingSave; }
    assert.equal((await Show.findById(ttlShow)).occupiedSeats.A2, undefined);
    assert.equal(await Booking.countDocuments({ show: ttlShow }), 1);
    assert.equal(await redis.get(`booking-lock:${ttlShow}`), null);
    console.log(JSON.stringify({ passed: true, tests: ['network guard', 'external routes disabled', 'validation', 'cache serialization',
        'real lock TTL', 'stale lock ownership', 'transaction contention after expiry', 'transaction rollback'] }));
} finally {
    await mongoose.disconnect();
    redis.disconnect();
}
