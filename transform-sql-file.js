// This script transforms the SQL file to match the database schema column names
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the mapping from SQL column names to database schema column names
const COLUMN_MAPPING = {
  'Sr_No': 'sr_no',
  'Region': 'region_name',
  'Circle': 'circle',
  'Division': 'division',
  'Sub_Division': 'sub_division',
  'Block': 'block',
  'Scheme_ID': 'scheme_id',
  'Scheme_Name': 'scheme_name',
  'Number_of_Village': 'total_villages',
  'Total_Villages_Integrated': 'villages_integrated',
  'No_of_Functional_Village': 'functional_villages',
  'No_of_Partial_Village': 'partial_villages',
  'No_of_Non_Functional_Village': 'non_functional_villages',
  'Fully_Completed_Villages': 'fully_completed_villages',
  'Total_Number_of_ESR': 'total_esr',
  'Scheme_Functional_Status': 'scheme_functional_status',
  'Total_ESR_Integrated': 'esr_integrated_on_iot',
  'No_Fully_Completed_ESR': 'fully_completed_esr',
  'Balance_to_Complete_ESR': 'balance_esr',
  'Flow_Meters_Connected': 'flow_meters_connected',
  'Pressure_Transmitter_Connected': 'pressure_transmitters_connected',
  'Residual_Chlorine_Analyzer_Connected': 'residual_chlorine_connected',
  'Fully_completion_Scheme_Status': 'scheme_status'
};

async function transformSqlFile() {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'attached_assets', 'insert_scheme_status.sql');
    const outputFilePath = path.join(__dirname, 'transformed_insert_scheme_status.sql');
    
    let sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Transforming SQL file...');
    
    // Extract the column names from the INSERT statement
    const columnNamesMatch = sqlContent.match(/INSERT INTO scheme_status \(([^)]+)\)/);
    
    if (!columnNamesMatch) {
      throw new Error('Could not find column names in SQL file');
    }
    
    const originalColumns = columnNamesMatch[1].split(',').map(col => col.trim());
    
    // Map the column names to the database schema
    const mappedColumns = originalColumns.map(col => {
      const mappedName = COLUMN_MAPPING[col];
      if (!mappedName) {
        console.warn(`Warning: No mapping found for column "${col}"`);
        return col; // Use original if no mapping is found
      }
      return mappedName;
    });
    
    // Replace the column names in the SQL
    const newColumnNames = mappedColumns.join(', ');
    sqlContent = sqlContent.replace(
      /INSERT INTO scheme_status \(([^)]+)\)/,
      `INSERT INTO scheme_status (${newColumnNames})`
    );
    
    // Write the transformed SQL to the output file
    fs.writeFileSync(outputFilePath, sqlContent);
    
    console.log(`Transformed SQL file written to ${outputFilePath}`);
    console.log('Original columns:', originalColumns.join(', '));
    console.log('Mapped columns:', mappedColumns.join(', '));
    
  } catch (error) {
    console.error('Error transforming SQL file:', error);
  }
}

// Execute the function
transformSqlFile();