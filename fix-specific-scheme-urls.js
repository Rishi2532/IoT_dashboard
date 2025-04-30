/**
 * Fix URLs for specific schemes
 * 
 * This script corrects the dashboard URLs for the "Shirsala & 4 Village" and "Sakol 7 villages WSS" schemes.
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

// Base URL for PI Vision dashboard - Corrected based on user requirements
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10020/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';

// Standard parameters for the dashboard
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

/**
 * Generate a custom dashboard URL for a scheme with the correct display ID
 * @param {Object} scheme - The scheme object with region, circle, division, etc.
 * @returns {String} The complete URL or null if missing required fields
 */
function generateCustomDashboardUrl(scheme) {
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
 * Main function to fix URLs for specific schemes
 */
async function fixSpecificSchemeUrls() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    
    try {
      // Define the list of schemes to fix
      const schemesToFix = [
        {
          name: "Shirsala & 4 Village",
          scheme_id: "20017395",
          block: "Sillod"
        },
        {
          name: "Sakol 7 villages WSS",
          scheme_id: "20030815",
          block: "Shirur Anantpal"
        }
      ];
      
      console.log('Fixing URLs for specific schemes...');
      
      for (const schemeInfo of schemesToFix) {
        // Get the complete scheme data
        const result = await client.query(`
          SELECT * FROM scheme_status
          WHERE scheme_id = $1 AND block = $2
        `, [schemeInfo.scheme_id, schemeInfo.block]);
        
        if (result.rows.length === 0) {
          console.warn(`Scheme not found: ${schemeInfo.name} in block ${schemeInfo.block}`);
          continue;
        }
        
        const scheme = result.rows[0];
        console.log(`Processing ${scheme.scheme_name} for block: ${scheme.block}`);
        
        // Generate the new URL with the correct BASE_URL
        const dashboardUrl = generateCustomDashboardUrl(scheme);
        
        if (dashboardUrl) {
          // Update the database
          await client.query(
            'UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3',
            [dashboardUrl, scheme.scheme_id, scheme.block]
          );
          
          console.log(`Updated dashboard URL for ${scheme.scheme_name} in block ${scheme.block}`);
          console.log(`New URL: ${dashboardUrl}`);
        } else {
          console.warn(`Couldn't generate URL for ${scheme.scheme_name} in block ${scheme.block}`);
        }
      }
      
      console.log('\nFixed URLs for specific schemes.');
      
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
fixSpecificSchemeUrls().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});