import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define possible column names for each field based on the images we saw
const COLUMN_VARIANTS = {
  schemeId: ['Scheme ID', 'scheme id', 'SchemeId', 'Scheme_ID', 'scheme_id'],
  schemeName: ['Scheme Name', 'scheme name', 'Scheme_Name', 'scheme_name'],
  totalVillages: ['Number of Village', 'No. of Village', 'Total Villages', 'Number of Villages'],
  functionalVillages: ['No. of Functional Village', 'Functional Villages', 'Functional Village', 'No. of Functional Villages'],
  partialVillages: ['No. of Partial Village', 'Partial Villages', 'Partial Village', 'No. of Partial Villages'],
  nonFunctionalVillages: ['No. of Non- Functional Village', 'No. of Non-Functional Village', 'Non-Functional Villages', 'Non Functional Villages'],
  fullyCompletedVillages: ['Fully completed Villages', 'Fully Completed Villages', 'Fully-Completed Villages'],
  totalEsr: ['Total Number of ESR', 'Total ESR', 'ESR Total'],
  schemeFunctionalStatus: ['Scheme Functional Status', 'Functional Status'],
  fullyCompletedEsr: ['No. Fully Completed ESR', 'Fully Completed ESR', 'No. of Fully Completed ESR'],
  balanceEsr: ['Balance to Complete ESR', 'Balance ESR'],
  flowMeters: ['Flow Meters Connected', ' Flow Meters Connected', 'Flow Meters Conneted', 'Flow Meter Connected'],
  pressureTransmitters: ['Pressure Transmitter Connected', 'Pressure Transmitters Connected', 'Pressure Transmitter Conneted'],
  residualChlorine: ['Residual Chlorine Connected', 'Residual Chlorine Analyzer Connected', 'Residual Chlorine Conneted'],
  schemeStatus: ['Fully completion Scheme Status', 'Scheme Status', 'Status']
};

async function analyzeExcelFile(filePath) {
  try {
    console.log(`Analyzing Excel file: ${filePath}`);
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    console.log(`Found ${workbook.SheetNames.length} sheets:`);
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\nSheet: ${sheetName}`);
      
      // Detect region from sheet name
      let regionName = null;
      const regionPatterns = [
        { pattern: /\b(Amravati)\b/i, name: 'Amravati' },
        { pattern: /\b(Nashik)\b/i, name: 'Nashik' },
        { pattern: /\b(Nagpur)\b/i, name: 'Nagpur' },
        { pattern: /\b(Pune)\b/i, name: 'Pune' },
        { pattern: /\b(Konkan)\b/i, name: 'Konkan' },
        { pattern: /\b(CS)\b/i, name: 'Chhatrapati Sambhajinagar' },
        { pattern: /\b(Sambhajinagar)\b/i, name: 'Chhatrapati Sambhajinagar' },
        { pattern: /\b(Chhatrapati)\b/i, name: 'Chhatrapati Sambhajinagar' }
      ];
      
      for (const pattern of regionPatterns) {
        if (pattern.pattern.test(sheetName)) {
          regionName = pattern.name;
          break;
        }
      }
      
      console.log(`  Detected region: ${regionName || 'Unknown'}`);
      
      const sheet = workbook.Sheets[sheetName];
      if (!sheet || !sheet['!ref']) {
        console.log(`  No valid data range found in sheet.`);
        continue;
      }
      
      // Log sheet range
      console.log(`  Sheet range: ${sheet['!ref']}`);
      
      // Parse data with different options to handle variations in sheet structure
      console.log(`  Parsing with header:auto option first:`);
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
      
      if (!jsonData || jsonData.length === 0) {
        console.log(`  No data found with header:auto, trying different parsing options...`);
        // Try parsing with explicit header row
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
        
        if (!data || data.length === 0) {
          console.log(`  No data found in sheet: ${sheetName}`);
          continue;
        }
        
        console.log(`  Found ${data.length} rows with header:1 option`);
        
        // Find header row by looking for key column names
        let headerRowIndex = -1;
        let headerColumns = {};
        
        for (let i = 0; i < Math.min(15, data.length); i++) {
          const row = data[i];
          const foundColumns = {};
          let columnsFound = 0;
          
          // Check each column in this row against our column variants
          for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            if (!cell) continue;
            
            const cellStr = String(cell).trim();
            
            // Check all possible column names
            for (const [fieldName, variants] of Object.entries(COLUMN_VARIANTS)) {
              if (variants.some(variant => 
                cellStr.toLowerCase() === variant.toLowerCase() ||
                cellStr.toLowerCase().includes(variant.toLowerCase())
              )) {
                foundColumns[fieldName] = j; // Store column index
                columnsFound++;
                break;
              }
            }
          }
          
          // If we found multiple column matches, this is likely our header row
          if (columnsFound >= 3) { // Require at least 3 matches to consider it a header
            headerRowIndex = i;
            headerColumns = foundColumns;
            console.log(`  Found likely header row at index ${i} with ${columnsFound} column matches`);
            break;
          }
        }
        
        if (headerRowIndex >= 0) {
          console.log(`  Header columns found:`);
          for (const [field, index] of Object.entries(headerColumns)) {
            console.log(`    - ${field}: column ${index}`);
          }
          
          // Now extract some sample data from rows below the header
          console.log(`  Sample data rows:`);
          for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 4, data.length); i++) {
            const row = data[i];
            const sampleData = {};
            
            for (const [field, index] of Object.entries(headerColumns)) {
              if (index < row.length) {
                sampleData[field] = row[index];
              }
            }
            
            console.log(`    Row ${i}: ${JSON.stringify(sampleData)}`);
          }
        } else {
          console.log(`  Could not find a clear header row in this sheet`);
        }
      } else {
        console.log(`  Found ${jsonData.length} rows with header:auto option`);
        
        // Map column names to our standardized fields
        const columnMapping = {};
        if (jsonData.length > 0) {
          const sampleRow = jsonData[0];
          const headers = Object.keys(sampleRow);
          
          for (const header of headers) {
            for (const [fieldName, variants] of Object.entries(COLUMN_VARIANTS)) {
              if (variants.some(variant => 
                header.toLowerCase() === variant.toLowerCase() ||
                header.toLowerCase().includes(variant.toLowerCase())
              )) {
                columnMapping[header] = fieldName;
                break;
              }
            }
          }
          
          console.log(`  Column mapping to standard fields:`);
          for (const [original, mapped] of Object.entries(columnMapping)) {
            console.log(`    - "${original}" → "${mapped}"`);
          }
          
          // Show a few sample rows with mapped field names
          console.log(`  Sample data rows with mapped fields:`);
          for (let i = 0; i < Math.min(3, jsonData.length); i++) {
            const row = jsonData[i];
            const mappedRow = {};
            
            for (const [original, value] of Object.entries(row)) {
              const mappedField = columnMapping[original];
              if (mappedField) {
                mappedRow[mappedField] = value;
              }
            }
            
            // Check if this row has a scheme ID - only log if it does
            if (mappedRow.schemeId) {
              console.log(`    Row ${i}: ${JSON.stringify(mappedRow)}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`Error analyzing Excel file: ${error.message}`);
    console.error(error);
  }
}

// Run the analysis
const filePath = path.join(__dirname, 'attached_assets', 'scheme_level_datalink_report.xlsx');
analyzeExcelFile(filePath);