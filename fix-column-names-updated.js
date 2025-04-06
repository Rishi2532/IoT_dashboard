/**
 * Fix script for column name mismatches in scheme_status table
 * This fixes the "column total_villages_in_scheme does not exist" error
 * Updated with correct mappings provided by user
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

async function fixColumnNames() {
  console.log('======================================');
  console.log('   Fix for Column Name Mismatches');
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
      
      // Get the actual column structure
      console.log('Getting current column structure...');
      const columnResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'scheme_status'
        ORDER BY ordinal_position;
      `);
      
      const currentColumns = columnResult.rows.map(row => row.column_name);
      console.log(`Found ${currentColumns.length} columns in scheme_status table`);

      // Using the user-provided mappings for correct column references
      
      // Fix total_villages_in_scheme - the key issue
      const hasTotalVillagesInScheme = currentColumns.includes('total_villages_in_scheme');
      const hasNumberOfVillage = currentColumns.includes('number_of_village');
      
      if (!hasTotalVillagesInScheme && hasNumberOfVillage) {
        console.log('🔧 Adding total_villages_in_scheme column that maps to number_of_village...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN total_villages_in_scheme INTEGER GENERATED ALWAYS AS (number_of_village) STORED;
        `);
        
        console.log('✅ Added total_villages_in_scheme as a generated column');
      } else if (!hasTotalVillagesInScheme) {
        console.log('🔧 Adding total_villages_in_scheme column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN total_villages_in_scheme INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added total_villages_in_scheme column with default 0');
      } else {
        console.log('✅ total_villages_in_scheme column already exists');
      }

      // Check/Fix for total_esr_in_scheme
      const hasTotalEsrInScheme = currentColumns.includes('total_esr_in_scheme');
      const hasTotalNumberOfEsr = currentColumns.includes('total_number_of_esr');
      
      if (!hasTotalEsrInScheme && hasTotalNumberOfEsr) {
        console.log('🔧 Adding total_esr_in_scheme column that maps to total_number_of_esr...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN total_esr_in_scheme INTEGER GENERATED ALWAYS AS (total_number_of_esr) STORED;
        `);
        
        console.log('✅ Added total_esr_in_scheme as a generated column');
      } else if (!hasTotalEsrInScheme) {
        console.log('🔧 Adding total_esr_in_scheme column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN total_esr_in_scheme INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added total_esr_in_scheme column with default 0');
      } else {
        console.log('✅ total_esr_in_scheme column already exists');
      }
      
      // Check/Fix for villages_integrated_on_iot column
      const hasVillagesIntegratedOnIot = currentColumns.includes('villages_integrated_on_iot');
      const hasTotalVillagesIntegrated = currentColumns.includes('total_villages_integrated');
      
      if (!hasVillagesIntegratedOnIot && hasTotalVillagesIntegrated) {
        console.log('🔧 Adding villages_integrated_on_iot column that maps to total_villages_integrated...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN villages_integrated_on_iot INTEGER GENERATED ALWAYS AS (total_villages_integrated) STORED;
        `);
        
        console.log('✅ Added villages_integrated_on_iot as a generated column');
      } else if (!hasVillagesIntegratedOnIot) {
        console.log('🔧 Adding villages_integrated_on_iot column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN villages_integrated_on_iot INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added villages_integrated_on_iot column with default 0');
      }
      
      // Check/Fix for esr_integrated_on_iot
      const hasEsrIntegratedOnIot = currentColumns.includes('esr_integrated_on_iot');
      const hasTotalEsrIntegrated = currentColumns.includes('total_esr_integrated');
      
      if (!hasEsrIntegratedOnIot && hasTotalEsrIntegrated) {
        console.log('🔧 Adding esr_integrated_on_iot column that maps to total_esr_integrated...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN esr_integrated_on_iot INTEGER GENERATED ALWAYS AS (total_esr_integrated) STORED;
        `);
        
        console.log('✅ Added esr_integrated_on_iot as a generated column');
      } else if (!hasEsrIntegratedOnIot) {
        console.log('🔧 Adding esr_integrated_on_iot column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN esr_integrated_on_iot INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added esr_integrated_on_iot column with default 0');
      }
      
      // Check/Fix for total_villages column
      const hasTotalVillages = currentColumns.includes('total_villages');
      
      if (!hasTotalVillages && hasNumberOfVillage) {
        console.log('🔧 Adding total_villages column that maps to number_of_village...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN total_villages INTEGER GENERATED ALWAYS AS (number_of_village) STORED;
        `);
        
        console.log('✅ Added total_villages as a generated column');
      } else if (!hasTotalVillages) {
        console.log('🔧 Adding total_villages column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN total_villages INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added total_villages column with default 0');
      }
      
      // Check/Fix for integration_status column
      const hasIntegrationStatus = currentColumns.includes('integration_status');
      const hasFullyCompletionSchemeStatus = currentColumns.includes('fully_completion_scheme_status');
      
      if (!hasIntegrationStatus && hasFullyCompletionSchemeStatus) {
        console.log('🔧 Adding integration_status column that maps to fully_completion_scheme_status...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN integration_status TEXT GENERATED ALWAYS AS (fully_completion_scheme_status) STORED;
        `);
        
        console.log('✅ Added integration_status as a generated column');
      } else if (!hasIntegrationStatus) {
        console.log('🔧 Adding integration_status column with default value...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN integration_status TEXT DEFAULT 'In Progress';
        `);
        
        console.log('✅ Added integration_status column with default value');
      }
      
      // Check/Fix for scheme_status column (required by the codebase)
      const hasSchemeStatus = currentColumns.includes('scheme_status');
      
      if (!hasSchemeStatus && hasFullyCompletionSchemeStatus) {
        console.log('🔧 Adding scheme_status column that maps to fully_completion_scheme_status...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN scheme_status TEXT GENERATED ALWAYS AS (fully_completion_scheme_status) STORED;
        `);
        
        console.log('✅ Added scheme_status as a generated column');
      } else if (!hasSchemeStatus) {
        console.log('🔧 Adding scheme_status column with default value...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN scheme_status TEXT DEFAULT 'In Progress';
        `);
        
        console.log('✅ Added scheme_status column with default value');
      }
      
      // Check/Fix for functional_status column
      const hasFunctionalStatus = currentColumns.includes('functional_status');
      const hasSchemeFunctionalStatus = currentColumns.includes('scheme_functional_status');
      
      if (!hasFunctionalStatus && hasSchemeFunctionalStatus) {
        console.log('🔧 Adding functional_status column that maps to scheme_functional_status...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN functional_status TEXT GENERATED ALWAYS AS (scheme_functional_status) STORED;
        `);
        
        console.log('✅ Added functional_status as a generated column');
      } else if (!hasFunctionalStatus) {
        console.log('🔧 Adding functional_status column with default value...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN functional_status TEXT DEFAULT 'Partial';
        `);
        
        console.log('✅ Added functional_status column with default value');
      }
      
      // Check/Fix for balance_for_fully_completion column
      const hasBalanceForFullyCompletion = currentColumns.includes('balance_for_fully_completion');
      const hasBalanceToCompleteEsr = currentColumns.includes('balance_to_complete_esr');
      
      if (!hasBalanceForFullyCompletion && hasBalanceToCompleteEsr) {
        console.log('🔧 Adding balance_for_fully_completion column that maps to balance_to_complete_esr...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN balance_for_fully_completion INTEGER GENERATED ALWAYS AS (balance_to_complete_esr) STORED;
        `);
        
        console.log('✅ Added balance_for_fully_completion as a generated column');
      } else if (!hasBalanceForFullyCompletion) {
        console.log('🔧 Adding balance_for_fully_completion column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN balance_for_fully_completion INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added balance_for_fully_completion column with default 0');
      }
      
      // Check for agency column
      const hasAgency = currentColumns.includes('agency');
      
      if (!hasAgency) {
        console.log('🔧 Adding agency column...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN agency TEXT;
        `);
        
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
        
        console.log('✅ Added agency column and updated values based on region');
      }
      
      // Verify fixes
      console.log('\n🔍 Verifying fixes...');
      
      // Get updated column structure
      const updatedColumnResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'scheme_status'
        ORDER BY ordinal_position;
      `);
      
      const updatedColumns = updatedColumnResult.rows.map(row => row.column_name);
      
      const requiredColumns = [
        'scheme_id', 
        'number_of_village',
        'total_number_of_esr',
        'total_villages_in_scheme',
        'total_esr_in_scheme',
        'villages_integrated_on_iot',
        'esr_integrated_on_iot',
        'total_villages',
        'integration_status',
        'scheme_status',
        'functional_status',
        'agency',
        'balance_for_fully_completion'
      ];
      
      const missingColumns = requiredColumns.filter(col => !updatedColumns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log('✅ All required columns are now present in the scheme_status table');
      } else {
        console.log(`⚠️ Still missing columns: ${missingColumns.join(', ')}`);
        console.log('You may need to run this script again or check your database structure');
      }
      
      console.log('\n✅ Fix completed!');
      console.log('The scheme_status table now has all the column mappings needed by the application.');
      console.log('You should now be able to:');
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
fixColumnNames();