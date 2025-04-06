/**
 * Test script for local database connection and data verification
 */

import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const { Pool } = pg;

// Create a PostgreSQL client
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function testConnection() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL database');
    
    // Check table structure
    await checkTableStructure(client, 'scheme_status');
    await checkTableStructure(client, 'regions');
    await checkTableStructure(client, 'updates');
    await checkTableStructure(client, 'users');
    
    // Check data counts
    await checkDataCounts(client);
    
    console.log('\nDatabase connection and structure verified!');
  } catch (err) {
    console.error('Error testing database:', err);
  } finally {
    client.release();
    pool.end();
  }
}

async function checkTableStructure(client, tableName) {
  try {
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = '${tableName}'
      ORDER BY ordinal_position;
    `);
    
    console.log(`\nTable '${tableName}' structure:`);
    if (result.rows.length === 0) {
      console.log(`  Table does not exist or has no columns`);
    } else {
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
    }
    
    return result.rows.length > 0;
  } catch (err) {
    console.error(`Error checking table '${tableName}':`, err);
    return false;
  }
}

async function checkDataCounts(client) {
  try {
    // Check counts for all tables
    const regionCount = await client.query('SELECT COUNT(*) FROM regions');
    const schemeCount = await client.query('SELECT COUNT(*) FROM scheme_status');
    const updateCount = await client.query('SELECT COUNT(*) FROM updates');
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    
    console.log('\nData counts:');
    console.log(`  - regions: ${regionCount.rows[0].count} rows`);
    console.log(`  - scheme_status: ${schemeCount.rows[0].count} rows`);
    console.log(`  - updates: ${updateCount.rows[0].count} rows`);
    console.log(`  - users: ${userCount.rows[0].count} rows`);
    
    // Sample data for each table
    console.log('\nSample data:');
    
    // Regions sample
    const regionSample = await client.query('SELECT * FROM regions LIMIT 1');
    if (regionSample.rows.length > 0) {
      console.log('  - Sample region:', regionSample.rows[0].region_name);
    } else {
      console.log('  - No region data found');
    }
    
    // Scheme sample
    const schemeSample = await client.query('SELECT * FROM scheme_status LIMIT 1');
    if (schemeSample.rows.length > 0) {
      console.log('  - Sample scheme:', schemeSample.rows[0].scheme_name);
    } else {
      console.log('  - No scheme data found');
    }
    
  } catch (err) {
    console.error('Error checking data counts:', err);
  }
}

testConnection();