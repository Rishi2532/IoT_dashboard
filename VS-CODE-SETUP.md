# Running the Application in VS Code

This guide will help you set up and run the Maharashtra Water Infrastructure Management Platform in Visual Studio Code.

## Prerequisites

1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Install [Node.js](https://nodejs.org/) (version 16 or higher)
3. Install [PostgreSQL](https://www.postgresql.org/download/) locally or use a cloud PostgreSQL instance

## Setup Steps

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd <repository-folder>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory with the following variables:

```
# PostgreSQL Connection
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
PGUSER=your_username
PGHOST=localhost
PGPASSWORD=your_password
PGDATABASE=your_database_name
PGPORT=5432

# App Configuration
PORT=5000
```

Replace the values with your actual PostgreSQL connection details.

### 4. Create the database

You can either:

- Create a PostgreSQL database using pgAdmin
- Run the SQL commands in `database_backup.sql` to set up your database schema

### 5. Create `dev` script in package.json

Check that your `package.json` contains the following script:

```json
"scripts": {
  "dev": "tsx server/index.ts"
}
```

### 6. Start the application

```bash
npm run dev
```

The application should start and be available at http://localhost:5000

## Troubleshooting

### Database Connection Issues

If you encounter database connection problems:

1. Make sure PostgreSQL is running
2. Verify your connection details in the `.env` file
3. Check that your PostgreSQL user has the necessary permissions
4. Try running `node test-db.js` to test the database connection

### Environment Variables

On Windows, you might need to set environment variables differently. You can use a `.env` file or set them in your terminal before running the application:

```bash
set DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
set PGUSER=your_username
# ... other variables
npm run dev
```

### Port Conflicts

If port 5000 is already in use, you can change the port in your `.env` file:

```
PORT=3000
```

## Importing Data

After setting up, you can import data using the admin interface or run one of the import scripts:

```bash
node import-scheme-level-data.js
```

## More Information

For more detailed information, refer to the project documentation or other README files in the repository.