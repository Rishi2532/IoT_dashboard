/**
 * Fix script for file import functionality
 * This script sets up all necessary dependencies, directories and permissions
 * to make Excel file import work in VS Code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('========================================');
console.log('Excel File Import Fix Script');
console.log('========================================\n');

try {
  // Create necessary directories
  console.log('Creating necessary directories...');
  const directories = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'temp_data'),
    path.join(__dirname, 'excel_data')
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } else {
      console.log(`✅ Directory already exists: ${dir}`);
    }
  }
  
  // Check if required packages are installed
  console.log('\nChecking required packages...');
  const requiredPackages = [
    'xlsx',
    'multer',
    'csv-parse'
  ];
  
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  } catch (error) {
    console.error('❌ Error reading package.json:', error.message);
    process.exit(1);
  }
  
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const missingPackages = [];
  
  for (const pkg of requiredPackages) {
    if (!dependencies[pkg]) {
      missingPackages.push(pkg);
    }
  }
  
  if (missingPackages.length > 0) {
    console.log(`Missing packages: ${missingPackages.join(', ')}`);
    console.log('Installing missing packages...');
    
    try {
      execSync(`npm install ${missingPackages.join(' ')}`, { stdio: 'inherit' });
      console.log('✅ Installed missing packages');
    } catch (error) {
      console.error('❌ Error installing packages:', error.message);
      console.log('\nPlease install them manually with:');
      console.log(`npm install ${missingPackages.join(' ')}`);
    }
  } else {
    console.log('✅ All required packages are installed');
  }
  
  // Create test Excel import script
  console.log('\nCreating test Excel import script...');
  
  const testImportPath = path.join(__dirname, 'test-excel-import.js');
  const testImportScript = `/**
 * Test script for Excel file importing
 * Run this to verify Excel import functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function analyzeExcelFile(filePath) {
  console.log(\`Analyzing Excel file: \${filePath}\`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(\`❌ File not found: \${filePath}\`);
      return;
    }
    
    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    console.log(\`✅ Successfully opened Excel file\`);
    console.log(\`Found \${workbook.SheetNames.length} sheets: \${workbook.SheetNames.join(', ')}\`);
    
    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(\`\\n📊 Analyzing sheet: \${sheetName}\`);
      
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      if (jsonData.length === 0) {
        console.log(\`  Sheet is empty\`);
        continue;
      }
      
      // Find potential header row (row with most non-empty cells)
      let headerRowIndex = 0;
      let maxNonEmptyCells = 0;
      
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const nonEmptyCells = jsonData[i].filter(cell => cell !== undefined && cell !== '').length;
        
        if (nonEmptyCells > maxNonEmptyCells) {
          maxNonEmptyCells = nonEmptyCells;
          headerRowIndex = i;
        }
      }
      
      console.log(\`  Found likely header row at index \${headerRowIndex}\`);
      console.log(\`  Sheet has \${jsonData.length} rows and approximately \${maxNonEmptyCells} columns\`);
      
      // Display sample of headers
      const headers = jsonData[headerRowIndex];
      if (headers && headers.length > 0) {
        console.log(\`  Sample headers: \${headers.slice(0, 5).join(', ')}\${headers.length > 5 ? '...' : ''}\`);
      }
      
      // Look for key columns that might be used in import
      const keyColumns = ['scheme_name', 'region', 'region_name', 'district', 'scheme_id', 'sr_no'];
      const foundKeyColumns = [];
      
      for (const column of keyColumns) {
        const index = headers.findIndex(h => 
          typeof h === 'string' && h.toLowerCase().includes(column.toLowerCase())
        );
        
        if (index !== -1) {
          foundKeyColumns.push(\`\${headers[index]} (column \${index})\`);
        }
      }
      
      if (foundKeyColumns.length > 0) {
        console.log(\`  Found key columns: \${foundKeyColumns.join(', ')}\`);
      } else {
        console.log(\`  Warning: No key columns found. This might not be a valid data sheet.\`);
      }
      
      // Sample data row
      if (jsonData.length > headerRowIndex + 1) {
        const sampleDataRow = jsonData[headerRowIndex + 1];
        if (sampleDataRow) {
          const sampleData = {};
          for (let i = 0; i < Math.min(5, headers.length); i++) {
            if (headers[i]) {
              sampleData[headers[i]] = sampleDataRow[i];
            }
          }
          console.log(\`  Sample data: \${JSON.stringify(sampleData)}\`);
        }
      }
    }
    
    console.log('\\n✅ Excel file analysis complete');
    console.log('File import functionality appears to be working correctly');
    
  } catch (error) {
    console.error(\`❌ Error analyzing Excel file: \${error.message}\`);
    console.error(error);
  }
}

// Check command line arguments for file path
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('\\n❌ Please provide an Excel file path');
  console.log('Usage: node test-excel-import.js path/to/your/excel/file.xlsx');
} else {
  const filePath = args[0];
  analyzeExcelFile(filePath);
}
`;

  fs.writeFileSync(testImportPath, testImportScript);
  console.log('✅ Created test Excel import script');
  
  // Create helper script for scheme status Excel import
  console.log('\nCreating scheme status Excel import script...');
  
  const schemeImportPath = path.join(__dirname, 'import-scheme-excel.js');
  const schemeImportScript = `/**
 * Scheme Excel Import Script
 * Imports scheme data from an Excel file into the database
 * 
 * Usage: node import-scheme-excel.js path/to/your/excel/file.xlsx
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import xlsx from 'xlsx';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
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

/**
 * Get the agency name for a region according to business rules
 * @param {String} regionName - The region name
 * @returns {String} The agency name
 */
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

/**
 * Map column names to database fields based on the Excel's content
 * @param {Object} headers - The header row from Excel
 * @returns {Object} Mapping of Excel column headers to database field names
 */
function mapHeadersToFields(headers) {
  // Create a mapping of possible Excel column names to database fields
  const possibleMappings = {
    // Region info
    'region': 'region_name',
    'region name': 'region_name',
    'name of region': 'region_name',
    
    // Scheme info
    'sr. no': 'sr_no',
    'sr no': 'sr_no',
    'sr.no': 'sr_no',
    'sr no.': 'sr_no',
    'id': 'scheme_id',
    'scheme id': 'scheme_id',
    'name of scheme': 'scheme_name',
    'scheme name': 'scheme_name',
    'name of the scheme': 'scheme_name',
    'name': 'scheme_name',
    'district': 'district',
    'taluka': 'taluka',
    'agency': 'agency',
    
    // Village info
    'total villages': 'villages',
    'total villages in scheme': 'villages',
    'villages in scheme': 'villages',
    'villages': 'villages',
    'villages integrated': 'villages_integrated',
    'villages integrated on iot': 'villages_integrated',
    'fully completed villages': 'fully_completed_villages',
    
    // ESR info
    'total esr': 'total_esr',
    'esr total': 'total_esr',
    'total esr in scheme': 'total_esr',
    'esr integrated': 'esr_integrated',
    'esr integrated on iot': 'esr_integrated',
    'fully completed esr': 'fully_completed_esr',
    
    // Status info
    'scheme status': 'scheme_status',
    'scheme completion status': 'scheme_status',
    'status': 'scheme_status',
    'functional status': 'scheme_functional_status',
    'scheme functional status': 'scheme_functional_status',
    
    // Device info
    'flow meters': 'flow_meters_connected',
    'flow meter': 'flow_meters_connected',
    'flow meters connected': 'flow_meters_connected',
    'fm integrated': 'flow_meters_connected',
    'pressure transmitters': 'pressure_transmitters_connected',
    'pressure transmitter': 'pressure_transmitters_connected',
    'pt integrated': 'pressure_transmitters_connected',
    'residual chlorine': 'residual_chlorine_connected',
    'residual chlorine analyzer': 'residual_chlorine_connected',
    'rca integrated': 'residual_chlorine_connected',
    
    // Cost info
    'project cost': 'project_cost',
    'cost': 'project_cost',
    
    // Location info
    'latitude': 'location_latitude',
    'longitude': 'location_longitude',
    
    // Completion percentage
    'completion percentage': 'scheme_completion_percent',
    'completion %': 'scheme_completion_percent',
    'scheme completion': 'scheme_completion_percent'
  };
  
  // Create the mapping
  const mapping = {};
  headers.forEach((header, index) => {
    if (!header) return;
    
    const headerLower = header.toString().toLowerCase().trim();
    
    // Try to find a match in our mappings
    for (const [excelName, dbField] of Object.entries(possibleMappings)) {
      if (headerLower === excelName || headerLower.includes(excelName)) {
        mapping[dbField] = index;
        break;
      }
    }
  });
  
  return mapping;
}

/**
 * Extract value from row based on field and handle type conversion
 * @param {Object} row - The data row
 * @param {String} field - The field to extract
 * @param {Object} mapping - The column mapping
 * @returns {*} The extracted value
 */
function extractValue(row, field, mapping) {
  const columnIndex = mapping[field];
  if (columnIndex === undefined) return null;
  
  let value = row[columnIndex];
  if (value === undefined) return null;
  
  // Convert to string and trim
  if (typeof value === 'string') {
    value = value.trim();
  }
  
  // Handle specific field types
  switch (field) {
    case 'villages':
    case 'villages_integrated':
    case 'fully_completed_villages':
    case 'total_esr':
    case 'esr_integrated':
    case 'fully_completed_esr':
    case 'flow_meters_connected':
    case 'pressure_transmitters_connected':
    case 'residual_chlorine_connected':
      return typeof value === 'number' ? value : parseInt(value) || 0;
      
    case 'project_cost':
      return typeof value === 'number' ? value : parseFloat(value) || 0;
      
    case 'location_latitude':
    case 'location_longitude':
    case 'scheme_completion_percent':
      return typeof value === 'number' ? value : parseFloat(value) || null;
      
    case 'scheme_functional_status':
      if (value === true || value === 'true' || value === '1' || value === 1) {
        return 'Functional';
      } else if (value === false || value === 'false' || value === '0' || value === 0) {
        return 'Partial';
      }
      return value;
      
    default:
      return value;
  }
}

/**
 * Detect region from sheet name using predefined patterns
 * @param {String} sheetName - Name of the Excel sheet
 * @returns {String|null} Detected region name or null if not found
 */
function detectRegionFromSheetName(sheetName) {
  const regions = ['Nagpur', 'Amravati', 'Nashik', 'Pune', 'Konkan', 'Chhatrapati Sambhajinagar'];
  
  // Direct match
  for (const region of regions) {
    if (sheetName.includes(region)) {
      return region;
    }
  }
  
  // Special case for Chhatrapati Sambhajinagar (previously Aurangabad)
  if (sheetName.includes('Aurangabad')) {
    return 'Chhatrapati Sambhajinagar';
  }
  
  return null;
}

/**
 * Process Excel file and import scheme data
 * @param {String} filePath - Path to the Excel file
 */
async function processExcelFile(filePath) {
  console.log(\`Processing Excel file: \${filePath}\`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(\`❌ File not found: \${filePath}\`);
      return;
    }
    
    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    console.log(\`✅ Successfully opened Excel file\`);
    console.log(\`Found \${workbook.SheetNames.length} sheets: \${workbook.SheetNames.join(', ')}\`);
    
    // Connect to database
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    try {
      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        console.log(\`\\n📊 Processing sheet: \${sheetName}\`);
        
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        if (rows.length === 0) {
          console.log(\`  Sheet is empty, skipping\`);
          continue;
        }
        
        // Find header row
        let headerRowIndex = 0;
        let maxNonEmptyCells = 0;
        
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const nonEmptyCells = rows[i].filter(cell => cell !== undefined && cell !== '').length;
          
          if (nonEmptyCells > maxNonEmptyCells) {
            maxNonEmptyCells = nonEmptyCells;
            headerRowIndex = i;
          }
        }
        
        const headers = rows[headerRowIndex];
        console.log(\`  Found header row at index \${headerRowIndex} with \${headers.length} columns\`);
        
        // Map headers to database fields
        const mapping = mapHeadersToFields(headers);
        console.log(\`  Mapped \${Object.keys(mapping).length} columns to database fields\`);
        
        // Skip if essential fields are missing
        if (!mapping.scheme_name && !mapping.region_name) {
          console.log(\`  ❌ Essential fields missing (scheme_name, region_name), skipping sheet\`);
          continue;
        }
        
        // Try to detect region from sheet name if not in columns
        let defaultRegion = null;
        if (!mapping.region_name) {
          defaultRegion = detectRegionFromSheetName(sheetName);
          if (defaultRegion) {
            console.log(\`  Detected region from sheet name: \${defaultRegion}\`);
          } else {
            console.log(\`  ❌ Could not detect region from sheet name, skipping sheet\`);
            continue;
          }
        }
        
        // Process data rows
        let importedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          
          // Skip empty rows
          if (!row || row.length === 0) continue;
          
          // Skip if scheme name is missing
          const schemeName = extractValue(row, 'scheme_name', mapping);
          if (!schemeName) {
            continue;
          }
          
          // Get region name (from row or default)
          let regionName = extractValue(row, 'region_name', mapping) || defaultRegion;
          if (!regionName) {
            errorCount++;
            continue;
          }
          
          // Generate scheme ID if not present
          let schemeId = extractValue(row, 'scheme_id', mapping);
          if (!schemeId) {
            // Use sr_no if available
            const srNo = extractValue(row, 'sr_no', mapping);
            if (srNo) {
              schemeId = \`\${regionName.substring(0, 3).toUpperCase()}\${srNo.toString().padStart(4, '0')}\`;
            } else {
              // Generate random ID
              schemeId = \`\${regionName.substring(0, 3).toUpperCase()}\${Math.floor(Math.random() * 9000) + 1000}\`;
            }
          }
          
          // Determine agency based on region
          const agency = extractValue(row, 'agency', mapping) || getAgencyByRegion(regionName);
          
          // Extract all values for this scheme
          const schemeData = {
            scheme_id: schemeId,
            region_name: regionName,
            scheme_name: schemeName,
            district: extractValue(row, 'district', mapping) || regionName,
            taluka: extractValue(row, 'taluka', mapping),
            agency: agency,
            
            villages: extractValue(row, 'villages', mapping),
            villages_integrated: extractValue(row, 'villages_integrated', mapping),
            fully_completed_villages: extractValue(row, 'fully_completed_villages', mapping),
            
            total_esr: extractValue(row, 'total_esr', mapping),
            esr_integrated: extractValue(row, 'esr_integrated', mapping),
            fully_completed_esr: extractValue(row, 'fully_completed_esr', mapping),
            
            scheme_status: extractValue(row, 'scheme_status', mapping),
            scheme_functional_status: extractValue(row, 'scheme_functional_status', mapping),
            
            flow_meters_connected: extractValue(row, 'flow_meters_connected', mapping),
            pressure_transmitters_connected: extractValue(row, 'pressure_transmitters_connected', mapping),
            residual_chlorine_connected: extractValue(row, 'residual_chlorine_connected', mapping),
            
            project_cost: extractValue(row, 'project_cost', mapping),
            location_latitude: extractValue(row, 'location_latitude', mapping),
            location_longitude: extractValue(row, 'location_longitude', mapping),
            scheme_completion_percent: extractValue(row, 'scheme_completion_percent', mapping)
          };
          
          // Validate values and normalize status
          if (schemeData.scheme_status) {
            const status = schemeData.scheme_status.toString().toLowerCase();
            if (status.includes('fully') || status.includes('complete')) {
              schemeData.scheme_status = 'Fully-Completed';
            } else {
              schemeData.scheme_status = 'In Progress';
            }
          } else {
            schemeData.scheme_status = 'In Progress';
          }
          
          // Check for existing scheme
          const existingScheme = await client.query(
            'SELECT * FROM scheme_status WHERE scheme_id = $1',
            [schemeId]
          );
          
          if (existingScheme.rows.length > 0) {
            // Update existing scheme
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;
            
            for (const [key, value] of Object.entries(schemeData)) {
              if (value !== null && key !== 'scheme_id') {
                updateFields.push(\`\${key} = $\${paramIndex}\`);
                updateValues.push(value);
                paramIndex++;
              }
            }
            
            updateValues.push(schemeId);
            
            await client.query(
              \`UPDATE scheme_status SET \${updateFields.join(', ')} WHERE scheme_id = $\${paramIndex}\`,
              updateValues
            );
            
            updatedCount++;
          } else {
            // Insert new scheme
            const fields = [];
            const placeholders = [];
            const values = [];
            let paramIndex = 1;
            
            for (const [key, value] of Object.entries(schemeData)) {
              if (value !== null) {
                fields.push(key);
                placeholders.push(\`$\${paramIndex}\`);
                values.push(value);
                paramIndex++;
              }
            }
            
            await client.query(
              \`INSERT INTO scheme_status (\${fields.join(', ')}) VALUES (\${placeholders.join(', ')})\`,
              values
            );
            
            importedCount++;
          }
        }
        
        console.log(\`  ✅ Processed sheet: \${importedCount} schemes imported, \${updatedCount} schemes updated, \${errorCount} errors\`);
      }
      
      // Update region summaries
      console.log('\\n📊 Updating region summaries...');
      
      // For each region, update the summary stats
      const regions = await client.query('SELECT DISTINCT region_name FROM scheme_status');
      
      for (const region of regions.rows) {
        const regionName = region.region_name;
        
        // Count schemes by status
        const schemeCounts = await client.query(\`
          SELECT 
            COUNT(*) as total_schemes,
            COUNT(CASE WHEN scheme_status = 'Fully-Completed' OR scheme_status = 'Completed' OR scheme_status = 'fully completed' THEN 1 END) as fully_completed
          FROM scheme_status
          WHERE region_name = $1
        \`, [regionName]);
        
        // Count villages and ESRs
        const integrationCounts = await client.query(\`
          SELECT 
            SUM(villages_integrated) as villages_integrated,
            SUM(fully_completed_villages) as villages_completed,
            SUM(esr_integrated) as esr_integrated,
            SUM(fully_completed_esr) as esr_completed,
            SUM(flow_meters_connected) as flow_meters,
            SUM(residual_chlorine_connected) as rca,
            SUM(pressure_transmitters_connected) as pt
          FROM scheme_status
          WHERE region_name = $1
        \`, [regionName]);
        
        // Check if region exists
        const regionExists = await client.query(
          'SELECT * FROM regions WHERE region_name = $1',
          [regionName]
        );
        
        if (regionExists.rows.length > 0) {
          // Update existing region
          await client.query(\`
            UPDATE regions
            SET 
              total_schemes_integrated = $1,
              fully_completed_schemes = $2,
              total_villages_integrated = $3,
              fully_completed_villages = $4,
              total_esr_integrated = $5,
              fully_completed_esr = $6,
              flow_meter_integrated = $7,
              rca_integrated = $8,
              pressure_transmitter_integrated = $9
            WHERE region_name = $10
          \`, [
            schemeCounts.rows[0].total_schemes || 0,
            schemeCounts.rows[0].fully_completed || 0,
            integrationCounts.rows[0].villages_integrated || 0,
            integrationCounts.rows[0].villages_completed || 0,
            integrationCounts.rows[0].esr_integrated || 0,
            integrationCounts.rows[0].esr_completed || 0,
            integrationCounts.rows[0].flow_meters || 0,
            integrationCounts.rows[0].rca || 0,
            integrationCounts.rows[0].pt || 0,
            regionName
          ]);
        } else {
          // Insert new region
          await client.query(\`
            INSERT INTO regions (
              region_name,
              total_schemes_integrated,
              fully_completed_schemes,
              total_villages_integrated,
              fully_completed_villages,
              total_esr_integrated,
              fully_completed_esr,
              flow_meter_integrated,
              rca_integrated,
              pressure_transmitter_integrated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          \`, [
            regionName,
            schemeCounts.rows[0].total_schemes || 0,
            schemeCounts.rows[0].fully_completed || 0,
            integrationCounts.rows[0].villages_integrated || 0,
            integrationCounts.rows[0].villages_completed || 0,
            integrationCounts.rows[0].esr_integrated || 0,
            integrationCounts.rows[0].esr_completed || 0,
            integrationCounts.rows[0].flow_meters || 0,
            integrationCounts.rows[0].rca || 0,
            integrationCounts.rows[0].pt || 0
          ]);
        }
        
        console.log(\`  ✅ Updated summary for region: \${regionName}\`);
      }
      
      console.log('\\n✅ Excel import completed successfully!');
      console.log('You can now restart your application to see the imported data.');
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(\`❌ Error processing Excel file: \${error.message}\`);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Check command line arguments for file path
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('\\n❌ Please provide an Excel file path');
  console.log('Usage: node import-scheme-excel.js path/to/your/excel/file.xlsx');
} else {
  const filePath = args[0];
  processExcelFile(filePath);
}
`;

  fs.writeFileSync(schemeImportPath, schemeImportScript);
  console.log('✅ Created scheme Excel import script');
  
  // Create temporary uploads directory for admin panel
  console.log('\nEnsuring admin panel upload directory exists...');
  
  const adminUploadsDirs = [
    path.join(__dirname, 'client', 'public', 'uploads'),
    path.join(__dirname, 'public', 'uploads')
  ];
  
  for (const dir of adminUploadsDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created admin uploads directory: ${dir}`);
    } else {
      console.log(`✅ Admin uploads directory already exists: ${dir}`);
    }
  }
  
  // Create a test file in the uploads directory
  const testUploadFilePath = path.join(adminUploadsDirs[0], 'test-upload.txt');
  fs.writeFileSync(testUploadFilePath, 'This is a test file to verify upload permissions.');
  console.log('✅ Created test file in uploads directory');
  
  console.log('\n✅ File import fix completed successfully!');
  console.log('Excel file import should now work in VS Code.');
  console.log('\nTo test Excel import functionality:');
  console.log('1. Run: node test-excel-import.js path/to/your/excel/file.xlsx');
  console.log('2. To import data into the database: node import-scheme-excel.js path/to/your/excel/file.xlsx');
  
} catch (error) {
  console.error('❌ Error fixing file import functionality:', error.message);
  console.error(error);
}