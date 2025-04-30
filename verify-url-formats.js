/**
 * Verify URL Formats across all regions
 * 
 * This script checks that all dashboard URLs follow the exact spacing format:
 * - Block -BlockName (space before hyphen)
 * - Scheme - SchemeID -SchemeName (space before and after first hyphen, no space after second hyphen)
 */

import pg from 'pg';
const { Pool } = pg;

// Note: These patterns are URL-encoded in the database
const BLOCK_PATTERN = 'Block%20-';
const SCHEME_PATTERN = 'Scheme%20-%20';
const SCHEME_ID_PATTERN = '%20-'; // Space only before hyphen after scheme ID

async function verifyUrlFormats() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    
    try {
      // Get all regions to check
      const regionsResult = await client.query('SELECT DISTINCT region FROM scheme_status');
      const regions = regionsResult.rows.map(row => row.region);
      
      console.log(`Found ${regions.length} regions to check`);
      
      let totalSchemes = 0;
      let correctFormatSchemes = 0;
      
      // Check each region
      for (const region of regions) {
        // Get one sample URL for each region
        const schemeResult = await client.query(
          'SELECT scheme_id, block, scheme_name, dashboard_url FROM scheme_status WHERE region = $1 LIMIT 1', 
          [region]
        );
        
        if (schemeResult.rows.length > 0) {
          const scheme = schemeResult.rows[0];
          
          // Count schemes in this region
          const countResult = await client.query(
            'SELECT COUNT(*) as count FROM scheme_status WHERE region = $1',
            [region]
          );
          const schemeCount = parseInt(countResult.rows[0].count);
          
          totalSchemes += schemeCount;
          
          // Check URL format
          const url = scheme.dashboard_url;
          
          if (url && 
              url.includes(BLOCK_PATTERN) && 
              url.includes(SCHEME_PATTERN) && 
              url.includes(scheme.scheme_id + SCHEME_ID_PATTERN)) {
            
            // Check format of all schemes in this region
            const correctFormatResult = await client.query(
              "SELECT COUNT(*) as count FROM scheme_status WHERE region = $1 AND " +
              "dashboard_url LIKE '%Block%20-%' AND " +
              "dashboard_url LIKE '%Scheme%20-%20%' AND " +
              "dashboard_url LIKE '%" + scheme.scheme_id + "%20-%'", 
              [region]
            );
            
            const correctCount = parseInt(correctFormatResult.rows[0].count);
            correctFormatSchemes += correctCount;
            
            console.log(`Region ${region}: ${correctCount}/${schemeCount} schemes have correct URL format`);
            console.log(`Sample URL pattern: ${url}`);
          } else {
            console.log(`Region ${region}: URL format check FAILED`);
            console.log(`Sample URL: ${url}`);
          }
        } else {
          console.log(`Region ${region}: No schemes found`);
        }
        
        console.log('----------------------------');
      }
      
      // Summary
      console.log(`\nOverall: ${correctFormatSchemes}/${totalSchemes} schemes (${Math.round(correctFormatSchemes/totalSchemes*100)}%) have the correct URL format`);
      
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
  } finally {
    // Close the pool when done
    await pool.end();
  }
}

// Run the main function
verifyUrlFormats().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});