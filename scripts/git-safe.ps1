<#
.SYNOPSIS
    安全执行 Git 操作，自动清理 IDE 产生的 lock 文件。

.DESCRIPTION
    某些 IDE（如 Trae/VS Code）的 Git 扩展会频繁创建 .git/index.lock、
    .git/refs/remotes/origin/*.lock 等锁文件，导致常规 git 命令失败。
    本脚本在执行任何 git 操作前，先原子性地清理所有 lock/bak 文件，
    再串联执行 git add -> commit -> push，避免竞态条件。

.PARAMETER Action
    要执行的操作：
    - clean    仅清理 lock 文件（默认）
    - status   清理后显示 git status
    - add      清理后执行 git add -A
    - commit   清理后 add + commit
    - push     清理后 add + commit + push
    - sync     清理后 fetch + reset --hard origin/main

.PARAMETER Message
    commit 时使用的提交信息（Action=commit/push 时必填）。

.PARAMETER Branch
    目标分支名，默认 main。

.PARAMETER Root
    仓库根目录路径，默认自动检测脚本所在仓库。

.EXAMPLE
    .\scripts\git-safe.ps1 -Action push -Message "fix: 修复资讯页面 BUG"
    .\scripts\git-safe.ps1 -Action status
#>

param(
    [ValidateSet('clean', 'status', 'add', 'commit', 'push', 'sync')]
    [string]$Action = 'clean',

    [string]$Message = '',

    [string]$Branch = 'main',

    [string]$Root = ''
)

$ErrorActionPreference = 'Stop'

# ============================================================
# 1. 确定仓库根目录
# ============================================================
if ([string]::IsNullOrWhiteSpace($Root)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $Root = $scriptDir
    while ($Root -ne (Split-Path $Root -Parent)) {
        if (Test-Path (Join-Path $Root '.git')) { break }
        $Root = Split-Path $Root -Parent
    }
}

if (-not (Test-Path (Join-Path $Root '.git'))) {
    Write-Error "Git repo not found: $Root"
    exit 1
}

Set-Location $Root
Write-Host "[git-safe] Repo: $Root" -ForegroundColor Cyan

# ============================================================
# 2. 清理 lock / bak 文件
# ============================================================
function Clear-GitLocks {
    param([string]$RepoRoot)

    $gitDir = Join-Path $RepoRoot '.git'
    $removed = 0

    $locks = Get-ChildItem -Path $gitDir -Recurse -File -Filter '*.lock' -ErrorAction SilentlyContinue
    foreach ($lock in $locks) {
        try {
            Remove-Item $lock.FullName -Force -ErrorAction Stop
            $removed++
            $rel = $lock.FullName.Substring($RepoRoot.Length + 1)
            Write-Host "  DEL lock: $rel" -ForegroundColor DarkGray
        }
        catch {
            Write-Host "  WARN skip $($lock.Name): $_" -ForegroundColor Yellow
        }
    }

    $baks = Get-ChildItem -Path $gitDir -Recurse -File -Filter '*.bak*' -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match 'lock\.bak|HEAD\.lock|\.bak$' }
    foreach ($bak in $baks) {
        try {
            Remove-Item $bak.FullName -Force -ErrorAction Stop
            $removed++
            $rel = $bak.FullName.Substring($RepoRoot.Length + 1)
            Write-Host "  DEL bak:  $rel" -ForegroundColor DarkGray
        }
        catch {
            Write-Host "  WARN skip $($bak.Name): $_" -ForegroundColor Yellow
        }
    }

    return $removed
}

Write-Host "[git-safe] Cleaning lock files..." -ForegroundColor Cyan
$removedCount = Clear-GitLocks -RepoRoot $Root
if ($removedCount -eq 0) {
    Write-Host "  OK - no stale locks" -ForegroundColor Green
}
else {
    Write-Host "  OK - removed $removedCount locks" -ForegroundColor Green
}

# ============================================================
# 3. 执行 git 命令
# ============================================================
function Invoke-Git {
    param(
        [string[]]$GitArgs,
        [string]$Label = ''
    )
    Write-Host "[git-safe] git $($GitArgs -join ' ')  $Label" -ForegroundColor Cyan
    try {
        & git @GitArgs 2>&1 | Out-Host
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  FAIL (exit=$LASTEXITCODE)" -ForegroundColor Red
            return $false
        }
        return $true
    }
    catch {
        Write-Host "  FAIL $_" -ForegroundColor Red
        return $false
    }
}

switch ($Action) {

    'clean' {
        # done above
    }

    'status' {
        Invoke-Git -GitArgs @('status')
    }

    'add' {
        if (-not (Invoke-Git -GitArgs @('add', '-A'))) { exit 1 }
    }

    'commit' {
        if ([string]::IsNullOrWhiteSpace($Message)) {
            Write-Error "-Message is required for Action=commit"
            exit 1
        }
        if (-not (Invoke-Git -GitArgs @('add', '-A'))) { exit 1 }
        $hasChanges = (git diff --cached --name-only 2>$null | Measure-Object -Line).Lines -gt 0
        if (-not $hasChanges) {
            Write-Host "  INFO - nothing to commit" -ForegroundColor Yellow
            break
        }
        if (-not (Invoke-Git -GitArgs @('commit', '-m', $Message))) { exit 1 }
    }

    'push' {
        if ([string]::IsNullOrWhiteSpace($Message)) {
            Write-Error "-Message is required for Action=push"
            exit 1
        }
        if (-not (Invoke-Git -GitArgs @('add', '-A'))) { exit 1 }
        $hasChanges = (git diff --cached --name-only 2>$null | Measure-Object -Line).Lines -gt 0
        if (-not $hasChanges) {
            Write-Host "  INFO - nothing new to commit, pushing only" -ForegroundColor Yellow
        }
        else {
            if (-not (Invoke-Git -GitArgs @('commit', '-m', $Message))) { exit 1 }
        }
        Clear-GitLocks -RepoRoot $Root | Out-Null
        if (-not (Invoke-Git -GitArgs @('push', 'origin', $Branch))) { exit 1 }
    }

    'sync' {
        Write-Host ""
        Write-Host "WARNING: git reset --hard origin/$Branch" -ForegroundColor Magenta
        Write-Host "Local uncommitted changes will be DISCARDED." -ForegroundColor Magenta
        $confirm = Read-Host "Type YES to continue"
        if ($confirm -ne 'YES') {
            Write-Host "Cancelled" -ForegroundColor Yellow
            exit 0
        }
        Clear-GitLocks -RepoRoot $Root | Out-Null
        Invoke-Git -GitArgs @('fetch', 'origin') | Out-Null
        Invoke-Git -GitArgs @('reset', '--hard', "origin/$Branch") | Out-Null
    }
}

# ============================================================
# 4. 最终状态
# ============================================================
Write-Host ""
Write-Host "[git-safe] Recent commits:" -ForegroundColor Cyan
git log --oneline -3 2>&1 | Out-Host
Write-Host ""
Write-Host "[git-safe] DONE" -ForegroundColor Green
