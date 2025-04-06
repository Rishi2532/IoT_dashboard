/**
 * Fix script for local database setup issues
 * This script helps troubleshoot and fix common issues with the database setup
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

async function fixLocalSetup() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL database');
    
    // Fix 1: Check if scheme_status table is empty but regions has data
    const schemeCount = await client.query('SELECT COUNT(*) FROM scheme_status');
    const regionCount = await client.query('SELECT COUNT(*) FROM regions');
    
    console.log(`Found ${schemeCount.rows[0].count} schemes and ${regionCount.rows[0].count} regions`);
    
    if (parseInt(schemeCount.rows[0].count) === 0 && parseInt(regionCount.rows[0].count) > 0) {
      console.log('Found regions data but no scheme_status data - generating sample schemes for each region');
      
      // Get regions
      const regions = await client.query('SELECT * FROM regions');
      
      // Create sample schemes for each region
      for (const region of regions.rows) {
        const regionName = region.region_name;
        console.log(`Creating sample schemes for ${regionName}`);
        
        // Generate schemes based on total_schemes_integrated count
        const schemeCount = parseInt(region.total_schemes_integrated) || 1;
        
        for (let i = 0; i < schemeCount; i++) {
          const schemeId = `${regionName.substring(0, 3).toUpperCase()}${i+1000}`;
          const schemeName = `${regionName} Sample Water Scheme ${i+1}`;
          const agency = getAgencyByRegion(regionName);
          const district = regionName;
          const taluka = `${regionName} Taluka ${i+1}`;
          
          // Calculate random values based on region totals
          const villages = Math.min(10, Math.max(1, Math.floor(Math.random() * 10) + 1));
          const villages_integrated = villages;
          const fully_completed_villages = Math.floor(villages * Math.random());
          
          const total_esr = Math.min(15, Math.max(1, Math.floor(Math.random() * 15) + 1));
          const esr_integrated = total_esr;
          const fully_completed_esr = Math.floor(total_esr * Math.random());
          
          const project_cost = Math.floor(Math.random() * 5000) + 1000;
          
          // Status based on completion
          const isFullyCompleted = Math.random() > 0.7;
          const scheme_status = isFullyCompleted ? 'Fully-Completed' : 'In Progress';
          const scheme_functional_status = isFullyCompleted ? 'Functional' : 'Partial';
          
          const flow_meters = Math.floor(Math.random() * 10) + 1;
          const pressure_transmitters = Math.floor(Math.random() * 8) + 1;
          const residual_chlorine = Math.floor(Math.random() * 5) + 1;
          
          // Add the scheme to the database
          await client.query(
            `INSERT INTO scheme_status (
              scheme_id, region_name, district, taluka, scheme_name, agency,
              villages, villages_integrated, fully_completed_villages,
              total_esr, esr_integrated, fully_completed_esr,
              project_cost, scheme_status, scheme_functional_status,
              flow_meters_connected, pressure_transmitters_connected, residual_chlorine_connected
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
              schemeId, regionName, district, taluka, schemeName, agency,
              villages, villages_integrated, fully_completed_villages,
              total_esr, esr_integrated, fully_completed_esr,
              project_cost, scheme_status, scheme_functional_status,
              flow_meters, pressure_transmitters, residual_chlorine
            ]
          );
        }
      }
      
      console.log('Sample scheme data created successfully');
    } else if (parseInt(schemeCount.rows[0].count) > 0) {
      console.log('Scheme_status table already has data');
    }
    
    // Fix 2: Check if updates table is empty
    const updateCount = await client.query('SELECT COUNT(*) FROM updates');
    
    if (parseInt(updateCount.rows[0].count) === 0) {
      console.log('No updates found - creating sample update records');
      
      // Create sample updates for today
      await client.query(
        `INSERT INTO updates (date, type, count, region, affected_ids)
         VALUES (CURRENT_DATE, 'scheme', 3, 'Nagpur', ARRAY['NAG1000', 'NAG1001', 'NAG1002'])`
      );
      
      await client.query(
        `INSERT INTO updates (date, type, count, region, affected_ids)
         VALUES (CURRENT_DATE, 'village', 5, 'Pune', ARRAY['village1', 'village2', 'village3', 'village4', 'village5'])`
      );
      
      console.log('Sample update records created');
    } else {
      console.log('Updates table already has data');
    }
    
    // Fix 3: Check if any scheme_functional_status fields have boolean values instead of text
    const functionalStatusCheck = await client.query(
      `SELECT COUNT(*) FROM scheme_status 
       WHERE scheme_functional_status IS NOT NULL 
       AND scheme_functional_status NOT IN ('Functional', 'Partial')`
    );
    
    if (parseInt(functionalStatusCheck.rows[0].count) > 0) {
      console.log('Found schemes with incorrect functional status values - fixing...');
      
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
      
      console.log('Functional status values fixed');
    }
    
    console.log('\nLocal database setup fix completed!');
    console.log('Now restart your application with: npm run dev');
    
  } catch (err) {
    console.error('Error fixing local setup:', err);
  } finally {
    client.release();
    pool.end();
  }
}

function getAgencyByRegion(regionName) {
  // Business rule mapping regions to agencies
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

fixLocalSetup();