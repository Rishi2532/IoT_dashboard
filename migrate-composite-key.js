/**
 * Migration script to change scheme_status primary key 
 * from just scheme_id to a composite key of scheme_id AND block
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure environment variables
dotenv.config();

const { Pool } = pg;

async function migrateToCompositeKey() {
  console.log("Starting migration to composite primary key...");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Connect to the database
    const client = await pool.connect();
    console.log("Connected to PostgreSQL database");

    try {
      // Start a transaction
      await client.query('BEGIN');

      // 1. Create a temporary backup table
      console.log("Creating backup table...");
      await client.query(`
        CREATE TABLE scheme_status_backup AS 
        SELECT * FROM scheme_status;
      `);

      // 2. Drop the existing primary key constraint
      console.log("Dropping existing primary key constraint...");
      await client.query(`
        ALTER TABLE scheme_status DROP CONSTRAINT scheme_status_pkey;
      `);

      // 3. Add new composite primary key
      console.log("Adding composite primary key (scheme_id, block)...");
      await client.query(`
        ALTER TABLE scheme_status ADD PRIMARY KEY (scheme_id, block);
      `);

      // 4. Commit the transaction
      await client.query('COMMIT');
      console.log("Migration completed successfully!");
      
    } catch (err) {
      // If there's an error, roll back the transaction
      await client.query('ROLLBACK');
      console.error("Migration failed:", err);
      throw err;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error("Database connection error:", err);
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run the migration
migrateToCompositeKey().catch(err => {
  console.error("Migration script failed:", err);
  process.exit(1);
});