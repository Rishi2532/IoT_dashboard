import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current file directory with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkSchemeStatusSheet(filePath) {
  try {
    console.log(`Checking Scheme_Status sheet in: ${filePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath, {
      type: 'file',
      cellFormula: false,
      cellHTML: false,
      cellText: true,
      cellDates: true,
    });
    
    // Check if the sheet exists
    if (!workbook.SheetNames.includes('Scheme_Status')) {
      console.error("Scheme_Status sheet not found in workbook.");
      console.log(`Available sheets: ${workbook.SheetNames.join(', ')}`);
      return;
    }
    
    const sheet = workbook.Sheets['Scheme_Status'];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(sheet, { 
      defval: null,
      raw: true
    });
    
    if (jsonData.length === 0) {
      console.log("No data found in Scheme_Status sheet");
      return;
    }
    
    // Display all headers
    console.log("\nAll headers in Scheme_Status sheet:");
    const headers = Object.keys(jsonData[0]);
    headers.forEach(header => {
      console.log(`  - "${header}"`);
    });
    
    const targetColumns = [
      "Scheme ID", 
      " Flow Meters Connected", 
      "Flow Meters Connected", 
      "Pressure Transmitter Connected", 
      "Residual Chlorine Analyzer Connected"
    ];
    
    // Check for existence of each column
    for (const column of targetColumns) {
      const columnExists = headers.some(h => h === column || h.trim() === column.trim());
      console.log(`\nColumn "${column}" exists: ${columnExists}`);
      
      if (columnExists) {
        // Find the exact header
        const exactHeader = headers.find(h => h === column) || headers.find(h => h.trim() === column.trim());
        
        // Show some sample values
        console.log("Sample values:");
        for (let i = 0; i < Math.min(3, jsonData.length); i++) {
          console.log(`  Row ${i+1}: ${jsonData[i][exactHeader]}`);
        }
      }
    }
    
  } catch (error) {
    console.error(`Error reading Excel file: ${error.message}`);
  }
}

// Run the function
const filePath = path.resolve(__dirname, 'attached_assets/scheme_level_datalink_report.xlsx');
checkSchemeStatusSheet(filePath);