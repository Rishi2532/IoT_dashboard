/**
 * Check sample URLs from each region to verify their format
 */

import pg from 'pg';
const { Pool } = pg;

async function checkSampleUrls() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    
    try {
      // Define the regions to check
      const regions = ['Pune', 'Nashik', 'Konkan', 'Chhatrapati Sambhajinagar', 'Amravati', 'Nagpur'];
      
      for (const region of regions) {
        console.log(`\n===== SAMPLE URL FOR ${region} REGION =====`);
        
        // Get the first scheme from this region
        const schemeResult = await client.query(
          'SELECT scheme_id, scheme_name, block, dashboard_url FROM scheme_status WHERE region = $1 LIMIT 1', 
          [region]
        );
        
        if (schemeResult.rows.length > 0) {
          const scheme = schemeResult.rows[0];
          
          console.log(`Scheme: "${scheme.scheme_name}" (ID: ${scheme.scheme_id}) in block "${scheme.block}"`);
          console.log(`URL: ${scheme.dashboard_url}`);
          
          // Decode URL to show the actual path
          const urlParts = scheme.dashboard_url.split('rootpath=');
          if (urlParts.length > 1) {
            const encodedPath = urlParts[1];
            const decodedPath = decodeURIComponent(encodedPath);
            
            console.log(`\nDecoded path: ${decodedPath}`);
            
            // Check for specific patterns
            const hasPuneFormat = decodedPath.includes('Block -');
            const hasStandardFormat = decodedPath.includes('Block-');
            const hasAmravatiSpelling = decodedPath.includes('Region-Amaravati');
            
            console.log(`\nFormat details:`);
            console.log(`- Uses Pune format (Block -Name): ${hasPuneFormat ? 'YES' : 'NO'}`);
            console.log(`- Uses Standard format (Block-Name): ${hasStandardFormat ? 'YES' : 'NO'}`);
            console.log(`- Uses Amaravati spelling: ${hasAmravatiSpelling ? 'YES' : 'NO'}`);
          }
        } else {
          console.log(`No schemes found for region ${region}`);
        }
      }
      
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
  } finally {
    await pool.end();
  }
}

// Run the function
checkSampleUrls().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});