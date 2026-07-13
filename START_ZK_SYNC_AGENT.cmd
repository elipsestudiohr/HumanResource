@echo off
title ZKTeco K40 Attendance Real-Time Sync Agent
cd /d "%~dp0zk-sync-agent"
echo ===================================================================
echo     Starting ZKTeco K40 Attendance Machine Real-Time Sync Agent
echo ===================================================================
echo Current Directory: %CD%
echo.
npm start
echo.
echo ===================================================================
echo Agent stopped. Press any key to close window.
echo ===================================================================
pause
