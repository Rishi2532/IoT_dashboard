/**
 * Fix Bargaonpimpri Scheme Village URLs
 * 
 * This script updates all village URLs for the Bargaonpimpri scheme
 * to use the correct format with non-breaking space character.
 */

// Load environment variables
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Define the special Bargaonpimpri scheme details
const SCHEME_ID = '20019176';
const SCHEME_NAME = 'Retro. Bargaonpimpri & 6 VRWSS';

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixBargaonpimpriVillageUrls() {
  console.log(`Starting to fix village URLs for Bargaonpimpri scheme (ID: ${SCHEME_ID})...`);
  let client;

  try {
    client = await pool.connect();
    
    // Check if the scheme exists
    const schemeCheck = await client.query(
      `SELECT * FROM scheme_status WHERE scheme_id = $1`,
      [SCHEME_ID]
    );
    
    if (schemeCheck.rows.length === 0) {
      console.log(`Warning: Scheme with ID ${SCHEME_ID} not found`);
      return;
    }
    
    console.log(`Found scheme: ${schemeCheck.rows[0].scheme_name}`);
    
    // Find all villages belonging to this scheme
    const villageQuery = await client.query(
      `SELECT * FROM water_scheme_data WHERE scheme_id = $1`,
      [SCHEME_ID]
    );
    
    console.log(`Found ${villageQuery.rows.length} villages for this scheme`);
    
    if (villageQuery.rows.length === 0) {
      console.log('No villages found for this scheme. Nothing to update.');
      return;
    }
    
    // Generate the new URL format for each village
    let updatedCount = 0;
    
    for (const village of villageQuery.rows) {
      // Special scheme path with non-breaking space
      const schemePath = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS' + String.fromCharCode(160) + ' Tal Sinnar';
      
      // Append village name to path
      const path = `${schemePath}\\\\${village.village_name}`;
      
      // URL encode the path
      const encodedPath = encodeURIComponent(path);
      
      // Base URL and parameters for the dashboard URLs
      const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
      const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
      
      // Combine all parts to create the complete URL
      const newDashboardUrl = `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
      
      // Update the database
      const updateResult = await client.query(
        `UPDATE water_scheme_data 
         SET dashboard_url = $1 
         WHERE scheme_id = $2 AND village_name = $3`,
        [newDashboardUrl, SCHEME_ID, village.village_name]
      );
      
      if (updateResult.rowCount > 0) {
        updatedCount++;
      }
    }
    
    console.log(`Successfully updated URLs for ${updatedCount} villages in the Bargaonpimpri scheme`);
    
  } catch (err) {
    console.error('Error fixing Bargaonpimpri village URLs:', err);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Execute the function
fixBargaonpimpriVillageUrls().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
});
