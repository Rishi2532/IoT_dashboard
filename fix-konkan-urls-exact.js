/**
 * Exact Konkan URLs Fix Script
 * 
 * This script uses the exact URLs provided by the user and only removes the UUID part.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

// Setup WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

async function fixKonkanUrlsExact() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");
    return;
  }

  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connected to database, updating Konkan URLs with exact provided format...");

    // Mapping table with exact URLs from examples (without UUID)
    const exactUrlMapping = {
      // Scheme ID to exact URL mapping
      "20028168": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Konkan%5CCircle-Panvel%5CDivision-Raigadh%5CSub%20Division-Mangaon%5CBlock-Khalapur%5CScheme-20028168%20-%20Devnhave%20water%20supply%20scheme",
      
      "20020563": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Konkan%5CCircle-Panvel%5CDivision-Raigadh%5CSub%20Division-Mangaon%5CBlock-Pen%5CScheme-20020563-Shahapada%2038%20Villages",
      
      "20092478": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Konkan%5CCircle-Thane%5CDivision-Thane%5CSub%20Division-Thane%5CBlock-Kalyan%5CScheme-20092478-Retrofiting%20of%20Gotheghar%20Dahisar%20R.R.%20Water%20Supply%20Scheme"
    };
    
    // Get all schemes from Konkan region
    const konkanSchemes = await pool.query(`
      SELECT scheme_id, scheme_name, dashboard_url 
      FROM scheme_status 
      WHERE region = 'Konkan'
    `);

    console.log(`Found ${konkanSchemes.rows.length} schemes in the Konkan region.`);
    
    // Track updates
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each scheme
    for (const scheme of konkanSchemes.rows) {
      // Check if we have an exact URL for this scheme
      if (exactUrlMapping[scheme.scheme_id]) {
        const newUrl = exactUrlMapping[scheme.scheme_id];
        
        // Show the difference
        console.log(`\nScheme: ${scheme.scheme_name} (${scheme.scheme_id})`);
        console.log("Old URL:", scheme.dashboard_url);
        console.log("New URL:", newUrl);
        
        // Update the database
        await pool.query(
          "UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2",
          [newUrl, scheme.scheme_id]
        );
        
        updatedCount++;
      } else {
        // For schemes not in our mapping, we'll keep them as is
        console.log(`\nSkipping scheme without exact mapping: ${scheme.scheme_name} (${scheme.scheme_id})`);
        skippedCount++;
      }
    }
    
    console.log(`\nUpdated ${updatedCount} Konkan region URLs with exact format.`);
    console.log(`Skipped ${skippedCount} schemes without exact mappings.`);
    
  } catch (error) {
    console.error("Error updating Konkan URLs:", error);
  } finally {
    await pool.end();
  }
}

fixKonkanUrlsExact().catch(console.error);