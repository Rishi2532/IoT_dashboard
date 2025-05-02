/**
 * Fix Bargaonpimpri Scheme-Level URL
 * 
 * This script updates the scheme-level dashboard URL for the Bargaonpimpri scheme
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

async function fixBargaonpimpriSchemeUrl() {
  console.log(`Starting to fix scheme-level URL for Bargaonpimpri scheme (ID: ${SCHEME_ID})...`);
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
    
    const scheme = schemeCheck.rows[0];
    console.log(`Found scheme: ${scheme.scheme_name}`);
    
    if (!scheme.dashboard_url) {
      console.log('No dashboard URL found for this scheme. Nothing to update.');
      return;
    }
    
    // Verify if the URL already has the non-breaking space
    if (scheme.dashboard_url.includes('%C2%A0')) {
      console.log('URL already contains the non-breaking space character. No update needed.');
      return;
    }
    
    // Generate the new URL format with non-breaking space
    // Base URL parameters
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
    const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
    
    // Special path with non-breaking space
    // The path differs from the village level - uses single backslashes
    const path = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS' + String.fromCharCode(160) + ' Tal Sinnar';
    
    // URL encode the path
    const encodedPath = encodeURIComponent(path);
    
    // Create the complete URL
    const newDashboardUrl = `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
    
    // Update the database
    const updateResult = await client.query(
      `UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2`,
      [newDashboardUrl, SCHEME_ID]
    );
    
    if (updateResult.rowCount > 0) {
      console.log('Successfully updated the scheme-level URL with non-breaking space character');
      
      // Show the old and new URLs for comparison
      console.log('\nOld URL:');
      console.log(scheme.dashboard_url);
      console.log('\nNew URL with non-breaking space:');
      console.log(newDashboardUrl);
    } else {
      console.log('Failed to update the URL. No rows were affected.');
    }
    
  } catch (err) {
    console.error('Error fixing Bargaonpimpri scheme URL:', err);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Execute the function
fixBargaonpimpriSchemeUrl().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
});
