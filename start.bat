@echo off
title Pluck - YouTube & Shorts Downloader
cd /d "%~dp0"

echo =======================================================
echo          Pluck - YouTube & Shorts Downloader
echo =======================================================
echo.

:: Check for python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not found in PATH!
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

:: Install / verify dependencies
echo Checking and installing requirements...
pip install -r requirements.txt

:: Start app
echo.
echo Starting Pluck...
python run.py

pause
