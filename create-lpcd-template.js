import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a Water Scheme LPCD Data Excel template
function createWaterSchemeLpcdTemplate() {
  console.log('Creating Water Scheme LPCD Data Excel template...');
  
  // Define the headers
  const headers = [
    'Region',
    'Circle',
    'Division',
    'Sub Division',
    'Block',
    'Scheme ID',
    'Scheme Name',
    'Village Name', 
    'Population',
    'Number of ESR',
    'Water Value Day 1',
    'Water Value Day 2',
    'Water Value Day 3',
    'Water Value Day 4',
    'Water Value Day 5',
    'Water Value Day 6',
    'LPCD Value Day 1',
    'LPCD Value Day 2',
    'LPCD Value Day 3',
    'LPCD Value Day 4',
    'LPCD Value Day 5',
    'LPCD Value Day 6',
    'LPCD Value Day 7',
    'Water Date Day 1',
    'Water Date Day 2',
    'Water Date Day 3',
    'Water Date Day 4',
    'Water Date Day 5',
    'Water Date Day 6',
    'LPCD Date Day 1',
    'LPCD Date Day 2',
    'LPCD Date Day 3',
    'LPCD Date Day 4',
    'LPCD Date Day 5',
    'LPCD Date Day 6',
    'LPCD Date Day 7',
    'Consistent Zero LPCD For A Week',
    'Below 55 LPCD Count',
    'Above 55 LPCD Count'
  ];
  
  // Create an array to hold the worksheet data
  const wsData = [headers];
  
  // Add some sample data rows
  wsData.push([
    'Pune',                // Region
    'Pune',                // Circle
    'Pune Division',       // Division
    'Pune East',           // Sub Division
    'Wagholi',             // Block
    'PU-001',              // Scheme ID
    'Pune Rural Supply',   // Scheme Name
    'Wagholi',             // Village Name
    5000,                  // Population
    2,                     // Number of ESR
    120.5,                 // Water Value Day 1
    115.3,                 // Water Value Day 2
    110.2,                 // Water Value Day 3
    118.7,                 // Water Value Day 4
    122.1,                 // Water Value Day 5
    119.8,                 // Water Value Day 6
    65.2,                  // LPCD Value Day 1
    62.3,                  // LPCD Value Day 2
    59.5,                  // LPCD Value Day 3
    64.1,                  // LPCD Value Day 4
    66.0,                  // LPCD Value Day 5
    64.8,                  // LPCD Value Day 6
    63.9,                  // LPCD Value Day 7
    '11-Apr',              // Water Date Day 1
    '12-Apr',              // Water Date Day 2
    '13-Apr',              // Water Date Day 3
    '14-Apr',              // Water Date Day 4
    '15-Apr',              // Water Date Day 5
    '16-Apr',              // Water Date Day 6
    '10-Apr',              // LPCD Date Day 1
    '11-Apr',              // LPCD Date Day 2
    '12-Apr',              // LPCD Date Day 3
    '13-Apr',              // LPCD Date Day 4
    '14-Apr',              // LPCD Date Day 5
    '15-Apr',              // LPCD Date Day 6
    '16-Apr',              // LPCD Date Day 7
    'No',                  // Consistent Zero LPCD For A Week
    0,                     // Below 55 LPCD Count
    7                      // Above 55 LPCD Count
  ]);
  
  // Add a sample row with no water supply for a week
  wsData.push([
    'Nashik',              // Region
    'Nashik',              // Circle
    'Nashik Division',     // Division
    'Nashik East',         // Sub Division
    'Igatpuri',            // Block
    'NS-002',              // Scheme ID
    'Nashik Rural Supply', // Scheme Name
    'Igatpuri',            // Village Name
    3500,                  // Population
    1,                     // Number of ESR
    0,                     // Water Value Day 1
    0,                     // Water Value Day 2
    0,                     // Water Value Day 3
    0,                     // Water Value Day 4
    0,                     // Water Value Day 5
    0,                     // Water Value Day 6
    0,                     // LPCD Value Day 1
    0,                     // LPCD Value Day 2
    0,                     // LPCD Value Day 3
    0,                     // LPCD Value Day 4
    0,                     // LPCD Value Day 5
    0,                     // LPCD Value Day 6
    0,                     // LPCD Value Day 7
    '11-Apr',              // Water Date Day 1
    '12-Apr',              // Water Date Day 2
    '13-Apr',              // Water Date Day 3
    '14-Apr',              // Water Date Day 4
    '15-Apr',              // Water Date Day 5
    '16-Apr',              // Water Date Day 6
    '10-Apr',              // LPCD Date Day 1
    '11-Apr',              // LPCD Date Day 2
    '12-Apr',              // LPCD Date Day 3
    '13-Apr',              // LPCD Date Day 4
    '14-Apr',              // LPCD Date Day 5
    '15-Apr',              // LPCD Date Day 6
    '16-Apr',              // LPCD Date Day 7
    'Yes',                 // Consistent Zero LPCD For A Week
    7,                     // Below 55 LPCD Count
    0                      // Above 55 LPCD Count
  ]);
  
  // Create a new workbook and add the worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'LPCD_Data_Template');
  
  // Format the column widths for better readability
  ws['!cols'] = headers.map(() => ({ wch: 15 })); // Default width of 15 for all columns
  
  // Set a wider width for specific columns
  ws['!cols'][6] = { wch: 25 };  // Scheme Name
  ws['!cols'][7] = { wch: 25 };  // Village Name
  
  // Create the template directory if it doesn't exist
  const templateDir = path.join(__dirname, 'templates');
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }
  
  // Write the template file
  const templatePath = path.join(templateDir, 'lpcd_data_template.xlsx');
  XLSX.writeFile(wb, templatePath);
  
  console.log(`Template created at: ${templatePath}`);
  
  return templatePath;
}

// Run the template creator
const templatePath = createWaterSchemeLpcdTemplate();
console.log(`\nTo import LPCD data, use this template and add your data.`);
console.log(`Upload the filled template through the LPCD Data Import page.`);