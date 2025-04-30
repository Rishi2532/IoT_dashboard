/**
 * Check a single URL format for verification
 */

import pg from 'pg';
const { Pool } = pg;

async function checkUrlFormat() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    
    try {
      // Check a specific URL
      const targetSchemeId = '20029637'; // Penur Patkul
      
      // Get URL for this scheme
      const schemeResult = await client.query(
        'SELECT scheme_id, block, scheme_name, dashboard_url FROM scheme_status WHERE scheme_id = $1 LIMIT 1', 
        [targetSchemeId]
      );
      
      if (schemeResult.rows.length > 0) {
        const scheme = schemeResult.rows[0];
        
        console.log(`\nURL for scheme ${scheme.scheme_name} (ID: ${scheme.scheme_id}):`);
        console.log(scheme.dashboard_url);
        
        // Check if it includes the correct patterns
        const blockPattern = 'Block%20-';
        const schemePattern = 'Scheme%20-%20';
        const schemeIdPattern = '%20-';
        
        const hasCorrectBlockPattern = scheme.dashboard_url.includes(blockPattern);
        const hasCorrectSchemePattern = scheme.dashboard_url.includes(schemePattern);
        const hasCorrectIdPattern = scheme.dashboard_url.includes(scheme.scheme_id + schemeIdPattern);
        
        console.log(`\nFormat check results:`);
        console.log(`Block pattern (${blockPattern}): ${hasCorrectBlockPattern ? 'PASSED' : 'FAILED'}`);
        console.log(`Scheme pattern (${schemePattern}): ${hasCorrectSchemePattern ? 'PASSED' : 'FAILED'}`);
        console.log(`Scheme ID pattern (${scheme.scheme_id}${schemeIdPattern}): ${hasCorrectIdPattern ? 'PASSED' : 'FAILED'}`);
      } else {
        console.log(`Scheme with ID ${targetSchemeId} not found.`);
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
checkUrlFormat().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});