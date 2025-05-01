/**
 * Exact Pune URL Fix Script
 * 
 * This script uses the exact URLs provided by the user and only removes the UUID part.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

// Setup WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

async function fixPuneUrlsExact() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");
    return;
  }

  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connected to database, updating Pune URLs with exact provided format...");

    // Mapping table with exact URLs from examples (without UUID)
    const exactUrlMapping = {
      // Scheme ID to exact URL mapping
      "7942135": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Pune%5CDivision-Pune%201%5CSub%20Division-Pune%201%5CBlock-Daund%5CScheme-7942135-Gar,%20Sonwadi,%20Nanviz%20RR",
      
      "20027541": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Pune%5CDivision-Pune%202%5CSub%20Division-Pune%202%5CBlock-Velhe%5CScheme-20027541-Wangani%20RRWSS",
      
      "20027892": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Pune%5CDivision-Satara%5CSub%20Division-Phaltan%5CBlock-Phaltan%5CScheme-20027892-RR%20Girvi%20WSS",
      
      "20017250": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Pune%5CDivision-Pune%201%5CSub%20Division-Baramati%5CBlock-Ambegaon%5CScheme-20017250-LONI%20BHAPKAR%20RRWSS",
      
      "20022133": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Pune%5CDivision-Pune%5CSub%20Division-Pune%5CBlock-Mulshi%5CScheme-20022133%20-%20Peth%20RR",
      
      "20029637": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Sangli%5CDivision-Solapur%5CSub%20Division-Solapur%5CBlock%20-Mohol%5CScheme%20-%2020029637%20-Penur%20Patkul",
      
      "20013367": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Pune%5CDivision-Pune%202%5CSub%20Division-Maval%5CBlock-Daund%5CScheme-20013367-Done%20Adhale%20RR",
      
      "20027396": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Sangli%5CDivision-Solapur%5CSub%20Division-Solapur%5CBlock-Sangola%5CScheme-20027396%20-%20Alegaon%20shirbhavi%2082%20Village",
      
      "7940233": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Sangli%5CDivision-Sangli%5CSub%20Division-Islampur%5CBlock-Valva%5CScheme-7940233-Peth%20%26%20two%20Villages",
      
      "7942125": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Pune%5CDivision-Pune%201%5CSub%20Division-Baramati%5CBlock-Ambegaon%5CScheme-7942125-MURTI%20%26%207%20VILLAGES%20RRWSS",
      
      "20018548": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Pune%5CDivision-Pune%202%5CSub%20Division-Baramati%5CBlock-Ambegaon%5CScheme-20018548-HOL%20SASTEWADI",
      
      "20033593": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Sangli%5CDivision-Solapur%5CSub%20Division-Solapur%5CBlock%20-%20Mangalvedhe%5CScheme%20-%2020033593%20-Andhalgaon%20and%203%20villages",
      
      "20019021": "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Pune%5CDivision-Satara%5CSub%20Division-Pune%5CBlock-%20Phaltan%5CScheme-%2020019021%20-Dhuldev%20Algudewadi"
    };
    
    // Get all schemes from Pune region
    const puneSchemes = await pool.query(`
      SELECT scheme_id, scheme_name, dashboard_url 
      FROM scheme_status 
      WHERE region = 'Pune'
    `);

    console.log(`Found ${puneSchemes.rows.length} schemes in the Pune region.`);
    
    // Track updates
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each scheme
    for (const scheme of puneSchemes.rows) {
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
    
    console.log(`\nUpdated ${updatedCount} Pune region URLs with exact format.`);
    console.log(`Skipped ${skippedCount} schemes without exact mappings.`);
    
  } catch (error) {
    console.error("Error updating Pune URLs:", error);
  } finally {
    await pool.end();
  }
}

fixPuneUrlsExact().catch(console.error);