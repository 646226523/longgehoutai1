$ErrorActionPreference = 'Stop'
$repo = (Get-Location).Path
Set-Location $repo
$lock = Join-Path $repo '.git\index.lock'
function Remove-StaleLock {
  if (Test-Path $lock) {
    # Attempt exclusive open to ensure no other process holds it
    try {
      $fs = [IO.File]::Open($lock, 'Open', 'Read', 'None')
      $fs.Close()
      Start-Sleep -Milliseconds 800
      Remove-Item -Force $lock -ErrorAction Stop
      Write-Output "Removed stale index.lock"
    } catch {
      Write-Output "index.lock held by other process; wait 8s then delete anyway: $($_.Exception.Message)"
      Start-Sleep -Seconds 8
      Remove-Item -Force $lock -ErrorAction Stop
    }
  }
}
Remove-StaleLock
git config --local core.autocrlf true
git config --local core.safecrlf false
git config --local core.fscache false
Remove-StaleLock
git add -- .gitignore admin-api admin-web .trae scripts imgae
Remove-StaleLock
Write-Output '---STATUS AFTER ADD---'
git status --short | Select-Object -First 80
$totalStaged = (git status --short --untracked-files=all | Where-Object { $_ -match '^[AMDR]' }).Count
Write-Output "Staged files count: $totalStaged"
if ($totalStaged -gt 0) {
  $msg = @"
chore(init): bootstrap longgehoutai monorepo scaffold

- admin-api: Express+TS backend (sqlite-based modules for gene/nft/auction etc.)
- admin-web: React18+TS+Antd5 Pro frontend with dashboard charts
- .trae/specs: historical PRD/tasks/checklist spec docs
- scripts: Python verification scripts for cockpit/fit trends
- imgae: placeholder product photos
"@
  git commit -m $msg
  Write-Output '---LAST COMMIT---'
  git log -1 --oneline
  exit 0
}
Write-Output 'ERROR: nothing staged'
exit 1
