const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'water_scheme_dashboard',
  user: 'postgres',
  password: 'Salunke@123'
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL!');
    
    const result = await client.query('SELECT count(*) FROM region');
    console.log(`Found ${result.rows[0].count} regions in database`);
    
    client.release();
    pool.end();
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

testConnection();