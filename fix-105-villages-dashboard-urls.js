/**
 * Fix 105 Villages RRWSS Dashboard URLs Script
 * 
 * This script focuses on generating dashboard URLs for the 105 Villages RRWSS scheme
 * across all its blocks, especially ensuring Achalpur block has a dashboard URL.
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

// Base URL for PI Vision dashboard
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';

// Standard parameters for the dashboard
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

/**
 * Generate a dashboard URL for a scheme
 * @param {Object} scheme - The scheme object with region, circle, division, etc.
 * @returns {String} The complete URL or null if missing required fields
 */
function generateDashboardUrl(scheme) {
  // Skip if missing required hierarchical information
  if (!scheme.region || !scheme.circle || !scheme.division || 
      !scheme.sub_division || !scheme.block || !scheme.scheme_id || !scheme.scheme_name) {
    console.warn(`Cannot generate URL for scheme ${scheme.scheme_id} (${scheme.scheme_name}) - missing hierarchical information.`);
    return null;
  }
  
  // Generate a UUID for this scheme
  const schemeUuid = uuidv4();
  
  // Handle the special case for Amravati region (change to Amaravati in the URL)
  const regionDisplay = scheme.region === 'Amravati' ? 'Amaravati' : scheme.region;

  // Create the path without URL encoding
  const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block-${scheme.block}\\Scheme-${scheme.scheme_id} - ${scheme.scheme_name}?${schemeUuid}`;
  
  // URL encode the path
  const encodedPath = encodeURIComponent(path);
  
  // Combine all parts to create the complete URL
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

/**
 * Main function to fix dashboard URLs for the 105 Villages RRWSS scheme
 */
async function fix105VillagesDashboardUrls() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    
    try {
      console.log('Fetching all entries for the 105 Villages RRWSS scheme...');
      
      // Query to get all 105 Villages RRWSS scheme entries
      const result = await client.query(`
        SELECT * FROM scheme_status 
        WHERE scheme_name = '105 Villages RRWSS'
      `);
      
      console.log(`Found ${result.rows.length} entries for 105 Villages RRWSS scheme.`);
      
      if (result.rows.length === 0) {
        console.log('No 105 Villages RRWSS schemes found. Exiting.');
        return;
      }
      
      // Print all blocks found
      const blocks = result.rows.map(scheme => scheme.block);
      console.log(`Blocks found: ${blocks.join(', ')}`);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process each scheme entry
      for (const scheme of result.rows) {
        console.log(`Processing ${scheme.scheme_name} for block: ${scheme.block}`);
        
        try {
          // Generate URL
          const dashboardUrl = generateDashboardUrl(scheme);
          
          if (dashboardUrl) {
            // Update the database
            await client.query(
              'UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3',
              [dashboardUrl, scheme.scheme_id, scheme.block]
            );
            
            console.log(`Updated dashboard URL for ${scheme.scheme_name} in block ${scheme.block}`);
            successCount++;
          } else {
            console.warn(`Skipping scheme ${scheme.scheme_id} (${scheme.scheme_name}) for block ${scheme.block} - couldn't generate URL.`);
            errorCount++;
          }
        } catch (err) {
          console.error(`Error processing scheme ${scheme.scheme_id} for block ${scheme.block}: ${err.message}`);
          errorCount++;
        }
      }
      
      console.log('\nDashboard URL updates for 105 Villages RRWSS complete.');
      console.log(`Successfully updated: ${successCount} entries`);
      console.log(`Errors/Skipped: ${errorCount} entries`);
      
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
  } finally {
    // Close the pool when done
    await pool.end();
  }
}

// Run the main function
fix105VillagesDashboardUrls().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});