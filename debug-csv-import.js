/**
 * Debug tool for CSV import functionality
 * Run this script to identify issues with CSV imports
 */

import dotenv from 'dotenv';
import pg from 'pg';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

// Load environment variables
dotenv.config();

// PostgreSQL connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Check database connection
async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL database');
    
    // Check if scheme_status table exists and its structure
    const tableResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'scheme_status' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nScheme Status table structure:');
    tableResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('Check your DATABASE_URL environment variable');
  }
}

// Test CSV parsing with different configurations
async function testCsvParsing(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    console.log(`\nAnalyzing CSV file: ${filePath}`);
    console.log(`File size: ${fileContent.length} bytes`);
    
    // Check file encoding and BOM
    const hasUtf8Bom = fileContent.charCodeAt(0) === 0xFEFF;
    if (hasUtf8Bom) {
      console.log('⚠️ File has UTF-8 BOM marker which might cause parsing issues');
    }
    
    // Try parsing with different options
    console.log('\nParsing CSV with default options:');
    try {
      const records = parse(fileContent, {
        skip_empty_lines: true,
        trim: true
      });
      
      console.log(`✅ Successfully parsed ${records.length} rows`);
      
      if (records.length > 0) {
        console.log('\nSample row headers:');
        console.log(records[0]);
        
        if (records.length > 1) {
          console.log('\nSample data row:');
          console.log(records[1]);
        }
      }
    } catch (parseError) {
      console.error('❌ Error parsing CSV:', parseError.message);
    }
    
    // Try parsing with different delimiter
    console.log('\nParsing CSV with explicit comma delimiter:');
    try {
      const records = parse(fileContent, {
        skip_empty_lines: true,
        trim: true,
        delimiter: ','
      });
      
      console.log(`✅ Successfully parsed ${records.length} rows with comma delimiter`);
    } catch (parseError) {
      console.error('❌ Error parsing CSV with comma delimiter:', parseError.message);
    }
    
    // Try parsing with semicolon delimiter (common in some regions)
    console.log('\nParsing CSV with semicolon delimiter:');
    try {
      const records = parse(fileContent, {
        skip_empty_lines: true,
        trim: true,
        delimiter: ';'
      });
      
      console.log(`✅ Successfully parsed ${records.length} rows with semicolon delimiter`);
    } catch (parseError) {
      console.error('❌ Error parsing CSV with semicolon delimiter:', parseError.message);
    }
  } catch (error) {
    console.error('❌ Error reading or processing file:', error.message);
  }
}

// Check region values in database and mapping function
async function checkRegionAgencyMapping() {
  try {
    const client = await pool.connect();
    
    // Get distinct regions from database
    const regionResult = await client.query(`
      SELECT DISTINCT region FROM scheme_status
    `);
    
    console.log('\nDistinct regions in database:');
    regionResult.rows.forEach(row => {
      console.log(`- ${row.region}`);
    });
    
    // Check the agency values for each region
    console.log('\nAgency mapping by region:');
    const regionAgencyMap = {
      'Amravati': 'M/s Ceinsys',
      'Nashik': 'M/s Ceinsys',
      'Nagpur': 'M/s Rite Water',
      'Chhatrapati Sambhajinagar': 'M/s Rite Water',
      'Konkan': 'M/s Indo/Chetas',
      'Pune': 'M/s Indo/Chetas'
    };
    
    Object.entries(regionAgencyMap).forEach(([region, agency]) => {
      console.log(`- ${region}: ${agency}`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Error checking region mapping:', error.message);
  }
}

// Validate schema compatibility
async function checkSchemaCompatibility() {
  try {
    console.log('\nChecking schema compatibility for import:');
    
    // Common field types that might cause issues
    const fieldTypes = {
      'integer': ['number_of_village', 'total_villages_integrated', 'no_of_functional_village',
                 'no_of_partial_village', 'no_of_non_functional_village', 'fully_completed_villages',
                 'total_number_of_esr', 'total_esr_integrated', 'no_fully_completed_esr',
                 'balance_to_complete_esr', 'flow_meters_connected', 'pressure_transmitter_connected',
                 'residual_chlorine_analyzer_connected'],
      'text': ['scheme_id', 'region', 'circle', 'division', 'sub_division', 'block', 
              'scheme_name', 'agency', 'scheme_functional_status', 'fully_completion_scheme_status']
    };
    
    console.log('Expected field types:');
    Object.entries(fieldTypes).forEach(([type, fields]) => {
      console.log(`- ${type}: ${fields.join(', ')}`);
    });
    
    console.log('\nPotential import issues:');
    console.log('1. Empty values in numeric fields (should be sent as null, 0, or empty string)');
    console.log('2. Date format issues (ISO 8601 format recommended: YYYY-MM-DD)');
    console.log('3. Character encoding issues (UTF-8 without BOM recommended)');
    console.log('4. Delimiter mismatches (some systems export with ; instead of ,)');
    console.log('5. Region name mismatches (must match exactly one of the valid regions)');
    console.log('6. Column mapping errors (CSV header names don\'t match expected field names)');
    
  } catch (error) {
    console.error('❌ Error checking schema compatibility:', error.message);
  }
}

// Main function
async function main() {
  console.log('======================================');
  console.log('   CSV Import Diagnostic Tool');
  console.log('======================================\n');
  
  // Get file path from command line argument
  const args = process.argv.slice(2);
  const filePath = args[0];
  
  if (!filePath) {
    console.log('Usage: node debug-csv-import.js path/to/csv/file.csv');
    console.log('\nRunning diagnostics without CSV file analysis...');
    
    await checkDatabaseConnection();
    await checkRegionAgencyMapping();
    await checkSchemaCompatibility();
  } else {
    await checkDatabaseConnection();
    await testCsvParsing(filePath);
    await checkRegionAgencyMapping();
    await checkSchemaCompatibility();
  }
  
  // Clean up
  await pool.end();
  console.log('\nDiagnostic complete!');
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});