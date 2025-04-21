# Maharashtra Water Dashboard

## Getting Started with VS Code and pgAdmin

This project is configured to run easily in Visual Studio Code with your pgAdmin database. Follow these steps:

### Option 1: Quick Setup with pgAdmin (Recommended)

1. **Extract the project** to a folder on your computer
2. **Open the project** in VS Code
3. **Run the pgAdmin setup script** by right-clicking on `setup-vscode-pgadmin.bat` and selecting "Run" (Windows) or by running `node vscode-setup.js` in the terminal
4. Install dependencies by running:
   ```
   npm install
   ```
5. Press **F5** to launch the application with your pgAdmin database

### Option 2: Manual Setup

1. **Open the project** in VS Code
2. Make sure the `.env.vscode` file contains the correct pgAdmin database credentials:
   ```
   DATABASE_URL=postgres://postgres:Salunke@123@localhost:5432/water_scheme_dashboard
   PGPORT=5432
   PGUSER=postgres
   PGPASSWORD=Salunke@123
   PGDATABASE=water_scheme_dashboard
   PGHOST=localhost
   ```
3. Install dependencies by running:
   ```
   npm install
   ```
4. Press **F5** to launch the application

### Testing pgAdmin Connection

You can test your pgAdmin database connection by running:
```
node test-pgadmin-connection.js
```

The application will be accessible at http://localhost:5000

## pgAdmin Database Configuration

This application is configured to connect to your pgAdmin PostgreSQL database with:

- **Database Name**: water_scheme_dashboard
- **Username**: postgres
- **Password**: Salunke@123
- **Host**: localhost
- **Port**: 5432

All tables from your pgAdmin database will be automatically accessible in the dashboard, including:
- Region data from the "region" table
- Scheme data from the "scheme_status" table
- LPCD data from the "water_scheme_data" table

## Features

- Interactive dashboard for Maharashtra water infrastructure
- Regional water scheme visualization
- Voice-enabled chatbot assistant (supports multiple Indian languages)
- Data filtering by region, scheme status, etc.
- LPCD (Liters Per Capita per Day) visualization and analysis
- Import/export functionality for water scheme data

## Environment Variables

If you need to change any database credentials, edit the `.env.vscode` file.

## Troubleshooting

If you encounter issues connecting to pgAdmin:

1. Ensure PostgreSQL is running in pgAdmin
2. Verify the database name is "water_scheme_dashboard"
3. Check that your username and password are correct in `.env.vscode`
4. Run the test connection script: `node test-pgadmin-connection.js`

For more detailed instructions, see `VS-CODE-README.md`
