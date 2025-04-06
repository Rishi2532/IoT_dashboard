/**
 * Test script for local database connection and data verification
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function testConnection() {
  console.log("==== Local Database Test ====");
  console.log("Testing connection to PostgreSQL database...");
  
  try {
    const client = await pool.connect();
    
    try {
      console.log("\n✅ Connected to PostgreSQL database successfully");
      console.log(`   Database: ${process.env.PGDATABASE}`);
      console.log(`   Host: ${process.env.PGHOST}`);
      console.log(`   User: ${process.env.PGUSER}`);
      
      // Check tables
      console.log("\n🔍 Checking tables...");
      await checkTableStructure(client, "regions");
      await checkTableStructure(client, "scheme_status");
      await checkTableStructure(client, "updates");
      await checkTableStructure(client, "users");
      
      // Check data
      console.log("\n📊 Checking data...");
      await checkDataCounts(client);
      
      console.log("\n✅ Database test completed successfully");
      console.log("You can now run the application with 'npm run dev'");
      
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Error connecting to database:", err);
    console.log("\nPlease check your PostgreSQL connection settings in .env file:");
    console.log(`DATABASE_URL=${process.env.DATABASE_URL}`);
    console.log(`PGUSER=${process.env.PGUSER}`);
    console.log(`PGPASSWORD=******** (hidden for security)`);
    console.log(`PGHOST=${process.env.PGHOST}`);
    console.log(`PGDATABASE=${process.env.PGDATABASE}`);
    console.log(`PGPORT=${process.env.PGPORT}`);
  } finally {
    await pool.end();
  }
}

async function checkTableStructure(client, tableName) {
  try {
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [tableName]);
    
    console.log(`  ✅ Table '${tableName}' exists with ${result.rows.length} columns`);
    
    // Show first 5 columns as a sample
    const sampleColumns = result.rows.slice(0, 5);
    sampleColumns.forEach(col => {
      console.log(`     ${col.column_name} (${col.data_type})`);
    });
    
    if (result.rows.length > 5) {
      console.log(`     ... and ${result.rows.length - 5} more columns`);
    }
    
    return true;
  } catch (err) {
    console.error(`  ❌ Error checking table '${tableName}':`, err.message);
    return false;
  }
}

async function checkDataCounts(client) {
  const tables = ["regions", "scheme_status", "updates", "users"];
  
  for (const table of tables) {
    try {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      const count = parseInt(result.rows[0].count);
      
      if (count > 0) {
        console.log(`  ✅ Table '${table}' has ${count} records`);
        
        // Show sample data for each table
        const sampleData = await client.query(`SELECT * FROM ${table} LIMIT 1`);
        if (sampleData.rows.length > 0) {
          const sample = sampleData.rows[0];
          const keys = Object.keys(sample).slice(0, 5); // Show first 5 fields
          
          console.log(`     Sample record (partial):`);
          keys.forEach(key => {
            const value = typeof sample[key] === 'object' ? JSON.stringify(sample[key]).substring(0, 30) : sample[key];
            console.log(`       ${key}: ${value}`);
          });
          
          if (Object.keys(sample).length > 5) {
            console.log(`       ... and ${Object.keys(sample).length - 5} more fields`);
          }
        }
      } else {
        console.log(`  ⚠️ Table '${table}' has no records`);
      }
    } catch (err) {
      console.error(`  ❌ Error checking data in '${table}':`, err.message);
    }
  }
}

// Run the test
testConnection();