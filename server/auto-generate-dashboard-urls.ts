/**
 * Auto-generate Dashboard URLs Script
 * 
 * This script runs during application startup to ensure all dashboard URLs
 * are properly generated. It checks for schemes and villages with missing dashboard URLs
 * and regenerates them using the proper format.
 * 
 * It also generates ESR-level dashboard URLs for the chlorine and pressure tables.
 */

import { Pool } from 'pg';
import { getDB } from './db';

// Special case for Bargaonpimpri scheme in Nashik region
function generateSpecialCaseUrl(scheme: any): string | null {
  const { scheme_id, scheme_name } = scheme;
  
  // Bargaonpimpri scheme in Nashik region (includes non-breaking space character)
  if (scheme_id === '20019176' && scheme_name.includes('Bargaonpimpri')) {
    const path = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS' + String.fromCharCode(160) + ' Tal Sinnar';
    const encodedPath = encodeURIComponent(path);
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
    const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
    
    return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }
  
  return null; // No special case matched
}

// Generate dashboard URL for a scheme
export function generateDashboardUrl(scheme: any): string | null {
  // Check for special case URLs first
  const specialCaseUrl = generateSpecialCaseUrl(scheme);
  if (specialCaseUrl) {
    return specialCaseUrl;
  }
  
  // Default values for missing fields to ensure URL generation works even with partial data
  const region = scheme.region || 'Unknown Region';
  const circle = scheme.circle || 'Unknown Circle';
  const division = scheme.division || 'Unknown Division';
  const sub_division = scheme.sub_division || 'Unknown Sub Division';
  const block = scheme.block || 'Unknown Block';
  const scheme_id = scheme.scheme_id || `Unknown-${Date.now()}`;
  const scheme_name = scheme.scheme_name || `Unknown Scheme ${scheme_id}`;
  
  // Base URL for PI Vision dashboard with the correct display ID (10108)
  const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
  
  // Standard parameters for the dashboard
  const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
  
  // Handle the special case for Amravati region (change to Amaravati in the URL)
  const regionDisplay = region === 'Amravati' ? 'Amaravati' : region;

  // Create the path without URL encoding
  // Use different spacing formats based on the region and scheme name
  let path;
  
  // Different format for Pune region
  if (region === 'Pune') {
    // Pune region has hyphen with no space after scheme_id
    path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id}-${scheme_name}`;
  } else {
    // Standard format for other regions (space after scheme_id, then hyphen)
    path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name}`;
  }

  // Encode the path for the URL
  const encodedPath = encodeURIComponent(path);

  // Return the complete URL with parameters
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

// Special case for Bargaonpimpri village URLs in Nashik region
function generateSpecialCaseVillageUrl(village: any): string | null {
  const { scheme_id, scheme_name, village_name } = village;
  
  // Bargaonpimpri scheme in Nashik region (includes non-breaking space character)
  if (scheme_id === '20019176' && scheme_name.includes('Bargaonpimpri')) {
    // Insert the non-breaking space character (\u00A0) in the right position
    const path = `\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS${String.fromCharCode(160)} Tal Sinnar\\\\${village_name}`;
    const encodedPath = encodeURIComponent(path);
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
    const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
    
    return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }
  
  return null; // No special case matched
}

// Generate dashboard URL for a village
export function generateVillageDashboardUrl(village: any): string | null {
  // Skip if missing required hierarchical information
  if (!village.region || !village.circle || !village.division || 
      !village.sub_division || !village.block || !village.scheme_id || 
      !village.scheme_name || !village.village_name) {
    console.warn(`Cannot generate URL for village ${village.village_name} - missing hierarchical information.`);
    return null;
  }
  
  // Check for special case URLs first
  const specialCaseUrl = generateSpecialCaseVillageUrl(village);
  if (specialCaseUrl) {
    return specialCaseUrl;
  }
  
  // Base URL and parameters for the dashboard URLs
  const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
  const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
  
  // Handle the special case for Amravati region (change to Amaravati in the URL)
  const regionDisplay = village.region === 'Amravati' ? 'Amaravati' : village.region;
  
  // Create the path based on region format
  let path;
  
  // Different format for Pune region
  if (village.region === 'Pune') {
    // Format for Pune region (no space between scheme_id and hyphen)
    path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${village.circle}\\Division-${village.division}\\Sub Division-${village.sub_division}\\Block-${village.block}\\Scheme-${village.scheme_id}-${village.scheme_name}\\${village.village_name}`;
  } else {
    // Standard format for other regions (space between scheme_id and hyphen)
    path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${village.circle}\\Division-${village.division}\\Sub Division-${village.sub_division}\\Block-${village.block}\\Scheme-${village.scheme_id} - ${village.scheme_name}\\${village.village_name}`;
  }
  
  // Encode the path for use in URL
  const encodedPath = encodeURIComponent(path);
  
  // Return the complete URL
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

// Special case for Bargaonpimpri ESR URLs in Nashik region
function generateSpecialCaseEsrUrl(esr: any): string | null {
  const { scheme_id, scheme_name, village_name, esr_name } = esr;
  
  // Bargaonpimpri scheme in Nashik region (includes non-breaking space character)
  if (scheme_id === '20019176' && scheme_name && scheme_name.includes('Bargaonpimpri')) {
    // Insert the non-breaking space character (\u00A0) in the right position
    const path = `\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS${String.fromCharCode(160)} Tal Sinnar\\\\${village_name}\\\\${esr_name}`;
    const encodedPath = encodeURIComponent(path);
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10086/CEREBULB_JJM_MAHARASHTRA_ESR_LEVEL_DASHBOARD';
    const STANDARD_PARAMS = 'mode=kiosk&hidetoolbar&hidesidebar';
    
    return `${BASE_URL}?${STANDARD_PARAMS}&asset=${encodedPath}`;
  }
  
  return null; // No special case matched
}

// Generate dashboard URL for an ESR
export function generateEsrDashboardUrl(esr: any): string | null {
  // Skip if missing required hierarchical information
  if (!esr.region || !esr.circle || !esr.division || 
      !esr.sub_division || !esr.block || !esr.scheme_id || 
      !esr.scheme_name || !esr.village_name || !esr.esr_name) {
    console.warn(`Cannot generate URL for ESR ${esr.esr_name} in village ${esr.village_name} - missing hierarchical information.`);
    return null;
  }
  
  // Check for special case URLs first
  const specialCaseUrl = generateSpecialCaseEsrUrl(esr);
  if (specialCaseUrl) {
    return specialCaseUrl;
  }
  
  // Base URL and parameters for the ESR dashboard URLs
  const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10086/CEREBULB_JJM_MAHARASHTRA_ESR_LEVEL_DASHBOARD';
  const STANDARD_PARAMS = 'mode=kiosk&hidetoolbar&hidesidebar';
  
  // Handle the special case for Amravati region (change to Amaravati in the URL)
  const regionDisplay = esr.region === 'Amravati' ? 'Amaravati' : esr.region;
  
  // Create the path based on region format
  let path;
  
  // Different format for Pune region
  if (esr.region === 'Pune') {
    // Format for Pune region (no space between scheme_id and hyphen)
    path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${esr.circle}\\Division-${esr.division}\\Sub Division-${esr.sub_division}\\Block-${esr.block}\\Scheme-${esr.scheme_id}-${esr.scheme_name}\\${esr.village_name}\\${esr.esr_name}`;
  } else {
    // Standard format for other regions (space between scheme_id and hyphen)
    path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${esr.circle}\\Division-${esr.division}\\Sub Division-${esr.sub_division}\\Block-${esr.block}\\Scheme-${esr.scheme_id} - ${esr.scheme_name}\\${esr.village_name}\\${esr.esr_name}`;
  }
  
  // Encode the path for use in URL
  const encodedPath = encodeURIComponent(path);
  
  // Return the complete URL (note: using asset parameter for ESR instead of rootpath)
  return `${BASE_URL}?${STANDARD_PARAMS}&asset=${encodedPath}`;
}

// Main function to fix missing dashboard URLs
export async function autoGenerateDashboardUrls() {
  try {
    console.log('Auto-generating dashboard URLs during startup...');
    const db = await getDB();
    
    // Step 1: Check and fix scheme-level dashboard URLs
    console.log('Checking for schemes with missing dashboard URLs...');
    const schemeResults = await db.execute(`
      SELECT * FROM scheme_status WHERE dashboard_url IS NULL OR dashboard_url = '';
    `);
    
    if (schemeResults.rows.length > 0) {
      console.log(`Found ${schemeResults.rows.length} schemes with missing dashboard URLs.`);
      
      for (const scheme of schemeResults.rows) {
        const dashboardUrl = generateDashboardUrl(scheme);
        
        if (dashboardUrl) {
          console.log(`Generating URL for scheme: ${scheme.scheme_name}`);
          await db.execute(`
            UPDATE scheme_status 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND scheme_name = $3
          `, [dashboardUrl, scheme.scheme_id, scheme.scheme_name]);
        }
      }
      
      console.log('Scheme dashboard URLs generated successfully!');
    } else {
      console.log('No schemes with missing dashboard URLs found.');
    }
    
    // Step 2: Check and fix village-level dashboard URLs
    console.log('Checking for villages with missing dashboard URLs...');
    const villageResults = await db.execute(`
      SELECT * FROM water_scheme_data WHERE dashboard_url IS NULL OR dashboard_url = '';
    `);
    
    if (villageResults.rows.length > 0) {
      console.log(`Found ${villageResults.rows.length} villages with missing dashboard URLs.`);
      
      for (const village of villageResults.rows) {
        const dashboardUrl = generateVillageDashboardUrl(village);
        
        if (dashboardUrl) {
          console.log(`Generating URL for village: ${village.village_name} in scheme: ${village.scheme_name}`);
          await db.execute(`
            UPDATE water_scheme_data 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND village_name = $3
          `, [dashboardUrl, village.scheme_id, village.village_name]);
        }
      }
      
      console.log('Village dashboard URLs generated successfully!');
    } else {
      console.log('No villages with missing dashboard URLs found.');
    }
    
    // Step 3: Check and fix ESR-level dashboard URLs for chlorine data
    console.log('Checking for chlorine ESRs with missing dashboard URLs...');
    const chlorineResults = await db.execute(`
      SELECT * FROM chlorine_data WHERE dashboard_url IS NULL OR dashboard_url = '';
    `);
    
    if (chlorineResults.rows.length > 0) {
      console.log(`Found ${chlorineResults.rows.length} chlorine ESRs with missing dashboard URLs.`);
      
      for (const esr of chlorineResults.rows) {
        const dashboardUrl = generateEsrDashboardUrl(esr);
        
        if (dashboardUrl) {
          console.log(`Generating URL for ESR: ${esr.esr_name} in village: ${esr.village_name}`);
          await db.execute(`
            UPDATE chlorine_data 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND village_name = $3 AND esr_name = $4
          `, [dashboardUrl, esr.scheme_id, esr.village_name, esr.esr_name]);
        }
      }
      
      console.log('Chlorine ESR dashboard URLs generated successfully!');
    } else {
      console.log('No chlorine ESRs with missing dashboard URLs found.');
    }
    
    // Step 4: Check and fix ESR-level dashboard URLs for pressure data
    console.log('Checking for pressure ESRs with missing dashboard URLs...');
    const pressureResults = await db.execute(`
      SELECT * FROM pressure_data WHERE dashboard_url IS NULL OR dashboard_url = '';
    `);
    
    if (pressureResults.rows.length > 0) {
      console.log(`Found ${pressureResults.rows.length} pressure ESRs with missing dashboard URLs.`);
      
      for (const esr of pressureResults.rows) {
        const dashboardUrl = generateEsrDashboardUrl(esr);
        
        if (dashboardUrl) {
          console.log(`Generating URL for ESR: ${esr.esr_name} in village: ${esr.village_name}`);
          await db.execute(`
            UPDATE pressure_data 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND village_name = $3 AND esr_name = $4
          `, [dashboardUrl, esr.scheme_id, esr.village_name, esr.esr_name]);
        }
      }
      
      console.log('Pressure ESR dashboard URLs generated successfully!');
    } else {
      console.log('No pressure ESRs with missing dashboard URLs found.');
    }
    
    console.log('All dashboard URLs have been generated!');
  } catch (error) {
    console.error('Error generating dashboard URLs:', error);
  }
}
