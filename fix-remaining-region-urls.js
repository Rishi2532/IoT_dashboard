/**
 * Fix Remaining Regions URLs with Exact Spacing
 * 
 * This script fixes dashboard URLs for the remaining regions to match 
 * the exact spacing format.
 */

import pg from 'pg';
const { Pool } = pg;

// Correct base URL for PI Vision dashboard with display ID 10108
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';

// Standard parameters for the dashboard UI
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

/**
 * Generate a dashboard URL with the exact spacing format
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
  
  // Handle the special case for Amravati region (change to Amaravati in the URL)
  const regionDisplay = scheme.region === 'Amravati' ? 'Amaravati' : scheme.region;

  // Create the path using the exact spacing format
  const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block -${scheme.block}\\Scheme - ${scheme.scheme_id} -${scheme.scheme_name}`;
  
  // URL encode the path
  const encodedPath = encodeURIComponent(path);
  
  // Combine all parts to create the complete URL
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

/**
 * Process specific regions one by one
 */
async function fixRemainingRegionsUrls() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    
    try {
      // Get the remaining regions to process (excluding Amravati and Pune which are already done)
      const regionsToProcess = ['Konkan', 'Nagpur', 'Chhatrapati Sambhajinagar', 'Nashik'];
      
      // Process each region
      for (const region of regionsToProcess) {
        console.log(`\nProcessing region: ${region}`);
        
        // Get all schemes for this region
        const schemesResult = await client.query('SELECT * FROM scheme_status WHERE region = $1', [region]);
        const schemes = schemesResult.rows;
        
        console.log(`Found ${schemes.length} schemes in region ${region}`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        // Process each scheme
        for (const scheme of schemes) {
          // Generate the new URL
          const dashboardUrl = generateCorrectDashboardUrl(scheme);
          
          if (dashboardUrl) {
            // Update the database
            await client.query(
              'UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3',
              [dashboardUrl, scheme.scheme_id, scheme.block]
            );
            
            updatedCount++;
            
            // Log every 5th update to avoid excessive console output
            if (updatedCount <= 3 || updatedCount % 5 === 0) {
              console.log(`Updated URL for "${scheme.scheme_name}" in block "${scheme.block}"`);
            }
          } else {
            console.warn(`Couldn't generate URL for scheme ${scheme.scheme_name} (ID: ${scheme.scheme_id}) in block ${scheme.block}`);
            skippedCount++;
          }
        }
        
        console.log(`Completed region ${region}. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
      }
      
      console.log('\nAll remaining region dashboard URLs have been updated with the exact spacing format.');
      
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
fixRemainingRegionsUrls().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});