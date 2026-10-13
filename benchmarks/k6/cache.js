import http from 'k6/http';
import execution from 'k6/execution';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { baseURL, ensureBenchmark, record, summaryOutput } from './common.js';
import { movieIds } from '../fixtures.js';

const mode = __ENV.CACHE_MODE || 'enabled';
const rate = Number(__ENV.RATE || 100);
const seconds = Number(__ENV.SECONDS || 30);
const vus = Number(__ENV.VUS || 50);
if (!['enabled', 'miss', 'disabled'].includes(mode) || !Number.isInteger(rate) || rate < 1 || rate > 10000 ||
    !Number.isInteger(seconds) || seconds < 1 || seconds > 300 || !Number.isInteger(vus) || vus < 1 || vus > 500) throw new Error('Invalid cache workload');
const expectedHeader = { enabled: 'HIT', miss: 'MISS', disabled: 'BYPASS' }[mode];
const headers = new Counter('cache_responses');
const hitLatency = new Trend('cache_hit_latency', true);
const missLatency = new Trend('cache_miss_latency', true);
const bypassLatency = new Trend('cache_bypass_latency', true);

export const options = {
    scenarios: { reads: { executor: 'constant-arrival-rate', rate, timeUnit: '1s', duration: `${seconds}s`,
        preAllocatedVUs: vus, maxVUs: vus, gracefulStop: '30s' } },
    summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)', 'max'],
    thresholds: { checks: ['rate==1'], unexpected_error_rate: ['rate==0'],
        dropped_iterations: ['count==0'], api_requests: [`count==${rate * seconds}`] }
};

function read(phase) {
    return http.get(`${baseURL}/api/show/all-shows`, { tags: { phase, cache_mode: mode },
        timeout: '30s', redirects: 0, responseCallback: http.expectedStatuses(200) });
}

export function setup() {
    ensureBenchmark(mode);
    // Identical warm-up for MongoDB, sockets and serializer in all three modes.
    // Setup is excluded from the custom measured latency and RPS metrics.
    for (let i = 0; i < 5; i++) {
        const response = read('warmup');
        if (response.status !== 200 || response.json().success !== true) throw new Error('Cache warm-up failed');
    }
}

export default function () {
    // k6 may schedule an iteration at the duration boundary. Cap actual HTTP
    // requests to the fixed offered count, keeping all modes identical.
    if (execution.scenario.iterationInTest >= rate * seconds) return;
    const started = Date.now();
    const response = read('measured');
    let body;
    try { body = response.json(); } catch { body = {}; }
    const header = response.headers['X-Cache'];
    const ids = Array.isArray(body.shows) ? body.shows.map(movie => movie._id).sort() : [];
    const valid = response.status === 200 && body.success === true && header === expectedHeader &&
        JSON.stringify(ids) === JSON.stringify([...movieIds].sort());
    check(response, { 'correct synthetic payload and cache state': () => valid });
    headers.add(1, { cache: header || 'UNKNOWN' });
    if (header === 'HIT') hitLatency.add(response.timings.duration);
    if (header === 'MISS') missLatency.add(response.timings.duration);
    if (header === 'BYPASS') bypassLatency.add(response.timings.duration);
    record(response, started, valid);
}

export function handleSummary(data) {
    return summaryOutput(data, { kind: 'cache', mode, rate, seconds, vus,
        offeredRPS: rate, completedRPS: (data.metrics.api_requests?.values.count || 0) / seconds });
}
