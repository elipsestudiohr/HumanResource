@echo off
title Elipse HR Portal - Silent ZK Sync Launcher
cd /d "%~dp0"
echo ===================================================================
echo     Starting Elipse HR Portal & ZK Attendance Sync Agent
echo ===================================================================

:: Run run_zk_sync_hidden.vbs if present in current directory, C:, or D: drive
if exist "%~dp0run_zk_sync_hidden.vbs" (
    echo Launching ZK Sync Agent silently from current directory...
    start "" wscript "%~dp0run_zk_sync_hidden.vbs"
) else if exist "C:\Elipse\HRPortal\run_zk_sync_hidden.vbs" (
    echo Launching ZK Sync Agent silently from C:\Elipse\HRPortal...
    start "" wscript "C:\Elipse\HRPortal\run_zk_sync_hidden.vbs"
) else if exist "D:\Elipse\HRPortal\run_zk_sync_hidden.vbs" (
    echo Launching ZK Sync Agent silently from D:\Elipse\HRPortal...
    start "" wscript "D:\Elipse\HRPortal\run_zk_sync_hidden.vbs"
) else (
    echo Notice: run_zk_sync_hidden.vbs not found. Opening HR Portal directly.
)

:: Launch web application
start "" "http://localhost:5173"
exit
