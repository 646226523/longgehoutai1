<#
.SYNOPSIS
    Clean .git lock/bak/temp files that block IDE Git operations.

.DESCRIPTION
    Trae / VS Code Git extensions constantly create temp locks
    (index.lock, refs/remotes/origin/*.lock, HEAD.lock.bak etc.)
    that break regular git commands. This script provides:

    1) One-shot clean (default)
    2) Watch mode (-Watch) — loop forever, stop with Ctrl+C
    3) Clean-then-run (-Then) — execute git commands right after clean

.PARAMETER Watch
    Enable continuous watch mode.

.PARAMETER Interval
    Watch scan interval in seconds (default 3).

.PARAMETER Then
    Git command(s) to run after clean, e.g. "status" or
    "add -A; commit -m 'fix'; push origin main".

.PARAMETER Root
    Repo root, auto-detected by default.

.PARAMETER Verbose
    Print every deleted lock file path.

.EXAMPLE
    .\scripts\git-unlock.ps1
    .\scripts\git-unlock.ps1 -Watch -Interval 2
    .\scripts\git-unlock.ps1 -Then "status"
    .\scripts\git-unlock.ps1 -Then "add -A; commit -m 'fix'; push origin main"
#>

param(
    [switch]$Watch,
    [int]$Interval = 3,
    [string]$Then = '',
    [string]$Root = '',
    [switch]$Verbose
)

$ErrorActionPreference = 'SilentlyContinue'

# ── Find repo root ───────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = Split-Path -Parent $MyInvocation.MyCommand.Path
    while ($Root -ne (Split-Path $Root -Parent)) {
        if (Test-Path (Join-Path $Root '.git')) { break }
        $Root = Split-Path $Root -Parent
    }
}
if (-not (Test-Path (Join-Path $Root '.git'))) {
    Write-Error "Git repo not found: $Root"
    exit 1
}
$gitDir = Join-Path $Root '.git'

# ── Core clean function ──────────────────────────────────────────
function Remove-GitLocks {
    param([string]$GitDir, [string]$WorkspaceRoot, [bool]$Show)

    $count = 0

    # 1. *.lock files
    $locks = Get-ChildItem -Path $GitDir -Recurse -File -Filter '*.lock'
    foreach ($f in $locks) {
        if (Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue) {
            $count++
            if ($Show) { Write-Host "  DEL $($f.FullName.Substring($WorkspaceRoot.Length+1))" -ForegroundColor DarkGray }
        }
    }

    # 2. *.bak references (exclude objects/)
    $baks = Get-ChildItem -Path $GitDir -Recurse -File | Where-Object {
        $_.Name -match '\.lock\.bak|\.bak$' -and $_.FullName -notmatch 'objects'
    }
    foreach ($f in $baks) {
        if (Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue) {
            $count++
            if ($Show) { Write-Host "  DEL $($f.FullName.Substring($WorkspaceRoot.Length+1))" -ForegroundColor DarkGray }
        }
    }

    # 3. *.tmp / *.temp / *.swap
    $temps = Get-ChildItem -Path $GitDir -Recurse -File | Where-Object {
        $_.Name -match '\.(tmp|temp|swap)$'
    }
    foreach ($f in $temps) {
        if (Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue) {
            $count++
            if ($Show) { Write-Host "  DEL $($f.FullName.Substring($WorkspaceRoot.Length+1))" -ForegroundColor DarkGray }
        }
    }

    return $count
}

# ── ONE-SHOT MODE ────────────────────────────────────────────────
if (-not $Watch) {
    $n = Remove-GitLocks -GitDir $gitDir -WorkspaceRoot $Root -Show $Verbose.IsPresent
    $ts = Get-Date -Format 'HH:mm:ss'
    if ($n -eq 0) {
        Write-Host "[$ts] git-unlock: clean (0 locks)" -ForegroundColor Green
    } else {
        Write-Host "[$ts] git-unlock: removed $n lock(s)" -ForegroundColor Yellow
    }

    # ── Run -Then chain ──
    if (-not [string]::IsNullOrWhiteSpace($Then)) {
        Set-Location $Root
        Write-Host ""
        $steps = $Then -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ }

        foreach ($step in $steps) {
            Write-Host "[git-unlock] git $step" -ForegroundColor Cyan
            $parts = $step -split '\s+'
            $cmd = $parts[0]
            $rest = if ($parts.Count -gt 1) { $parts[1..($parts.Count - 1)] } else { @() }
            & git $cmd @rest 2>&1 | Out-Host

            if ($LASTEXITCODE -ne 0) {
                Write-Host "  FAIL exit=$LASTEXITCODE, stopping" -ForegroundColor Red
                break
            }
            # re-clean before next step
            Remove-GitLocks -GitDir $gitDir -WorkspaceRoot $Root | Out-Null
        }
        Write-Host ""
        Write-Host "[git-unlock] done" -ForegroundColor Green
    }
    exit 0
}

# ── WATCH MODE ───────────────────────────────────────────────────
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  git-unlock watcher  (Ctrl+C to stop)" -ForegroundColor Cyan
Write-Host "  Repo : $Root" -ForegroundColor Gray
Write-Host "  Every: ${Interval}s" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$total = 0
$cycles = 0

while ($true) {
    $cycles++
    $n = Remove-GitLocks -GitDir $gitDir -WorkspaceRoot $Root -Show $false
    $total += $n
    $ts = Get-Date -Format 'HH:mm:ss'

    if ($n -gt 0) {
        Write-Host "[$ts] cycle $cycles -> removed $n lock(s)  (total=$total)" -ForegroundColor Yellow
    }
    elseif ($cycles % 10 -eq 0) {
        Write-Host "[$ts] cycle $cycles -> clean  (total=$total)" -ForegroundColor DarkGray
    }

    Start-Sleep -Seconds $Interval
}
