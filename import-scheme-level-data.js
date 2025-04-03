import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current file directory with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection setup
const { Pool } = pg;

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Map column names to database fields based on the Excel's content
 * @param {Object} headers - The header row from Excel
 * @returns {Object} Mapping of Excel column headers to database field names
 */
function mapHeadersToFields(headers) {
  const mapping = {};
  const columnPatterns = {
    // Scheme identification
    scheme_id: [
      'Scheme ID', 'Scheme Id', 'scheme_id', 'SchemeId', 'SCHEME ID',
      'Scheme_Id', 'Scheme Code', 'SchemeID'
    ],
    scheme_name: [
      'Scheme Name', 'SchemeName', 'scheme_name', 'SCHEME NAME'
    ],
    
    // Villages related fields
    total_villages: [
      'Number of Village', 'No. of Village', 'Total Villages', 
      'Number of Villages', 'Villages'
    ],
    fully_completed_villages: [
      'Fully completed Villages', 'Fully Completed Villages', 
      'No. of Functional Village', 'Functional Villages'
    ],
    villages_integrated: [
      'Total Villages Integrated', 'Villages Integrated'
    ],
    partial_villages: [
      'No. of Partial Village', 'Partial Villages', 'Partial Village'
    ],
    non_functional_villages: [
      'No. of Non- Functional Village', 'No. of Non-Functional Village',
      'Non-Functional Villages', 'Non Functional Villages'
    ],
    
    // ESR related fields
    total_esr: [
      'Total Number of ESR', 'Total ESR', 'ESR Total'
    ],
    esr_integrated_on_iot: [
      'Total ESR Integrated', 'ESR Integrated', 'Total Number of ESR Integrated'
    ],
    fully_completed_esr: [
      'No. Fully Completed ESR', 'Fully Completed ESR', 'No. of Fully Completed ESR',
      'ESR Fully Completed'
    ],
    balance_esr: [
      'Balance to Complete ESR', 'Balance ESR'
    ],
    
    // Component related fields
    flow_meters_connected: [
      'Flow Meters Connected', ' Flow Meters Connected', 'Flow Meters Conneted',
      'Flow Meter Connected', 'Flow Meters', 'FM Connected'
    ],
    pressure_transmitters_connected: [
      'Pressure Transmitter Connected', 'Pressure Transmitters Connected',
      'Pressure Transmitter Conneted', 'PT Connected', 'Pressure Transmitters'
    ],
    residual_chlorine_connected: [
      'Residual Chlorine Connected', 'Residual Chlorine Analyzer Connected',
      'Residual Chlorine Conneted', 'RCA Connected', 'Residual Chlorine',
      'Residual Chlorine Analyzers'
    ],
    
    // Status fields
    scheme_status: [
      'Fully completion Scheme Status', 'Scheme Status', 'Status',
      'Scheme status', ' Scheme Status'
    ],
    scheme_functional_status: [
      'Scheme Functional Status', 'Functional Status'
    ],
    
    // Region identification
    region_name: [
      'Region', 'RegionName', 'Region Name'
    ]
  };
  
  // Match headers to fields
  for (const header of Object.keys(headers)) {
    // Skip empty headers
    if (header.startsWith('__EMPTY')) continue;
    
    // Look for a match in the column patterns
    for (const [field, patterns] of Object.entries(columnPatterns)) {
      if (patterns.some(pattern => 
        header === pattern || 
        header.toLowerCase() === pattern.toLowerCase() ||
        header.toLowerCase().includes(pattern.toLowerCase())
      )) {
        mapping[header] = field;
        break;
      }
    }
  }
  
  console.log('Column Mapping:');
  for (const [header, field] of Object.entries(mapping)) {
    console.log(`  "${header}" → "${field}"`);
  }
  
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
  // Find the Excel column that maps to the desired field
  const columnHeader = Object.keys(mapping).find(key => mapping[key] === field);
  
  if (!columnHeader || row[columnHeader] === undefined) {
    return null; // Return null if column not found or value is undefined
  }
  
  let value = row[columnHeader];
  
  // Handle data type conversions
  if (field === 'scheme_id') {
    return String(value || '').trim();
  } else if ([
    'total_villages',
    'fully_completed_villages',
    'villages_integrated',
    'partial_villages',
    'non_functional_villages',
    'total_esr',
    'esr_integrated_on_iot',
    'fully_completed_esr',
    'balance_esr',
    'flow_meters_connected',
    'pressure_transmitters_connected',
    'residual_chlorine_connected'
  ].includes(field)) {
    // Convert to number, handling 0 and null cases
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  } else if (field === 'scheme_status') {
    // Standardize scheme status values
    const status = String(value || '').trim();
    if (!status || status === '') return 'Not-Connected';
    
    // Map status values to standardized format
    if (status.toLowerCase().includes('full')) return 'Fully-Completed';
    if (status.toLowerCase().includes('partial')) return 'In Progress';
    if (status.toLowerCase().includes('progress')) return 'In Progress';
    if (status.toLowerCase().includes('function')) return 'In Progress';
    
    return status;
  }
  
  // Return as is for other fields
  return value === null || value === undefined ? null : String(value).trim();
}

/**
 * Detect region from sheet name using predefined patterns
 * @param {String} sheetName - Name of the Excel sheet
 * @returns {String|null} Detected region name or null if not found
 */
function detectRegionFromSheetName(sheetName) {
  const regionPatterns = [
    { pattern: /\bamravati\b/i, name: 'Amravati' },
    { pattern: /\bnashik\b/i, name: 'Nashik' },
    { pattern: /\bnagpur\b/i, name: 'Nagpur' },
    { pattern: /\bpune\b/i, name: 'Pune' },
    { pattern: /\bkonkan\b/i, name: 'Konkan' },
    { pattern: /\bcs\b/i, name: 'Chhatrapati Sambhajinagar' },
    { pattern: /\bsambhajinagar\b/i, name: 'Chhatrapati Sambhajinagar' },
    { pattern: /\bchhatrapati\b/i, name: 'Chhatrapati Sambhajinagar' }
  ];
  
  for (const { pattern, name } of regionPatterns) {
    if (pattern.test(sheetName)) {
      return name;
    }
  }
  
  // If no match found, check for explicit "Region" word
  if (sheetName.includes('Region')) {
    const parts = sheetName.split('Region');
    if (parts.length > 1) {
      const regionPart = parts[1].trim().replace(/\s*-\s*/, '').trim();
      if (regionPart) return regionPart;
    }
  }
  
  return null;
}

/**
 * Find the header row in a sheet by looking for rows with many non-empty cells
 * @param {Object} sheet - The Excel sheet
 * @returns {Number} Index of the header row, or 0 if not found
 */
function findHeaderRow(sheet) {
  // Get the address range of the sheet
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const minRow = range.s.r;
  const maxRow = Math.min(range.e.r, minRow + 20); // Check only first 20 rows
  
  let bestRowIndex = 0;
  let bestRowCount = 0;
  
  // Check each row to see which one has the most non-empty cells
  for (let r = minRow; r <= maxRow; r++) {
    let cellCount = 0;
    
    // Count non-empty cells in the row
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (sheet[cellRef] && sheet[cellRef].v !== undefined && sheet[cellRef].v !== null && sheet[cellRef].v !== '') {
        cellCount++;
      }
    }
    
    // If this row has more non-empty cells, consider it as the header row
    if (cellCount > bestRowCount) {
      bestRowCount = cellCount;
      bestRowIndex = r;
    }
  }
  
  return bestRowIndex;
}

/**
 * Process Excel file and import scheme data
 * @param {String} filePath - Path to the Excel file
 */
async function processExcelFile(filePath) {
  console.log(`Processing Excel file: ${filePath}`);
  
  // Initialize counters
  let totalUpdated = 0;
  let totalCreated = 0;
  const processedIds = new Set();
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath, {
      type: 'file',
      cellFormula: false,
      cellHTML: false,
      cellText: true,
      cellDates: true,
      cellNF: false,
      WTF: true,
      cellStyles: false,
      bookVBA: false,
      dateNF: 'yyyy-mm-dd',
      raw: true
    });
    
    console.log(`Found ${workbook.SheetNames.length} sheets in the workbook`);
    
    // Process each sheet in the workbook
    for (const sheetName of workbook.SheetNames) {
      // Try to detect region from sheet name
      let regionName = detectRegionFromSheetName(sheetName);
      
      console.log(`Processing sheet: ${sheetName}, detected region: ${regionName || 'Unknown'}`);
      
      const sheet = workbook.Sheets[sheetName];
      
      // Find the header row in the sheet
      const headerRowIndex = findHeaderRow(sheet);
      console.log(`Found header row at index: ${headerRowIndex}`);
      
      // Convert to JSON with the header row
      const jsonData = XLSX.utils.sheet_to_json(sheet, { 
        defval: null,
        raw: true,
        range: headerRowIndex
      });
      
      if (jsonData.length === 0) {
        console.log(`No data found in sheet: ${sheetName}`);
        continue;
      }
      
      // Create mapping of columns to database fields
      const columnMapping = mapHeadersToFields(jsonData[0]);
      
      // Check if we have the key fields we need
      const hasSchemeId = Object.values(columnMapping).includes('scheme_id');
      const hasSchemeName = Object.values(columnMapping).includes('scheme_name');
      
      if (!hasSchemeId && !hasSchemeName) {
        console.error(`Sheet ${sheetName} doesn't have scheme ID or name columns, skipping`);
        continue;
      }
      
      // Try to find region name in the data if we couldn't detect it from sheet name
      if (!regionName) {
        // Look for region in the column data
        const regionHeader = Object.keys(columnMapping).find(
          h => columnMapping[h] === 'region_name'
        );
        
        if (regionHeader && jsonData[0][regionHeader]) {
          regionName = String(jsonData[0][regionHeader]).trim();
          console.log(`Found region name in data: ${regionName}`);
        } else {
          console.error(`Could not determine region for sheet: ${sheetName}, skipping`);
          continue;
        }
      }
      
      // Validate region exists in the database
      try {
        const regionCheck = await pool.query(
          'SELECT region_id FROM region WHERE region_name = $1',
          [regionName]
        );
        
        if (regionCheck.rows.length === 0) {
          console.error(`Region "${regionName}" not found in database, creating it...`);
          
          // Create the region if it doesn't exist
          await pool.query(
            'INSERT INTO region (region_name) VALUES ($1)',
            [regionName]
          );
          
          console.log(`Created region: ${regionName}`);
        }
      } catch (error) {
        console.error(`Error validating region: ${error.message}`);
        continue;
      }
      
      // Process each row in the sheet
      for (const row of jsonData) {
        try {
          // Extract values for the scheme using our mapping
          const schemeData = {
            scheme_id: extractValue(row, 'scheme_id', columnMapping),
            scheme_name: extractValue(row, 'scheme_name', columnMapping),
            region_name: regionName,
            total_villages: extractValue(row, 'total_villages', columnMapping),
            functional_villages: extractValue(row, 'fully_completed_villages', columnMapping), // Function villages maps to fully completed
            partial_villages: extractValue(row, 'partial_villages', columnMapping),
            non_functional_villages: extractValue(row, 'non_functional_villages', columnMapping),
            villages_integrated: extractValue(row, 'villages_integrated', columnMapping),
            fully_completed_villages: extractValue(row, 'fully_completed_villages', columnMapping),
            total_esr: extractValue(row, 'total_esr', columnMapping),
            esr_integrated_on_iot: extractValue(row, 'esr_integrated_on_iot', columnMapping),
            scheme_functional_status: extractValue(row, 'scheme_functional_status', columnMapping),
            fully_completed_esr: extractValue(row, 'fully_completed_esr', columnMapping),
            balance_esr: extractValue(row, 'balance_esr', columnMapping),
            flow_meters_connected: extractValue(row, 'flow_meters_connected', columnMapping),
            pressure_transmitters_connected: extractValue(row, 'pressure_transmitters_connected', columnMapping),
            residual_chlorine_connected: extractValue(row, 'residual_chlorine_connected', columnMapping),
            scheme_status: extractValue(row, 'scheme_status', columnMapping)
          };
          
          // Skip if we don't have a scheme name
          if (!schemeData.scheme_name) {
            console.log('Skipping row - no scheme name found');
            continue;
          }
          
          // Generate scheme ID if it's missing
          if (!schemeData.scheme_id) {
            // Query the maximum scheme ID and increment
            const maxIdResult = await pool.query(
              'SELECT MAX(CAST(scheme_id AS INTEGER)) FROM scheme_status'
            );
            
            const maxId = maxIdResult.rows[0].max || 20000000; // Start at 20M if no schemes exist
            schemeData.scheme_id = String(Number(maxId) + 1);
            console.log(`Generated new scheme ID: ${schemeData.scheme_id} for ${schemeData.scheme_name}`);
          }
          
          // Skip if we've already processed this scheme ID
          if (processedIds.has(schemeData.scheme_id)) {
            console.log(`Skipping duplicate scheme ID: ${schemeData.scheme_id}`);
            continue;
          }
          
          processedIds.add(schemeData.scheme_id);
          
          // Check if scheme exists in the database
          const schemeCheck = await pool.query(
            'SELECT * FROM scheme_status WHERE scheme_id = $1',
            [schemeData.scheme_id]
          );
          
          if (schemeCheck.rows.length > 0) {
            // Update existing scheme
            await pool.query(`
              UPDATE scheme_status SET
                scheme_name = $1,
                region_name = $2,
                total_villages = $3,
                functional_villages = $4,
                partial_villages = $5,
                non_functional_villages = $6,
                villages_integrated = $7,
                fully_completed_villages = $8,
                total_esr = $9,
                esr_integrated_on_iot = $10,
                scheme_functional_status = $11,
                fully_completed_esr = $12,
                balance_esr = $13,
                flow_meters_connected = $14,
                pressure_transmitters_connected = $15,
                residual_chlorine_connected = $16,
                scheme_status = $17
              WHERE scheme_id = $18
            `, [
              schemeData.scheme_name,
              schemeData.region_name,
              schemeData.total_villages,
              schemeData.functional_villages,
              schemeData.partial_villages,
              schemeData.non_functional_villages,
              schemeData.villages_integrated,
              schemeData.fully_completed_villages,
              schemeData.total_esr,
              schemeData.esr_integrated_on_iot,
              schemeData.scheme_functional_status,
              schemeData.fully_completed_esr,
              schemeData.balance_esr,
              schemeData.flow_meters_connected,
              schemeData.pressure_transmitters_connected,
              schemeData.residual_chlorine_connected,
              schemeData.scheme_status,
              schemeData.scheme_id
            ]);
            
            totalUpdated++;
            console.log(`Updated scheme: ${schemeData.scheme_name} (ID: ${schemeData.scheme_id})`);
          } else {
            // Create new scheme
            await pool.query(`
              INSERT INTO scheme_status (
                scheme_id,
                scheme_name,
                region_name,
                total_villages,
                functional_villages,
                partial_villages,
                non_functional_villages,
                villages_integrated,
                fully_completed_villages,
                total_esr,
                esr_integrated_on_iot,
                scheme_functional_status,
                fully_completed_esr,
                balance_esr,
                flow_meters_connected,
                pressure_transmitters_connected,
                residual_chlorine_connected,
                scheme_status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            `, [
              schemeData.scheme_id,
              schemeData.scheme_name,
              schemeData.region_name,
              schemeData.total_villages,
              schemeData.functional_villages,
              schemeData.partial_villages,
              schemeData.non_functional_villages,
              schemeData.villages_integrated,
              schemeData.fully_completed_villages,
              schemeData.total_esr,
              schemeData.esr_integrated_on_iot,
              schemeData.scheme_functional_status,
              schemeData.fully_completed_esr,
              schemeData.balance_esr,
              schemeData.flow_meters_connected,
              schemeData.pressure_transmitters_connected,
              schemeData.residual_chlorine_connected,
              schemeData.scheme_status
            ]);
            
            totalCreated++;
            console.log(`Created new scheme: ${schemeData.scheme_name} (ID: ${schemeData.scheme_id})`);
          }
        } catch (rowError) {
          console.error(`Error processing row:`, rowError.message);
          // Continue with the next row
        }
      }
    }
    
    // Update region summaries
    await updateRegionSummaries();
    
    console.log(`Import completed: ${totalCreated} schemes created, ${totalUpdated} schemes updated`);
    return { totalCreated, totalUpdated };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw error;
  }
}

/**
 * Update region summary data based on scheme status data
 */
async function updateRegionSummaries() {
  console.log('Updating region summaries...');
  
  try {
    // Get all regions
    const regionsResult = await pool.query('SELECT * FROM region');
    const regions = regionsResult.rows;
    
    for (const region of regions) {
      // Get all schemes for this region
      const schemesResult = await pool.query(
        'SELECT * FROM scheme_status WHERE region_name = $1',
        [region.region_name]
      );
      
      const schemes = schemesResult.rows;
      
      // Calculate region totals
      const totals = {
        total_esr_integrated: schemes.reduce((sum, scheme) => sum + (scheme.esr_integrated_on_iot || 0), 0),
        fully_completed_esr: schemes.reduce((sum, scheme) => sum + (scheme.fully_completed_esr || 0), 0),
        partial_esr: schemes.reduce((sum, scheme) => 
          sum + (scheme.esr_integrated_on_iot || 0) - (scheme.fully_completed_esr || 0), 0),
        total_villages_integrated: schemes.reduce((sum, scheme) => sum + (scheme.villages_integrated || 0), 0),
        fully_completed_villages: schemes.reduce((sum, scheme) => sum + (scheme.fully_completed_villages || 0), 0),
        total_schemes_integrated: schemes.length,
        fully_completed_schemes: schemes.filter(s => s.scheme_status === 'Fully-Completed').length,
        flow_meter_integrated: schemes.reduce((sum, scheme) => sum + (scheme.flow_meters_connected || 0), 0),
        rca_integrated: schemes.reduce((sum, scheme) => sum + (scheme.residual_chlorine_connected || 0), 0),
        pressure_transmitter_integrated: schemes.reduce((sum, scheme) => sum + (scheme.pressure_transmitters_connected || 0), 0)
      };
      
      // Update the region record
      await pool.query(`
        UPDATE region SET
          total_esr_integrated = $1,
          fully_completed_esr = $2,
          partial_esr = $3,
          total_villages_integrated = $4,
          fully_completed_villages = $5,
          total_schemes_integrated = $6,
          fully_completed_schemes = $7,
          flow_meter_integrated = $8,
          rca_integrated = $9,
          pressure_transmitter_integrated = $10
        WHERE region_id = $11
      `, [
        totals.total_esr_integrated,
        totals.fully_completed_esr,
        totals.partial_esr,
        totals.total_villages_integrated,
        totals.fully_completed_villages,
        totals.total_schemes_integrated,
        totals.fully_completed_schemes,
        totals.flow_meter_integrated,
        totals.rca_integrated,
        totals.pressure_transmitter_integrated,
        region.region_id
      ]);
      
      console.log(`Updated summary for region: ${region.region_name}`);
    }
    
    console.log('All region summaries updated successfully');
  } catch (error) {
    console.error('Error updating region summaries:', error);
    throw error;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Path to the Excel file
    const filePath = path.join(__dirname, 'attached_assets', 'scheme_level_datalink_report.xlsx');
    
    // Process the file
    await processExcelFile(filePath);
    
    // Close the database connection
    await pool.end();
    
    console.log('Script completed successfully');
  } catch (error) {
    console.error('Error running script:', error);
    // Ensure we close the pool on error
    try {
      await pool.end();
    } catch (e) {
      console.error('Error closing database pool:', e);
    }
    process.exit(1);
  }
}

// Run the main function
main();