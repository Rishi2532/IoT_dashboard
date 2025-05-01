/**
 * Fix for Kawtha Bk & 9 Vill RR WSS Dashboard URL
 * 
 * This script updates the dashboard URL for the Kawtha scheme
 * to match the exact format required by the user.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

// Setup WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

async function fixKawthaUrl() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");
    return;
  }

  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connected to database, updating Kawtha URL...");

    // Get the current URL
    const currentResult = await pool.query(`
      SELECT scheme_id, scheme_name, block, dashboard_url 
      FROM scheme_status 
      WHERE scheme_name = 'Kawtha Bk & 9 Vill RR WSS'
    `);

    if (currentResult.rows.length === 0) {
      console.log("Kawtha scheme not found in the database.");
      return;
    }

    // Correct URL provided by the user - with space removed after scheme_id
    const correctUrl = "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Chhatrapati%20Sambhajinagar%5CCircle-Nanded%5CDivision-Parbhani%5CSub%20Division-Senaon%5CBlock-Senaon%5CScheme-20023330%20-Kawtha%20Bk%20%26%209%20Vill%20RR%20WSS";

    // Process the scheme
    const scheme = currentResult.rows[0];
    console.log(`Processing Kawtha scheme in block: ${scheme.block}`);
    
    // Show the difference
    console.log("Old dashboard URL:", scheme.dashboard_url);
    console.log("New dashboard URL:", correctUrl);

    // Update the dashboard URL in the database
    await pool.query(
      "UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND scheme_name = $3",
      [correctUrl, scheme.scheme_id, scheme.scheme_name]
    );

    console.log(`Updated dashboard URL for Kawtha Bk & 9 Vill RR WSS`);
    
    console.log("Kawtha URL updated successfully.");
  } catch (error) {
    console.error("Error updating Kawtha URL:", error);
  } finally {
    await pool.end();
  }
}

fixKawthaUrl().catch(console.error);