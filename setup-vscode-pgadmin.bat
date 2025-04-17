@echo off
echo Maharashtra Water Dashboard - pgAdmin Setup

echo Installing required packages...
call npm install dotenv pg

echo Setting up for pgAdmin...
node setup-pgadmin.js

echo.
echo If setup was successful, you can now:
echo 1. Open this project in VS Code
echo 2. Start the application with F5 or "npm run dev"
echo.
echo The application will be available at http://localhost:5000
echo.

pause