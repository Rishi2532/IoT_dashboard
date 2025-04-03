import { read, utils } from 'xlsx';

interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: {
    sheets: string[];
    schemeIdColumnPresent: boolean;
    requiredColumnsPresent: boolean;
    schemesFound: number;
  };
}

/**
 * Validates an Excel file for importing scheme data
 * 
 * @param fileBuffer ArrayBuffer of the Excel file to validate
 * @returns ValidationResult with details about Excel structure
 */
export async function validateExcelFile(fileBuffer: ArrayBuffer): Promise<ValidationResult> {
  try {
    // Read the Excel file
    const workbook = read(fileBuffer, { type: 'array' });
    
    // Expected sheets should include at least one region
    const expectedRegions = ['Amravati', 'Nashik', 'Nagpur', 'Pune', 'Konkan', 'CS', 'Sambhajinagar'];
    const foundRegionSheets: string[] = [];
    
    // Track if required columns are present
    let schemeIdColumnPresent = false;
    let requiredDataColumns = false;
    let schemesFound = 0;
    
    // Function to check if a sheet name contains a region
    const isRegionSheet = (sheetName: string): boolean => {
      const sheetNameLower = sheetName.toLowerCase();
      return expectedRegions.some(region => 
        sheetNameLower.includes(region.toLowerCase())
      );
    };
    
    // Valid columns that should be checked
    const validColumns = [
      // Primary columns from Region sheets
      'Total Villages Integrated',
      'Fully Completed Villages',
      'Total ESR Integrated',
      'No. Fully Completed ESR',
      'Flow Meters Connected',
      ' Flow Meters Connected', // Note space in front
      'Residual Chlorine Analyzer Connected',
      'Pressure Transmitter Connected',
      'Fully completion Scheme Status',
      
      // Alternative versions
      'Total Villages',
      'Villages Integrated',
      'Functional Villages',
      'ESR Integrated',
      'ESR Fully Completed',
      'Residual Chlorine',
      'Residual Chlorine Analyzers',
      'PT Connected',
      'Pressure Transmitters',
      'Flow Meters',
      'FM Connected',
      'Status',
      'Scheme Status',
      'Scheme status'
    ];
    
    // Analyze each sheet in the workbook
    for (const sheetName of workbook.SheetNames) {
      // Check if this sheet name contains a region name using the function we defined
      if (isRegionSheet(sheetName)) {
        foundRegionSheets.push(sheetName);
        
        // Check sheet contents
        const sheet = workbook.Sheets[sheetName];
        const data = utils.sheet_to_json(sheet) as Record<string, any>[];
        
        if (data && data.length > 0) {
          // Check for scheme ID column
          for (const row of data) {
            const hasSchemeId = row['Scheme ID'] !== undefined || 
                              row['Scheme Id'] !== undefined || 
                              row['scheme_id'] !== undefined ||
                              row['SchemeId'] !== undefined || 
                              row['SCHEME ID'] !== undefined || 
                              row['Scheme_Id'] !== undefined ||
                              row['Scheme Code'] !== undefined || 
                              row['Scheme Id.'] !== undefined;
            
            if (hasSchemeId) {
              schemeIdColumnPresent = true;
              schemesFound++;
            }
            
            // Check if any of the required data columns are present
            const hasAnyRequiredColumn = validColumns.some(col => row[col] !== undefined);
            if (hasAnyRequiredColumn) {
              requiredDataColumns = true;
            }
          }
        }
      }
    }
    
    // Check validation results
    if (foundRegionSheets.length === 0) {
      return {
        isValid: false,
        message: 'No region sheets found in the Excel file. Expected sheets containing Amravati, Nashik, Nagpur, Pune, Konkan, CS (Chhatrapati Sambhajinagar), or Sambhajinagar.',
        details: {
          sheets: workbook.SheetNames,
          schemeIdColumnPresent,
          requiredColumnsPresent: requiredDataColumns,
          schemesFound
        }
      };
    }
    
    if (!schemeIdColumnPresent) {
      return {
        isValid: false,
        message: 'No Scheme ID column found in any sheet. Expected column name "Scheme ID" or similar.',
        details: {
          sheets: foundRegionSheets,
          schemeIdColumnPresent,
          requiredColumnsPresent: requiredDataColumns,
          schemesFound
        }
      };
    }
    
    if (!requiredDataColumns) {
      return {
        isValid: false,
        message: 'Missing required data columns. Expected columns for Villages, ESR, Flow Meters, etc.',
        details: {
          sheets: foundRegionSheets,
          schemeIdColumnPresent,
          requiredColumnsPresent: requiredDataColumns,
          schemesFound
        }
      };
    }
    
    if (schemesFound === 0) {
      return {
        isValid: false,
        message: 'No scheme data found in the Excel file.',
        details: {
          sheets: foundRegionSheets,
          schemeIdColumnPresent,
          requiredColumnsPresent: requiredDataColumns,
          schemesFound
        }
      };
    }
    
    // All validation passed
    return {
      isValid: true,
      message: `Excel file valid. Found ${schemesFound} schemes across ${foundRegionSheets.length} region sheets.`,
      details: {
        sheets: foundRegionSheets,
        schemeIdColumnPresent,
        requiredColumnsPresent: requiredDataColumns,
        schemesFound
      }
    };
    
  } catch (error) {
    return {
      isValid: false,
      message: `Failed to validate Excel file: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}