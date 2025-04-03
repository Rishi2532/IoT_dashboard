import * as XLSX from 'xlsx';

// Function to detect the header row and analyze the Excel structure
function analyzeExcelFile(filePath) {
  try {
    console.log(`Analyzing Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    
    console.log('All sheets in workbook:');
    console.log(workbook.SheetNames);

    // Process each sheet to find scheme data
    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n======= Analyzing sheet: ${sheetName} =======`);
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array of arrays with headers option off to find the header row
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Find a row that might contain headers (check for common column names)
      const headerRowIndex = findHeaderRow(rawData);
      
      if (headerRowIndex !== -1) {
        console.log(`Found potential header row at index ${headerRowIndex}:`);
        console.log(rawData[headerRowIndex]);
        
        // Check for specific columns we care about
        const headerRow = rawData[headerRowIndex];
        checkForImportantColumns(headerRow);
        
        // Show some sample data from rows after the header
        if (rawData.length > headerRowIndex + 1) {
          console.log('\nSample data rows:');
          for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 4, rawData.length); i++) {
            console.log(`Row ${i}:`, rawData[i]);
          }
        }
      } else {
        console.log('No identifiable header row found in this sheet');
      }
    });
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
  }
}

// Find a row that likely contains headers
function findHeaderRow(data) {
  const keyTerms = ['Scheme ID', 'Scheme Name', 'District', 'Total Villages Integrated', 'Fully Scheme Completing Status'];
  
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    // Check if this row contains any of our key terms
    const containsKeyTerms = row.some(cell => 
      typeof cell === 'string' && keyTerms.some(term => cell.includes(term))
    );
    
    if (containsKeyTerms) return i;
  }
  
  return -1; // Header row not found
}

// Check if important columns exist in the header row
function checkForImportantColumns(headerRow) {
  const columnsToCheck = [
    { name: 'Scheme ID', variations: ['Scheme ID', 'SchemeID', 'Scheme_ID'] },
    { name: 'Total Villages Integrated', variations: ['Total Villages Integrated', 'Villages Integrated', 'Integrated Villages'] },
    { name: 'Fully Scheme Completing Status', variations: ['Fully Scheme Completing Status', 'Scheme Status', 'Completion Status'] }
  ];
  
  console.log('\nChecking for important columns:');
  
  columnsToCheck.forEach(column => {
    const foundIndex = headerRow.findIndex(cell => 
      typeof cell === 'string' && column.variations.some(v => cell.includes(v))
    );
    
    if (foundIndex !== -1) {
      console.log(`✓ Found "${column.name}" at index ${foundIndex} with value "${headerRow[foundIndex]}"`);
    } else {
      console.log(`✗ Could not find "${column.name}" in header row`);
    }
  });
}

// Run the analysis on the provided file
analyzeExcelFile('attached_assets/scheme_level_datalink_report.xlsx');

// Export the function for use in other modules
export { analyzeExcelFile };