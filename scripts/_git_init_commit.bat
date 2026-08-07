@echo off
chcp 65001 >nul
setlocal enableextensions
cd /d "%~dp0.."
echo [1/5] Cleanup stale lock...
if exist ".git\index.lock" (
  ping -n 4 127.0.0.1 >nul
  del /f /q ".git\index.lock"
)
echo [2/5] Configure...
git config --local core.autocrlf true
git config --local core.safecrlf false
git config --local core.fscache false
echo [3/5] Stage all tracked folders...
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add -- .gitignore admin-api admin-web .trae scripts imgae
if errorlevel 1 goto :err
echo [4/5] Verify staged...
if exist ".git\index.lock" del /f /q ".git\index.lock"
git status --short --untracked-files=all
echo [5/5] Commit (only if staged)
if exist ".git\index.lock" del /f /q ".git\index.lock"
git update-index -q --refresh
git diff --cached --quiet
if not errorlevel 1 (
  echo Nothing staged. FAIL.
  exit /b 1
)
git commit -m "chore(init): bootstrap longgehoutai monorepo scaffold" -m "- admin-api: Express+TS backend (sqlite modules)" -m "- admin-web: React18+TS+Antd5 Pro frontend with charts" -m "- .trae/specs: PRD/tasks/checklist history docs" -m "- scripts: Python verification helpers" -m "- imgae: placeholder product images"
if errorlevel 1 goto :err
git log -1 --oneline
exit /b 0
:err
echo FAILED with errorlevel %errorlevel%
exit /b %errorlevel%
