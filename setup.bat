@echo off
title DelivSaga Setup (Windows)
echo ======================================================
echo   DelivSaga: Smart Food Delivery App Setup (Windows)   
echo ======================================================

:: Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please download and install it from https://nodejs.org/
    pause
    exit /b 1
)

:: Install Dependencies
echo.
echo [1/5] Installing npm dependencies for all workspaces...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b %errorlevel%
)
echo [OK] Dependencies installed successfully.

:: Docker Compose Kafka Setup
echo.
echo [2/5] Starting Kafka and Zookeeper via Docker Compose...
where docker >nul 2>nul
if %errorlevel% equ 0 (
    call docker compose up -d
    echo Waiting 10 seconds for Kafka broker to start...
    timeout /t 10 /nobreak >nul
) else (
    echo [WARNING] Docker is not installed or not in PATH. Skipping Kafka container startup.
    echo Please make sure a Kafka broker is running on localhost:9092.
)

:: Create Kafka topics
echo.
echo [3/5] Creating Kafka topics...
call node shared/create-topics.mjs
if %errorlevel% neq 0 (
    echo [WARNING] Kafka topic setup finished with warnings. Ensure your broker is active.
)

:: Seed Databases
echo.
echo [4/5] Seeding SQLite databases...
call npm run seed
if %errorlevel% neq 0 (
    echo [ERROR] Database seeding failed.
    pause
    exit /b %errorlevel%
)
echo [OK] Databases seeded successfully.

:: Build TS & Frontend
echo.
echo [5/5] Compiling services and packaging frontend dashboard...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build compilation failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================
echo  ✓ Setup completed successfully!                      
echo ======================================================
echo.
echo To start the entire microservices ecosystem, run:
echo    npm run dev
echo.
echo ======================================================
pause
