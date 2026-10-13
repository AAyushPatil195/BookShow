import { isBenchmark } from '../configs/environment.js';
import mongoose from 'mongoose';
import { readFile, writeFile } from 'node:fs/promises';
import connectDB from '../configs/db.js';
import redis, { CACHE_KEYS, validateBenchmarkRedis } from '../configs/redis.js';
import Movie from '../models/Movie.js';
import Show from '../models/Show.js';
import Booking from '../models/Booking.js';

if (!isBenchmark) throw new Error('Fixture tools require BENCHMARK_MODE=true');
const fixtures = await import(process.env.BENCHMARK_CONTAINER === 'true' ? '/benchmarks/fixtures.js' : '../../benchmarks/fixtures.js');
const { allShowIds, movieIds, catalogShows, requestFor, bookingModes, fixtureVersion } = fixtures;
const [command, mode, countText, summaryPath, reportPath] = process.argv.slice(2);

async function cleanup() {
    // Exact reserved fixture IDs only. Never drop databases, collections, or flush Redis.
    await Booking.deleteMany({ show: { $in: allShowIds } });
    await Show.deleteMany({ _id: { $in: allShowIds } });
    await Movie.deleteMany({ _id: { $in: movieIds } });
    await redis.del(CACHE_KEYS.UPCOMING_SHOWS, ...allShowIds.map(id => `booking-lock:${id}`));
}

async function seed() {
    await cleanup();
    await Movie.insertMany(movieIds.map((id, i) => ({
        _id: id, title: `Benchmark movie ${i}`, overview: `Synthetic fixture ${i}. `.repeat(40),
        poster_path: '/synthetic-poster', backdrop_path: '/synthetic-backdrop',
        release_date: '2026-01-01', original_language: 'en', tagline: 'Synthetic benchmark fixture',
        genres: [{ id: 1, name: 'Synthetic' }], casts: [], vote_average: 7, runtime: 120,
        createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z')
    })));
    await Show.insertMany(allShowIds.map(id => ({
        _id: id, movie: catalogShows.includes(id) ? movieIds[catalogShows.indexOf(id)] : movieIds[0],
        showDateTime: new Date('2099-01-01T12:00:00Z'), showPrice: 100, occupiedSeats: {}
    })));
    // Create indexes/collections outside timed requests, including before transactions.
    await Promise.all([Movie.init(), Show.init(), Booking.init()]);
    console.log(JSON.stringify({ seeded: true, fixtureVersion, movies: movieIds.length, shows: allShowIds.length }));
}

async function inspectDuplicates() {
    const duplicates = await Booking.aggregate([
        { $unwind: '$bookedSeats' },
        { $group: { _id: { show: '$show', seat: '$bookedSeats' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);
    console.log(JSON.stringify({ database: mongoose.connection.name, duplicateAllocations: duplicates }));
    if (duplicates.length) throw new Error('Duplicate allocations found');
}

async function freshCheck() {
    const base = process.env.BENCHMARK_CONTAINER === 'true' ? 'http://api:3000' : 'http://127.0.0.1:3000';
    const target = requestFor('same-seat', 0);
    const response = await fetch(`${base}/api/booking/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(target)
    });
    if (response.status !== 201) throw new Error(`Fresh booking failed: ${response.status}`);
    const body = await response.json();
    const booking = await Booking.findById(body.bookingId);
    const show = await Show.findById(target.showId);
    if (!booking || booking.show !== target.showId || booking.user !== 'benchmark-user' ||
        show.occupiedSeats.A1 !== body.bookingId || await Booking.countDocuments() !== 1) {
        throw new Error('Fresh transaction allocation verification failed');
    }
    await inspectDuplicates();
    console.log(JSON.stringify({ freshTransactionPassed: true, database: mongoose.connection.name, bookingId: body.bookingId }));
}

async function verify() {
    const count = Number(countText);
    if (!bookingModes.includes(mode) || !Number.isInteger(count) || count < 1 || count > 500 || !summaryPath || !reportPath) {
        throw new Error('Usage: fixture.js verify MODE COUNT SUMMARY_JSON REPORT_JSON');
    }
    const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
    if (summary.benchmark?.kind !== 'booking' || summary.benchmark.mode !== mode || summary.benchmark.requests !== count) {
        throw new Error('Summary does not match verification workload');
    }
    const targets = Array.from({ length: count }, (_, i) => requestFor(mode, i));
    const showIds = [...new Set(targets.map(target => target.showId))];
    const permitted = new Set(targets.map(target => `${target.showId}:${target.selectedSeats[0]}`));
    const bookings = await Booking.find({ show: { $in: showIds } }).lean();
    const shows = await Show.find({ _id: { $in: showIds } }).lean();
    const duplicates = await Booking.aggregate([
        { $match: { show: { $in: showIds } } }, { $unwind: '$bookedSeats' },
        { $group: { _id: { show: '$show', seat: '$bookedSeats' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);
    const errors = [];
    const owners = new Map();
    if (duplicates.length) errors.push('Duplicate allocations detected by MongoDB aggregation');
    for (const booking of bookings) {
        if (booking.user !== 'benchmark-user' || booking.isPaid || booking.paymentLink || booking.stripeSessionId) {
            errors.push(`Non-synthetic/payment data in booking ${booking._id}`);
        }
        if (booking.bookedSeats.length !== 1 || booking.amount !== 100) errors.push('Unexpected booking seat count/amount');
        for (const seat of booking.bookedSeats) {
            const key = `${booking.show}:${seat}`;
            if (!permitted.has(key)) errors.push(`Unexpected allocation ${key}`);
            owners.set(key, String(booking._id));
        }
    }
    let occupiedCount = 0;
    if (shows.length !== showIds.length) errors.push('Fixture shows are missing');
    for (const show of shows) {
        for (const [seat, owner] of Object.entries(show.occupiedSeats)) {
            occupiedCount++;
            if (owners.get(`${show._id}:${seat}`) !== owner) errors.push('Occupied seat does not match booking owner');
        }
        for (const booking of bookings.filter(b => b.show === String(show._id))) {
            for (const seat of booking.bookedSeats) {
                if (show.occupiedSeats[seat] !== String(booking._id)) errors.push('Booking has no matching occupied seat');
            }
        }
    }
    const metricCount = name => summary.metrics[name]?.values?.count || 0;
    const successes = metricCount('booking_successes');
    const conflicts = metricCount('booking_conflicts');
    if (successes !== bookings.length) errors.push('HTTP 201 count differs from committed MongoDB bookings');
    if (metricCount('api_requests') !== count || successes + conflicts !== count) errors.push('Missing requests or unexpected outcomes');
    if (metricCount('unexpected_errors') !== 0 || summary.metrics.checks?.values?.rate !== 1) errors.push('Unexpected HTTP errors or invalid responses');
    if (occupiedCount !== bookings.length) errors.push('Occupied seat count differs from booking count');
    if (mode === 'same-seat' && bookings.length !== 1) errors.push('Same-seat contention must have exactly one winner');
    if (mode === 'different-show' && bookings.length !== count) errors.push('Independent shows must all succeed');
    if (mode === 'different-seat' && bookings.length < 1) errors.push('No different-seat booking succeeded');
    const report = { verifiedAt: new Date().toISOString(), fixtureVersion, mode, requests: count,
        successes, conflicts, committedBookings: bookings.length, occupiedSeats: occupiedCount,
        duplicateAllocations: duplicates, passed: errors.length === 0, errors };
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    if (errors.length) throw new Error('MongoDB correctness verification failed');
}

try {
    await connectDB();
    await validateBenchmarkRedis();
    if (mongoose.connection.name !== 'bookshow_benchmark') throw new Error('Refusing to modify another database');
    if (command === 'setup') await seed();
    else if (command === 'cleanup') await cleanup();
    else if (command === 'verify') await verify();
    else if (command === 'inspect') await inspectDuplicates();
    else if (command === 'fresh-check') await freshCheck();
    else throw new Error('Expected setup, cleanup, verify, inspect, or fresh-check');
} finally {
    await mongoose.disconnect();
    redis.disconnect();
}
