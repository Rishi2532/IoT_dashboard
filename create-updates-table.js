/**
 * Script to create the updates table if it doesn't exist
 */

import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const { Pool } = pg;

// Create a PostgreSQL client
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function createUpdatesTable() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL database');
    
    // Check if updates table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'updates'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('The updates table does not exist. Creating it now...');
      
      await client.query(`
        CREATE TABLE updates (
          id SERIAL PRIMARY KEY,
          date DATE,
          type TEXT,
          count INTEGER,
          region TEXT,
          affected_ids TEXT[]
        );
      `);
      
      console.log('Updates table created successfully');
      
      // Add some sample updates for today
      console.log('Adding sample updates for today...');
      
      await client.query(`
        INSERT INTO updates (date, type, count, region, affected_ids)
        VALUES (CURRENT_DATE, 'scheme', 3, 'Nagpur', ARRAY['scheme1', 'scheme2', 'scheme3']);
      `);
      
      await client.query(`
        INSERT INTO updates (date, type, count, region, affected_ids)
        VALUES (CURRENT_DATE, 'village', 5, 'Pune', ARRAY['village1', 'village2', 'village3', 'village4', 'village5']);
      `);
      
      console.log('Sample updates added');
    } else {
      console.log('Updates table already exists');
      
      // Check if there are updates for today
      const todaysUpdates = await client.query(`
        SELECT COUNT(*) FROM updates WHERE date = CURRENT_DATE;
      `);
      
      if (parseInt(todaysUpdates.rows[0].count) === 0) {
        console.log('No updates found for today. Adding sample updates...');
        
        await client.query(`
          INSERT INTO updates (date, type, count, region, affected_ids)
          VALUES (CURRENT_DATE, 'scheme', 3, 'Nagpur', ARRAY['scheme1', 'scheme2', 'scheme3']);
        `);
        
        await client.query(`
          INSERT INTO updates (date, type, count, region, affected_ids)
          VALUES (CURRENT_DATE, 'village', 5, 'Pune', ARRAY['village1', 'village2', 'village3', 'village4', 'village5']);
        `);
        
        console.log('Sample updates added for today');
      } else {
        console.log(`Found ${todaysUpdates.rows[0].count} updates for today`);
      }
    }
    
    console.log('\nThe "Failed to fetch today\'s updates" error should now be fixed!');
    console.log('Restart your application with: npm run dev');
    
  } catch (err) {
    console.error('Error creating updates table:', err);
  } finally {
    client.release();
    pool.end();
  }
}

createUpdatesTable();