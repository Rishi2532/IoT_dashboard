@echo off
echo Maharashtra Water Dashboard - pgAdmin Setup

echo Installing required packages...
call npm install dotenv pg

echo Setting up for pgAdmin...
node setup-pgadmin.cjs

echo.
echo If setup was successful, you can now:
echo 1. Run: npm install
echo 2. Open this project in VS Code
echo 3. Start the application with F5 or "npm run dev"
echo.
echo The application will be available at http://localhost:5000
echo.

pause