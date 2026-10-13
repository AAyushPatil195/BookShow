import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const directory = process.argv[2];
if (!directory) throw new Error('Usage: node benchmarks/summarize.mjs benchmarks/results/RUN');
const files = (await readdir(directory)).filter(file => file.endsWith('.summary.json')).sort();
if (!files.length) throw new Error('No k6 summaries found');
const rows = [];
for (const file of files) {
    const data = JSON.parse(await readFile(path.join(directory, file), 'utf8'));
    const meta = data.benchmark;
    const metrics = data.metrics;
    let correctness = 'n/a';
    if (meta.kind === 'booking') {
        try { correctness = JSON.parse(await readFile(path.join(directory, file.replace('.summary.json', '.correctness.json')), 'utf8')).passed ? 'PASS' : 'FAIL'; }
        catch { correctness = 'MISSING'; }
    }
    const latency = metrics.api_latency?.values || {};
    rows.push({ file, kind: meta.kind, mode: meta.mode, requests: metrics.api_requests?.values?.count || 0,
        rps: meta.kind === 'cache' ? meta.completedRPS : meta.measuredRPS,
        successfulBookingRPS: meta.successfulBookingRPS ?? '',
        p50_ms: latency.med, p95_ms: latency['p(95)'], p99_ms: latency['p(99)'],
        successes: metrics.booking_successes?.values?.count ?? '', conflicts: metrics.booking_conflicts?.values?.count ?? '',
        unexpectedErrors: metrics.unexpected_errors?.values?.count || 0,
        droppedIterations: metrics.dropped_iterations?.values?.count || 0,
        thresholdsPassed: Object.values(metrics).every(metric => Object.values(metric.thresholds || {}).every(t => t.ok)),
        correctness });
}
const columns = Object.keys(rows[0]);
const csv = [columns.join(','), ...rows.map(row => columns.map(column => JSON.stringify(row[column] ?? '')).join(','))].join('\n') + '\n';
await writeFile(path.join(directory, 'results.csv'), csv);
console.table(rows);
// Compare matching workloads only; show actual measurements, including regressions.
const cache = rows.filter(row => row.kind === 'cache');
const comparisons = [];
for (const enabled of cache.filter(row => row.mode === 'enabled')) {
    const repeat = enabled.file.match(/-r(\d+)\.summary\.json$/)?.[1];
    for (const baseline of cache.filter(row => row.mode !== 'enabled' && row.file.endsWith(`-r${repeat}.summary.json`))) {
        const a = JSON.parse(await readFile(path.join(directory, enabled.file), 'utf8')).benchmark;
        const b = JSON.parse(await readFile(path.join(directory, baseline.file), 'utf8')).benchmark;
        if (a.rate !== b.rate || a.seconds !== b.seconds || a.vus !== b.vus || a.fixtureVersion !== b.fixtureVersion) throw new Error('Cannot compare different cache workloads');
        comparisons.push({ repeat, baseline: baseline.mode,
            valid: enabled.thresholdsPassed && baseline.thresholdsPassed && !enabled.unexpectedErrors && !baseline.unexpectedErrors,
            p95ReductionPercent: baseline.p95_ms > 0 ? 100 * (baseline.p95_ms - enabled.p95_ms) / baseline.p95_ms : null,
            p99ReductionPercent: baseline.p99_ms > 0 ? 100 * (baseline.p99_ms - enabled.p99_ms) / baseline.p99_ms : null });
    }
}
await writeFile(path.join(directory, 'cache-comparisons.json'), JSON.stringify(comparisons, null, 2));
console.table(comparisons);
