import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const moduleURL = new URL('../configs/environment.js', import.meta.url).href;
const script = `import { isBenchmark } from ${JSON.stringify(moduleURL)}; if (!isBenchmark) throw new Error('Benchmark flag lost'); console.log('safe');`;
function run(overrides, code = script) {
    const env = { ...process.env };
    // Child environments are intentionally credential-free; test rejection separately.
    for (const key of Object.keys(env)) {
        if (/SECRET|TOKEN|PASSWORD|(?:^|_)PASS$|API_KEY|PRIVATE_KEY|CREDENTIAL|DSN|^(CLERK|STRIPE|INNGEST|KAFKA|SMTP|SENDER_EMAIL|TMDB|CLOUDINARY|UPSTASH|KV_REST)_?/i.test(key)) delete env[key];
    }
    Object.assign(env, { BENCHMARK_MODE: 'true', NODE_ENV: 'test', BENCHMARK_CONTAINER: 'false',
        MONGODB_URI: 'mongodb://127.0.0.1:27018', REDIS_URL: 'redis://127.0.0.1:6380', BENCHMARK_CACHE_MODE: 'enabled' }, overrides);
    return spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        env, encoding: 'utf8', cwd: fileURLToPath(new URL('../../benchmarks', import.meta.url))
    });
}

test('accepts only local credential-free test environment', () => {
    const result = run({});
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /safe/);
});
test('disabled benchmark mode preserves provider access and native sockets', () => {
    const code = `import net from 'node:net'; const original = net.Socket.prototype.connect;
        const { isBenchmark, assertExternalServicesAllowed } = await import(${JSON.stringify(moduleURL)});
        if (isBenchmark) throw new Error('Wrong mode'); assertExternalServicesAllowed();
        if (net.Socket.prototype.connect !== original) throw new Error('Production sockets changed');`;
    const result = run({ BENCHMARK_MODE: 'false', NODE_ENV: 'production', STRIPE_SECRET_KEY: 'synthetic-normal-mode-marker' }, code);
    assert.equal(result.status, 0, result.stderr);
});
for (const [name, overrides] of [
    ['production mode', { NODE_ENV: 'production' }],
    ['remote MongoDB', { MONGODB_URI: 'mongodb://remote.invalid:27017' }],
    ['MongoDB SRV', { MONGODB_URI: 'mongodb+srv://remote.invalid' }],
    ['another local MongoDB', { MONGODB_URI: 'mongodb://127.0.0.1:27017' }],
    ['remote Redis', { REDIS_URL: 'redis://remote.invalid:6379' }],
    ['embedded credentials', { REDIS_URL: 'redis://user:secret@127.0.0.1:6380' }],
    ['malformed URI without exposing its value', { MONGODB_URI: 'synthetic-rejection-marker' }],
    ['query overrides', { MONGODB_URI: 'mongodb://127.0.0.1:27018/?replicaSet=production' }],
    ['real credentials', { STRIPE_SECRET_KEY: 'synthetic-rejection-marker' }],
    ['external service configuration', { KAFKA_BROKERS: 'localhost:9092' }],
    ['invalid cache mode', { BENCHMARK_CACHE_MODE: 'unknown' }]
]) {
    test(`rejects ${name} without leaking values`, () => {
        const result = run(overrides);
        assert.notEqual(result.status, 0);
        assert(!result.stderr.includes('synthetic-rejection-marker'));
    });
}
