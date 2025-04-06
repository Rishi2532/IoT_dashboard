# VS Code Setup Guide for Maharashtra Water Dashboard

This guide will help you set up and run the Maharashtra Water Dashboard application in Visual Studio Code with a local PostgreSQL database.

## Prerequisites

1. **PostgreSQL**: Install PostgreSQL on your local machine (version 12 or higher recommended)
2. **pgAdmin**: Install pgAdmin 4 for easy database management
3. **Node.js**: Install Node.js (LTS version recommended)
4. **Visual Studio Code**: Install VS Code with recommended extensions:
   - ESLint
   - Prettier
   - TypeScript and JavaScript Language Features

## Step 1: Clone the Repository

Clone the repository to your local machine using Git:

```
git clone <repository-url>
cd maharashtra-water-dashboard
```

## Step 2: Set Up PostgreSQL Database

1. Open pgAdmin and create a new database called `water_scheme_dashboard`
2. Note your PostgreSQL connection details:
   - Host: localhost
   - Port: 5432 (default)
   - Username: postgres (or your custom username)
   - Password: Your PostgreSQL password
   - Database: water_scheme_dashboard

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory of the project with your PostgreSQL credentials:

```
# PostgreSQL Connection
DATABASE_URL=postgresql://postgres:YourPassword@localhost:5432/water_scheme_dashboard
PGUSER=postgres
PGHOST=localhost
PGPASSWORD=YourPassword
PGDATABASE=water_scheme_dashboard
PGPORT=5432

# App Configuration
PORT=5000
```

Replace `YourPassword` with your actual PostgreSQL password.

## Step 4: Install Dependencies

Run the following command to install project dependencies:

```
npm install
```

## Step 5: Set Up Local Database

The project includes several utility scripts to help set up your local database correctly:

1. **Initial Setup**: This script creates all necessary tables and sample data

```
node setup-vscode.js
```

2. **Verify Database Connection**: Test your connection to the database

```
node test-local-db.js
```

3. **Fix Common Issues**: If you encounter any issues, run the fix script

```
node fix-local-setup.js
```

## Step 6: Start the Application

Start the application using:

```
npm run dev
```

The application should now be running at [http://localhost:5000](http://localhost:5000)

## Default Login

Use the following credentials to log in:
- Username: admin
- Password: admin123

## Troubleshooting

If you encounter any issues, try these steps:

1. **Database Connection Issues**:
   - Check your PostgreSQL credentials in the `.env` file
   - Ensure PostgreSQL service is running
   - Run `node fix-local-setup.js` to fix common database issues

2. **Missing Tables or Data**:
   - Run `node setup-vscode.js` to recreate tables and sample data

3. **Application Errors**:
   - Check the console for error messages
   - Ensure all environment variables are correctly set in `.env`
   - Restart the application with `npm run dev`

4. **"Failed to fetch today's data" Error**:
   - This error indicates the `updates` table is missing or empty
   - Run `node fix-local-setup.js` to fix this issue

## Importing Excel Data

To import data from Excel files:

1. Place your Excel file in the project root directory
2. Run the appropriate import script:
   ```
   node import-scheme-level-data.js YourExcelFile.xlsx
   ```

## Additional Information

- The application uses a PostgreSQL database for data storage
- The backend is built with Express.js
- The frontend is built with React and uses Tailwind CSS for styling
- The map visualization uses Leaflet.js
- All database interactions are managed through Drizzle ORM