import { Request, Response } from 'express';
import { storage } from '../../storage';
import { parse } from 'csv-parse/sync';
import { updateRegionSummaries } from '../../db';
import { type InsertSchemeStatus } from '@shared/schema';

/**
 * Handle CSV import with column mapping for files without headers
 */
export async function importCsvHandler(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Extract column mappings and region from request body
    let { columnMappings, regionName, tableName } = req.body;
    
    if (!columnMappings || !tableName) {
      return res.status(400).json({ 
        message: "Missing required parameters", 
        details: "Column mappings and table name are required" 
      });
    }
    
    // Handle 'no_region' value from SelectItem to actual null/empty value
    if (regionName === 'no_region') {
      regionName = null;
    }
    
    // Read CSV data from the uploaded file
    const csvData = req.file.buffer.toString('utf-8');
    
    // Parse CSV data according to mappings
    const parsedData = parseCsvData(csvData, JSON.parse(columnMappings));
    
    // Update database records based on the table name
    const result = await updateDatabaseRecords(parsedData, tableName, regionName);
    
    // Update region summaries after import to reflect changes
    await updateRegionSummaries();
    
    // Return success response with details
    return res.status(200).json({
      message: "CSV data imported successfully",
      updatedCount: result.updatedCount,
      details: result.details
    });
  } catch (error) {
    console.error("Error importing CSV data:", error);
    return res.status(500).json({ 
      message: "Failed to import CSV data", 
      error: (error as Error).message 
    });
  }
}

/**
 * Parse CSV data using provided column mappings
 */
function parseCsvData(csvData: string, columnMappings: Record<string, string | number>): any[] {
  // Parse the CSV into records (array of arrays)
  const records = parse(csvData, {
    skip_empty_lines: true,
    trim: true
  });
  
  // Transform records based on column mappings
  return records.map((row: string[]) => {
    const mappedRecord: Record<string, any> = {};
    
    // Apply each column mapping
    for (const [fieldName, columnIndexValue] of Object.entries(columnMappings)) {
      // Skip "not_mapped" values that were added to fix the SelectItem empty value error
      if (columnIndexValue === "not_mapped") {
        mappedRecord[fieldName] = null;
        continue;
      }
      
      // Convert columnIndex to number if it's a string representation of a number
      const colIndex = typeof columnIndexValue === 'string' ? 
                        parseInt(columnIndexValue) : columnIndexValue;
      
      // Check if colIndex is a valid number and within row bounds
      if (!isNaN(colIndex) && colIndex >= 0 && colIndex < row.length) {
        mappedRecord[fieldName] = parseFieldValue(fieldName, row[colIndex]);
      } else {
        mappedRecord[fieldName] = null; // Set null for unmapped columns
      }
    }
    
    return mappedRecord;
  });
}

/**
 * Parse field value based on expected data type
 */
function parseFieldValue(fieldName: string, value: string): any {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // Apply specific parsing rules based on field name patterns
  if (fieldName === 'region' || fieldName === 'scheme_name' || 
      fieldName === 'scheme_id' || fieldName === 'district' || 
      fieldName === 'implementing_agency') {
    return String(value).trim();
  } else if (fieldName === 'scheme_status') {
    // Handle scheme_status specially - keep the original text values
    const trimmedValue = String(value).trim();
    
    // Map common status values to standardized ones
    const statusMap: Record<string, string> = {
      'completed': 'Fully Completed',
      'in progress': 'In Progress',
      'functional': 'Functional',
      'non functional': 'Non Functional',
      'non-functional': 'Non Functional',
      'partial': 'Partial'
    };
    
    // Return mapped value if it exists, otherwise return the original value
    return statusMap[trimmedValue.toLowerCase()] || trimmedValue;
  } else if (fieldName.includes('date')) {
    // Try to parse as date if it looks like a date
    const dateValue = new Date(value);
    return isNaN(dateValue.getTime()) ? value : dateValue.toISOString();
  } else if (fieldName.includes('is_') || fieldName.includes('has_') || 
             fieldName.includes('_status') || fieldName === 'active') {
    return parseBoolean(value);
  } else {
    // Default to number if it looks like a number, otherwise keep as string
    return parseNumber(value) ?? String(value).trim();
  }
}

/**
 * Parse string to boolean
 */
function parseBoolean(value: string): boolean {
  const lowerValue = String(value).toLowerCase().trim();
  return lowerValue === 'yes' || 
         lowerValue === 'true' || 
         lowerValue === '1' || 
         lowerValue === 'y' || 
         lowerValue === 'completed' || 
         lowerValue === 'fully completed';
}

/**
 * Parse string to number
 */
function parseNumber(value: string): number | null {
  const trimmedValue = String(value).trim();
  
  // Remove any commas, spaces, or currency symbols
  const cleanValue = trimmedValue
    .replace(/,/g, '')
    .replace(/₹/g, '')
    .replace(/\$/g, '')
    .replace(/\s/g, '');
  
  const parsedNumber = Number(cleanValue);
  
  return isNaN(parsedNumber) ? null : parsedNumber;
}

/**
 * Update records in the database
 */
async function updateDatabaseRecords(
  data: Record<string, any>[], 
  tableName: string,
  regionName?: string
): Promise<{ updatedCount: number, details: string }> {
  let updatedCount = 0;
  let details = '';
  
  if (tableName === 'scheme_status') {
    // Process scheme status updates
    for (const item of data) {
      try {
        // Add region name if provided via form
        if (regionName && !item.region_name) {
          item.region_name = regionName;
        }
        
        // Skip items without region name
        if (!item.region_name) {
          details += `Skipped item - missing region name\n`;
          continue;
        }
        
        // Set default scheme ID if not provided
        if (!item.scheme_id) {
          // Generate a unique ID based on name and region
          const timestamp = Date.now();
          const randomPart = Math.floor(Math.random() * 1000);
          item.scheme_id = `${item.region_name.substring(0, 3).toUpperCase()}-${timestamp}-${randomPart}`;
        }
        
        // Assign agency based on region if not specified
        if (!item.agency) {
          // Map region to agency according to requirements
          const regionAgencyMap: Record<string, string> = {
            'Amravati': 'M/s Ceinsys',
            'Nashik': 'M/s Ceinsys',
            'Nagpur': 'M/s Rite Water',
            'Chhatrapati Sambhajinagar': 'M/s Rite Water',
            'Konkan': 'M/s Indo/Chetas',
            'Pune': 'M/s Indo/Chetas'
          };
          
          item.agency = regionAgencyMap[item.region_name] || null;
        }
        
        // Check if scheme exists
        const existingScheme = await storage.getSchemeById(item.scheme_id);
        
        if (existingScheme) {
          // Update existing scheme
          const schemeData = {
            ...existingScheme,
            ...item
          };
          
          await storage.updateScheme(schemeData);
          details += `Updated scheme: ${item.scheme_id}\n`;
        } else {
          // Create new scheme
          const schemeData: InsertSchemeStatus = {
            scheme_id: item.scheme_id,
            scheme_name: item.scheme_name || `Scheme ${item.scheme_id}`,
            region_name: item.region_name,
            sr_no: item.sr_no || null,
            circle: item.circle || null,
            division: item.division || null,
            sub_division: item.sub_division || null,
            block: item.block || null,
            agency: item.agency || null,
            total_villages: item.total_villages || 0,
            villages_integrated: item.villages_integrated || 0,
            functional_villages: item.functional_villages || 0,
            partial_villages: item.partial_villages || 0,
            non_functional_villages: item.non_functional_villages || 0,
            fully_completed_villages: item.fully_completed_villages || 0,
            total_esr: item.total_esr || 0,
            scheme_functional_status: item.scheme_functional_status || null,
            esr_integrated_on_iot: item.esr_integrated_on_iot || 0,
            fully_completed_esr: item.fully_completed_esr || 0,
            balance_esr: item.balance_esr || 0,
            flow_meters_connected: item.flow_meters_connected || 0,
            pressure_transmitters_connected: item.pressure_transmitters_connected || 0,
            residual_chlorine_connected: item.residual_chlorine_connected || 0,
            scheme_status: item.scheme_status || 'In Progress'
          };
          
          await storage.createScheme(schemeData);
          details += `Created new scheme: ${item.scheme_id}\n`;
        }
        
        updatedCount++;
      } catch (itemError) {
        console.error('Error processing scheme item:', itemError);
        details += `Error processing item: ${(itemError as Error).message}\n`;
      }
    }
  } else if (tableName === 'region') {
    // Process region updates
    for (const item of data) {
      try {
        // Skip items without region name
        if (!item.region_name) {
          details += `Skipped region - missing region name\n`;
          continue;
        }
        
        // Check if region exists
        const existingRegion = await storage.getRegionByName(item.region_name);
        
        if (existingRegion) {
          // Update existing region
          const regionData = {
            ...existingRegion,
            ...item
          };
          
          await storage.updateRegion(regionData);
          details += `Updated region: ${item.region_name}\n`;
        } else {
          // Create new region with validated fields
          const regionData: { 
            region_name: string; 
            total_esr_integrated?: number | null;
            fully_completed_esr?: number | null;
            partial_esr?: number | null;
            total_villages_integrated?: number | null;
            fully_completed_villages?: number | null;
            total_schemes_integrated?: number | null;
            fully_completed_schemes?: number | null;
            flow_meter_integrated?: number | null;
            rca_integrated?: number | null;
            pressure_transmitter_integrated?: number | null;
          } = {
            region_name: item.region_name,
            total_esr_integrated: item.total_esr_integrated || null,
            fully_completed_esr: item.fully_completed_esr || null,
            partial_esr: item.partial_esr || null,
            total_villages_integrated: item.total_villages_integrated || null,
            fully_completed_villages: item.fully_completed_villages || null,
            total_schemes_integrated: item.total_schemes_integrated || null,
            fully_completed_schemes: item.fully_completed_schemes || null,
            flow_meter_integrated: item.flow_meter_integrated || null,
            rca_integrated: item.rca_integrated || null,
            pressure_transmitter_integrated: item.pressure_transmitter_integrated || null
          };
          
          await storage.createRegion(regionData);
          details += `Created new region: ${item.region_name}\n`;
        }
        
        updatedCount++;
      } catch (itemError) {
        console.error('Error processing region item:', itemError);
        details += `Error processing item: ${(itemError as Error).message}\n`;
      }
    }
  } else {
    throw new Error(`Unsupported table name: ${tableName}`);
  }
  
  return { updatedCount, details };
}