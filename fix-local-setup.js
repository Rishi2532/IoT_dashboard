/**
 * Fix script for local database setup issues
 * This script helps troubleshoot and fix common issues with the database setup
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local if it exists, otherwise from .env
const envPath = fs.existsSync(path.join(__dirname, '.env.local')) 
  ? path.join(__dirname, '.env.local') 
  : path.join(__dirname, '.env');

dotenv.config({ path: envPath });

async function fixLocalSetup() {
  console.log('Starting local setup fix...');
  console.log('Using environment file:', envPath);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test database connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to database');
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('regions', 'scheme_status', 'daily_updates')
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log('Existing tables:', existingTables.join(', '));
    
    // Check if regions table exists and create if needed
    if (!existingTables.includes('regions')) {
      console.log('Creating regions table...');
      await client.query(`
        CREATE TABLE regions (
          region_id SERIAL PRIMARY KEY,
          region_name TEXT NOT NULL,
          total_schemes INTEGER DEFAULT 0,
          total_schemes_integrated INTEGER DEFAULT 0,
          fully_completed_schemes INTEGER DEFAULT 0,
          total_villages INTEGER DEFAULT 0,
          total_villages_integrated INTEGER DEFAULT 0,
          fully_completed_villages INTEGER DEFAULT 0,
          total_esr INTEGER DEFAULT 0,
          total_esr_integrated INTEGER DEFAULT 0,
          fully_completed_esr INTEGER DEFAULT 0,
          agency TEXT DEFAULT 'MSEDCL',
          latitude DECIMAL(10, 8) DEFAULT NULL,
          longitude DECIMAL(11, 8) DEFAULT NULL,
          flow_meter_integrated INTEGER DEFAULT 0,
          rca_integrated INTEGER DEFAULT 0,
          pressure_transmitter_integrated INTEGER DEFAULT 0
        )
      `);
      console.log('✅ Created regions table');
      
      // Insert sample regions if needed
      const regionNames = ['Amravati', 'Aurangabad', 'Chhatrapati Sambhajinagar', 'Konkan', 'Mumbai', 'Nagpur', 'Nashik', 'Pune', 'Thane'];
      
      for (const name of regionNames) {
        const agency = getAgencyByRegion(name);
        await client.query(`
          INSERT INTO regions (region_name, agency) VALUES ($1, $2)
        `, [name, agency]);
      }
      console.log('✅ Inserted sample regions');
    }
    
    // Check if scheme_status table exists and create if needed
    if (!existingTables.includes('scheme_status')) {
      console.log('Creating scheme_status table...');
      await client.query(`
        CREATE TABLE scheme_status (
          sr_no SERIAL PRIMARY KEY,
          scheme_id TEXT UNIQUE NOT NULL,
          region TEXT NOT NULL,
          district TEXT,
          taluka TEXT,
          name_of_scheme TEXT,
          scheme_type TEXT,
          source_of_water TEXT,
          total_villages INTEGER DEFAULT 0,
          villages_covered INTEGER DEFAULT 0,
          villages_integrated INTEGER DEFAULT 0,
          total_habitations INTEGER DEFAULT 0,
          habitations_integrated INTEGER DEFAULT 0,
          villages_iot_integrated INTEGER DEFAULT 0,
          total_esrs INTEGER DEFAULT 0,
          esrs_integrated INTEGER DEFAULT 0,
          villages_with_full_integration INTEGER DEFAULT 0,
          cumulative_status TEXT,
          scheme_status TEXT,
          integration_status TEXT,
          agency TEXT,
          entry_date DATE DEFAULT CURRENT_DATE,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          flow_meter_integrated INTEGER DEFAULT 0,
          rca_integrated INTEGER DEFAULT 0,
          pressure_transmitter_integrated INTEGER DEFAULT 0,
          total_villages_in_scheme INTEGER DEFAULT 0,
          scheme_functional_status TEXT DEFAULT 'Functional',
          circle TEXT,
          division TEXT
        )
      `);
      console.log('✅ Created scheme_status table');
    }
    
    // Check if daily_updates table exists and create if needed
    if (!existingTables.includes('daily_updates')) {
      console.log('Creating daily_updates table...');
      await client.query(`
        CREATE TABLE daily_updates (
          id SERIAL PRIMARY KEY,
          type TEXT NOT NULL,
          count INTEGER NOT NULL,
          region TEXT NOT NULL,
          status TEXT,
          update_date DATE DEFAULT CURRENT_DATE
        )
      `);
      console.log('✅ Created daily_updates table');
      
      // Insert sample update
      await client.query(`
        INSERT INTO daily_updates (type, count, region, status, update_date)
        VALUES ('scheme', 5, 'Nagpur', 'Fully Completed', CURRENT_DATE)
      `);
      console.log('✅ Inserted sample daily update');
    }
    
    // Check if tables have data
    const regionsCount = await client.query('SELECT COUNT(*) FROM regions');
    console.log(`Regions count: ${regionsCount.rows[0].count}`);
    
    const schemesCount = await client.query('SELECT COUNT(*) FROM scheme_status');
    console.log(`Schemes count: ${schemesCount.rows[0].count}`);
    
    // If no schemes, insert at least one sample scheme for each region
    if (parseInt(schemesCount.rows[0].count) === 0) {
      console.log('No schemes found, adding sample schemes...');
      
      const regions = await client.query('SELECT region_id, region_name FROM regions');
      
      for (const region of regions.rows) {
        const schemeId = `${region.region_id}00001`;
        const agency = getAgencyByRegion(region.region_name);
        
        await client.query(`
          INSERT INTO scheme_status (
            scheme_id, region, district, name_of_scheme, scheme_type, 
            total_villages, villages_integrated, total_esrs, esrs_integrated,
            scheme_status, integration_status, agency, flow_meter_integrated,
            rca_integrated, pressure_transmitter_integrated
          ) VALUES (
            $1, $2, $3, $4, $5, 
            $6, $7, $8, $9, 
            $10, $11, $12, $13,
            $14, $15
          )
        `, [
          schemeId, 
          region.region_name, 
          region.region_name + ' District', 
          region.region_name + ' Water Supply Scheme',
          'Regional',
          10, // total_villages
          5,  // villages_integrated
          8,  // total_esrs
          4,  // esrs_integrated
          'Fully Completed',
          'Full Integration',
          agency,
          3, // flow_meter_integrated
          2, // rca_integrated
          2  // pressure_transmitter_integrated
        ]);
      }
      
      console.log('✅ Added sample schemes for each region');
    }
    
    // Make sure we have an OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key is not set. The chatbot functionality requires an API key.');
      console.log('Please set OPENAI_API_KEY in your .env.local file.');
    }
    
    client.release();
    console.log('✅ Local setup fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during local setup fix:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check connection details in your .env.local file');
    console.log('3. Try running setup-vscode.js script again');
  } finally {
    await pool.end();
  }
}

function getAgencyByRegion(regionName) {
  // Business rule for determining agency based on region
  if (regionName.includes('Nagpur') || regionName.includes('Amravati') || 
      regionName.includes('Aurangabad') || regionName.includes('Chhatrapati Sambhajinagar')) {
    return 'MSEDCL';
  } else if (regionName.includes('Nashik')) {
    return 'MJP';
  } else if (regionName.includes('Konkan') || regionName.includes('Thane')) {
    return 'Co-Op';
  } else {
    return 'MSEDCL'; // Default agency
  }
}

// Run the function
fixLocalSetup();