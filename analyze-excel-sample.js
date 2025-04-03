import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current file directory with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Analyzes an Excel file to understand its structure
 * @param {string} filePath - Path to the Excel file
 */
function analyzeExcelFile(filePath) {
  try {
    console.log(`Analyzing Excel file: ${filePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    
    console.log(`Sheets in workbook: ${workbook.SheetNames.join(', ')}`);
    
    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n=== Sheet: ${sheetName} ===`);
      
      const sheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      
      console.log(`Sheet range: ${sheet['!ref']}`);
      console.log(`Total rows: ${range.e.r - range.s.r + 1}, Total columns: ${range.e.c - range.s.c + 1}`);
      
      // First try to find the header row
      const headerRowIndex = findHeaderRow(sheet);
      if (headerRowIndex === -1) {
        console.log('Could not find header row in sheet');
        continue;
      }
      
      console.log(`Found header row at index: ${headerRowIndex}`);
      
      // Convert to JSON with the header row
      const jsonData = XLSX.utils.sheet_to_json(sheet, { 
        defval: null,
        raw: true,
        range: headerRowIndex
      });
      
      if (jsonData.length === 0) {
        console.log('No data found in sheet after header row');
        continue;
      }
      
      // Show the first row (headers)
      console.log('\nHeader Row:');
      const headers = Object.keys(jsonData[0]);
      console.log(headers);
      
      // Print non-empty headers only
      console.log('\nNon-empty headers:');
      headers.filter(h => !h.startsWith('__EMPTY')).forEach(h => console.log(`- ${h}`));
      
      // Extract path information from the first column if it exists
      if (jsonData[0].__EMPTY && typeof jsonData[0].__EMPTY === 'string') {
        const pathInfo = jsonData[0].__EMPTY;
        console.log('\nPath information from first column:');
        console.log(pathInfo);
        
        // Try to extract region, scheme id, and scheme name from path
        const pathParts = pathInfo.split('\\');
        console.log('\nPath parts:');
        pathParts.forEach(part => console.log(`- ${part}`));
        
        // Extract region information
        const regionPart = pathParts.find(part => part.startsWith('Region-'));
        if (regionPart) {
          console.log(`\nFound region: ${regionPart.substring(7)}`);
        }
        
        // Extract scheme information
        const schemePart = pathParts.find(part => part.startsWith('Scheme-'));
        if (schemePart) {
          console.log(`\nFound scheme: ${schemePart.substring(7)}`);
          // Extract scheme ID from scheme name (if it follows the pattern "ID - Name")
          const schemeIdMatch = schemePart.substring(7).match(/^(\d+)\s*-\s*(.*)/);
          if (schemeIdMatch) {
            console.log(`Scheme ID: ${schemeIdMatch[1]}`);
            console.log(`Scheme Name: ${schemeIdMatch[2]}`);
          }
        }
      }
      
      // Check for our expected columns using both direct and fuzzy matching
      console.log('\nChecking for required columns:');
      const requiredColumns = [
        'Total Villages Integrated',
        'Fully Completed Villages',
        'Total ESR Integrated',
        'No. Fully Completed ESR',
        'Flow Meters Connected',
        'Residual Chlorine Analyzer Connected',
        'Pressure Transmitter Connected',
        'Fully completion Scheme Status'
      ];
      
      const columnVariations = {
        'Total Villages Integrated': ['Total Villages Integrated', 'Villages Integrated', 'Total Village Integrated', 'Number of Village'],
        'Fully Completed Villages': ['Fully Completed Villages', 'Fully completed Villages', 'Full Completed Villages', 'Village Functional'],
        'Total ESR Integrated': ['Total ESR Integrated', 'ESR Integrated on IoT', 'Total ESR Integrated on IoT', 'Number of the Reservoir'],
        'No. Fully Completed ESR': ['No. Fully Completed ESR', 'Fully Completed ESR', 'Full Completed ESR'],
        'Flow Meters Connected': ['Flow Meters Connected', 'Flow Meter Connected', 'Flow Meter'],
        'Residual Chlorine Analyzer Connected': ['Residual Chlorine Analyzer Connected', 'Residual Chlorine Connected', 'Chlorine Analyzer'],
        'Pressure Transmitter Connected': ['Pressure Transmitter Connected', 'PT Connected', 'Pressure Transmitter'],
        'Fully completion Scheme Status': ['Fully completion Scheme Status', 'Scheme Status', 'Status', 'Scheme Completion Status', 'Calc - Scheme Status']
      };
      
      const foundColumns = {};
      
      for (const [requiredColumn, variations] of Object.entries(columnVariations)) {
        for (const header of headers) {
          if (variations.some(v => 
              header === v || 
              header.toLowerCase().includes(v.toLowerCase())
          )) {
            foundColumns[requiredColumn] = header;
            break;
          }
        }
      }
      
      for (const requiredColumn of requiredColumns) {
        console.log(`${requiredColumn}: ${foundColumns[requiredColumn] ? 'Found as "' + foundColumns[requiredColumn] + '"' : 'Not found'}`);
      }
      
      // Try to find related columns by checking all headers
      console.log('\nAll matching columns (for any reference to key terms):');
      const keyTerms = ['village', 'esr', 'flow', 'chlorine', 'pressure', 'status', 'scheme', 'region', 'functional', 'partial'];
      for (const term of keyTerms) {
        const matchingHeaders = headers.filter(h => 
          h.toLowerCase().includes(term.toLowerCase())
        );
        if (matchingHeaders.length > 0) {
          console.log(`\nColumns matching '${term}':`);
          matchingHeaders.forEach(h => console.log(`- ${h}`));
        }
      }
      
      // Show some sample data (first 2 rows)
      console.log('\nSample Data (first 2 rows with non-empty values only):');
      jsonData.slice(0, 2).forEach((row, i) => {
        console.log(`Row ${i + 1}:`);
        Object.entries(row)
          .filter(([key, value]) => value !== null && value !== undefined && value !== '')
          .forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
      });
      
      // Check for scheme_id column
      const schemeIdColumn = headers.find(h => 
        h === 'Scheme ID' || 
        h === 'scheme_id' || 
        (h.toLowerCase().includes('scheme') && h.toLowerCase().includes('id'))
      );
      
      console.log(`\nScheme ID column: ${schemeIdColumn || 'Not found'}`);
      
      // Look for any column that might have numeric IDs
      const possibleIdColumns = headers.filter(header => {
        const firstRow = jsonData[0][header];
        return firstRow && typeof firstRow === 'string' && /^\d+$/.test(firstRow.toString().trim());
      });
      
      if (possibleIdColumns.length > 0) {
        console.log('\nPossible ID columns (containing numeric values):');
        possibleIdColumns.forEach(col => console.log(`- ${col}`));
      }
    }
    
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
  }
}

/**
 * Find the header row in a sheet by looking for rows with many non-empty cells
 * @param {object} sheet - The Excel sheet to analyze
 * @returns {number} - The index of the header row, or -1 if not found
 */
function findHeaderRow(sheet) {
  // Get the address range of the sheet
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const minRow = range.s.r;
  const maxRow = Math.min(range.e.r, minRow + 20); // Check only first 20 rows
  
  let bestRowIndex = -1;
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

// Path to the Excel file
const filePath = path.join(__dirname, 'attached_assets', 'scheme_level_datalink_report.xlsx');

// Check if file exists
if (fs.existsSync(filePath)) {
  analyzeExcelFile(filePath);
} else {
  console.error(`File not found: ${filePath}`);
}