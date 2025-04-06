/**
 * Fix script for missing "agency" column in scheme_status table
 * This is a targeted fix for the specific error occurring in VS Code
 */

import pg from 'pg';
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

async function fixAgencyColumn() {
  console.log('======================================');
  console.log('   Fix for Missing Agency Column');
  console.log('======================================\n');
  
  try {
    const client = await pool.connect();
    
    try {
      console.log('Connected to PostgreSQL database successfully');
      
      // Check if scheme_status table exists
      console.log('\nChecking scheme_status table...');
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'scheme_status'
        );
      `);
      
      if (!tableExists.rows[0].exists) {
        console.log('❌ scheme_status table does not exist');
        return;
      }
      
      // Check if agency column exists in scheme_status table
      console.log('Checking if agency column exists...');
      const agencyColumnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'scheme_status' 
          AND column_name = 'agency'
        );
      `);
      
      if (agencyColumnExists.rows[0].exists) {
        console.log('✅ agency column already exists in scheme_status table');
      } else {
        console.log('🔧 Adding missing agency column to scheme_status table...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN agency TEXT;
        `);
        
        console.log('✅ Added agency column to scheme_status table');
        
        // Update agency values based on region
        console.log('🔧 Setting default agency values based on region...');
        
        await client.query(`
          UPDATE scheme_status 
          SET agency = 
            CASE
              WHEN region_name = 'Nagpur' THEN 'M/s Rite Water'
              WHEN region_name = 'Amravati' THEN 'JISL'
              WHEN region_name = 'Nashik' THEN 'JISL'
              WHEN region_name = 'Pune' THEN 'L&T'
              WHEN region_name = 'Konkan' THEN 'L&T'
              WHEN region_name = 'Chhatrapati Sambhajinagar' THEN 'L&T'
              ELSE 'L&T'
            END;
        `);
        
        console.log('✅ Updated agency values for all schemes');
      }
      
      // Check if there are any schemes in the table
      console.log('\nChecking for schemes in the table...');
      const schemeCount = await client.query(`
        SELECT COUNT(*) FROM scheme_status;
      `);
      
      const count = parseInt(schemeCount.rows[0].count);
      console.log(`Found ${count} schemes in the database`);
      
      if (count === 0) {
        console.log('\n⚠️ No schemes found. You should run fix-scheme-data.js to create sample data.');
      }
      
      // Now check for updates table
      console.log('\nChecking updates table...');
      
      const updatesTableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'updates'
        );
      `);
      
      if (!updatesTableExists.rows[0].exists) {
        console.log('🔧 Creating missing updates table...');
        
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
        
        // Insert today's date for a sample update
        const today = new Date().toISOString().split('T')[0];
        
        await client.query(
          `INSERT INTO updates (date, type, count, region, affected_ids)
           VALUES ($1, 'scheme', 2, 'Nagpur', ARRAY['NAG1000', 'NAG1001'])`,
          [today]
        );
        
        console.log('✅ Added sample update for today');
      } else {
        const updateCount = await client.query(`
          SELECT COUNT(*) FROM updates WHERE date = CURRENT_DATE;
        `);
        
        if (parseInt(updateCount.rows[0].count) === 0) {
          console.log('🔧 No updates found for today, adding sample update...');
          
          const today = new Date().toISOString().split('T')[0];
          
          await client.query(
            `INSERT INTO updates (date, type, count, region, affected_ids)
             VALUES ($1, 'scheme', 2, 'Nagpur', ARRAY['NAG1000', 'NAG1001'])`,
            [today]
          );
          
          console.log('✅ Added sample update for today');
        } else {
          console.log('✅ Updates for today already exist');
        }
      }
      
      // Check for app_state table
      console.log('\nChecking app_state table...');
      
      const appStateTableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'app_state'
        );
      `);
      
      if (!appStateTableExists.rows[0].exists) {
        console.log('🔧 Creating app_state table...');
        
        await client.query(`
          CREATE TABLE app_state (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        console.log('✅ Created app_state table');
      }
      
      // Add today's updates to app_state
      const today = new Date().toISOString().split('T')[0];
      const updateKey = `daily_updates_${today}`;
      
      const existingUpdate = await client.query(`
        SELECT * FROM app_state WHERE key = $1;
      `, [updateKey]);
      
      if (existingUpdate.rows.length === 0) {
        console.log('🔧 Creating sample daily updates in app_state...');
        
        // Sample updates data
        const updatesData = {
          updates: [
            { type: 'scheme', count: 3, region: 'Nagpur', timestamp: new Date().toISOString() },
            { type: 'village', count: 5, region: 'Pune', timestamp: new Date().toISOString() },
            { type: 'esr', count: 2, region: 'Nashik', timestamp: new Date().toISOString() }
          ],
          prevTotals: {
            villages: 590,
            esr: 775,
            completedSchemes: 12,
            flowMeters: 690,
            rca: 620,
            pt: 395
          },
          lastUpdateDay: today
        };
        
        await client.query(`
          INSERT INTO app_state (key, value)
          VALUES ($1, $2);
        `, [updateKey, JSON.stringify(updatesData)]);
        
        console.log('✅ Added sample daily updates to app_state');
      } else {
        console.log('✅ Daily updates already exist in app_state');
      }
      
      console.log('\n✅ Fix completed successfully!');
      console.log('The "agency" column has been added to the scheme_status table.');
      console.log('All required tables have been verified and fixed if needed.');
      console.log('\nYou should now be able to:');
      console.log('1. View scheme details on the dashboard');
      console.log('2. Import Excel/CSV files through the admin panel');
      console.log('3. See today\'s updates on the dashboard');
      
      console.log('\nPlease restart your application with:');
      console.log('npm run dev');
      
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Error:', err);
    console.log('\nPlease check your PostgreSQL connection settings in .env file:');
    console.log(`DATABASE_URL=${process.env.DATABASE_URL}`);
    console.log(`PGUSER=${process.env.PGUSER}`);
    console.log(`PGHOST=${process.env.PGHOST}`);
    console.log(`PGDATABASE=${process.env.PGDATABASE}`);
    console.log(`PGPORT=${process.env.PGPORT}`);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixAgencyColumn();