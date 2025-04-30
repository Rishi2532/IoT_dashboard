/**
 * Fix All Dashboard URLs Script
 * 
 * This script regenerates dashboard URLs for all schemes across all regions
 * to ensure consistent functionality with the PI Vision dashboard.
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
 * Main function to regenerate dashboard URLs for all schemes
 */
async function fixAllDashboardUrls() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    
    try {
      // Get all regions for detailed reporting
      const regionsResult = await client.query(`
        SELECT DISTINCT region FROM scheme_status
        ORDER BY region
      `);
      
      const regions = regionsResult.rows.map(r => r.region).filter(Boolean);
      console.log(`Found ${regions.length} regions: ${regions.join(', ')}`);
      
      let totalSuccess = 0;
      let totalErrors = 0;
      
      // Process each region separately
      for (const region of regions) {
        console.log(`\nProcessing schemes for region: ${region}`);
        
        // Get all schemes for this region
        const result = await client.query(`
          SELECT * FROM scheme_status 
          WHERE region = $1
        `, [region]);
        
        console.log(`Found ${result.rows.length} scheme entries for region ${region}.`);
        
        if (result.rows.length === 0) {
          console.log(`No schemes found for region ${region}. Skipping.`);
          continue;
        }
        
        let regionSuccess = 0;
        let regionErrors = 0;
        
        // Process each scheme entry
        for (const scheme of result.rows) {
          try {
            // Generate URL
            const dashboardUrl = generateDashboardUrl(scheme);
            
            if (dashboardUrl) {
              // Update the database
              await client.query(
                'UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3',
                [dashboardUrl, scheme.scheme_id, scheme.block]
              );
              
              regionSuccess++;
              
              // Log progress every 10 schemes
              if (regionSuccess % 10 === 0) {
                console.log(`Processed ${regionSuccess} schemes for region ${region}...`);
              }
            } else {
              console.warn(`Skipping scheme ${scheme.scheme_id} (${scheme.scheme_name}) for block ${scheme.block} - couldn't generate URL.`);
              regionErrors++;
            }
          } catch (err) {
            console.error(`Error processing scheme ${scheme.scheme_id} in ${scheme.block}: ${err.message}`);
            regionErrors++;
          }
        }
        
        console.log(`Region ${region} complete - Successfully updated: ${regionSuccess}, Errors: ${regionErrors}`);
        
        totalSuccess += regionSuccess;
        totalErrors += regionErrors;
      }
      
      console.log('\nAll dashboard URL updates complete.');
      console.log(`Successfully updated: ${totalSuccess} schemes`);
      console.log(`Errors/Skipped: ${totalErrors} schemes`);
      
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
fixAllDashboardUrls().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});