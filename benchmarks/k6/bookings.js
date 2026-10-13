import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { requestFor, bookingModes } from '../fixtures.js';
import { baseURL, ensureBenchmark, record, summaryOutput } from './common.js';

const count = Number(__ENV.REQUESTS || 100);
const mode = __ENV.MODE || 'same-seat';
if (!bookingModes.includes(mode) || !Number.isInteger(count) || count < 1 || count > 500) throw new Error('Invalid booking workload');
if (![100, 250, 500].includes(count) && __ENV.SMOKE !== 'true') throw new Error('Use 100/250/500 requests, or SMOKE=true');
const successes = new Counter('booking_successes');
const conflicts = new Counter('booking_conflicts');
const successLatency = new Trend('booking_success_latency', true);
const conflictLatency = new Trend('booking_conflict_latency', true);
const startSkew = new Trend('booking_start_skew_ms', true);

export const options = {
    scenarios: { competing: { executor: 'per-vu-iterations', vus: count, iterations: 1, maxDuration: '60s', gracefulStop: '5s' } },
    summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)', 'max'],
    thresholds: { checks: ['rate==1'], unexpected_error_rate: ['rate==0'], api_requests: [`count==${count}`],
        booking_successes: [mode === 'same-seat' ? 'count==1' : mode === 'different-show' ? `count==${count}` : 'count>0'] }
};

export function setup() {
    ensureBenchmark();
    // A best-effort wall-clock barrier reduces VU startup skew. Record actual skew.
    return { startAt: Date.now() + 3000 };
}

export default function (data) {
    const wait = data.startAt - Date.now();
    if (wait > 0) sleep(wait / 1000);
    const started = Date.now();
    startSkew.add(started - data.startAt);
    const response = http.post(`${baseURL}/api/booking/create`, JSON.stringify(requestFor(mode, __VU - 1)), {
        headers: { 'Content-Type': 'application/json' }, timeout: '30s', redirects: 0,
        tags: { phase: 'measured', mode }, responseCallback: http.expectedStatuses(201, 409)
    });
    let body;
    try { body = response.json(); } catch { body = {}; }
    const valid = response.status === 201 ? body.success === true && /^[a-f\d]{24}$/i.test(body.bookingId || '') :
        response.status === 409 && body.success === false;
    check(response, { '201 booking or expected 409 conflict': () => valid });
    successes.add(response.status === 201 && valid ? 1 : 0);
    conflicts.add(response.status === 409 && valid ? 1 : 0);
    if (response.status === 201) successLatency.add(response.timings.duration);
    if (response.status === 409) conflictLatency.add(response.timings.duration);
    record(response, started, valid);
}

export function handleSummary(data) { return summaryOutput(data, { kind: 'booking', mode, requests: count }); }
