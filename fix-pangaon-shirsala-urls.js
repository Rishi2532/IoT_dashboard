/**
 * Fix for Pangaon and Shirsala Schemes Dashboard URLs
 * 
 * This script updates the dashboard URLs for the Pangaon and Shirsala schemes
 * to match the exact format required by the user.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

// Setup WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

async function fixPangaonShirsalaUrls() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");
    return;
  }

  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connected to database, updating Pangaon and Shirsala URLs...");

    // Get the current URLs
    const currentResult = await pool.query(`
      SELECT scheme_id, scheme_name, block, dashboard_url 
      FROM scheme_status 
      WHERE scheme_name IN ('Shirsala & 4 Village', 'Pangaon 10 villages WSS')
    `);

    if (currentResult.rows.length === 0) {
      console.log("Schemes not found in the database.");
      return;
    }

    // Correct URLs provided by the user
    const correctUrls = {
      'Pangaon 10 villages WSS': "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Chhatrapati%20Sambhajinagar%5CCircle-Latur%5CDivision-Latur%5CSub%20Division-Renapur%5CBlock-Renapur%5CScheme-20030820-%20Pangaon%2010%20villages%20WSS",
      'Shirsala & 4 Village': "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Chhatrapati%20Sambhajinagar%5CCircle-Chhatrapati%20Sambhajinagar%5CDivision-Chhatrapati%20Sambhajinagar%5CSub%20Division-Sillod%5CBlock-Sillod%5CScheme-20017395%20-%20Shirsala%20%26%204%20Village%20RRWS"
    };

    // Process each scheme
    for (const scheme of currentResult.rows) {
      console.log(`Processing scheme: ${scheme.scheme_name}`);
      
      if (correctUrls[scheme.scheme_name]) {
        const newUrl = correctUrls[scheme.scheme_name];
        
        // Show the difference
        console.log("Old dashboard URL:", scheme.dashboard_url);
        console.log("New dashboard URL:", newUrl);

        // Update the dashboard URL in the database
        await pool.query(
          "UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND scheme_name = $3",
          [newUrl, scheme.scheme_id, scheme.scheme_name]
        );

        console.log(`Updated dashboard URL for ${scheme.scheme_name}`);
      } else {
        console.log(`No correct URL found for ${scheme.scheme_name}`);
      }
    }

    console.log("Pangaon and Shirsala URLs updated successfully.");
  } catch (error) {
    console.error("Error updating Pangaon and Shirsala URLs:", error);
  } finally {
    await pool.end();
  }
}

fixPangaonShirsalaUrls().catch(console.error);