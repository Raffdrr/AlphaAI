@echo off
TITLE Publish to GitHub
CLS

ECHO ========================================================
ECHO   PUBLISH TO GITHUB
ECHO ========================================================
ECHO.
ECHO This script will upload your code to GitHub.
ECHO.
ECHO 1. Go to https://github.com/new
ECHO 2. Create a new repository (give it a name like 'alpha-vision')
ECHO 3. Copy the HTTPS URL (e.g., https://github.com/username/alpha-vision.git)
ECHO [*] Setting Repository URL...
SET REPO_URL=git@github.com:Raffdrr/AlphaAI.git
ECHO Target: %REPO_URL%

ECHO.
ECHO [*] Initializing Git...
git init
git branch -M main

ECHO [*] Adding files...
git add .

ECHO [*] Committing...
git commit -m "Initial deploy of Alpha-Vision"

ECHO [*] Adding remote...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

ECHO [*] Pushing to GitHub...
git push -u origin main

ECHO.
ECHO [OK] Done! If you saw errors above, check your URL or login status.
PAUSE
