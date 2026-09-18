@echo off
title HR Portal - Supabase Daily Database Backup
cd /d "%~dp0"
echo ========================================================
echo   Running Automated Supabase Database Backup...
echo ========================================================
node zk-sync-agent\backup_database.js
echo.
if "%~1"=="--no-pause" goto :eof
if "%~1"=="-s" goto :eof
echo Backup completed. Press any key to close this window.
pause >nul
