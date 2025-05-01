/**
 * Fix Village-Level Dashboard URLs Script
 * 
 * This script ensures all village-level dashboard URLs are correctly generated
 * with the proper matching of villages to their specific blocks, especially for
 * multi-block schemes.
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Base URL and parameters for the dashboard URLs
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

/**
 * Generate a village dashboard URL with the correct format
 * This properly matches villages to their specific blocks, especially for multi-block schemes
 * 
 * @param {Object} village - The village object with all required fields
 * @returns {String} The complete URL or null if missing required fields
 */
function generateVillageDashboardUrl(village) {
  // Skip if missing required hierarchical information
  if (!village.region || !village.circle || !village.division || 
      !village.sub_division || !village.block || !village.scheme_id || 
      !village.scheme_name || !village.village_name) {
    console.warn(`Cannot generate URL for village ${village.village_name} - missing hierarchical information.`);
    return null;
  }
  
  // Handle the special case for Amravati region (change to Amaravati in the URL)
  const regionDisplay = village.region === 'Amravati' ? 'Amaravati' : village.region;

  // Create the path with proper block and village information
  // Important: Use the village's specific block, which may differ from the scheme's primary block
  const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${village.circle}\\Division-${village.division}\\Sub Division-${village.sub_division}\\Block-${village.block}\\Scheme-${village.scheme_id} - ${village.scheme_name}\\${village.village_name}`;
  
  // URL encode the path
  const encodedPath = encodeURIComponent(path);
  
  // Combine all parts to create the complete URL
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

/**
 * Main function to fix all village dashboard URLs
 */
async function fixVillageDashboardUrls() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('Connected. Fetching all villages from water_scheme_data...');
      
      // Get all villages from the water_scheme_data table with the correct columns
      const { rows: villages } = await client.query(`
        SELECT 
          village_name, scheme_id, scheme_name, 
          region, circle, division, sub_division, block
        FROM water_scheme_data
      `);
      
      console.log(`Fetched ${villages.length} villages. Regenerating dashboard URLs...`);
      
      // Update each village's dashboard URL
      let processedCount = 0;
      for (const village of villages) {
        // Generate the dashboard URL for the village
        const dashboardUrl = generateVillageDashboardUrl(village);
        
        if (dashboardUrl) {
          // Update the dashboard_url in the database using the composite primary key
          await client.query(`
            UPDATE water_scheme_data 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND village_name = $3
          `, [dashboardUrl, village.scheme_id, village.village_name]);
          
          processedCount++;
          if (processedCount % 100 === 0) {
            console.log(`Processed ${processedCount}/${villages.length} villages...`);
          }
        }
      }
      
      console.log(`✅ Successfully updated dashboard URLs for ${processedCount} villages.`);
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error updating village dashboard URLs:', error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the main function
fixVillageDashboardUrls().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}).then(() => {
  console.log('Script completed successfully.');
  process.exit(0);
});
