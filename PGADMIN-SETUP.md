# Setting Up the Maharashtra Water Dashboard with pgAdmin

This guide will help you set up the Maharashtra Water Dashboard application to use your local pgAdmin PostgreSQL database.

## Prerequisites

1. **PostgreSQL and pgAdmin** installed on your computer
2. **Node.js** (v14 or later) installed
3. **VS Code** installed

## pgAdmin Database Setup

1. **Open pgAdmin** and connect to your PostgreSQL server

2. **Create a new database**:
   - Right-click on "Databases" and select "Create" → "Database..."
   - Set the database name to: `water_scheme_dashboard`
   - Keep the default owner (typically "postgres")
   - Click "Save"

3. **Set up database security** (if needed):
   - Make sure your PostgreSQL user ("postgres") has the password `Salunke@123`
   - If you have a different password, you'll need to update `.env.pgadmin` with your password

## Application Setup

1. **Download the project** to your local machine

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the pgAdmin setup script**:
   ```bash
   node setup-pgadmin.js
   ```
   
   This script will:
   - Configure the application to use your pgAdmin database
   - Test the database connection
   - Create the necessary tables if they don't exist
   - Set up VS Code configuration files

4. **Verify setup**:
   The script should show several ✅ success messages. If you see any errors, check:
   - Is pgAdmin running?
   - Does the database "water_scheme_dashboard" exist?
   - Is your PostgreSQL password correct?

## Starting the Application

1. **Open the project in VS Code**

2. **Start the application** using one of these methods:
   - Press F5 to launch with debugging
   - Use the Terminal menu: "Terminal" → "Run Task..." → "Start App"
   - Run `npm run dev` in the terminal

3. **Access the application** at http://localhost:5000

## Troubleshooting Database Issues

If you encounter database connection issues:

1. **Check PostgreSQL is running**:
   - pgAdmin should show your server as connected

2. **Verify database credentials**:
   - Check `.env.local` for correct database settings:
     ```
     DATABASE_URL=postgresql://postgres:Salunke@123@localhost:5432/water_scheme_dashboard
     PGHOST=localhost
     PGPORT=5432
     PGUSER=postgres
     PGPASSWORD=Salunke@123
     PGDATABASE=water_scheme_dashboard
     ```

3. **Test database connection**:
   ```bash
   node test-local-db.js
   ```

4. **Recreate tables** if needed:
   ```bash
   node fix-local-setup.js
   ```

## Using the Chatbot Feature

The chatbot requires an OpenAI API key. Make sure the OPENAI_API_KEY environment variable is set in your `.env.local` file.

If the key is not already set, you can add it by editing `.env.local`:
```
OPENAI_API_KEY=your_api_key_here
```

## Getting Help

If you continue to experience issues, check:
- The console output for specific error messages
- That PostgreSQL is running and accessible
- That your database user has appropriate permissions