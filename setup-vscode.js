/**
 * VS Code Setup Script
 * 
 * This script sets up the application to work with VS Code and local PostgreSQL.
 * It fixes common issues and ensures all database tables are properly structured.
 * 
 * Run this once before starting your application in VS Code.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('Creating .env file with your PostgreSQL credentials...');
  const envContent = `# PostgreSQL Connection
DATABASE_URL=postgresql://postgres:Salunke@123@localhost:5432/water_scheme_dashboard
PGUSER=postgres
PGHOST=localhost
PGPASSWORD=Salunke@123
PGDATABASE=water_scheme_dashboard
PGPORT=5432

# App Configuration
PORT=5000
`;
  fs.writeFileSync(envPath, envContent);
  console.log('.env file created successfully!');
}

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Create PostgreSQL client
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function setupVSCode() {
  console.log('========================================');
  console.log('VS Code Setup for Maharashtra Water Dashboard');
  console.log('========================================\n');
  
  console.log('Connecting to PostgreSQL database...');
  
  const client = await pool.connect();
  try {
    console.log('✅ Connected to PostgreSQL database successfully');
    
    // PART 1: Check and create tables
    console.log('\n📊 Checking database tables...');
    
    // Check if key tables exist
    const tables = ['regions', 'scheme_status', 'updates', 'users'];
    
    for (const table of tables) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${table}'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log(`Creating missing table: ${table}...`);
        
        if (table === 'regions') {
          await client.query(`
            CREATE TABLE regions (
              region_id SERIAL PRIMARY KEY,
              region_name TEXT NOT NULL,
              total_schemes_integrated INTEGER,
              fully_completed_schemes INTEGER,
              total_villages_integrated INTEGER,
              fully_completed_villages INTEGER,
              total_esr_integrated INTEGER,
              fully_completed_esr INTEGER,
              flow_meter_integrated INTEGER,
              rca_integrated INTEGER,
              pressure_transmitter_integrated INTEGER
            );
          `);
          console.log('✅ Created regions table');
        }
        
        if (table === 'scheme_status') {
          await client.query(`
            CREATE TABLE scheme_status (
              sr_no SERIAL PRIMARY KEY,
              scheme_id TEXT UNIQUE,
              region_name TEXT,
              district TEXT,
              taluka TEXT,
              scheme_name TEXT,
              agency TEXT,
              villages INTEGER,
              villages_integrated INTEGER,
              fully_completed_villages INTEGER,
              total_esr INTEGER,
              esr_integrated INTEGER,
              fully_completed_esr INTEGER,
              project_cost DECIMAL(15, 2),
              scheme_status TEXT,
              scheme_functional_status TEXT,
              flow_meters_connected INTEGER,
              pressure_transmitters_connected INTEGER,
              residual_chlorine_connected INTEGER,
              ph_meters_connected INTEGER,
              turbidity_meters_connected INTEGER,
              tds_meters_connected INTEGER,
              villages_status TEXT,
              esr_status TEXT,
              scheme_completion_percent DECIMAL(5, 2),
              location_latitude DECIMAL(11, 8),
              location_longitude DECIMAL(11, 8)
            );
          `);
          console.log('✅ Created scheme_status table');
        }
        
        if (table === 'updates') {
          await client.query(`
            CREATE TABLE updates (
              id SERIAL PRIMARY KEY,
              date DATE,
              type TEXT,
              count INTEGER,
              region TEXT,
              affected_ids TEXT[]
            );
          `);
          console.log('✅ Created updates table');
        }
        
        if (table === 'users') {
          await client.query(`
            CREATE TABLE users (
              id SERIAL PRIMARY KEY,
              username TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              is_admin BOOLEAN DEFAULT FALSE
            );
            
            -- Insert default admin user (username: admin, password: admin123)
            INSERT INTO users (username, password, is_admin) 
            VALUES ('admin', '$2b$10$3euPcmQFCiblsZeEu5s7p.9MUZWRVnj0MSKqgq9tHKkEzJqDBK5pG', TRUE);
          `);
          console.log('✅ Created users table with default admin user (admin/admin123)');
        }
      } else {
        console.log(`✅ Table ${table} already exists`);
      }
    }
    
    // PART 2: Check data exists in tables
    console.log('\n📈 Checking data in tables...');
    
    // Check regions data
    const regionCount = await client.query('SELECT COUNT(*) FROM regions');
    if (parseInt(regionCount.rows[0].count) === 0) {
      console.log('Adding default regions data...');
      
      // Insert Maharashtra regions with default values
      await client.query(`
        INSERT INTO regions (region_name, total_schemes_integrated, fully_completed_schemes, 
                             total_villages_integrated, fully_completed_villages, 
                             total_esr_integrated, fully_completed_esr, 
                             flow_meter_integrated, rca_integrated, pressure_transmitter_integrated) 
        VALUES 
        ('Nagpur', 16, 8, 136, 59, 164, 87, 120, 121, 66),
        ('Amravati', 11, 3, 103, 34, 123, 42, 157, 114, 116),
        ('Chhatrapati Sambhajinagar', 11, 4, 87, 21, 143, 57, 136, 143, 96),
        ('Nashik', 15, 0, 130, 54, 181, 87, 113, 114, 47),
        ('Pune', 13, 0, 95, 0, 119, 0, 160, 126, 74),
        ('Konkan', 4, 0, 47, 8, 51, 14, 11, 10, 3);
      `);
      
      console.log('✅ Added default regions data');
    } else {
      console.log(`✅ Regions table has ${regionCount.rows[0].count} regions`);
    }
    
    // Check scheme_status data
    const schemeCount = await client.query('SELECT COUNT(*) FROM scheme_status');
    if (parseInt(schemeCount.rows[0].count) === 0) {
      console.log('No schemes found. Generating sample schemes for each region...');
      
      // Get regions to create sample schemes
      const regions = await client.query('SELECT * FROM regions');
      
      for (const region of regions.rows) {
        const regionName = region.region_name;
        console.log(`  Creating schemes for ${regionName}...`);
        
        // Create sample schemes based on total_schemes_integrated count
        const numSchemesToCreate = parseInt(region.total_schemes_integrated) || 1;
        
        for (let i = 0; i < numSchemesToCreate; i++) {
          const schemeId = `${regionName.substring(0, 3).toUpperCase()}${i+1000}`;
          const schemeName = `${regionName} Water Supply Scheme ${i+1}`;
          const district = regionName;
          const taluka = `${regionName} Taluka ${i+1}`;
          const agency = getAgencyByRegion(regionName);
          
          // Villages data
          const villages = Math.min(10, Math.max(1, Math.floor(Math.random() * 10) + 1));
          const villagesIntegrated = villages;
          const fullyCompletedVillages = regionName === 'Pune' ? 0 : Math.floor(villages * Math.random());
          
          // ESR data
          const totalEsr = Math.min(15, Math.max(1, Math.floor(Math.random() * 15) + 1));
          const esrIntegrated = totalEsr;
          const fullyCompletedEsr = regionName === 'Pune' || regionName === 'Konkan' ? 0 : Math.floor(totalEsr * Math.random());
          
          // Status data
          const isFullyCompleted = regionName !== 'Pune' && regionName !== 'Konkan' && regionName !== 'Nashik' && Math.random() > 0.7;
          const schemeStatus = isFullyCompleted ? 'Fully-Completed' : 'In Progress';
          const functionalStatus = isFullyCompleted ? 'Functional' : 'Partial';
          
          // Integration data
          const flowMeters = Math.floor(Math.random() * 10) + 1;
          const pressureTransmitters = Math.floor(Math.random() * 8) + 1;
          const residualChlorine = Math.floor(Math.random() * 5) + 1;
          
          // Project cost
          const projectCost = Math.floor(Math.random() * 5000) + 1000;
          
          // Insert the scheme
          await client.query(
            `INSERT INTO scheme_status (
              scheme_id, region_name, district, taluka, scheme_name, agency,
              villages, villages_integrated, fully_completed_villages,
              total_esr, esr_integrated, fully_completed_esr,
              project_cost, scheme_status, scheme_functional_status,
              flow_meters_connected, pressure_transmitters_connected, residual_chlorine_connected
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
              schemeId, regionName, district, taluka, schemeName, agency,
              villages, villagesIntegrated, fullyCompletedVillages,
              totalEsr, esrIntegrated, fullyCompletedEsr,
              projectCost, schemeStatus, functionalStatus,
              flowMeters, pressureTransmitters, residualChlorine
            ]
          );
        }
      }
      
      console.log('✅ Created sample schemes for all regions');
    } else {
      console.log(`✅ Scheme_status table has ${schemeCount.rows[0].count} schemes`);
    }
    
    // Check updates data
    const updateCount = await client.query('SELECT COUNT(*) FROM updates');
    const todayUpdateCount = await client.query("SELECT COUNT(*) FROM updates WHERE date = CURRENT_DATE");
    
    if (parseInt(todayUpdateCount.rows[0].count) === 0) {
      console.log('No updates found for today. Creating sample updates...');
      
      // Generate today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Create sample updates for today
      await client.query(
        `INSERT INTO updates (date, type, count, region, affected_ids)
         VALUES ($1, 'scheme', 3, 'Nagpur', ARRAY['NAG1000', 'NAG1001', 'NAG1002'])`,
        [today]
      );
      
      await client.query(
        `INSERT INTO updates (date, type, count, region, affected_ids)
         VALUES ($1, 'village', 5, 'Pune', ARRAY['village1', 'village2', 'village3', 'village4', 'village5'])`,
        [today]
      );
      
      console.log('✅ Created sample updates for today');
    } else {
      console.log(`✅ Updates table has ${updateCount.rows[0].count} updates (${todayUpdateCount.rows[0].count} for today)`);
    }
    
    // PART 3: Fix schema issues
    console.log('\n🔧 Checking for schema issues...');
    
    // Fix functional status values to ensure they're text
    const wrongStatusCount = await client.query(
      `SELECT COUNT(*) FROM scheme_status 
       WHERE scheme_functional_status IS NOT NULL 
       AND scheme_functional_status NOT IN ('Functional', 'Partial')`
    );
    
    if (parseInt(wrongStatusCount.rows[0].count) > 0) {
      console.log('Fixing functional status values...');
      
      await client.query(
        `UPDATE scheme_status 
         SET scheme_functional_status = 'Functional' 
         WHERE scheme_functional_status IN ('true', '1') 
         OR scheme_functional_status::text = 'true'`
      );
      
      await client.query(
        `UPDATE scheme_status 
         SET scheme_functional_status = 'Partial' 
         WHERE scheme_functional_status IN ('false', '0')
         OR scheme_functional_status::text = 'false'`
      );
      
      console.log('✅ Fixed functional status values');
    } else {
      console.log('✅ Functional status values are correct');
    }
    
    // Check local adapter for custom connection
    await createLocalAdapter();
    
    // PART 4: Update summary
    console.log('\n✨ Setup Complete! ✨');
    console.log('\nDatabase connection details:');
    console.log(`  Host: ${process.env.PGHOST}`);
    console.log(`  Database: ${process.env.PGDATABASE}`);
    console.log(`  User: ${process.env.PGUSER}`);
    console.log(`  Port: ${process.env.PGPORT}`);
    
    console.log('\nYour application is now ready to run in VS Code:');
    console.log('  1. Start your application with: npm run dev');
    console.log('  2. Access the dashboard at: http://localhost:5000');
    console.log('  3. Login with: admin / admin123');
    
    console.log('\nIf you update data in pgAdmin:');
    console.log('  1. Changes will be reflected automatically');
    console.log('  2. Use the "Update Region Summaries" button in the admin panel to refresh summary stats');
    
  } catch (err) {
    console.error('Error during setup:', err);
  } finally {
    client.release();
    pool.end();
  }
}

// Helper function to determine agency by region
function getAgencyByRegion(regionName) {
  const regionAgencyMap = {
    'Nagpur': 'M/s Rite Water',
    'Amravati': 'JISL',
    'Chhatrapati Sambhajinagar': 'L&T',
    'Pune': 'L&T',
    'Konkan': 'L&T',
    'Nashik': 'JISL'
  };
  
  return regionAgencyMap[regionName] || 'L&T';
}

// Create local adapter for custom PostgreSQL connection
async function createLocalAdapter() {
  const localAdapterPath = path.join(__dirname, 'server', 'local-adapter.js');
  const localAdapterDir = path.join(__dirname, 'server');
  
  // Ensure the server directory exists
  if (!fs.existsSync(localAdapterDir)) {
    fs.mkdirSync(localAdapterDir, { recursive: true });
  }
  
  console.log('Creating local adapter for custom database connection...');
  
  const localAdapterContent = `/**
 * Local Database Adapter
 * This file provides a PostgreSQL connection pool for local development.
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Create a connection pool with environment variables
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Test connection on initialization
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
  } else {
    console.log('Connected to PostgreSQL database at:', process.env.PGHOST);
  }
});

export default pool;
`;

  fs.writeFileSync(localAdapterPath, localAdapterContent);
  console.log('✅ Created local database adapter');
  
  // Now update the storage.ts file to use local-adapter if needed
  const storageFilePath = path.join(__dirname, 'server', 'storage.ts');
  
  if (fs.existsSync(storageFilePath)) {
    const storageContent = fs.readFileSync(storageFilePath, 'utf8');
    
    // Only update if it doesn't already have our changes
    if (!storageContent.includes('// VS Code local development')) {
      console.log('Updating storage.ts for local development...');
      
      const updatedContent = storageContent.replace(
        "import pool from './pg-adapter';",
        `// Import database pool
// VS Code local development support
let pool;
try {
  pool = (await import('./local-adapter.js')).default;
  console.log('Using local database adapter');
} catch (err) {
  pool = (await import('./pg-adapter')).default;
  console.log('Using default database adapter');
}`
      );
      
      fs.writeFileSync(storageFilePath, updatedContent);
      console.log('✅ Updated storage.ts for local development');
    }
  }
  
  return true;
}

// Run the setup
setupVSCode();