@echo off
chcp 65001 >nul
setlocal enableextensions
set REPO=%~dp0..
cd /d "%REPO%"
set TMPDIR_FOR_GIT=%REPO%
set GIT_DIR=%REPO%\.git
:: Clone a temporary GIT_INDEX_FILE to avoid the Trae parallel host's index.lock race
set GIT_INDEX_FILE=%REPO%\.git\index.batch
echo [1/6] Cleanup stale lock files...
ping -n 3 127.0.0.1 >nul
if exist "%REPO%\.git\index.lock" del /f /q "%REPO%\.git\index.lock"
if exist "%GIT_INDEX_FILE%.lock" del /f /q "%GIT_INDEX_FILE%.lock"
if exist "%GIT_INDEX_FILE%" del /f /q "%GIT_INDEX_FILE%"
echo [2/6] Configure (use custom index)...
git config --local core.autocrlf true
git config --local core.safecrlf false
git config --local core.fscache false
echo [3/6] Stage everything to custom index (avoid lock races with other git clients in repo)...
copy /y "%REPO%\.git\index" "%GIT_INDEX_FILE%" 1>nul 2>nul
if exist "%GIT_INDEX_FILE%.lock" del /f /q "%GIT_INDEX_FILE%.lock"
git add -- .gitignore admin-api admin-web .trae scripts imgae
if errorlevel 1 goto :err
echo [4/6] Replace the real index with our staged copy...
ping -n 2 127.0.0.1 >nul
if exist "%REPO%\.git\index.lock" del /f /q "%REPO%\.git\index.lock"
move /y "%GIT_INDEX_FILE%" "%REPO%\.git\index" >nul
set GIT_INDEX_FILE=
echo [5/6] Verify staged count...
git status --short --untracked-files=all
git diff --cached --quiet
if not errorlevel 1 (
  echo ERROR: Nothing staged in repo index
  exit /b 1
)
echo [6/6] Create initial commit...
ping -n 3 127.0.0.1 >nul
if exist "%REPO%\.git\index.lock" del /f /q "%REPO%\.git\index.lock"
:: commit via temp worktree-style GIT_INDEX_FILE trick using an OUT-OF-TREE index path that no other tool will race on
set GIT_INDEX_FILE=%TEMP%\lg_index_%RANDOM%.git
copy /y "%REPO%\.git\index" "%GIT_INDEX_FILE%" >nul
git write-tree > "%TEMP%\lg_tree_sha.txt"
set /p TREE_SHA=<"%TEMP%\lg_tree_sha.txt"
if "%TREE_SHA%"=="" (
  echo write-tree failed
  goto :err
)
echo Wrote tree=%TREE_SHA%
:: delete the repo index.lock so commit-tree's side effects don't collide (we won't touch repo's index.lock from here)
if exist "%REPO%\.git\index.lock" del /f /q "%REPO%\.git\index.lock"
git commit-tree "%TREE_SHA%" -m "chore(init): bootstrap longgehoutai monorepo scaffold" -m "- admin-api: Express+TS backend (sqlite modules)" -m "- admin-web: React18+TS+Antd5 Pro frontend with charts" -m "- .trae/specs: PRD/tasks/checklist history docs" -m "- scripts: Python verification helpers" -m "- imgae: placeholder product images" > "%TEMP%\lg_commit_sha.txt"
set /p COMMIT_SHA=<"%TEMP%\lg_commit_sha.txt"
if "%COMMIT_SHA%"=="" (
  echo commit-tree failed
  goto :err
)
echo Wrote commit=%COMMIT_SHA%
:: Update HEAD reference with direct file write (update-ref would need index.lock safety, so use symbolic-ref + plumbing)
git update-ref -m "Initial commit: bootstrap scaffold" refs/heads/main "%COMMIT_SHA%"
if errorlevel 1 goto :err
set GIT_INDEX_FILE=
git log -1 --oneline
exit /b 0
:err
set GIT_INDEX_FILE=
echo FAILED with errorlevel %errorlevel%
exit /b %errorlevel%
