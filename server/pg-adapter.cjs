// This is a CommonJS module that will be used by ESM modules
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
console.log('PostgreSQL Connection Configuration:');
console.log(`Host: ${process.env.PGHOST || 'localhost'}`);
console.log(`Database: ${process.env.PGDATABASE || 'not set'}`);
console.log(`User: ${process.env.PGUSER || 'postgres'}`);
console.log(`Password is set: ${process.env.PGPASSWORD ? 'Yes' : 'No'}`);

// Make sure password is a string
let password = process.env.PGPASSWORD;
if (typeof password !== 'string') {
  console.warn('Password is not a string, converting explicitly');
  password = String(password || '');
}

// Create pool with explicit parameters and password as string
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: password, // Use the string version
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT || '5432'),
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: {
    require: true,
    rejectUnauthorized: false // This is needed for self-signed certificates
  }
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