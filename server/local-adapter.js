/**
 * Local PostgreSQL adapter for VS Code development
 * This file should be used when running the app locally in VS Code
 * 
 * Copy this file to your local VS Code project as server/local-adapter.js
 */

// For local environment, use this file instead of pg-adapter.cjs
const pg = require('pg');
const { Pool } = pg;
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables with explicit path
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading environment from: ${envPath} (exists: ${fs.existsSync(envPath)})`);
dotenv.config({ path: envPath });

// Log environment variables for debugging (without showing complete password)
console.log('PostgreSQL Connection Configuration (Local):');
console.log(`Host: ${process.env.PGHOST || 'localhost'}`);
console.log(`Database: ${process.env.PGDATABASE || 'water_scheme_dashboard'}`);
console.log(`User: ${process.env.PGUSER || 'postgres'}`);
console.log(`Password is set: ${process.env.PGPASSWORD ? 'Yes' : 'No'}`);

// Make sure password is a string and explicitly set to your password
const password = 'Salunke@123'; // Hardcoded for local development - change this to your actual password

// For localhost, we don't need SSL
const sslConfig = process.env.PGHOST === 'localhost' ? false : {
  require: true,
  rejectUnauthorized: false
};

// Create pool with explicit parameters and password as string
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: password, // Use the explicit string password
  database: process.env.PGDATABASE || 'water_scheme_dashboard',
  port: parseInt(process.env.PGPORT || '5432'),
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: sslConfig
});

// Log connection attempts
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// Export the pool
module.exports = pool;