/**
 * Migration script to add the 'agency' column to the scheme_status table
 * This column is used to store the agency managing the scheme
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function addAgencyColumn() {
  try {
    console.log("Setting up database connection...");
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const db = await pool.connect();
    
    // Check if agency column exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scheme_status' AND column_name = 'agency'
    `;
    
    const columnExists = await db.query(checkColumnQuery);
    
    if (columnExists.rows.length === 0) {
      console.log("Adding 'agency' column to scheme_status table...");
      
      // Add the agency column
      await db.query(`
        ALTER TABLE scheme_status 
        ADD COLUMN agency TEXT
      `);
      
      console.log("Successfully added 'agency' column to scheme_status table.");
    } else {
      console.log("The 'agency' column already exists in the scheme_status table.");
    }
    
    console.log("Migration completed successfully!");
    
    // Release the client back to the pool
    db.release();
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
addAgencyColumn()
  .then(() => {
    console.log("Migration completed. You can now restart the application.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });