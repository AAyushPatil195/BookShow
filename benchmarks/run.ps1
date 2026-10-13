param(
    [ValidateSet('smoke', 'bookings', 'cache', 'all')][string]$Suite = 'smoke',
    [switch]$AllowHighLoad,
    [ValidateRange(1, 10)][int]$Repetitions = 3,
    [ValidateRange(1, 10000)][int]$Rate = 100,
    [ValidateRange(1, 300)][int]$Seconds = 30,
    [ValidateRange(1, 500)][int]$VUs = 50,
    [ValidateRange(1024, 65535)][int]$ApiPort = 3001
)
$ErrorActionPreference = 'Stop'
if ($Suite -ne 'smoke' -and !$AllowHighLoad) {
    throw 'High-load execution requires explicit authorization: add -AllowHighLoad after reviewing README.md.'
}
$repoRoot = Split-Path $PSScriptRoot -Parent
$branch = & git -C $repoRoot branch --show-current
if ($LASTEXITCODE -ne 0 -or $branch -ne 'benchmarking') { throw 'Run only on the benchmarking branch.' }
$runName = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$results = Join-Path $PSScriptRoot "results/$runName"
New-Item -ItemType Directory -Path $results | Out-Null
$dockerArgs = @('compose', '--env-file', (Join-Path $PSScriptRoot 'compose.env'), '-f', (Join-Path $repoRoot 'compose.benchmark.yaml'), '--profile', 'api', '--profile', 'tools')
$originalCacheMode = $env:BENCHMARK_CACHE_MODE
$originalApiPort = $env:BENCHMARK_API_PORT
$env:BENCHMARK_API_PORT = "$ApiPort"
$lock = $null

function Invoke-Compose([string[]]$Arguments) {
    # Windows PowerShell 5.1 represents native stderr (including normal Compose
    # progress) as ErrorRecord objects. Check the exit code, not stderr content.
    $savedPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & docker @dockerArgs @Arguments 2>&1 | ForEach-Object { "$_" } | Tee-Object -FilePath (Join-Path $results 'commands.log') -Append
        $dockerExitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $savedPreference }
    if ($dockerExitCode -ne 0) { throw "Docker Compose failed: $($Arguments -join ' ')" }
}
function Fixture([string[]]$Arguments) {
    Invoke-Compose (@('exec', '-T', 'api', 'node', 'benchmarks/fixture.js') + $Arguments)
}
function Start-API([string]$Mode) {
    $env:BENCHMARK_CACHE_MODE = $Mode
    Invoke-Compose @('up', '-d', '--no-build', '--pull', 'never', '--wait', '--wait-timeout', '120', 'api')
}
function Run-Booking([string]$Mode, [int]$Count, [int]$Repeat, [bool]$Smoke) {
    $name = "booking-$Mode-$Count-r$Repeat"
    Fixture @('setup')
    try {
        Invoke-Compose @('run', '--rm', '--no-deps', '--pull', 'never', 'k6', 'run',
            '-e', "MODE=$Mode", '-e', "REQUESTS=$Count", '-e', "SMOKE=$($Smoke.ToString().ToLowerInvariant())",
            '-e', "SUMMARY_PATH=/benchmarks/results/$runName/$name.summary.json",
            '--out', "json=/benchmarks/results/$runName/$name.samples.json", '/benchmarks/k6/bookings.js')
    } finally {
        # Inspect DB allocations even when k6 fails its thresholds.
        Fixture @('verify', $Mode, "$Count", "/benchmarks/results/$runName/$name.summary.json", "/benchmarks/results/$runName/$name.correctness.json")
    }
}
function Run-Cache([string]$Mode, [int]$Repeat, [bool]$Smoke) {
    Start-API $Mode
    Fixture @('setup')
    $testRate = $Rate
    $testSeconds = $Seconds
    $testVUs = $VUs
    if ($Smoke) { $testRate = 2; $testSeconds = 2; $testVUs = 2 }
    $name = "cache-$Mode-r$Repeat"
    Invoke-Compose @('run', '--rm', '--no-deps', '--pull', 'never', 'k6', 'run',
        '-e', "CACHE_MODE=$Mode", '-e', "RATE=$testRate", '-e', "SECONDS=$testSeconds", '-e', "VUS=$testVUs",
        '-e', "SMOKE=$($Smoke.ToString().ToLowerInvariant())",
        '-e', "SUMMARY_PATH=/benchmarks/results/$runName/$name.summary.json",
        '--out', "json=/benchmarks/results/$runName/$name.samples.json", '/benchmarks/k6/cache.js')
}

try {
    # An exclusive file handle prevents concurrent runners from resetting shared fixtures.
    # Retain the lock file on disk; closing the handle releases the lock.
    $lock = [System.IO.File]::Open((Join-Path $PSScriptRoot 'results/runner.lock'), [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    Start-API 'enabled'
    $metadata = [ordered]@{
        startedAt = (Get-Date).ToUniversalTime().ToString('o'); branch = $branch;
        commit = (& git -C $repoRoot rev-parse HEAD); suite = $Suite;
        dirtyFiles = @(& git -C $repoRoot status --short);
        repetitions = $(if ($Suite -eq 'smoke') { 1 } else { $Repetitions });
        rate = $(if ($Suite -eq 'smoke') { 2 } else { $Rate });
        seconds = $(if ($Suite -eq 'smoke') { 2 } else { $Seconds });
        vus = $(if ($Suite -eq 'smoke') { 2 } else { $VUs });
        bookingRequestCounts = $(if ($Suite -eq 'smoke') { @(4) } else { @(100, 250, 500) }); apiPort = $ApiPort;
        os = [Environment]::OSVersion.VersionString; hostProcessors = [Environment]::ProcessorCount
    }
    $metadata | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $results 'environment.json')
    & docker version | Set-Content (Join-Path $results 'docker-version.txt')
    & docker info --format '{{.NCPU}} {{.MemTotal}}' | Set-Content (Join-Path $results 'docker-resources.txt')
    & docker @dockerArgs images --format json | Set-Content (Join-Path $results 'images.json')
    Invoke-Compose @('exec', '-T', 'api', 'node', '--version')
    Invoke-Compose @('exec', '-T', 'api', 'node', '--test', 'benchmarks/safety.test.js')
    if ($Suite -eq 'smoke') {
        Fixture @('setup')
        Invoke-Compose @('exec', '-T', 'api', 'node', 'benchmarks/smoke.js')
        foreach ($mode in @('same-seat', 'different-seat', 'different-show')) { Run-Booking $mode 4 1 $true }
        foreach ($mode in @('enabled', 'miss', 'disabled')) { Run-Cache $mode 1 $true }
    } else {
        for ($repeat = 1; $repeat -le $Repetitions; $repeat++) {
            if ($Suite -in @('bookings', 'all')) {
                Start-API 'enabled'
                foreach ($count in @(100, 250, 500)) {
                    foreach ($mode in @('same-seat', 'different-seat', 'different-show')) { Run-Booking $mode $count $repeat $false }
                }
            }
            if ($Suite -in @('cache', 'all')) {
                $modes = @('enabled', 'miss', 'disabled')
                for ($offset = 0; $offset -lt 3; $offset++) { Run-Cache $modes[($repeat - 1 + $offset) % 3] $repeat $false }
            }
        }
    }
    # Preserve the final dataset for manual verification. Cleanup is an explicit command.
    Write-Host "Completed. Results: $results"
} finally {
    $env:BENCHMARK_CACHE_MODE = $originalCacheMode
    $env:BENCHMARK_API_PORT = $originalApiPort
    if ($lock) { $lock.Dispose() }
}
