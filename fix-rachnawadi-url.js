/**
 * Fix for Rachnawadi 6 villages WSS Dashboard URL
 * 
 * This script updates the dashboard URL for the Rachnawadi scheme
 * to match the standard format for all regions (not a special case).
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

// Setup WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

async function fixRachnawadiUrl() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");
    return;
  }

  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connected to database, updating Rachnawadi URL...");

    // Get the current URL
    const currentResult = await pool.query(`
      SELECT scheme_id, scheme_name, region, block, circle, division, sub_division, dashboard_url 
      FROM scheme_status 
      WHERE scheme_name = 'Rachnawadi 6 villages WSS'
    `);

    if (currentResult.rows.length === 0) {
      console.log("Rachnawadi scheme not found in the database.");
      return;
    }

    // Process the scheme
    const scheme = currentResult.rows[0];
    console.log(`Processing Rachnawadi scheme in block: ${scheme.block}`);
    
    // Generate the correct URL with standard format for other regions
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
    const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
    
    // Handle the special case for Amravati region (change to Amaravati in the URL)
    const regionDisplay = scheme.region === 'Amravati' ? 'Amaravati' : scheme.region;
    
    // Standard format for all regions (no space before first hyphen, space after)
    const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block-${scheme.block}\\Scheme-${scheme.scheme_id} - ${scheme.scheme_name}`;
    
    const encodedPath = encodeURIComponent(path);
    const newUrl = `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;

    // Show the difference
    console.log("Old dashboard URL:", scheme.dashboard_url);
    console.log("New dashboard URL:", newUrl);

    // Update the dashboard URL in the database
    await pool.query(
      "UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND scheme_name = $3",
      [newUrl, scheme.scheme_id, scheme.scheme_name]
    );

    console.log(`Updated dashboard URL for Rachnawadi 6 villages WSS`);
    
    console.log("Rachnawadi URL updated successfully.");
  } catch (error) {
    console.error("Error updating Rachnawadi URL:", error);
  } finally {
    await pool.end();
  }
}

fixRachnawadiUrl().catch(console.error);