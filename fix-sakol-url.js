/**
 * Special Fix for the Sakol 7 villages WSS Dashboard URL
 * 
 * This script specifically updates the dashboard URL for the Sakol 7 villages WSS scheme
 * to match the exact format required: with the hyphen directly attached to scheme_id.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

// Setup WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Base URL for PI Vision dashboard
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';

// Standard parameters for the dashboard
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

async function fixSakolDashboardUrl() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");
    return;
  }

  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connected to database, searching for Sakol 7 villages WSS scheme...");

    // Get the Sakol 7 villages WSS scheme
    const result = await pool.query(
      "SELECT * FROM scheme_status WHERE scheme_name = 'Sakol 7 villages WSS'"
    );

    if (result.rows.length === 0) {
      console.log("Sakol 7 villages WSS scheme not found in the database.");
      return;
    }

    console.log(`Found ${result.rows.length} entries for Sakol 7 villages WSS.`);

    // Process each Sakol scheme
    for (const scheme of result.rows) {
      console.log(`Processing Sakol scheme in block: ${scheme.block}`);

      // Generate the correct path with exact required format (with a space after the hyphen)
      const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${scheme.region}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block-${scheme.block}\\Scheme-${scheme.scheme_id}- ${scheme.scheme_name}`;
      
      // URL encode the path
      const encodedPath = encodeURIComponent(path);
      
      // Combine all parts to create the complete URL
      const newDashboardUrl = `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;

      // Show the difference
      console.log("Old dashboard URL:", scheme.dashboard_url);
      console.log("New dashboard URL:", newDashboardUrl);

      // Update the dashboard URL in the database
      await pool.query(
        "UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3",
        [newDashboardUrl, scheme.scheme_id, scheme.block]
      );

      console.log(`Updated dashboard URL for Sakol 7 villages WSS in block ${scheme.block}`);
    }

    console.log("Sakol 7 villages WSS dashboard URL fix completed successfully.");
  } catch (error) {
    console.error("Error fixing Sakol 7 villages WSS dashboard URL:", error);
  } finally {
    await pool.end();
  }
}

fixSakolDashboardUrl().catch(console.error);