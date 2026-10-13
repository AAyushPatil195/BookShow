import http from 'k6/http';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';
import { fixtureVersion } from '../fixtures.js';

export const baseURL = __ENV.BASE_URL || 'http://api:3000';
if (!/^http:\/\/(api:3000|127\.0\.0\.1:3001|localhost:3001)$/.test(baseURL)) throw new Error('k6 target must be local benchmark API');
export const apiRequests = new Counter('api_requests');
export const unexpectedErrors = new Counter('unexpected_errors');
export const unexpectedRate = new Rate('unexpected_error_rate');
export const apiLatency = new Trend('api_latency', true);
const window = new Gauge('request_window_ms');

export function ensureBenchmark(cacheMode) {
    const response = http.get(`${baseURL}/health`, { tags: { phase: 'setup' }, responseCallback: http.expectedStatuses(200), redirects: 0 });
    const data = response.json();
    if (response.status !== 200 || data.benchmark !== true || data.database !== 'bookshow_benchmark' || (cacheMode && data.cacheMode !== cacheMode)) {
        throw new Error('Target is not the expected benchmark environment/cache mode');
    }
}

export function record(response, startedAt, valid) {
    window.add(startedAt);
    window.add(Date.now());
    apiRequests.add(1);
    unexpectedErrors.add(valid ? 0 : 1);
    unexpectedRate.add(!valid);
    apiLatency.add(response.timings.duration);
}

export function summaryOutput(data, benchmark) {
    const values = data.metrics.request_window_ms?.values;
    const elapsedSeconds = values ? (values.max - values.min) / 1000 : 0;
    const requests = data.metrics.api_requests?.values.count || 0;
    const report = { ...data, benchmark: { ...benchmark, fixtureVersion, smoke: __ENV.SMOKE === 'true',
        measuredWindowSeconds: elapsedSeconds, measuredRPS: elapsedSeconds > 0 ? requests / elapsedSeconds : null,
        ...(benchmark.kind === 'booking' ? { successfulBookingRPS: elapsedSeconds > 0 ?
            (data.metrics.booking_successes?.values.count || 0) / elapsedSeconds : null } : {}) } };
    const output = __ENV.SUMMARY_PATH || '/benchmarks/results/summary.json';
    const concise = { benchmark: report.benchmark, requests, latency: data.metrics.api_latency?.values,
        unexpectedErrors: data.metrics.unexpected_errors?.values.count || 0,
        successes: data.metrics.booking_successes?.values.count, conflicts: data.metrics.booking_conflicts?.values.count,
        thresholdsPassed: Object.values(data.metrics).every(metric => Object.values(metric.thresholds || {}).every(t => t.ok)) };
    return { [output]: JSON.stringify(report, null, 2), stdout: JSON.stringify(concise, null, 2) + '\n' };
}
