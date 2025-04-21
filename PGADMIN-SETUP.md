# Complete pgAdmin Setup Guide for Maharashtra Water Dashboard

This guide provides detailed instructions for setting up the Maharashtra Water Dashboard to work with your pgAdmin PostgreSQL database.

## Prerequisites

Before you begin, ensure you have:

1. **pgAdmin** installed and running on your computer
2. A **PostgreSQL database** named `water_scheme_dashboard` created in pgAdmin
3. Your database contains the necessary tables with your data:
   - `region`
   - `scheme_status`
   - `users`
   - `app_state`
   - `water_scheme_data`
4. **Node.js** (version 16 or higher) installed on your computer
5. **Visual Studio Code** installed on your computer

## Step-by-Step Setup

### 1. Extract the Project

Extract the ZIP file to a folder on your computer.

### 2. Open in VS Code

Open VS Code, then use **File > Open Folder** to open the extracted project folder.

### 3. Configure the Database Connection

#### Option A: Automatic Setup (Windows)

1. In VS Code's file explorer, find and right-click on the file `setup-vscode-pgadmin.bat`
2. Select "Run" from the context menu
3. The script will create the necessary configuration files automatically

#### Option B: Automatic Setup (Mac/Linux)

1. Open a terminal in VS Code (Terminal > New Terminal)
2. Run the setup script:
   ```bash
   node vscode-setup.js
   ```
3. The script will create the necessary configuration files automatically

#### Option C: Manual Setup

1. Ensure the `.env.vscode` file exists in the project root with the following content:
   ```
   # Database configuration for VS Code (pgAdmin)
   DATABASE_URL=postgres://postgres:Salunke@123@localhost:5432/water_scheme_dashboard
   PGPORT=5432
   PGUSER=postgres
   PGPASSWORD=Salunke@123
   PGDATABASE=water_scheme_dashboard
   PGHOST=localhost

   # Port settings
   PORT=5000

   # Node settings
   NODE_ENV=development
   ```

2. Make sure the `.vscode/launch.json` file exists with the following content:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "node",
         "request": "launch",
         "name": "Launch Server",
         "runtimeExecutable": "npm",
         "runtimeArgs": ["run", "dev"],
         "envFile": "${workspaceFolder}/.env.vscode",
         "console": "integratedTerminal"
       }
     ]
   }
   ```

### 4. Install Dependencies

In the VS Code terminal, run:

```bash
npm install
```

This will install all the required packages for the project.

### 5. Test the Database Connection

Before starting the application, you can test the connection to your pgAdmin database:

```bash
node test-pgadmin-connection.js
```

This script will verify:
- Connection to your PostgreSQL database
- Existence of required tables
- Record count in each table

If any issues are detected, the script will provide troubleshooting suggestions.

### 6. Start the Application

To start the application, you have two options:

#### Option A: Using VS Code Debugger (Recommended)

1. Press **F5** in VS Code
2. This will start the application with the debugger attached

#### Option B: Using the Terminal

Run the following command in the VS Code terminal:

```bash
npm run dev
```

### 7. Access the Dashboard

Open your web browser and navigate to:

```
http://localhost:5000
```

You should see the Maharashtra Water Dashboard loading your data from pgAdmin.

## Table Requirements

To ensure compatibility with the application, your tables in pgAdmin should follow this structure:

### 1. Region Table (`region`)

The region table should contain information about different administrative regions:

- `region_id` (Primary Key)
- `region_name`
- `total_esr_integrated`
- `fully_completed_esr`
- `partial_esr`
- `total_villages_integrated`
- `fully_completed_villages`
- `total_schemes_integrated`
- `fully_completed_schemes`
- `flow_meter_integrated`
- `rca_integrated`
- `pressure_transmitter_integrated`

### 2. Scheme Status Table (`scheme_status`)

The scheme status table should contain details about water schemes:

- `scheme_id` (Primary Key)
- `region`
- `circle`
- `division`
- `sub_division`
- `block`
- `scheme_name`
- `agency`
- Various status fields (villages, ESR, etc.)

### 3. Water Scheme Data Table (`water_scheme_data`)

The water scheme data table should contain LPCD (Liters Per Capita per Day) measurements:

- `scheme_id` and `village_name` (Composite Primary Key)
- `region`, `circle`, `division`, etc.
- Water values for different days
- LPCD values for different days
- Date values

## Troubleshooting

### Database Connection Issues

If you encounter issues connecting to your pgAdmin database:

1. **Verify PostgreSQL is Running**
   - Open pgAdmin and check if the PostgreSQL server is running

2. **Check Database Name**
   - Ensure the database name is exactly `water_scheme_dashboard`

3. **Verify Credentials**
   - Username: `postgres`
   - Password: `Salunke@123`
   - If different, update the `.env.vscode` file with your credentials

4. **Check Port**
   - Ensure PostgreSQL is running on the default port `5432`
   - If different, update the port in the `.env.vscode` file

5. **Run Test Script**
   - Execute `node test-pgadmin-connection.js` to diagnose connection issues

### Application Startup Issues

If the application fails to start:

1. **Check Console Output**
   - Review the error messages in the VS Code terminal

2. **Install Dependencies**
   - Ensure you've run `npm install` to install all dependencies

3. **Port in Use**
   - If port 5000 is already in use, edit the `PORT` in `.env.vscode`

4. **Node.js Version**
   - Ensure you're using Node.js version 16 or higher

### Data Display Issues

If your data isn't displaying correctly:

1. **Table Structure**
   - Verify your tables match the expected structure (see Table Requirements above)

2. **Empty Tables**
   - Check if your tables contain any data

3. **Column Names**
   - Ensure column names in your tables match the expected names

## Need More Help?

If you're still experiencing issues after following this guide, please reference the additional documentation files or contact support.