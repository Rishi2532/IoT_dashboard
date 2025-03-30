// This is a CommonJS module that will be used by ESM modules
const pg = require('pg');
const { Pool } = pg;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create pool with explicit parameters
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT || '5432'),
  max: 10,
  idleTimeoutMillis: 30000,
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