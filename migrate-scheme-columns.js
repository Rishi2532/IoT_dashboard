/**
 * Migration script to update the column names in the scheme_status table
 * This script renames the columns to match the new schema definition
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateSchemeColumns() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration of scheme_status table columns...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // List of columns to rename in format: [oldName, newName]
    const columnsToRename = [
      ['region_name', 'region'],
      ['total_villages', 'number_of_village'],
      ['villages_integrated', 'total_villages_integrated'],
      ['functional_villages', 'no_of_functional_village'],
      ['partial_villages', 'no_of_partial_village'],
      ['non_functional_villages', 'no_of_non_functional_village'],
      ['total_esr', 'total_number_of_esr'],
      ['esr_integrated_on_iot', 'total_esr_integrated'],
      ['fully_completed_esr', 'no_fully_completed_esr'],
      ['balance_esr', 'balance_to_complete_esr'],
      ['pressure_transmitters_connected', 'pressure_transmitter_connected'],
      ['residual_chlorine_connected', 'residual_chlorine_analyzer_connected'],
      ['scheme_status', 'fully_completion_scheme_status']
    ];
    
    // Rename each column
    for (const [oldName, newName] of columnsToRename) {
      console.log(`Renaming column ${oldName} to ${newName}...`);
      
      // Check if old column exists
      const checkOldColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'scheme_status' AND column_name = $1
      `, [oldName]);
      
      // Check if new column already exists
      const checkNewColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'scheme_status' AND column_name = $1
      `, [newName]);
      
      if (checkOldColumn.rows.length > 0 && checkNewColumn.rows.length === 0) {
        await client.query(`ALTER TABLE scheme_status RENAME COLUMN ${oldName} TO ${newName}`);
        console.log(`✅ Successfully renamed ${oldName} to ${newName}`);
      } else if (checkOldColumn.rows.length === 0) {
        console.log(`⚠️ Original column ${oldName} does not exist, skipping...`);
      } else if (checkNewColumn.rows.length > 0) {
        console.log(`⚠️ New column ${newName} already exists, skipping...`);
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('❌ Error during migration:', error.message);
    console.error('Migration rolled back, no changes were made.');
  } finally {
    // Release the client
    client.release();
    await pool.end();
  }
}

// Execute the migration
migrateSchemeColumns().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});