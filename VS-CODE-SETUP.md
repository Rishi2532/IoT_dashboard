# Running the Water Scheme Dashboard in VS Code

This document provides steps to run the application in your local VS Code environment.

## Prerequisites

1. Node.js v16+ installed
2. PostgreSQL database server installed and running
3. Visual Studio Code with TypeScript support

## Setup Steps

### 1. Database Setup

1. Create a PostgreSQL database named `water_scheme_dashboard`:
   ```sql
   CREATE DATABASE water_scheme_dashboard;
   ```

2. Make sure your PostgreSQL server is running on the default port (5432)

3. Update the `.env` file in the project root with your PostgreSQL credentials:
   ```
   # Database connection information
   DATABASE_URL=postgresql://postgres:Salunke@123@localhost:5432/water_scheme_dashboard
   PGHOST=localhost
   PGUSER=postgres
   PGPASSWORD=Salunke@123
   PGDATABASE=water_scheme_dashboard
   PGPORT=5432
   ```

   **Note**: Replace `Salunke@123` with your actual PostgreSQL password.

### 2. Local Adapter Setup

The project includes a special adapter for local environments:

- `server/local-adapter.js` - Configures the PostgreSQL connection for local development
- `test-local-db.js` - A test script to verify your database connection

Before running the main application, test your database connection:

```bash
node test-local-db.js
```

If the connection is successful, you'll see information about your PostgreSQL server and available tables.

### 3. Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to http://localhost:5000

## Troubleshooting

### "client password must be a string" Error
If you encounter this error, it's likely that your database credentials aren't being properly loaded:

1. Make sure your `.env` file exists in the project root and has the correct PostgreSQL credentials
2. Check that the `PGPASSWORD` value in your `.env` file is correctly set and has no surrounding quotes
3. If needed, modify the password directly in `server/local-adapter.js`:
   ```javascript
   // Find this line:
   const password = 'Salunke@123'; // Hardcoded for local development
   
   // Change it to your actual PostgreSQL password:
   const password = 'your-actual-password';
   ```

### Database Initialization Issues
If the application starts but you don't see any data:

1. Run the database test script to verify connectivity:
   ```bash
   node test-local-db.js
   ```

2. If tables exist but contain no data, you can manually trigger data initialization:
   - The application will automatically populate the database with sample data when it first runs
   - Check the console logs for any initialization errors

## Getting Help

If you encounter issues not covered here:

1. Review the console logs for specific error messages
2. Check that all prerequisites are properly installed and configured
3. Make sure PostgreSQL is running and accessible from your terminal/command prompt