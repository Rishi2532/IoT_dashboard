/**
 * Fix script for local database setup issues
 * This script helps troubleshoot and fix common issues with the database setup
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Create PostgreSQL client
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function fixLocalSetup() {
  console.log('========================================');
  console.log('Local Database Fix Script');
  console.log('========================================\n');
  
  console.log('Attempting to connect to PostgreSQL database...');
  
  try {
    const client = await pool.connect();
    
    try {
      console.log('✅ Connected to PostgreSQL database successfully');
      
      // Check for incomplete or corrupted schema
      console.log('\n🔧 Checking for schema issues...');
      
      // Check if regions table has partial_esr column
      const partialEsrCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'regions' 
          AND column_name = 'partial_esr'
        );
      `);
      
      if (!partialEsrCheck.rows[0].exists) {
        console.log('Adding missing partial_esr column to regions table...');
        await client.query(`
          ALTER TABLE regions 
          ADD COLUMN partial_esr INTEGER DEFAULT 0;
        `);
        console.log('✅ Added partial_esr column');
      }
      
      // Check if scheme_status table has scheme_functional_status column
      const functionalStatusCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'scheme_status' 
          AND column_name = 'scheme_functional_status'
        );
      `);
      
      if (!functionalStatusCheck.rows[0].exists) {
        console.log('Adding missing scheme_functional_status column to scheme_status table...');
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN scheme_functional_status TEXT;
        `);
        console.log('✅ Added scheme_functional_status column');
      }
      
      // Fix functional status values to ensure they're text
      const wrongStatusCount = await client.query(
        `SELECT COUNT(*) FROM scheme_status 
         WHERE scheme_functional_status IS NOT NULL 
         AND scheme_functional_status NOT IN ('Functional', 'Partial')`
      );
      
      if (parseInt(wrongStatusCount.rows[0].count) > 0) {
        console.log('Fixing functional status values...');
        
        await client.query(
          `UPDATE scheme_status 
           SET scheme_functional_status = 'Functional' 
           WHERE scheme_functional_status IN ('true', '1') 
           OR scheme_functional_status::text = 'true'`
        );
        
        await client.query(
          `UPDATE scheme_status 
           SET scheme_functional_status = 'Partial' 
           WHERE scheme_functional_status IN ('false', '0')
           OR scheme_functional_status::text = 'false'`
        );
        
        console.log('✅ Fixed functional status values');
      }
      
      // Check if fully completed schemes for Konkan and Pune regions are null but should be 0
      const nullSchemesCount = await client.query(`
        SELECT COUNT(*) FROM regions 
        WHERE region_name IN ('Konkan', 'Pune') 
        AND fully_completed_schemes IS NULL
      `);
      
      if (parseInt(nullSchemesCount.rows[0].count) > 0) {
        console.log('Fixing null values for fully completed schemes in Konkan and Pune regions...');
        
        await client.query(`
          UPDATE regions 
          SET fully_completed_schemes = 0 
          WHERE region_name IN ('Konkan', 'Pune') 
          AND fully_completed_schemes IS NULL
        `);
        
        console.log('✅ Fixed null values for fully completed schemes');
      }
      
      // Update agency values for each region
      console.log('\n🔧 Checking agency values for schemes...');
      
      const regions = await client.query(`SELECT DISTINCT region_name FROM regions`);
      
      for (const row of regions.rows) {
        const regionName = row.region_name;
        const agency = getAgencyByRegion(regionName);
        
        const nullAgencyCount = await client.query(`
          SELECT COUNT(*) FROM scheme_status 
          WHERE region_name = $1 AND agency IS NULL
        `, [regionName]);
        
        if (parseInt(nullAgencyCount.rows[0].count) > 0) {
          console.log(`Updating agency values for ${regionName} region...`);
          
          await client.query(`
            UPDATE scheme_status 
            SET agency = $1 
            WHERE region_name = $2 AND agency IS NULL
          `, [agency, regionName]);
          
          console.log(`✅ Updated agency values for ${regionName} region`);
        }
      }
      
      // Check for updates table and create if missing
      const updatesTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'updates'
        );
      `);
      
      if (!updatesTableCheck.rows[0].exists) {
        console.log('Creating missing updates table...');
        
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
        
        console.log('✅ Created updates table');
        
        // Insert today's date for a sample update
        const today = new Date().toISOString().split('T')[0];
        
        await client.query(
          `INSERT INTO updates (date, type, count, region, affected_ids)
           VALUES ($1, 'scheme', 2, 'Nagpur', ARRAY['NAG1000', 'NAG1001'])`,
          [today]
        );
        
        console.log('✅ Added sample update for today');
      }
      
      // Check for users table and create if missing
      const usersTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      if (!usersTableCheck.rows[0].exists) {
        console.log('Creating missing users table...');
        
        await client.query(`
          CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE
          );
          
          -- Insert default admin user (username: admin, password: admin123)
          INSERT INTO users (username, password, is_admin) 
          VALUES ('admin', 'admin123', TRUE);
        `);
        
        console.log('✅ Created users table with default admin user');
      }
      
      console.log('\n✅ Fix script completed successfully!');
      console.log('Your database structure should now be ready for use.');
      console.log('Try running the application with: npm run dev');
      
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Error connecting to database:', err);
    console.log('\nPlease check your PostgreSQL connection settings in .env file:');
    console.log(`DATABASE_URL=${process.env.DATABASE_URL}`);
    console.log(`PGUSER=${process.env.PGUSER}`);
    console.log(`PGHOST=${process.env.PGHOST}`);
    console.log(`PGDATABASE=${process.env.PGDATABASE}`);
    console.log(`PGPORT=${process.env.PGPORT}`);
  } finally {
    await pool.end();
  }
}

// Helper function to determine agency by region
function getAgencyByRegion(regionName) {
  const regionAgencyMap = {
    'Nagpur': 'M/s Rite Water',
    'Amravati': 'JISL',
    'Chhatrapati Sambhajinagar': 'L&T',
    'Pune': 'L&T',
    'Konkan': 'L&T',
    'Nashik': 'JISL'
  };
  
  return regionAgencyMap[regionName] || 'L&T';
}

// Run the fix script
fixLocalSetup();