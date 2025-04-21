/**
 * Comprehensive LPCD Data Import Script
 * 
 * This script properly imports all water scheme data from Excel
 * while preserving exact decimal precision for all villages.
 */

import XLSX from 'xlsx';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Excel file path
const excelFilePath = path.join(__dirname, 'attached_assets', 'new_lpcd.xlsx');

/**
 * Get clean numeric value from Excel cell with precise decimal handling
 * @param {*} value - The raw value from Excel
 * @returns {number|null} - Precise number or null if invalid
 */
function getPreciseNumericValue(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  
  // Check if it's already a number
  if (typeof value === 'number') {
    // Convert to string then back to number to ensure precise representation
    return parseFloat(value.toString());
  }
  
  // Try parsing string values
  if (typeof value === 'string') {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    if (cleanValue === '') {
      return null;
    }
    return parseFloat(cleanValue);
  }
  
  return null;
}

/**
 * Main function to import LPCD data
 */
async function fixAllLpcdData() {
  console.log('Starting comprehensive LPCD data import...');
  
  // Check if the Excel file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error(`Excel file not found: ${excelFilePath}`);
    return;
  }
  
  // Read Excel file
  console.log(`Reading Excel file: ${excelFilePath}`);
  const workbook = XLSX.readFile(excelFilePath);
  
  // Get sheet names
  const sheetNames = workbook.SheetNames;
  console.log(`Found sheets: ${sheetNames.join(', ')}`);
  
  if (sheetNames.length === 0) {
    console.error('No sheets found in Excel file');
    return;
  }
  
  // Use first sheet by default
  const sheetName = sheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with raw values to preserve numbers
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    raw: true,
    defval: null,
    dateNF: 'yyyy-mm-dd'
  });
  
  if (rawData.length === 0) {
    console.log('No data found in Excel file');
    return;
  }
  
  console.log(`Found ${rawData.length} records in Excel file`);
  
  // Connect to database
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    // Start transaction
    await client.query('BEGIN');
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    // Process each row
    for (const row of rawData) {
      try {
        // Skip header rows or empty rows
        if (!row['Scheme ID'] || !row['Village Name']) {
          continue;
        }
        
        // Extract the population and other fields with proper type conversion
        const schemeId = row['Scheme ID'].toString();
        const villageName = row['Village Name'].toString();
        
        // List of all possible column name variations for water values
        const waterColumns = [
          // Day 1
          row['water value day1'] !== undefined ? row['water value day1'] : 
          row['water value day1  '] !== undefined ? row['water value day1  '] : 
          row['Water Value Day1'] !== undefined ? row['Water Value Day1'] :
          row['Water Value Day 1'],
          
          // Day 2
          row['water value day2'] !== undefined ? row['water value day2'] : 
          row['water value day2  '] !== undefined ? row['water value day2  '] : 
          row['Water Value Day2'] !== undefined ? row['Water Value Day2'] :
          row['Water Value Day 2'],
          
          // Day 3
          row['water value day3'] !== undefined ? row['water value day3'] : 
          row['water value day3  '] !== undefined ? row['water value day3  '] : 
          row['Water Value Day3'] !== undefined ? row['Water Value Day3'] :
          row['Water Value Day 3'],
          
          // Day 4
          row['water value day4'] !== undefined ? row['water value day4'] : 
          row['water value day4  '] !== undefined ? row['water value day4  '] : 
          row['Water Value Day4'] !== undefined ? row['Water Value Day4'] :
          row['Water Value Day 4'],
          
          // Day 5
          row['water value day5'] !== undefined ? row['water value day5'] : 
          row['water value day5  '] !== undefined ? row['water value day5  '] : 
          row['Water Value Day5'] !== undefined ? row['Water Value Day5'] :
          row['Water Value Day 5'],
          
          // Day 6
          row['water value day6'] !== undefined ? row['water value day6'] : 
          row['water value day6  '] !== undefined ? row['water value day6  '] : 
          row['Water Value Day6'] !== undefined ? row['Water Value Day6'] :
          row['Water Value Day 6']
        ];
        
        // List of all possible column name variations for LPCD values
        const lpcdColumns = [
          // Day 1
          row['lpcd value day1'] !== undefined ? row['lpcd value day1'] : 
          row['lpcd value day1  '] !== undefined ? row['lpcd value day1  '] : 
          row['LPCD Value Day1'] !== undefined ? row['LPCD Value Day1'] :
          row['LPCD Value Day 1'],
          
          // Day 2
          row['lpcd value day2'] !== undefined ? row['lpcd value day2'] : 
          row['lpcd value day2  '] !== undefined ? row['lpcd value day2  '] : 
          row['LPCD Value Day2'] !== undefined ? row['LPCD Value Day2'] :
          row['LPCD Value Day 2'],
          
          // Day 3
          row['lpcd value day3'] !== undefined ? row['lpcd value day3'] : 
          row['lpcd value day3  '] !== undefined ? row['lpcd value day3  '] : 
          row['LPCD Value Day3'] !== undefined ? row['LPCD Value Day3'] :
          row['LPCD Value Day 3'],
          
          // Day 4
          row['lpcd value day4'] !== undefined ? row['lpcd value day4'] : 
          row['lpcd value day4  '] !== undefined ? row['lpcd value day4  '] : 
          row['LPCD Value Day4'] !== undefined ? row['LPCD Value Day4'] :
          row['LPCD Value Day 4'],
          
          // Day 5
          row['lpcd value day5'] !== undefined ? row['lpcd value day5'] : 
          row['lpcd value day5  '] !== undefined ? row['lpcd value day5  '] : 
          row['LPCD Value Day5'] !== undefined ? row['LPCD Value Day5'] :
          row['LPCD Value Day 5'],
          
          // Day 6
          row['lpcd value day6'] !== undefined ? row['lpcd value day6'] : 
          row['lpcd value day6  '] !== undefined ? row['lpcd value day6  '] : 
          row['LPCD Value Day6'] !== undefined ? row['LPCD Value Day6'] :
          row['LPCD Value Day 6'],
          
          // Day 7
          row['lpcd value day7'] !== undefined ? row['lpcd value day7'] : 
          row['lpcd value day7  '] !== undefined ? row['lpcd value day7  '] : 
          row['LPCD Value Day7'] !== undefined ? row['LPCD Value Day7'] :
          row['LPCD Value Day 7']
        ];
        
        // Create update data object with all the values we need to set
        const updateData = {
          region: row['Region'] || '',
          circle: row['Circle'] || '',
          division: row['Division'] || '',
          sub_division: row['Sub Division'] || '',
          block: row['Block'] || '',
          scheme_name: row['Scheme Name'] || '',
          population: row['Population'] ? parseInt(row['Population']) : null,
          number_of_esr: getPreciseNumericValue(row['Number of ESR']),
          
          // Water values
          water_value_day1: getPreciseNumericValue(waterColumns[0]),
          water_value_day2: getPreciseNumericValue(waterColumns[1]),
          water_value_day3: getPreciseNumericValue(waterColumns[2]),
          water_value_day4: getPreciseNumericValue(waterColumns[3]),
          water_value_day5: getPreciseNumericValue(waterColumns[4]),
          water_value_day6: getPreciseNumericValue(waterColumns[5]),
          
          // LPCD values
          lpcd_value_day1: getPreciseNumericValue(lpcdColumns[0]),
          lpcd_value_day2: getPreciseNumericValue(lpcdColumns[1]),
          lpcd_value_day3: getPreciseNumericValue(lpcdColumns[2]),
          lpcd_value_day4: getPreciseNumericValue(lpcdColumns[3]),
          lpcd_value_day5: getPreciseNumericValue(lpcdColumns[4]),
          lpcd_value_day6: getPreciseNumericValue(lpcdColumns[5]),
          lpcd_value_day7: getPreciseNumericValue(lpcdColumns[6]),
          
          // Water dates
          water_date_day1: row['water date day1  '] || row['Water Date Day 1'] || '',
          water_date_day2: row['water date day2  '] || row['Water Date Day 2'] || '',
          water_date_day3: row['water date day3  '] || row['Water Date Day 3'] || '',
          water_date_day4: row['water date day4  '] || row['Water Date Day 4'] || '',
          water_date_day5: row['water date day5  '] || row['Water Date Day 5'] || '',
          water_date_day6: row['water date day6  '] || row['Water Date Day 6'] || '',
          
          // LPCD dates
          lpcd_date_day1: row['lpcd date day1  '] || row['LPCD Date Day 1'] || '',
          lpcd_date_day2: row['lpcd date day2  '] || row['LPCD Date Day 2'] || '',
          lpcd_date_day3: row['lpcd date day3  '] || row['LPCD Date Day 3'] || '',
          lpcd_date_day4: row['lpcd date day4  '] || row['LPCD Date Day 4'] || '',
          lpcd_date_day5: row['lpcd date day5  '] || row['LPCD Date Day 5'] || '',
          lpcd_date_day6: row['lpcd date day6  '] || row['LPCD Date Day 6'] || '',
          lpcd_date_day7: row['lpcd date day7  '] || row['LPCD Date Day 7'] || '',
          
          // Derived values
          consistent_zero_lpcd_for_a_week: row['Consistent Zero LPCD for a week'] === true || 
                                         row['Consistent Zero LPCD for a week'] === 1 ? 1 : 0,
          below_55_lpcd_count: row['Consistent <55 LPCD for a week'] ? parseInt(row['Consistent <55 LPCD for a week']) : 0,
          above_55_lpcd_count: row['Consistent >55 LPCD for a week'] ? parseInt(row['Consistent >55 LPCD for a week']) : 0
        };
        
        // Check if record exists
        const checkQuery = {
          text: 'SELECT id FROM water_scheme_data WHERE scheme_id = $1 AND village_name = $2',
          values: [schemeId, villageName]
        };
        
        const checkResult = await client.query(checkQuery);
        
        if (checkResult.rows.length > 0) {
          // Update existing record
          const updateColumns = [];
          const updateValues = [];
          let paramCounter = 1;
          
          for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined) {
              updateColumns.push(`${key} = $${paramCounter}`);
              updateValues.push(value);
              paramCounter++;
            }
          }
          
          updateValues.push(schemeId);
          updateValues.push(villageName);
          
          const updateQuery = {
            text: `UPDATE water_scheme_data SET ${updateColumns.join(', ')} WHERE scheme_id = $${paramCounter} AND village_name = $${paramCounter + 1}`,
            values: updateValues
          };
          
          await client.query(updateQuery);
          updatedCount++;
          
          console.log(`Updated record for scheme_id=${schemeId}, village=${villageName}`);
          console.log(`  Water day6: ${updateData.water_value_day6}, LPCD day7: ${updateData.lpcd_value_day7}`);
        } else {
          // Insert new record
          const insertData = {
            ...updateData,
            scheme_id: schemeId,
            village_name: villageName
          };
          
          const columns = Object.keys(insertData);
          const values = Object.values(insertData);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          
          const insertQuery = {
            text: `INSERT INTO water_scheme_data (${columns.join(', ')}) VALUES (${placeholders})`,
            values: values
          };
          
          await client.query(insertQuery);
          insertedCount++;
          
          console.log(`Inserted record for scheme_id=${schemeId}, village=${villageName}`);
          console.log(`  Water day6: ${updateData.water_value_day6}, LPCD day7: ${updateData.lpcd_value_day7}`);
        }
      } catch (error) {
        console.error(`Error processing row: ${error.message}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`LPCD data import complete: ${insertedCount} records inserted, ${updatedCount} records updated`);
    console.log('Precise decimal values have been preserved for water consumption and LPCD values');
    
    // Verify some sample data
    const sampleResult = await client.query('SELECT scheme_id, village_name, water_value_day6, lpcd_value_day7 FROM water_scheme_data WHERE water_value_day6 IS NOT NULL LIMIT 5');
    console.log('Sample data after import:');
    sampleResult.rows.forEach(row => {
      console.log(`  ${row.scheme_id} - ${row.village_name}: water_value_day6=${row.water_value_day6}, lpcd_value_day7=${row.lpcd_value_day7}`);
    });
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error(`Error importing LPCD data: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the script
fixAllLpcdData().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
});