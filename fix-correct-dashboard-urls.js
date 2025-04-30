/**
 * Fix Dashboard URLs to use the correct format
 * 
 * This script correctly generates dashboard URLs using the specified format:
 * Base URL: https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD
 * Parameters: hidetoolbar=true&hidesidebar=true&mode=kiosk
 * Path: \DemoAF\JJM\JJM\Maharashtra\Region-{regionName}\Circle-{circle}\Division-{division}\Sub Division-{sub_division}\Block-{block}\Scheme-{scheme_id} - {scheme_name}
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

// Correct base URL for PI Vision dashboard
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';

// Standard parameters for the dashboard
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

/**
 * Generate a dashboard URL for a scheme using the specified format
 * @param {Object} scheme - The scheme object with region, circle, division, etc.
 * @returns {String} The complete URL or null if missing required fields
 */
function generateCorrectDashboardUrl(scheme) {
  // Skip if missing required hierarchical information
  if (!scheme.region || !scheme.circle || !scheme.division || 
      !scheme.sub_division || !scheme.block || !scheme.scheme_id || !scheme.scheme_name) {
    console.warn(`Cannot generate URL for scheme ${scheme.scheme_id} - missing hierarchical information.`);
    return null;
  }
  
  // Generate a UUID for this scheme
  const schemeUuid = uuidv4();
  
  // Handle the special case for Amravati region (change to Amaravati in the URL)
  const regionDisplay = scheme.region === 'Amravati' ? 'Amaravati' : scheme.region;

  // Create the path using double backslashes for URL escaping
  const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block-${scheme.block}\\Scheme-${scheme.scheme_id} - ${scheme.scheme_name}?${schemeUuid}`;
  
  // URL encode the path
  const encodedPath = encodeURIComponent(path);
  
  // Combine all parts to create the complete URL with the correct format
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

/**
 * Main function to fix all dashboard URLs
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
      // Get the count of all schemes for reporting progress
      const countResult = await client.query('SELECT COUNT(*) FROM scheme_status');
      const totalSchemes = parseInt(countResult.rows[0].count);
      console.log(`Found ${totalSchemes} schemes to update.`);
      
      console.log('Updating dashboard URLs for all schemes with the correct format...');
      
      // Get all schemes in batches to prevent memory issues
      const batchSize = 50;
      let processedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      
      for (let offset = 0; offset < totalSchemes; offset += batchSize) {
        // Get a batch of schemes
        const batchResult = await client.query(
          'SELECT * FROM scheme_status LIMIT $1 OFFSET $2',
          [batchSize, offset]
        );
        
        const schemes = batchResult.rows;
        
        // Process each scheme in the batch
        for (const scheme of schemes) {
          processedCount++;
          
          // Generate a correctly formatted dashboard URL
          const dashboardUrl = generateCorrectDashboardUrl(scheme);
          
          if (dashboardUrl) {
            // Update the database
            await client.query(
              'UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3',
              [dashboardUrl, scheme.scheme_id, scheme.block]
            );
            
            updatedCount++;
            
            // Log progress periodically
            if (updatedCount % 20 === 0 || updatedCount === 1) {
              console.log(`Updated ${updatedCount} of ${totalSchemes} dashboard URLs...`);
            }
          } else {
            skippedCount++;
            console.warn(`Skipped scheme ${scheme.scheme_id} for block ${scheme.block} - missing hierarchical information`);
          }
        }
      }
      
      console.log('\nDashboard URL update completed:');
      console.log(`- Total schemes processed: ${processedCount}`);
      console.log(`- Successfully updated: ${updatedCount}`);
      console.log(`- Skipped (incomplete data): ${skippedCount}`);
      
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