@echo off
echo ==============================================
echo FORGECART HACKATHON BACKEND BOOTSTRAPPER
echo ==============================================

:: Temporarily add Node.js and NPM to this terminal's PATH
set PATH=C:\Program Files\nodejs;%PATH%

echo [1/3] Node.js Path Fixed for this session!
node -v

echo [2/3] Installing/Verifying Backend Packages...
npm install

echo [3/3] Attempting to Seed Data and Start Server...
echo NOTE: If this gets stuck or crashes with a Timeout, you do NOT have MongoDB running locally!
node seed/seedData.js
npm start
