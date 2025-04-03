import { read, utils } from 'xlsx';

interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: {
    sheets: string[];
    schemeIdColumnPresent: boolean;
    requiredColumnsPresent: boolean;
    schemesFound: number;
    regionsFound: string[];
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
    
    // Region name patterns for detection
    const REGION_PATTERNS = [
      { pattern: /\bamravati\b/i, name: 'Amravati' },
      { pattern: /\bnashik\b/i, name: 'Nashik' },
      { pattern: /\bnagpur\b/i, name: 'Nagpur' },
      { pattern: /\bpune\b/i, name: 'Pune' },
      { pattern: /\bkonkan\b/i, name: 'Konkan' },
      { pattern: /\bcs\b/i, name: 'Chhatrapati Sambhajinagar' },
      { pattern: /\bsambhajinagar\b/i, name: 'Chhatrapati Sambhajinagar' },
      { pattern: /\bchhatrapati\b/i, name: 'Chhatrapati Sambhajinagar' }
    ];
    
    // Column patterns by field
    const COLUMN_PATTERNS = {
      // Scheme identification
      schemeId: [
        'Scheme ID', 'Scheme Id', 'scheme_id', 'SchemeId', 'SCHEME ID',
        'Scheme_Id', 'Scheme Code', 'SchemeID'
      ],
      
      // Villages related fields
      villages: [
        'Number of Village', 'No. of Village', 'Total Villages', 
        'Number of Villages', 'Villages', 'Total Villages Integrated',
        'Villages Integrated', 'Fully Completed Villages',
        'No. of Functional Village', 'Functional Villages'
      ],
      
      // ESR related fields
      esr: [
        'Total Number of ESR', 'Total ESR', 'ESR Total',
        'Total ESR Integrated', 'ESR Integrated',
        'No. Fully Completed ESR', 'Fully Completed ESR',
        'ESR Fully Completed'
      ],
      
      // Component related fields
      components: [
        'Flow Meters Connected', ' Flow Meters Connected', 'Flow Meters Conneted',
        'Flow Meter Connected', 'Flow Meters', 'FM Connected',
        'Pressure Transmitter Connected', 'Pressure Transmitters Connected',
        'Pressure Transmitter Conneted', 'PT Connected', 'Pressure Transmitters',
        'Residual Chlorine Connected', 'Residual Chlorine Analyzer Connected',
        'Residual Chlorine Conneted', 'RCA Connected', 'Residual Chlorine',
        'Residual Chlorine Analyzers'
      ],
      
      // Status fields
      status: [
        'Fully completion Scheme Status', 'Scheme Status', 'Status',
        'Scheme status', ' Scheme Status', 'Scheme Functional Status',
        'Functional Status'
      ]
    };
    
    const foundRegionSheets: string[] = [];
    const foundRegions: string[] = [];
    
    // Track if required columns are present
    let schemeIdColumnPresent = false;
    let requiredDataColumns = false;
    let schemesFound = 0;
    
    // Detect region from sheet name
    const detectRegionFromSheetName = (sheetName: string): string | null => {
      for (const { pattern, name } of REGION_PATTERNS) {
        if (pattern.test(sheetName)) {
          return name;
        }
      }
      return null;
    };
    
    // Analyze each sheet in the workbook
    for (const sheetName of workbook.SheetNames) {
      // Detect region from sheet name
      const regionName = detectRegionFromSheetName(sheetName);
      
      if (regionName) {
        foundRegionSheets.push(sheetName);
        if (!foundRegions.includes(regionName)) {
          foundRegions.push(regionName);
        }
        
        // Check sheet contents
        const sheet = workbook.Sheets[sheetName];
        const data = utils.sheet_to_json(sheet, { defval: null }) as Record<string, any>[];
        
        if (data && data.length > 0) {
          // Check each row for scheme ID and required columns
          for (const row of data) {
            let hasSchemeId = false;
            
            // Check for scheme ID using patterns
            for (const pattern of COLUMN_PATTERNS.schemeId) {
              if (row[pattern] !== undefined && row[pattern] !== null) {
                hasSchemeId = true;
                schemeIdColumnPresent = true;
                break;
              }
            }
            
            if (hasSchemeId) {
              schemesFound++;
              
              // Check for any required data column
              let hasRequiredDataColumn = false;
              
              // Check villages data
              for (const pattern of COLUMN_PATTERNS.villages) {
                if (row[pattern] !== undefined && row[pattern] !== null) {
                  hasRequiredDataColumn = true;
                  break;
                }
              }
              
              // Check ESR data
              if (!hasRequiredDataColumn) {
                for (const pattern of COLUMN_PATTERNS.esr) {
                  if (row[pattern] !== undefined && row[pattern] !== null) {
                    hasRequiredDataColumn = true;
                    break;
                  }
                }
              }
              
              // Check component data
              if (!hasRequiredDataColumn) {
                for (const pattern of COLUMN_PATTERNS.components) {
                  if (row[pattern] !== undefined && row[pattern] !== null) {
                    hasRequiredDataColumn = true;
                    break;
                  }
                }
              }
              
              // Check status data
              if (!hasRequiredDataColumn) {
                for (const pattern of COLUMN_PATTERNS.status) {
                  if (row[pattern] !== undefined && row[pattern] !== null) {
                    hasRequiredDataColumn = true;
                    break;
                  }
                }
              }
              
              if (hasRequiredDataColumn) {
                requiredDataColumns = true;
              }
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
          schemesFound,
          regionsFound: foundRegions
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
          schemesFound,
          regionsFound: foundRegions
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
          schemesFound,
          regionsFound: foundRegions
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
          schemesFound,
          regionsFound: foundRegions
        }
      };
    }
    
    // All validation passed
    return {
      isValid: true,
      message: `Excel file valid. Found ${schemesFound} schemes across ${foundRegionSheets.length} region sheets (${foundRegions.join(', ')}).`,
      details: {
        sheets: foundRegionSheets,
        schemeIdColumnPresent,
        requiredColumnsPresent: requiredDataColumns,
        schemesFound,
        regionsFound: foundRegions
      }
    };
    
  } catch (error) {
    return {
      isValid: false,
      message: `Failed to validate Excel file: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}