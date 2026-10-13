# Local booking benchmarks

Run these tools only on `benchmarking`. The runner checks the branch, never commits or pushes, and requires `-AllowHighLoad` for every suite except `smoke`. Do not run a high-load command until you have approved that load. The production `compose.yaml` is unchanged.

## Architecture and safeguards

- `compose.benchmark.yaml` defines its own project, networks, MongoDB volume, Redis, API, and k6. Never combine it with the production Compose file.
- MongoDB 7 uses a single-member `rs0`. `mongo-init` retries startup, initializes only an uninitialized replica set, and waits for PRIMARY. API startup requires both PRIMARY and a successful Redis ping.
- Database: **`bookshow_benchmark`**, hardcoded in benchmark mode. The named `benchmark-mongo-data` volume is separate from production. Existing data in `bookshow` is untouched.
- Redis 7 is dedicated to this stack and has persistence disabled. Booking uses the existing show-wide `SET NX EX 15` lock and token-checked Lua release. MongoDB `withTransaction` remains the allocation source of truth.
- API, MongoDB, and Redis publish only on `127.0.0.1`; defaults are API **3001**, MongoDB **27018**, Redis **6380**. `-ApiPort 3002` avoids an existing process on 3001. Direct Node API startup binds to `127.0.0.1:3000`.
- k6 attaches only to the internal benchmark network. The API/stores also use a dedicated bridge because Docker Desktop needs it to publish localhost ports. The API has a Node socket allowlist for the local MongoDB, Redis, and test API endpoints; external sockets are rejected.
- `BENCHMARK_MODE=true` must already be in the process environment and requires `NODE_ENV=test`. The benchmark path never loads `.env`. Startup rejects inherited credential/service variables, credential-bearing URLs, remote hosts, URI query overrides, and unexpected database ports. Error messages show rejected variable names, never their values.
- Compose specifies a credential-free environment directly. Commands use `--env-file benchmarks/compose.env` to prevent Compose from reading a root `.env`. `server/.dockerignore` excludes every `.env*` from the image. The previous ignored `server/.env.benchmark` is not used by Compose.
- Synthetic authentication always returns `benchmark-user`. Rate limits are bypassed. Successful booking returns 201 immediately after the real transaction; no payments, events, email, or background consumers run.
- Only booking creation, occupied-seat reads, all-shows reads, root, and health are mounted. Stripe, Clerk middleware/admin, Inngest, Kafka, TMDB mutations and email routes/modules are excluded or guarded. Browser-origin requests are rejected.
- When benchmark mode is disabled, production database, Redis, authentication, routes, provider calls and booking responses retain their existing behavior. In benchmark mode only, DB availability errors propagate instead of being mislabeled as expected 409 conflicts.

This is a local test environment, not a deployment configuration. Do not override the network, ports or environment to publish it remotely. Docker service names are allowed only inside a Docker container with `BENCHMARK_CONTAINER=true`; host tools must use the specific loopback store endpoints.

## Prepare images once

Prerequisites: Docker Desktop with Linux containers, Docker Compose **2.24.4+** (for `!reset` in the optional fresh-volume check), PowerShell, Git. Host Node 24 is needed only for standalone safety tests and result summarization. k6 runs in Docker; no local installation or cloud account is needed.

From the repository root:

```powershell
git branch --show-current # must print benchmarking
docker compose --env-file benchmarks/compose.env -f compose.benchmark.yaml --profile api --profile tools config --quiet
docker compose --env-file benchmarks/compose.env -f compose.benchmark.yaml pull mongo redis k6
docker compose --env-file benchmarks/compose.env -f compose.benchmark.yaml build api
```

Image preparation needs registry/npm access. **Test execution uses local images with `--pull never --no-build`, has no remote imports, no runtime external-service dependencies, and disables k6 usage reporting.** Rebuild the API after changing server code. Versions: k6 **1.6.0**, MongoDB major **7**, Redis major **7**, Node **24-alpine**, npm dependencies from `server/package-lock.json`. MongoDB/Redis/Node tags can receive patch updates; keep the downloaded images and record their IDs/digests for comparisons.

## Low-load validation

```powershell
node --test server/benchmarks/safety.test.js
.\benchmarks\run.ps1 -Suite smoke -ApiPort 3002
```

Smoke runs 4 booking requests per concurrency case and 2 RPS for 2 seconds per cache mode. It also checks cache MISS→HIT serialization, disabled external routes, blocked network connections, input validation, the actual 15-second Redis TTL, stale-owner release, two transactions overlapping after lock expiry, and transaction rollback. The TTL checks take about 31 seconds. Delays/failure injection exist only in the standalone smoke process, never in API routes or load tests.

The final fixture remains available for inspection. The API stays running in the last tested cache mode (`disabled` after smoke); the next runner invocation starts it with caching enabled. No databases, collections, files, or volumes are dropped by the runner. Before each workload, setup replaces only the reserved synthetic records and their cache/lock keys. A persistent file with an exclusive handle prevents two runners in this checkout from resetting shared fixtures concurrently. Manual commands and other checkouts must also be kept sequential.

## High-load tests — run after approval

```powershell
# 100, 250, 500 requests for each of the three booking cases, three repeats
.\benchmarks\run.ps1 -Suite bookings -AllowHighLoad -ApiPort 3002

# Identical 100 RPS, 30 seconds, 50 preallocated/max VUs in each cache mode
.\benchmarks\run.ps1 -Suite cache -AllowHighLoad -ApiPort 3002

# Both suites; override repetitions/workload explicitly as needed
.\benchmarks\run.ps1 -Suite all -AllowHighLoad -ApiPort 3002 -Repetitions 3 -Rate 100 -Seconds 30 -VUs 50
```

The booking executor runs one request per VU with no retry. A best-effort 3-second wall-clock barrier reduces startup skew; `booking_start_skew_ms` records the actual spread. This creates competing requests, not a guarantee that every request reaches MongoDB at the same instant.

| Booking case | Allocation targets | Correctness expectation |
| --- | --- | --- |
| `same-seat` | All VUs request A1 on one show | Exactly one 201, all remaining responses 409 |
| `different-seat` | Unique seats, grouped into shows of at most 90 seats | No duplicate pairs; 409s are expected because locking covers an entire show |
| `different-show` | One A1 request on each independent show | Every request must return 201; no show-wide lock contention |

There are only 90 valid seat names (`A1`–`J9`) per show. The 250/500-request different-seat workloads use 3/6 show cohorts, rather than inventing invalid seats or treating repeated seats as independent.

Cache modes run the same `/api/show/all-shows` endpoint, 100 synthetic movies, 608 shows, identical 5-request warm-up, arrival rate, duration and VU budget:

| Mode | `X-Cache` during measurement | Path measured |
| --- | --- | --- |
| `enabled` | HIT | Real Redis read and deserialization, warm cache |
| `miss` | MISS | DB query and real Redis write; cache reads bypassed to force every request to miss |
| `disabled` | BYPASS | Same DB query with no cache reads/writes |

The forced-miss mode is an explicit benchmark-only cache-read switch, not per-request Redis flushing. Mode is fixed at API startup. The runner rotates mode order across repeats to reduce ordering bias. Actual HTTP requests are capped at `rate × seconds` because k6 can schedule an extra iteration at the duration boundary. All response payloads and cache headers are checked. Dropped iterations, missing requests, invalid bodies, or incorrect cache headers fail thresholds. An overloaded baseline is reported as a failed workload, not a valid improvement claim.

## Results and environment details

Every invocation creates a unique `benchmarks/results/<timestamp>-<id>/` directory containing:

- `environment.json`: branch, commit, dirty file list, requested parameters, host CPU count and OS.
- `docker-version.txt`, `docker-resources.txt`, `images.json`, `commands.log`: Docker versions/VM allocation, image identities, runtime versions, test output and verification receipts.
- `*.summary.json`: full k6 summaries, measured request count and RPS, errors, conflicts, latency distributions and threshold status.
- `*.samples.json`: raw time-series samples including request phase, cache mode and response status tags.
- `booking-*.correctness.json`: direct MongoDB allocation verification after each booking run, before the next setup.

```powershell
node benchmarks/summarize.mjs benchmarks/results/<your-run-directory>
docker info --format '{{.NCPU}} {{.MemTotal}}' # record Docker VM CPU/memory allocation
docker compose --env-file benchmarks/compose.env -f compose.benchmark.yaml exec -T mongo mongosh --quiet --eval 'db.version()'
docker compose --env-file benchmarks/compose.env -f compose.benchmark.yaml exec -T redis redis-server --version
```

The summarizer writes `results.csv` and `cache-comparisons.json` from actual k6 measurements. No performance numbers are prefilled. `api_latency` excludes setup and warm-up: `med` is p50, `p(95)` is p95, `p(99)` is p99. Booking success and conflict latencies are also separate trends; a fast conflict must not be presented as a fast successful booking.

`benchmark.measuredRPS` = measured request count divided by the span from the first measured request start to the last measured request end. `successfulBookingRPS` uses only committed 201 responses over that same span. For sustained cache workloads, also inspect offered RPS and `completedRPS` (completed requests / configured interval); in-flight completion can extend the actual span. CSV RPS uses `completedRPS` for cache tests and measured batch-window RPS for bookings. Burst RPS describes a short competing batch, not sustained capacity. Built-in `http_req_*` metrics include health/warm-up requests; use custom `api_*` metrics or raw samples tagged `phase=measured` for comparisons. [k6 metric documentation](https://grafana.com/docs/k6/latest/using-k6/metrics/).

HTTP 409 is configured as an expected response for booking using [k6 expectedStatuses](https://grafana.com/docs/k6/latest/javascript-api/k6-http/expected-statuses/). Conflicts have a separate count. Transport failures, 4xx other than 409, 5xx, malformed success bodies and failed checks are unexpected. Request counts must match the chosen workload exactly.

Record host hardware, Docker VM allocation, competing processes, image digests, git diff, and dataset/workload settings when publishing results. The stack does not impose CPU/memory caps; API, load generator, MongoDB and Redis share the Docker VM. Report repeat distributions and any negative improvements rather than cherry-picking a run.

## Verify allocation correctness

The runner automatically verifies MongoDB after every booking workload. Verification checks:

1. MongoDB aggregation groups every committed `(show, bookedSeat)` pair and finds **zero duplicate allocations**.
2. Each `occupiedSeats` entry names the matching booking `_id`, and every booking seat has that owner in the show.
3. HTTP 201 count equals committed bookings, and 201 + 409 equals total attempted requests.
4. Same-seat has exactly one winner; different-show has all winners; different-seat has at least one winner.
5. No unexpected HTTP errors, invalid responses, payment links, Stripe sessions, real users, or paid bookings occur.

To reverify the most recent booking dataset before another setup (substitute actual paths/count/mode):

```powershell
docker compose --env-file benchmarks/compose.env -f compose.benchmark.yaml exec -T api node benchmarks/fixture.js verify same-seat 100 /benchmarks/results/<run>/booking-same-seat-100-r1.summary.json /benchmarks/results/<run>/manual.correctness.json

# Independent MongoDB duplicate-seat aggregation for the whole dedicated database
docker compose --env-file benchmarks/compose.env -f compose.benchmark.yaml exec -T api node benchmarks/fixture.js inspect
```

Reverification of an older summary after resetting fixtures must fail; use the saved correctness report for historical runs. The `all` suite finishes with a cache dataset, so historical booking reports are the retained verification evidence.

## Fresh-volume initialization and cleanup

Optional validation creates a **new project and volume** without publishing conflicting host ports. Keep the project name unique; no existing volume is removed:

```powershell
$freshProject = 'quickshow-benchmark-fresh-' + (Get-Date -Format yyyyMMddHHmmss)
docker compose --env-file benchmarks/compose.env -p $freshProject -f compose.benchmark.yaml -f benchmarks/compose.fresh.yaml --profile api up -d --no-build --pull never --wait --wait-timeout 120 api
docker compose --env-file benchmarks/compose.env -p $freshProject -f compose.benchmark.yaml -f benchmarks/compose.fresh.yaml exec -T mongo mongosh --quiet --eval 'db.hello().isWritablePrimary'
docker compose --env-file benchmarks/compose.env -p $freshProject -f compose.benchmark.yaml -f benchmarks/compose.fresh.yaml exec -T api node benchmarks/fixture.js setup
docker compose --env-file benchmarks/compose.env -p $freshProject -f compose.benchmark.yaml -f benchmarks/compose.fresh.yaml exec -T api node benchmarks/fixture.js fresh-check
docker compose --env-file benchmarks/compose.env -p $freshProject -f compose.benchmark.yaml -f benchmarks/compose.fresh.yaml --profile api stop
```

The optional project/volume is retained. Do not use `down -v`, `docker volume prune`, `dropDatabase`, or Redis `FLUSHALL`/`FLUSHDB`.

Explicit deterministic fixture commands for the primary benchmark stack:

```powershell
docker compose --env-file benchmarks/compose.env -f compose.benchmark.yaml exec -T api node benchmarks/fixture.js setup
docker compose --env-file benchmarks/compose.env -f compose.benchmark.yaml exec -T api node benchmarks/fixture.js cleanup
docker compose --env-file benchmarks/compose.env -f compose.benchmark.yaml --profile api stop
```

Setup/cleanup affect only fixture show IDs with the `be000001` prefix listed in `fixtures.js`, movie IDs `99000000`–`99000099`, bookings for those exact shows, their lock keys, and the upcoming-shows cache key in the dedicated stores. Do not manually place real data in this reserved namespace. Results/files/volumes are retained.

For host-only development with the Docker stores, use `benchmarks/local.env.example`, set those variables in the process, and run `node server.js` from `server`. Do not load the ordinary `.env` or copy credentials. Direct MongoDB connection avoids resolving Docker's advertised `mongo` hostname on the host while still using real replica-set transactions. The recommended benchmark runner always uses Docker API/k6 to keep measurements comparable.

## Limitations and remaining audit findings

- This tests allocation and show-cache paths, not production payment completion, authentication cost, rate limits, event processing, email, TLS, ingress, multi-node Redis, replica-set failover, or geographic latency.
- A single MongoDB node cannot establish production durability/failover characteristics. Redis is intentionally ephemeral.
- A show-wide lock can reject different-seat attempts and limits accepted throughput. The tests preserve that implementation; they do not retry 409s or replace it with seat-level locks.
- Synthetic fixtures, payloads and indexes are small and fixed. Cache HIT tests start warm; forced MISS includes DB work and cache population. This is not a steady-state cache hit-ratio simulation.
- Keep cache durations below the real 300-second TTL for pure warm-HIT measurements. A run long enough for expiry fails its HIT-header checks rather than silently mixing hits and misses.
- At a fixed offered rate, caching may reduce latency without increasing completed RPS. Capacity claims require additional approved rate sweeps with zero dropped iterations.
- The TTL smoke proves ownership safety and transaction conflict behavior in a controlled two-request overlap; it does not exhaust all possible process crashes and timings.
- Existing production behavior still swallows seat-availability DB errors, reports missing shows as unavailable, and reserves seats before payment-provider calls. Those production concerns are outside this isolated benchmark change. The benchmark error propagation prevents them from biasing error classification here.
- The locked dependency installation currently reports npm audit vulnerabilities. They were not automatically upgraded as part of this task; dependency remediation needs a separate change and compatibility checks.
- High-load measurements are intentionally unrun until approved. Smoke validation figures must not be published as representative performance results.

## Implementation validation (2026-10-13)

Validated on Windows with Docker Desktop Linux containers, Compose 5.3.1, Node 24.21.0, k6 1.6.0, MongoDB 7 and Redis 7. Docker reported 16 CPUs and 8,172,486,656 bytes of memory. Host port 3001 was occupied, so the primary benchmark API used localhost port 3002.

- Startup safety/regression tests: 13 passed.
- Full low-load suite: three 4-request booking cases passed, zero duplicate allocations verified against MongoDB, expected 409s accounted for, all three cache modes passed at 2 RPS with identical request counts and no dropped iterations.
- Real 15-second TTL, stale-token release, two-controller transaction overlap after expiry, and rollback checks passed.
- Fresh, initially unconfigured MongoDB volume became PRIMARY; one real API transaction passed allocation verification. Its separate project was stopped, and its volume retained.
- `compose.yaml`, production Dockerfile, and production branches were not changed. No commits or pushes were made. No high-load performance results are claimed.

The final successful smoke evidence is under the ignored `benchmarks/results/20261013-193342-fc9ed1b8/` directory in this workspace. Summaries mark smoke runs and record successful-booking throughput and fixture version. The retained fresh-volume project is `quickshow-benchmark-fresh-20261013192448`; its containers are stopped. The runner's high-load gate was also checked and refused execution without `-AllowHighLoad` before Docker startup.
