/**
 * Test Script for Sakol 7 villages WSS URL Generation
 * 
 * This script tests the URL generation for the Sakol 7 villages WSS scheme
 * to ensure it follows the exact format required.
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

// Test function to verify URL generation matches exactly what was requested
async function testSakolUrlGeneration() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");
    return;
  }

  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connected to database, testing Sakol 7 villages WSS URL generation...");

    // Get the current Sakol 7 villages WSS scheme URL from database
    const currentResult = await pool.query(
      "SELECT dashboard_url FROM scheme_status WHERE scheme_name = 'Sakol 7 villages WSS'"
    );

    if (currentResult.rows.length === 0) {
      console.log("Sakol 7 villages WSS scheme not found in the database.");
      return;
    }

    const currentUrl = currentResult.rows[0].dashboard_url;
    console.log("Current URL in database:");
    console.log(currentUrl);

    // Create a test scheme object to simulate what's used in storage.ts
    const testScheme = {
      region: 'Chhatrapati Sambhajinagar',
      circle: 'Latur',
      division: 'Latur',
      sub_division: 'Shirur Anantpal',
      block: 'Shirur Anantpal',
      scheme_id: '20030815',
      scheme_name: 'Sakol 7 villages WSS'
    };

    // Generate URL in the same way as storage.ts
    const regionDisplay = testScheme.region === 'Amravati' ? 'Amaravati' : testScheme.region;
    
    // Use the expected format with hyphen followed by a space for Sakol
    const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${testScheme.circle}\\Division-${testScheme.division}\\Sub Division-${testScheme.sub_division}\\Block-${testScheme.block}\\Scheme-${testScheme.scheme_id}- ${testScheme.scheme_name}`;
    
    // URL encode the path
    const encodedPath = encodeURIComponent(path);
    
    // Combine all parts to create the complete URL
    const generatedUrl = `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;

    console.log("\nURL that would be generated by storage.ts:");
    console.log(generatedUrl);

    // Check if they match
    const isMatch = currentUrl === generatedUrl;
    console.log(`\nDo URLs match? ${isMatch ? 'YES' : 'NO'}`);

    if (!isMatch) {
      console.log("\nDifference in URLs:");
      for (let i = 0; i < Math.max(currentUrl.length, generatedUrl.length); i++) {
        if (currentUrl[i] !== generatedUrl[i]) {
          console.log(`Position ${i}: '${currentUrl[i] || ''}' vs '${generatedUrl[i] || ''}'`);
          
          // Show a window of characters around the difference
          const start = Math.max(0, i - 20);
          const end = Math.min(currentUrl.length, i + 20);
          console.log(`Context in current URL: ${currentUrl.substring(start, end)}`);
          
          const gStart = Math.max(0, i - 20);
          const gEnd = Math.min(generatedUrl.length, i + 20);
          console.log(`Context in generated URL: ${generatedUrl.substring(gStart, gEnd)}`);
          
          break;
        }
      }
    }

    // Also test against the exact URL provided by the user
    const expectedExactUrl = "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Chhatrapati%20Sambhajinagar%5CCircle-Latur%5CDivision-Latur%5CSub%20Division-Shirur%20Anantpal%5CBlock-Shirur%20Anantpal%5CScheme-20030815-%20Sakol%207%20villages%20WSS";
    
    console.log("\nComparing with exact URL provided by user:");
    const exactMatch = currentUrl === expectedExactUrl;
    console.log(`Match with user-provided URL? ${exactMatch ? 'YES' : 'NO'}`);

    if (!exactMatch) {
      // Show difference with expected exact URL
      console.log("\nDifference with user-provided URL:");
      for (let i = 0; i < Math.max(currentUrl.length, expectedExactUrl.length); i++) {
        if (currentUrl[i] !== expectedExactUrl[i]) {
          console.log(`Position ${i}: '${currentUrl[i] || ''}' vs '${expectedExactUrl[i] || ''}'`);
          
          // Show a window of characters around the difference
          const start = Math.max(0, i - 20);
          const end = Math.min(currentUrl.length, i + 20);
          console.log(`Context in current URL: ${currentUrl.substring(start, end)}`);
          
          const eStart = Math.max(0, i - 20);
          const eEnd = Math.min(expectedExactUrl.length, i + 20);
          console.log(`Context in expected URL: ${expectedExactUrl.substring(eStart, eEnd)}`);
          
          break;
        }
      }
    }

  } catch (error) {
    console.error("Error testing Sakol URL generation:", error);
  } finally {
    await pool.end();
  }
}

testSakolUrlGeneration().catch(console.error);