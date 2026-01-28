@echo off
echo Starting Git Push Process...

:: Check if git is available
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Git is not found in your PATH.
    echo Please install Git or add it to your PATH variable.
    pause
    exit /b 1
)

echo Adding all files...
git add .

echo Committing changes...
git commit -m "Enhance inventory: bulk actions, history logs, return process, and sidebar"

echo Setting remote origin...
git remote add origin https://github.com/shahzadashraf85/xmlProject.git
:: If it already exists, ensure it points to the right place
git remote set-url origin https://github.com/shahzadashraf85/xmlProject.git

echo Pushing to main...
git push -u origin main

echo.
echo Process Complete.
pause
