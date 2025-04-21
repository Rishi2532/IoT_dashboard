import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This script will help us diagnose issues with Excel column headers
function inspectExcelFile(filePath) {
  console.log(`Inspecting file: ${filePath}`);

  try {
    // Read the Excel file
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Print all sheet names
    console.log('Sheets in workbook:', workbook.SheetNames);

    // Process the first sheet (assuming it's the one we want)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`\nExamining Sheet: ${sheetName}`);
    
    // Convert to JSON for easier processing
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      console.log('No data found in sheet');
      return;
    }
    
    // Print all headers (column names)
    console.log('\nColumns found in Excel:');
    const headers = Object.keys(data[0]);
    headers.forEach(header => {
      console.log(`  - "${header}"`);
    });
    
    // Check for specific water values and LPCD columns
    console.log('\nChecking for specific water and LPCD columns:');
    const waterColumns = headers.filter(h => h.includes('Water Value') || h.includes('water value'));
    const lpcdColumns = headers.filter(h => h.includes('LPCD Value') || h.includes('lpcd value'));
    
    console.log('Water Value columns:', waterColumns);
    console.log('LPCD Value columns:', lpcdColumns);
    
    // Show sample data for the first row
    console.log('\nSample Data (First Row):');
    const firstRow = data[0];
    
    // Print all cell values for the first row
    for (const key in firstRow) {
      console.log(`  ${key}: ${firstRow[key]}`);
    }
    
    // Print some specific columns important for debugging
    console.log('\nValues for first 3 rows:');
    data.slice(0, 3).forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`);
      console.log(`  Scheme ID: ${row['Scheme ID'] || row['scheme_id'] || 'N/A'}`);
      console.log(`  Village: ${row['Village Name'] || row['village_name'] || 'N/A'}`);
      
      // Print water values if available
      waterColumns.forEach(col => {
        console.log(`  ${col}: ${row[col] !== undefined ? row[col] : 'N/A'}`);
      });
      
      // Print LPCD values if available
      lpcdColumns.forEach(col => {
        console.log(`  ${col}: ${row[col] !== undefined ? row[col] : 'N/A'}`);
      });
    });
    
    // If water or LPCD values are missing, provide guidance
    if (waterColumns.length === 0 || lpcdColumns.length === 0) {
      console.log('\nISSUE DETECTED: Missing expected columns');
      console.log('The Excel file must have columns with exact names:');
      console.log('  - Water Value Day 1, Water Value Day 2, etc.');
      console.log('  - LPCD Value Day 1, LPCD Value Day 2, etc.');
    }
    
  } catch (error) {
    console.error('Error inspecting Excel file:', error);
  }
}

// Check all Excel files in the attached_assets directory
const assetDir = 'attached_assets';
const excelFiles = fs.readdirSync(assetDir)
  .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));

if (excelFiles.length === 0) {
  console.log('No Excel files found in attached_assets directory');
} else {
  // Let's check the scheme_level_datalink_report.xlsx file specifically
  const targetFile = 'scheme_level_datalink_report.xlsx';
  
  if (excelFiles.includes(targetFile)) {
    console.log(`Inspecting target file: ${targetFile}`);
    inspectExcelFile(path.join(assetDir, targetFile));
  } else {
    // Fall back to the first file
    inspectExcelFile(path.join(assetDir, excelFiles[0]));
  }
  
  // List all available Excel files
  console.log('\nAll Excel files available:');
  excelFiles.forEach(file => console.log(`  - ${file}`));
}