# Local Database Setup for VS Code Development

## Overview
This guide helps you configure the Maharashtra Water Infrastructure Management Platform to use your local PostgreSQL database instead of the remote Replit database.

## Prerequisites
- PostgreSQL installed locally (pgAdmin recommended)
- VS Code for development
- Node.js and npm installed

## Step 1: Database Configuration

### Option A: Update .env.vscode file (Recommended)
Edit the `.env.vscode` file with your actual PostgreSQL credentials:

```env
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/your_database_name
PGHOST=localhost
PGPORT=5432
PGUSER=your_username
PGPASSWORD=your_password
PGDATABASE=your_database_name
```

### Option B: Update .env.local file
Edit the `.env.local` file with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/your_database_name
PGHOST=localhost
PGPORT=5432
PGUSER=your_username
PGPASSWORD=your_password
PGDATABASE=your_database_name
```

## Step 2: Create Database in pgAdmin
1. Open pgAdmin
2. Create a new database (e.g., `maharashtra_water`)
3. Ensure your PostgreSQL user has full permissions on this database

## Step 3: Common PostgreSQL Settings
If using default PostgreSQL installation:
- Username: `postgres`
- Password: `postgres` (or your chosen password)
- Host: `localhost`
- Port: `5432`

## Step 4: Run the Application
When you run the application from VS Code using `npm run dev`, it will:
1. Automatically detect the `.env.vscode` file
2. Connect to your local PostgreSQL database
3. Create all required tables automatically
4. Create a default admin user (username: `admin`, password: `admin123`)

## Step 5: Verify Activity Logging
After running the application:
1. Login with admin credentials
2. Navigate to different pages (chlorine, pressure, LPCD dashboards)
3. Download some files
4. Go to Admin Panel → User Activity Logs
5. You should see all activities logged in your local database

## Troubleshooting

### Database Connection Issues
If you see connection errors:
1. Verify PostgreSQL is running
2. Check your credentials in the `.env.vscode` file
3. Ensure the database exists
4. Check firewall settings

### Missing Activity Logs
If activity logs are not appearing:
1. Ensure you're logged in as a user
2. Check that the `user_activity_logs` table exists
3. Verify the DATABASE_URL points to your local database

### Environment File Priority
The application loads environment files in this order:
1. `.env.vscode` (highest priority - for VS Code development)
2. `.env.local` (for general local development)
3. `.env` (default/fallback)

## Database Tables Created Automatically
The application will create these tables:
- `users` - User accounts and authentication
- `user_activity_logs` - Activity tracking (downloads, page visits, etc.)
- `region` - Regional data
- `scheme_status` - Water scheme status information
- `water_scheme_data` - LPCD and water consumption data
- `chlorine_data` - Chlorine monitoring data
- `pressure_data` - Pressure monitoring data
- `report_files` - Uploaded report files
- `app_state` - Application state storage

## Default Admin User
Username: `admin`
Password: `admin123`
Role: `admin`

After first login, you can create additional users or change the admin password through the application interface.