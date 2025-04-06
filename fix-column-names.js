/**
 * Fix script for column name mismatches in scheme_status table
 * This fixes the "column total_villages does not exist" error
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
      
      // Check for total_villages column
      const hasTotalVillages = currentColumns.includes('total_villages');
      const hasNumberOfVillage = currentColumns.includes('number_of_village');
      
      if (!hasTotalVillages && hasNumberOfVillage) {
        console.log('🔧 Adding total_villages column that maps to number_of_village...');
        
        // Add view with column mapping
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
      } else {
        console.log('✅ total_villages column already exists');
      }
      
      // Check for villages column
      const hasVillages = currentColumns.includes('villages');
      
      if (!hasVillages && hasNumberOfVillage) {
        console.log('🔧 Adding villages column that maps to number_of_village...');
        
        // Add view with column mapping
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN villages INTEGER GENERATED ALWAYS AS (number_of_village) STORED;
        `);
        
        console.log('✅ Added villages as a generated column');
      } else if (!hasVillages) {
        console.log('🔧 Adding villages column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN villages INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added villages column with default 0');
      } else {
        console.log('✅ villages column already exists');
      }
      
      // Check for scheme_status column
      const hasSchemeStatus = currentColumns.includes('scheme_status');
      const hasCompletionStatus = currentColumns.includes('fully_completion_scheme_status');
      
      if (!hasSchemeStatus && hasCompletionStatus) {
        console.log('🔧 Adding scheme_status column that maps to fully_completion_scheme_status...');
        
        // Add column first, then update it
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN scheme_status TEXT;
          
          UPDATE scheme_status 
          SET scheme_status = fully_completion_scheme_status;
        `);
        
        console.log('✅ Added scheme_status mapped to fully_completion_scheme_status');
      } else if (!hasSchemeStatus) {
        console.log('🔧 Adding scheme_status column with default value...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN scheme_status TEXT DEFAULT 'In Progress';
        `);
        
        console.log('✅ Added scheme_status column with default value');
      } else {
        console.log('✅ scheme_status column already exists');
      }
      
      // More column mappings based on your actual structure
      // Map total_esr_integrated to total_number_of_esr if missing
      const hasTotalEsrIntegrated = currentColumns.includes('total_esr_integrated');
      const hasTotalNumberOfEsr = currentColumns.includes('total_number_of_esr');
      
      if (!hasTotalEsrIntegrated && hasTotalNumberOfEsr) {
        console.log('🔧 Adding total_esr_integrated column that maps to total_number_of_esr...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN total_esr_integrated INTEGER GENERATED ALWAYS AS (total_number_of_esr) STORED;
        `);
        
        console.log('✅ Added total_esr_integrated as a generated column');
      } else if (!hasTotalEsrIntegrated) {
        console.log('🔧 Adding total_esr_integrated column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN total_esr_integrated INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added total_esr_integrated column with default 0');
      }
      
      // Map esr_integrated to total_esr_integrated if missing
      const hasEsrIntegrated = currentColumns.includes('esr_integrated');
      
      if (!hasEsrIntegrated && hasTotalEsrIntegrated) {
        console.log('🔧 Adding esr_integrated column that maps to total_esr_integrated...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN esr_integrated INTEGER GENERATED ALWAYS AS (total_esr_integrated) STORED;
        `);
        
        console.log('✅ Added esr_integrated as a generated column');
      } else if (!hasEsrIntegrated) {
        console.log('🔧 Adding esr_integrated column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN esr_integrated INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added esr_integrated column with default 0');
      }
      
      // Map fully_completed_esr to no_fully_completed_esr if missing
      const hasFullyCompletedEsr = currentColumns.includes('fully_completed_esr');
      const hasNoFullyCompletedEsr = currentColumns.includes('no_fully_completed_esr');
      
      if (!hasFullyCompletedEsr && hasNoFullyCompletedEsr) {
        console.log('🔧 Adding fully_completed_esr column that maps to no_fully_completed_esr...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN fully_completed_esr INTEGER GENERATED ALWAYS AS (no_fully_completed_esr) STORED;
        `);
        
        console.log('✅ Added fully_completed_esr as a generated column');
      } else if (!hasFullyCompletedEsr) {
        console.log('🔧 Adding fully_completed_esr column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN fully_completed_esr INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added fully_completed_esr column with default 0');
      }
      
      // Map total_esr to match total_number_of_esr
      const hasTotalEsr = currentColumns.includes('total_esr');
      
      if (!hasTotalEsr && hasTotalNumberOfEsr) {
        console.log('🔧 Adding total_esr column that maps to total_number_of_esr...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN total_esr INTEGER GENERATED ALWAYS AS (total_number_of_esr) STORED;
        `);
        
        console.log('✅ Added total_esr as a generated column');
      } else if (!hasTotalEsr) {
        console.log('🔧 Adding total_esr column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN total_esr INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added total_esr column with default 0');
      }
      
      // Map balance_esr to balance_to_complete_esr
      const hasBalanceEsr = currentColumns.includes('balance_esr');
      const hasBalanceToCompleteEsr = currentColumns.includes('balance_to_complete_esr');
      
      if (!hasBalanceEsr && hasBalanceToCompleteEsr) {
        console.log('🔧 Adding balance_esr column that maps to balance_to_complete_esr...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN balance_esr INTEGER GENERATED ALWAYS AS (balance_to_complete_esr) STORED;
        `);
        
        console.log('✅ Added balance_esr as a generated column');
      } else if (!hasBalanceEsr) {
        console.log('🔧 Adding balance_esr column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN balance_esr INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added balance_esr column with default 0');
      }
      
      // Map villages_integrated to total_villages_integrated
      const hasVillagesIntegrated = currentColumns.includes('villages_integrated');
      const hasTotalVillagesIntegrated = currentColumns.includes('total_villages_integrated');
      
      if (!hasVillagesIntegrated && hasTotalVillagesIntegrated) {
        console.log('🔧 Adding villages_integrated column that maps to total_villages_integrated...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN villages_integrated INTEGER GENERATED ALWAYS AS (total_villages_integrated) STORED;
        `);
        
        console.log('✅ Added villages_integrated as a generated column');
      } else if (!hasVillagesIntegrated) {
        console.log('🔧 Adding villages_integrated column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN villages_integrated INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added villages_integrated column with default 0');
      }
      
      // Map scheme_functional_status properly if it exists
      const hasSchemeStatusFunc = currentColumns.includes('scheme_functional_status');
      
      if (!hasSchemeStatusFunc) {
        console.log('🔧 Adding scheme_functional_status column...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN scheme_functional_status TEXT DEFAULT 'Partial';
        `);
        
        console.log('✅ Added scheme_functional_status column with default value');
      }
      
      // Residual chlorine analyzer mapping
      const hasResidualChlorineConnected = currentColumns.includes('residual_chlorine_connected');
      const hasResidualChlorineAnalyzerConnected = currentColumns.includes('residual_chlorine_analyzer_connected');
      
      if (!hasResidualChlorineConnected && hasResidualChlorineAnalyzerConnected) {
        console.log('🔧 Adding residual_chlorine_connected column that maps to residual_chlorine_analyzer_connected...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN residual_chlorine_connected INTEGER GENERATED ALWAYS AS (residual_chlorine_analyzer_connected) STORED;
        `);
        
        console.log('✅ Added residual_chlorine_connected as a generated column');
      } else if (!hasResidualChlorineConnected) {
        console.log('🔧 Adding residual_chlorine_connected column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN residual_chlorine_connected INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added residual_chlorine_connected column with default 0');
      }
      
      // District column
      const hasDistrict = currentColumns.includes('district');
      
      if (!hasDistrict) {
        console.log('🔧 Adding district column...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN district TEXT;
          
          UPDATE scheme_status 
          SET district = region_name;
        `);
        
        console.log('✅ Added district column with region_name as default');
      }
      
      // Taluka column
      const hasTaluka = currentColumns.includes('taluka');
      
      if (!hasTaluka) {
        console.log('🔧 Adding taluka column...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN taluka TEXT DEFAULT NULL;
        `);
        
        console.log('✅ Added taluka column');
      }
      
      // Add total_villages_in_scheme column
      const hasTotalVillagesInScheme = currentColumns.includes('total_villages_in_scheme');
      
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
      }
      
      // Add total_esr_in_scheme column
      const hasTotalEsrInScheme = currentColumns.includes('total_esr_in_scheme');
      
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
        'total_villages', 'villages', 'scheme_status', 'total_esr', 'esr_integrated',
        'fully_completed_esr', 'balance_esr', 'villages_integrated', 'scheme_functional_status',
        'residual_chlorine_connected', 'district', 'taluka', 'agency',
        'total_villages_in_scheme', 'total_esr_in_scheme'
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