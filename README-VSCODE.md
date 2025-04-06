# VS Code Setup for Maharashtra Water Dashboard

## Initial Setup Instructions

1. **Clone the repository to your local machine**

2. **Set up the environment file**
   - Create a `.env` file in the project root with your database credentials:
   ```
   # PostgreSQL Connection
   DATABASE_URL=postgresql://postgres:Salunke@123@localhost:5432/water_scheme_dashboard
   PGUSER=postgres
   PGHOST=localhost
   PGPASSWORD=Salunke@123
   PGDATABASE=water_scheme_dashboard
   PGPORT=5432

   # App Configuration
   PORT=5000
   ```

3. **Install Dependencies**
   ```
   npm install
   ```

4. **Run the setup scripts in this order:**

   ```
   node setup-vscode.js
   node fix-agency-column.js
   ```

   If you still have problems with file imports or scheme data:
   ```
   node fix-scheme-data.js
   node fix-file-import.js
   ```

## Troubleshooting Scripts

Each script solves a specific issue:

- **setup-vscode.js**: Creates all necessary tables and inserts sample data
- **fix-agency-column.js**: Fixes the missing "agency" column that causes most errors
- **fix-scheme-data.js**: Recreates the scheme_status table with proper structure
- **fix-file-import.js**: Sets up file upload directories and permissions
- **test-local-db.js**: Tests your database connection and tables

## Common Errors & Solutions

1. **Error: column "agency" does not exist**
   - Run `node fix-agency-column.js`

2. **No schemes visible in dashboard**
   - Run `node fix-scheme-data.js`

3. **Cannot import Excel/CSV files**
   - Run `node fix-file-import.js`

4. **"Failed to fetch today's data" error**
   - Run `node fix-agency-column.js`

## Default Login

- Username: admin
- Password: admin123

## Custom Data Import

To import your own Excel file:
```
node import-scheme-excel.js path/to/your/excel/file.xlsx
```