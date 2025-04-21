/**
 * Test script for pgAdmin database connection
 * 
 * This script tests the connection to your pgAdmin PostgreSQL database
 * and checks if the necessary tables exist.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Attempt to load environment variables from .env.vscode
const envPath = path.join(__dirname, '.env.vscode');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('No .env.vscode file found, using default environment variables');
  dotenv.config();
}

async function testPgAdminConnection() {
  console.log('\n--- Testing pgAdmin Database Connection ---\n');
  console.log('Connection details:');
  console.log('- Database: water_scheme_dashboard');
  console.log('- Host: localhost');
  console.log('- Port: 5432');
  console.log('- User: postgres');
  console.log('- Password: [HIDDEN]');
  
  const connectionString = 'postgres://postgres:Salunke@123@localhost:5432/water_scheme_dashboard';
  console.log('\nAttempting to connect...');
  
  const pool = new Pool({ connectionString });
  
  try {
    // Try to connect
    const client = await pool.connect();
    console.log('✅ Successfully connected to pgAdmin database!');
    
    // Check if required tables exist
    console.log('\nChecking for required tables:');
    const requiredTables = ['region', 'scheme_status', 'users', 'app_state', 'water_scheme_data'];
    
    for (const table of requiredTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      const exists = result.rows[0].exists;
      console.log(`- Table "${table}": ${exists ? '✅ Found' : '❌ Not found'}`);
    }
    
    // Check record counts in each table
    console.log('\nChecking record counts:');
    for (const table of requiredTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM "${table}"`);
        const count = parseInt(countResult.rows[0].count, 10);
        console.log(`- "${table}": ${count} records`);
      } catch (err) {
        console.log(`- "${table}": Error counting records - ${err.message}`);
      }
    }
    
    client.release();
    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error connecting to pgAdmin database:', error.message);
    console.log('\nPlease ensure:');
    console.log('1. PostgreSQL is running in pgAdmin');
    console.log('2. The database "water_scheme_dashboard" exists');
    console.log('3. The username "postgres" and password "Salunke@123" are correct');
    console.log('4. PostgreSQL is accepting connections on localhost:5432');
  } finally {
    await pool.end();
  }
}

// Run the test
testPgAdminConnection();