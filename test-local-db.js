/**
 * Test script for local PostgreSQL connection
 * Run with: node test-local-db.js
 */

// Import the local adapter
const pool = require('./server/local-adapter.js');

async function testConnection() {
  console.log('Testing PostgreSQL connection...');
  
  try {
    // Test the connection by querying PostgreSQL version
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully!');
    
    // Try a simple query
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL version:', result.rows[0].version);
    
    // Release the client
    client.release();
    
    // Now try checking if our tables exist
    const tableCheckResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
    `);
    
    console.log('\nDatabase tables:');
    tableCheckResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    console.log('\nConnection test completed successfully!');
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error.message);
    console.error('\nComplete error details:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the test
testConnection().catch(err => {
  console.error('Unhandled error:', err);
});