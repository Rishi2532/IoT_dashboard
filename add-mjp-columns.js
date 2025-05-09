/**
 * Migration script to add the MJP columns to the scheme_status table
 * - mjp_commissioned column (Yes/No values)
 * - mjp_fully_completed column (Fully Completed/In Progress values)
 */
import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
dotenv.config();

async function addMjpColumns() {
  console.log("Starting migration to add MJP columns...");
  
  // Create a connection to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Check if columns already exist
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'scheme_status' 
      AND column_name IN ('mjp_commissioned', 'mjp_fully_completed');
    `);

    const existingColumns = checkResult.rows.map(row => row.column_name);
    
    // Begin transaction
    await pool.query('BEGIN');

    // Add mjp_commissioned column if it doesn't exist
    if (!existingColumns.includes('mjp_commissioned')) {
      console.log("Adding mjp_commissioned column...");
      await pool.query(`
        ALTER TABLE scheme_status 
        ADD COLUMN mjp_commissioned TEXT DEFAULT 'No'
      `);
      console.log("Added mjp_commissioned column successfully");
    } else {
      console.log("mjp_commissioned column already exists, skipping...");
    }

    // Add mjp_fully_completed column if it doesn't exist
    if (!existingColumns.includes('mjp_fully_completed')) {
      console.log("Adding mjp_fully_completed column...");
      await pool.query(`
        ALTER TABLE scheme_status 
        ADD COLUMN mjp_fully_completed TEXT DEFAULT 'In Progress'
      `);
      console.log("Added mjp_fully_completed column successfully");
    } else {
      console.log("mjp_fully_completed column already exists, skipping...");
    }

    // Commit transaction
    await pool.query('COMMIT');
    
    console.log("Migration completed successfully!");
  } catch (error) {
    // Rollback transaction in case of error
    await pool.query('ROLLBACK');
    console.error("Error during migration:", error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Execute the function
addMjpColumns()
  .then(() => {
    console.log("Database schema updated successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to update database schema:", error);
    process.exit(1);
  });