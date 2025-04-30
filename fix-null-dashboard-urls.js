/**
 * Fix Missing (Null) Dashboard URLs Script
 * 
 * This script specifically targets and fixes schemes with missing (null) dashboard URLs
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

// Base URL for PI Vision dashboard - using correct display ID
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10020/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';

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
    console.warn(`Cannot generate URL for scheme ${scheme.scheme_id} - missing hierarchical information.`);
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
 * Main function to fix null dashboard URLs
 */
async function fixNullDashboardUrls() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    
    try {
      // Get all schemes with null dashboard_url
      const countResult = await client.query('SELECT COUNT(*) FROM scheme_status WHERE dashboard_url IS NULL');
      const totalNullUrls = parseInt(countResult.rows[0].count);
      
      if (totalNullUrls === 0) {
        console.log('No schemes with null dashboard URLs found!');
        return;
      }
      
      console.log(`Found ${totalNullUrls} schemes with null dashboard URLs to update.`);
      
      // Get all schemes with null dashboard_url
      const result = await client.query('SELECT * FROM scheme_status WHERE dashboard_url IS NULL');
      const schemes = result.rows;
      
      let updatedCount = 0;
      let skippedCount = 0;
      
      // Process each scheme
      for (const scheme of schemes) {
        // Generate a new dashboard URL
        const dashboardUrl = generateDashboardUrl(scheme);
        
        if (dashboardUrl) {
          // Update the database
          await client.query(
            'UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3',
            [dashboardUrl, scheme.scheme_id, scheme.block]
          );
          
          updatedCount++;
          console.log(`Updated ${updatedCount} of ${totalNullUrls}: ${scheme.scheme_name} (${scheme.scheme_id}) in ${scheme.block}`);
        } else {
          skippedCount++;
          console.warn(`Skipped scheme ${scheme.scheme_id} for block ${scheme.block} - missing hierarchical information`);
        }
      }
      
      console.log('\nDashboard URL update completed:');
      console.log(`- Total schemes with null URLs: ${totalNullUrls}`);
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
fixNullDashboardUrls().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});