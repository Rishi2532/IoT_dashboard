/**
 * Comprehensive fix script for column name mismatches in scheme_status table
 * This fixes all column mapping issues between the code and your database
 * Updated with ALL the mappings provided by the user
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
  console.log('   Comprehensive Fix for Column Name Mismatches');
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

      // MAPPING FROM USER'S SPECIFICATIONS
      // UI Name ➝ Excel Name ➝ Database Column
      
      // 1. Fix total_villages_in_scheme - primary issue
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

      // 2. Fix total_esr_in_scheme
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
      
      // 3. Fix total_villages column (UI: Total Villages ➝ Excel: Number of Village ➝ DB: number_of_village)
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
      } else {
        console.log('✅ total_villages column already exists');
      }
      
      // 4. Fix functional_villages (UI: Functional villages ➝ Excel: No. of Functional Village ➝ DB: no_of_functional_village)
      const hasFunctionalVillages = currentColumns.includes('functional_villages');
      const hasNoOfFunctionalVillage = currentColumns.includes('no_of_functional_village');
      
      if (!hasFunctionalVillages && hasNoOfFunctionalVillage) {
        console.log('🔧 Adding functional_villages column that maps to no_of_functional_village...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN functional_villages INTEGER GENERATED ALWAYS AS (no_of_functional_village) STORED;
        `);
        
        console.log('✅ Added functional_villages as a generated column');
      } else if (!hasFunctionalVillages) {
        console.log('🔧 Adding functional_villages column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN functional_villages INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added functional_villages column with default 0');
      } else {
        console.log('✅ functional_villages column already exists');
      }
      
      // 5. Fix partial_villages (UI: Partial villages ➝ Excel: No. of Partial Village ➝ DB: no_of_partial_village)
      const hasPartialVillages = currentColumns.includes('partial_villages');
      const hasNoOfPartialVillage = currentColumns.includes('no_of_partial_village');
      
      if (!hasPartialVillages && hasNoOfPartialVillage) {
        console.log('🔧 Adding partial_villages column that maps to no_of_partial_village...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN partial_villages INTEGER GENERATED ALWAYS AS (no_of_partial_village) STORED;
        `);
        
        console.log('✅ Added partial_villages as a generated column');
      } else if (!hasPartialVillages) {
        console.log('🔧 Adding partial_villages column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN partial_villages INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added partial_villages column with default 0');
      } else {
        console.log('✅ partial_villages column already exists');
      }
      
      // 6. Fix non_functional_villages (UI: Non-functional villages ➝ Excel: No. of Non-Functional Village ➝ DB: no_of_non_functional_village)
      const hasNonFunctionalVillages = currentColumns.includes('non_functional_villages');
      const hasNoOfNonFunctionalVillage = currentColumns.includes('no_of_non_functional_village');
      
      if (!hasNonFunctionalVillages && hasNoOfNonFunctionalVillage) {
        console.log('🔧 Adding non_functional_villages column that maps to no_of_non_functional_village...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN non_functional_villages INTEGER GENERATED ALWAYS AS (no_of_non_functional_village) STORED;
        `);
        
        console.log('✅ Added non_functional_villages as a generated column');
      } else if (!hasNonFunctionalVillages) {
        console.log('🔧 Adding non_functional_villages column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN non_functional_villages INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added non_functional_villages column with default 0');
      } else {
        console.log('✅ non_functional_villages column already exists');
      }
      
      // 7. Fix villages_integrated column (UI: Villages integrated ➝ Excel: Total Villages Integrated ➝ DB: total_villages_integrated)
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
      } else {
        console.log('✅ villages_integrated column already exists');
      }
      
      // 8. Fix villages_integrated_on_iot column
      const hasVillagesIntegratedOnIot = currentColumns.includes('villages_integrated_on_iot');
      
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
      } else {
        console.log('✅ villages_integrated_on_iot column already exists');
      }
      
      // 9. Fix esr_integrated column (UI: ESR integrated ➝ Excel: Total ESR Integrated ➝ DB: total_esr_integrated)
      const hasEsrIntegrated = currentColumns.includes('esr_integrated');
      const hasTotalEsrIntegrated = currentColumns.includes('total_esr_integrated');
      
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
      } else {
        console.log('✅ esr_integrated column already exists');
      }
      
      // 10. Fix esr_integrated_on_iot column
      const hasEsrIntegratedOnIot = currentColumns.includes('esr_integrated_on_iot');
      
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
      } else {
        console.log('✅ esr_integrated_on_iot column already exists');
      }
      
      // 11. Fix fully_completed_esr column (UI: Fully completed ESR ➝ Excel: No. Fully Completed ESR ➝ DB: no_fully_completed_esr)
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
      } else {
        console.log('✅ fully_completed_esr column already exists');
      }
      
      // 12. Fix total_esr column (UI: Total ESR ➝ Excel: Total Number of ESR ➝ DB: total_number_of_esr)
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
      } else {
        console.log('✅ total_esr column already exists');
      }
      
      // 13. Fix scheme_status column (UI: Integration Status ➝ Excel: Fully completion Scheme Status ➝ DB: fully_completion_scheme_status)
      const hasSchemeStatus = currentColumns.includes('scheme_status');
      const hasFullyCompletionSchemeStatus = currentColumns.includes('fully_completion_scheme_status');
      
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
      } else {
        console.log('✅ scheme_status column already exists');
      }
      
      // 14. Fix integration_status column
      const hasIntegrationStatus = currentColumns.includes('integration_status');
      
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
      } else {
        console.log('✅ integration_status column already exists');
      }
      
      // 15. Fix functional_status column (UI: Functional Status ➝ Excel: Scheme Functional Status ➝ DB: scheme_functional_status)
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
      } else {
        console.log('✅ functional_status column already exists');
      }
      
      // 16. Fix flow_meters column (UI: Flow Meters ➝ Excel: Flow Meters Connected ➝ DB: flow_meters_connected)
      const hasFlowMeters = currentColumns.includes('flow_meters');
      const hasFlowMetersConnected = currentColumns.includes('flow_meters_connected');
      
      if (!hasFlowMeters && hasFlowMetersConnected) {
        console.log('🔧 Adding flow_meters column that maps to flow_meters_connected...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN flow_meters INTEGER GENERATED ALWAYS AS (flow_meters_connected) STORED;
        `);
        
        console.log('✅ Added flow_meters as a generated column');
      } else if (!hasFlowMeters) {
        console.log('🔧 Adding flow_meters column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN flow_meters INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added flow_meters column with default 0');
      } else {
        console.log('✅ flow_meters column already exists');
      }
      
      // 17. Fix pressure_transmitters column (UI: Pressure Transmitters ➝ Excel: Pressure Transmitter Connected ➝ DB: pressure_transmitter_connected)
      const hasPressureTransmitters = currentColumns.includes('pressure_transmitters');
      const hasPressureTransmitterConnected = currentColumns.includes('pressure_transmitter_connected');
      
      if (!hasPressureTransmitters && hasPressureTransmitterConnected) {
        console.log('🔧 Adding pressure_transmitters column that maps to pressure_transmitter_connected...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN pressure_transmitters INTEGER GENERATED ALWAYS AS (pressure_transmitter_connected) STORED;
        `);
        
        console.log('✅ Added pressure_transmitters as a generated column');
      } else if (!hasPressureTransmitters) {
        console.log('🔧 Adding pressure_transmitters column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN pressure_transmitters INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added pressure_transmitters column with default 0');
      } else {
        console.log('✅ pressure_transmitters column already exists');
      }
      
      // 18. Fix residual_chlorine_analyzers (UI: Residual Chlorine Analyzers ➝ Excel: Residual Chlorine Analyzer Connected ➝ DB: residual_chlorine_analyzer_connected)
      const hasResidualChlorineAnalyzers = currentColumns.includes('residual_chlorine_analyzers');
      const hasResidualChlorineAnalyzerConnected = currentColumns.includes('residual_chlorine_analyzer_connected');
      
      if (!hasResidualChlorineAnalyzers && hasResidualChlorineAnalyzerConnected) {
        console.log('🔧 Adding residual_chlorine_analyzers column that maps to residual_chlorine_analyzer_connected...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN residual_chlorine_analyzers INTEGER GENERATED ALWAYS AS (residual_chlorine_analyzer_connected) STORED;
        `);
        
        console.log('✅ Added residual_chlorine_analyzers as a generated column');
      } else if (!hasResidualChlorineAnalyzers) {
        console.log('🔧 Adding residual_chlorine_analyzers column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN residual_chlorine_analyzers INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added residual_chlorine_analyzers column with default 0');
      } else {
        console.log('✅ residual_chlorine_analyzers column already exists');
      }
      
      // 19. Add residual_chlorine_connected - alternative name
      const hasResidualChlorineConnected = currentColumns.includes('residual_chlorine_connected');
      
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
      } else {
        console.log('✅ residual_chlorine_connected column already exists');
      }
      
      // 20. Fix pressure_transmitters_connected as an alternative name
      const hasPressureTransmittersConnected = currentColumns.includes('pressure_transmitters_connected');
      
      if (!hasPressureTransmittersConnected && hasPressureTransmitterConnected) {
        console.log('🔧 Adding pressure_transmitters_connected column that maps to pressure_transmitter_connected...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN pressure_transmitters_connected INTEGER GENERATED ALWAYS AS (pressure_transmitter_connected) STORED;
        `);
        
        console.log('✅ Added pressure_transmitters_connected as a generated column');
      } else if (!hasPressureTransmittersConnected) {
        console.log('🔧 Adding pressure_transmitters_connected column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN pressure_transmitters_connected INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added pressure_transmitters_connected column with default 0');
      } else {
        console.log('✅ pressure_transmitters_connected column already exists');
      }
      
      // 21. Fix flow_meters_connected - alternative name
      const hasFlowMetersConnected = currentColumns.includes('flow_meters_connected');
      
      if (!hasFlowMetersConnected && hasFlowMeters) {
        console.log('🔧 Adding flow_meters_connected column that maps to flow_meters...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN flow_meters_connected INTEGER GENERATED ALWAYS AS (flow_meters) STORED;
        `);
        
        console.log('✅ Added flow_meters_connected as a generated column');
      } else if (!hasFlowMetersConnected) {
        console.log('🔧 Adding flow_meters_connected column with default 0...');
        
        await client.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN flow_meters_connected INTEGER DEFAULT 0;
        `);
        
        console.log('✅ Added flow_meters_connected column with default 0');
      } else {
        console.log('✅ flow_meters_connected column already exists');
      }
      
      // 22. Check for agency column
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
      } else {
        console.log('✅ agency column already exists');
      }
      
      // Verify all mappings
      console.log('\n🔍 Verifying all column mappings...');
      
      // Get updated column structure
      const updatedColumnResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'scheme_status'
        ORDER BY ordinal_position;
      `);
      
      const updatedColumns = updatedColumnResult.rows.map(row => row.column_name);
      
      // All required columns from mappings and searches
      const requiredColumns = [
        'scheme_id',
        'total_villages', 
        'total_villages_in_scheme',
        'total_esr',
        'total_esr_in_scheme',
        'functional_villages',
        'partial_villages',
        'non_functional_villages',
        'villages_integrated',
        'villages_integrated_on_iot',
        'esr_integrated',
        'esr_integrated_on_iot',
        'fully_completed_esr',
        'scheme_status',
        'integration_status',
        'functional_status',
        'flow_meters',
        'flow_meters_connected',
        'pressure_transmitters',
        'pressure_transmitters_connected',
        'residual_chlorine_analyzers',
        'residual_chlorine_connected',
        'agency'
      ];
      
      const missingColumns = requiredColumns.filter(col => !updatedColumns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log('✅ All required columns are now present in the scheme_status table');
      } else {
        console.log(`⚠️ Still missing columns: ${missingColumns.join(', ')}`);
        console.log('You may need to run this script again or check your database structure');
      }
      
      console.log('\n✅ Fix completed successfully!');
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