/**
 * Comprehensive Fix for Pune Region URLs
 * 
 * This script updates all Pune region schemes to:
 * 1. Match the exact format shown in the examples
 * 2. Remove UUIDs from the end of all URLs
 * 3. Preserve the special formatting for specific schemes
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

// Setup WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Base URL and parameters
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

async function fixPuneRegionUrls() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");
    return;
  }

  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connected to database, updating Pune region URLs...");

    // Get all schemes from Pune region
    const puneSchemes = await pool.query(`
      SELECT scheme_id, scheme_name, region, block, circle, division, sub_division, dashboard_url 
      FROM scheme_status 
      WHERE region = 'Pune'
    `);

    console.log(`Found ${puneSchemes.rows.length} schemes in the Pune region.`);

    // Process each scheme
    for (const scheme of puneSchemes.rows) {
      let path = '';
      
      // Check for schemes with specific formats based on examples
      if (scheme.scheme_name === 'LONI BHAPKAR RRWSS' || 
          scheme.scheme_name === 'HOL SASTEWADI' || 
          scheme.scheme_name === 'MURTI & 7 VILLAGES RRWSS' ||
          scheme.scheme_name === 'Wangani RRWSS' ||
          scheme.scheme_name === 'RR Girvi WSS' ||
          scheme.scheme_name === 'Done Adhale RR' ||
          scheme.scheme_name === 'Gar, Sonwadi, Nanviz RR' ||
          scheme.scheme_name === 'Peth & two Villages') {
        // Format with no spaces around hyphens
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${scheme.region}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block-${scheme.block}\\Scheme-${scheme.scheme_id}-${scheme.scheme_name}`;
      } 
      else if (scheme.scheme_name === 'Peth RR' || 
              scheme.scheme_name.includes('Alegaon shirbhavi 82 Village')) {
        // Format with space after scheme_id
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${scheme.region}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block-${scheme.block}\\Scheme-${scheme.scheme_id} - ${scheme.scheme_name}`;
      }
      else if (scheme.scheme_name.includes('Penur Patkul') || 
               scheme.scheme_name.includes('Andhalgaon and 3 villages') ||
               scheme.scheme_name.includes('Dhuldev Algudewadi')) {
        // Format with spaces around scheme_id and hyphen
        // Special handling for block with space before hyphen
        if (scheme.scheme_name.includes('Andhalgaon and 3 villages')) {
          path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${scheme.region}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block - ${scheme.block}\\Scheme - ${scheme.scheme_id} -${scheme.scheme_name}`;
        } else if (scheme.scheme_name.includes('Dhuldev Algudewadi')) {
          path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${scheme.region}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block- ${scheme.block}\\Scheme- ${scheme.scheme_id} -${scheme.scheme_name}`;
        } else {
          path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${scheme.region}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block -${scheme.block}\\Scheme - ${scheme.scheme_id} -${scheme.scheme_name}`;
        }
      }
      else {
        // Standard Pune format for all other schemes
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${scheme.region}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block -${scheme.block}\\Scheme - ${scheme.scheme_id} -${scheme.scheme_name}`;
      }
      
      // Encode the path
      const encodedPath = encodeURIComponent(path);
      
      // Create new URL without UUID
      const newUrl = `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
      
      // Show the difference for the first few schemes
      if (puneSchemes.rows.indexOf(scheme) < 5) {
        console.log(`\nScheme: ${scheme.scheme_name}`);
        console.log("Old URL:", scheme.dashboard_url);
        console.log("New URL:", newUrl);
      }
      
      // Update the database
      await pool.query(
        "UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND scheme_name = $3",
        [newUrl, scheme.scheme_id, scheme.scheme_name]
      );
    }
    
    console.log("\nUpdated all Pune region URLs successfully.");
  } catch (error) {
    console.error("Error updating Pune region URLs:", error);
  } finally {
    await pool.end();
  }
}

fixPuneRegionUrls().catch(console.error);