/**
 * Migration script to add the 'active' column to the scheme_status table
 * This column is used to track whether a scheme is present in the latest import
 */
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function addActiveColumn() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Check if the 'active' column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scheme_status' AND column_name = 'active';
    `;
    
    const columnCheck = await client.query(checkColumnQuery);
    
    if (columnCheck.rowCount === 0) {
      // Add the 'active' column if it doesn't exist
      console.log("Adding 'active' column to scheme_status table...");
      
      const addColumnQuery = `
        ALTER TABLE scheme_status
        ADD COLUMN active BOOLEAN DEFAULT TRUE;
      `;
      
      await client.query(addColumnQuery);
      console.log("Successfully added 'active' column to scheme_status table");
      
      // Set all existing schemes to active
      const setActiveQuery = `
        UPDATE scheme_status
        SET active = TRUE;
      `;
      
      await client.query(setActiveQuery);
      console.log("Set all existing schemes to active");
    } else {
      console.log("The 'active' column already exists in the scheme_status table");
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await client.end();
  }
}

// Run the migration
addActiveColumn();