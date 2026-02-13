@echo off
echo ========================================
echo Article Analyzer - Git Deploy Script
echo ========================================
echo.

cd /d "C:\Users\trive\Article Analyzer"

echo Current directory: %CD%
echo.

echo [1/3] Staging all changes...
git add .

echo.
echo [2/3] Committing changes...
set /p commit_message="Enter commit message (or press Enter for default): "

if "%commit_message%"=="" (
    set commit_message=Update article analyzer
)

git commit -m "%commit_message%"

echo.
echo [3/3] Pushing to GitHub...
git push

echo.
echo ========================================
echo Deployment complete!
echo ========================================
echo.
pause
