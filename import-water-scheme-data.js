/**
 * Script to import water scheme data sample into the database
 */
import { pool } from './server/db.js';
import fs from 'fs';
import path from 'path';

async function importWaterSchemeData() {
  console.log('Importing water scheme data from SQL file...');
  
  // Read the SQL file
  const sqlFilePath = path.join(process.cwd(), 'attached_assets', 'deepseek_sql_20250420_7b9ba1.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Insert the data from the SQL file
      await client.query(sqlContent);
      console.log('Successfully imported water scheme data from SQL file');
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error importing water scheme data:', error);
  }
}

// Execute the function
importWaterSchemeData();