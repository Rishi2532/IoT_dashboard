/**
 * Fix ALL Village-Level Dashboard URLs Script
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
 * Fix all villages in a specific multi-block scheme
 */
async function fixSchemeUrls(client, schemeId, schemeName) {
  console.log(`Processing scheme: ${schemeName} (${schemeId})`);
  
  // Get all villages for this scheme
  const { rows: villages } = await client.query(
    `SELECT village_name, scheme_id, scheme_name, region, circle, division, sub_division, block 
     FROM water_scheme_data 
     WHERE scheme_id = $1`,
    [schemeId]
  );
  
  let processedCount = 0;
  for (const village of villages) {
    // Generate the dashboard URL for the village
    const dashboardUrl = generateVillageDashboardUrl(village);
    
    if (dashboardUrl) {
      // Update the dashboard_url in the database using the composite primary key
      await client.query(
        `UPDATE water_scheme_data 
         SET dashboard_url = $1 
         WHERE scheme_id = $2 AND village_name = $3`,
        [dashboardUrl, village.scheme_id, village.village_name]
      );
      
      processedCount++;
    }
  }
  
  console.log(`  ✅ Updated ${processedCount}/${villages.length} villages for scheme "${schemeName}"`);
  return processedCount;
}

/**
 * Main function to fix all village dashboard URLs
 */
async function fixAllVillageDashboardUrls() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('Connected. Finding multi-block schemes...');
      
      // Get all multi-block schemes
      const { rows: multiBlockSchemes } = await client.query(`
        SELECT scheme_id, scheme_name, COUNT(DISTINCT block) as block_count
        FROM water_scheme_data
        GROUP BY scheme_id, scheme_name
        HAVING COUNT(DISTINCT block) > 1
        ORDER BY block_count DESC
      `);
      
      console.log(`Found ${multiBlockSchemes.length} multi-block schemes.`);
      
      // Process each multi-block scheme
      let totalProcessed = 0;
      for (const scheme of multiBlockSchemes) {
        totalProcessed += await fixSchemeUrls(client, scheme.scheme_id, scheme.scheme_name);
      }
      
      console.log(`\n✅ Successfully updated dashboard URLs for ${totalProcessed} villages across all multi-block schemes.`);
      
      // Now check for any remaining villages with mismatched blocks in their URLs
      const { rows: mismatchedUrls } = await client.query(`
        SELECT COUNT(*) as mismatched_count
        FROM water_scheme_data
        WHERE dashboard_url NOT LIKE CONCAT('%Block-', block, '%')
        AND dashboard_url IS NOT NULL
      `);
      
      if (mismatchedUrls[0].mismatched_count > 0) {
        console.log(`⚠️ Found ${mismatchedUrls[0].mismatched_count} villages with mismatched blocks in their URLs.`);
        console.log('Fixing all remaining mismatched URLs...');
        
        // Get all villages that have incorrect blocks in their URLs
        const { rows: mismatchedVillages } = await client.query(`
          SELECT village_name, scheme_id, scheme_name, region, circle, division, sub_division, block
          FROM water_scheme_data
          WHERE dashboard_url NOT LIKE CONCAT('%Block-', block, '%')
          AND dashboard_url IS NOT NULL
        `);
        
        // Fix each mismatched village
        let fixedCount = 0;
        for (const village of mismatchedVillages) {
          const dashboardUrl = generateVillageDashboardUrl(village);
          
          if (dashboardUrl) {
            await client.query(
              `UPDATE water_scheme_data 
               SET dashboard_url = $1 
               WHERE scheme_id = $2 AND village_name = $3`,
              [dashboardUrl, village.scheme_id, village.village_name]
            );
            
            fixedCount++;
          }
        }
        
        console.log(`  ✅ Fixed an additional ${fixedCount} villages with mismatched blocks in their URLs.`);
        totalProcessed += fixedCount;
      }
      
      console.log(`\n🎉 Total fixed: ${totalProcessed} villages now have correctly formatted dashboard URLs.`);
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
fixAllVillageDashboardUrls().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}).then(() => {
  console.log('Script completed successfully.');
  process.exit(0);
});
