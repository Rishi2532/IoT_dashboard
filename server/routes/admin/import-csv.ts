import { Request, Response } from "express";
import { storage } from "../../storage";
import { parse } from "csv-parse/sync";
import { updateRegionSummaries } from "../../db";
import { type InsertSchemeStatus, type SchemeStatus } from "@shared/schema";

/**
 * Handle CSV import with column mapping and advanced configuration options
 */
export async function importCsvHandler(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Extract parameters from request body
    let { columnMappings, regionName, tableName, delimiter, hasHeader } = req.body;

    if (!columnMappings || !tableName) {
      return res.status(400).json({
        message: "Missing required parameters",
        details: "Column mappings and table name are required",
      });
    }

    // Apply defaults if not provided
    delimiter = delimiter || ",";
    hasHeader = hasHeader === "true" || hasHeader === true;

    // Handle 'no_region' value from SelectItem to actual null/empty value
    if (regionName === "no_region" || regionName === "") {
      regionName = null;
    }

    // Read CSV data from the uploaded file
    const csvData = req.file.buffer.toString("utf-8");

    console.log(`Importing CSV with delimiter: '${delimiter}', hasHeader: ${hasHeader}, tableName: ${tableName}`);

    // Parse CSV data according to mappings and options
    const parsedData = parseCsvData(
      csvData, 
      JSON.parse(columnMappings), 
      delimiter, 
      hasHeader
    );

    // Update database records based on the table name
    const result = await updateDatabaseRecords(
      parsedData,
      tableName,
      regionName,
    );

    // Update region summaries after import to reflect changes
    await updateRegionSummaries();

    // Return success response with details
    return res.status(200).json({
      message: "CSV data imported successfully",
      updatedCount: result.updatedCount,
      details: result.details,
    });
  } catch (error) {
    console.error("Error importing CSV data:", error);
    return res.status(500).json({
      message: "Failed to import CSV data",
      error: (error as Error).message,
    });
  }
}

/**
 * Parse CSV data using provided column mappings and options
 */
function parseCsvData(
  csvData: string,
  columnMappings: Record<string, string | number>,
  delimiter: string = ",",
  hasHeader: boolean = false,
): any[] {
  // Parse options
  const parseOptions = {
    delimiter: delimiter,
    skip_empty_lines: true,
    trim: true,
    from_line: hasHeader ? 2 : 1, // Skip header row if present
  };

  // Parse the CSV into records (array of arrays)
  const records = parse(csvData, parseOptions);

  // Transform records based on column mappings
  return records.map((row: string[]) => {
    const mappedRecord: Record<string, any> = {};

    // Apply each column mapping
    for (const [fieldName, columnIndexValue] of Object.entries(
      columnMappings,
    )) {
      // Skip "not_mapped" values that were added to fix the SelectItem empty value error
      if (columnIndexValue === "not_mapped") {
        mappedRecord[fieldName] = null;
        continue;
      }

      // Convert columnIndex to number if it's a string representation of a number
      const colIndex =
        typeof columnIndexValue === "string"
          ? parseInt(columnIndexValue)
          : columnIndexValue;

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
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Apply specific parsing rules based on field name patterns
  if (
    fieldName === "region" ||
    fieldName === "scheme_name" ||
    fieldName === "scheme_id" ||
    fieldName === "district" ||
    fieldName === "implementing_agency"
  ) {
    return String(value).trim();
  } else if (fieldName === "fully_completion_scheme_status" || fieldName === "scheme_functional_status") {
    // Handle status fields specially - keep the original text values
    const trimmedValue = String(value).trim();
    const lowerValue = trimmedValue.toLowerCase();

    // Map common status values to standardized ones
    const statusMap: Record<string, string> = {
      "completed": "Fully Completed",
      "fully completed": "Fully Completed",
      "fully-completed": "Fully Completed",
      "complete": "Fully Completed",
      "yes": "Fully Completed",
      "true": "Fully Completed",
      "1": "Fully Completed",
      "y": "Fully Completed",
      "partial": "Partial",
      "in progress": "In Progress",
      "in-progress": "In Progress",
      "no": "In Progress",
      "false": "In Progress",
      "0": "In Progress",
      "n": "In Progress",
      "functional": "Functional",
      "non functional": "Non Functional",
      "non-functional": "Non Functional",
      "not functional": "Non Functional",
      "not connected": "Not-Connected",
      "not-connected": "Not-Connected",
      "disconnected": "Not-Connected",
    };

    // Special handling for functional status field
    if (fieldName === "scheme_functional_status") {
      // Ensure correct mapping for functional status
      const functionalStatusMap: Record<string, string> = {
        ...statusMap,
        "complete": "Functional", // Override for functional status
        "completed": "Functional",
        "fully completed": "Functional",
        "fully-completed": "Functional",
        "yes": "Functional",
        "true": "Functional",
        "1": "Functional",
        "y": "Functional"
      };
      return functionalStatusMap[lowerValue] || trimmedValue;
    }

    // Return mapped value if it exists, otherwise return the original value
    return statusMap[lowerValue] || trimmedValue;
  } else if (fieldName === "mjp_commissioned") {
    // For MJP columns, use exactly the values from the CSV without normalizing
    return String(value).trim();
  } else if (fieldName === "mjp_fully_completed") {
    // For MJP columns, use exactly the values from the CSV without normalizing
    return String(value).trim();
  
  } else if (fieldName.includes("date")) {
    // Try to parse as date if it looks like a date
    const dateValue = new Date(value);
    return isNaN(dateValue.getTime()) ? value : dateValue.toISOString();
  } else if (
    fieldName.includes("is_") ||
    fieldName.includes("has_") ||
    (fieldName.includes("_status") &&
      fieldName !== "fully_completion_scheme_status" &&
      fieldName !== "scheme_functional_status") ||
    fieldName === "active"
  ) {
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
  return (
    lowerValue === "yes" ||
    lowerValue === "true" ||
    lowerValue === "1" ||
    lowerValue === "y" ||
    lowerValue === "completed" ||
    lowerValue === "fully completed"
  );
}

/**
 * Parse string to number
 */
function parseNumber(value: string): number | null {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const trimmedValue = String(value).trim();
  
  // Skip values that clearly aren't numbers (contain letters other than 'e' for scientific notation)
  if (/[a-df-zA-DF-Z]/.test(trimmedValue)) {
    return null;
  }

  // Remove any commas, spaces, or currency symbols
  const cleanValue = trimmedValue
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/\$/g, "")
    .replace(/\s/g, "");

  const parsedNumber = Number(cleanValue);

  // Additional validation to ensure we don't return NaN or Infinity
  if (isNaN(parsedNumber) || !isFinite(parsedNumber)) {
    return null;
  }

  return parsedNumber;
}

/**
 * Update records in the database
 */
async function updateDatabaseRecords(
  data: Record<string, any>[],
  tableName: string,
  regionName?: string,
): Promise<{ updatedCount: number; details: string }> {
  let updatedCount = 0;
  let details = "";

  if (tableName === "fully_completion_scheme_status" || tableName === "scheme_status") {
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
            Amravati: "M/s Ceinsys",
            Nashik: "M/s Ceinsys",
            Nagpur: "M/s Rite Water",
            "Chhatrapati Sambhajinagar": "M/s Rite Water",
            Konkan: "M/s Indo/Chetas",
            Pune: "M/s Indo/Chetas",
          };

          item.agency = regionAgencyMap[item.region_name] || null;
        }

        // Check if scheme exists with same ID and block
        const existingScheme = await storage.getSchemeByIdAndBlock(item.scheme_id, item.block);

        if (existingScheme) {
          // Update existing scheme with the same ID and block
          // FIXED: Only update specific fields from the import, don't blindly apply all fields with spread
          const schemeData: SchemeStatus = {
            ...existingScheme,
            scheme_name: item.scheme_name || existingScheme.scheme_name,
            region: item.region || existingScheme.region,
            circle: item.circle || existingScheme.circle,
            division: item.division || existingScheme.division,
            sub_division: item.sub_division || existingScheme.sub_division,
            block: item.block, // Keep the original block
            agency: item.agency || existingScheme.agency,
            number_of_village: item.number_of_village !== undefined && typeof item.number_of_village === 'number' 
              ? item.number_of_village : existingScheme.number_of_village,
            total_villages_integrated: item.total_villages_integrated !== undefined && typeof item.total_villages_integrated === 'number' 
              ? item.total_villages_integrated : existingScheme.total_villages_integrated,
            no_of_functional_village: item.no_of_functional_village !== undefined && typeof item.no_of_functional_village === 'number' 
              ? item.no_of_functional_village : existingScheme.no_of_functional_village,
            no_of_partial_village: item.no_of_partial_village !== undefined && typeof item.no_of_partial_village === 'number' 
              ? item.no_of_partial_village : existingScheme.no_of_partial_village,
            no_of_non_functional_village: item.no_of_non_functional_village !== undefined && typeof item.no_of_non_functional_village === 'number' 
              ? item.no_of_non_functional_village : existingScheme.no_of_non_functional_village,
            fully_completed_villages: item.fully_completed_villages !== undefined && typeof item.fully_completed_villages === 'number' 
              ? item.fully_completed_villages : existingScheme.fully_completed_villages,
            total_number_of_esr: item.total_number_of_esr !== undefined && typeof item.total_number_of_esr === 'number' 
              ? item.total_number_of_esr : existingScheme.total_number_of_esr,
            total_esr_integrated: item.total_esr_integrated !== undefined && typeof item.total_esr_integrated === 'number' 
              ? item.total_esr_integrated : existingScheme.total_esr_integrated,
            no_fully_completed_esr: item.no_fully_completed_esr !== undefined && typeof item.no_fully_completed_esr === 'number' 
              ? item.no_fully_completed_esr : existingScheme.no_fully_completed_esr,
            balance_to_complete_esr: item.balance_to_complete_esr !== undefined && typeof item.balance_to_complete_esr === 'number' 
              ? item.balance_to_complete_esr : existingScheme.balance_to_complete_esr,
            flow_meters_connected: item.flow_meters_connected !== undefined && typeof item.flow_meters_connected === 'number' 
              ? item.flow_meters_connected : existingScheme.flow_meters_connected,
            pressure_transmitter_connected: item.pressure_transmitter_connected !== undefined && typeof item.pressure_transmitter_connected === 'number' 
              ? item.pressure_transmitter_connected : existingScheme.pressure_transmitter_connected,
            residual_chlorine_analyzer_connected: item.residual_chlorine_analyzer_connected !== undefined && typeof item.residual_chlorine_analyzer_connected === 'number' 
              ? item.residual_chlorine_analyzer_connected : existingScheme.residual_chlorine_analyzer_connected,
            scheme_functional_status: item.scheme_functional_status || existingScheme.scheme_functional_status,
            fully_completion_scheme_status: item.fully_completion_scheme_status || existingScheme.fully_completion_scheme_status,
            mjp_commissioned: item.mjp_commissioned || existingScheme.mjp_commissioned || "",
            mjp_fully_completed: item.mjp_fully_completed || existingScheme.mjp_fully_completed || "",
            dashboard_url: item.dashboard_url || (item.scheme_name !== existingScheme.scheme_name ? null : existingScheme.dashboard_url), // Force regeneration if scheme name changed
          };

          await storage.updateScheme(schemeData);
          details += `Updated scheme: ${item.scheme_id} in block ${item.block}\n`;
        } else {
          // Create new scheme (dashboard_url is automatically generated in the storage.createScheme method)
          const schemeData: InsertSchemeStatus = {
            scheme_id: String(item.scheme_id),
            scheme_name: item.scheme_name || `Scheme ${item.scheme_id}`,
            region: item.region,
            sr_no: typeof item.sr_no === 'number' ? item.sr_no : null,
            circle: item.circle || null,
            division: item.division || null,
            sub_division: item.sub_division || null,
            block: item.block || null,
            agency: item.agency || null,
            number_of_village: typeof item.number_of_village === 'number' ? item.number_of_village : 0,
            total_villages_integrated: typeof item.total_villages_integrated === 'number' ? item.total_villages_integrated : 0,
            no_of_functional_village: typeof item.no_of_functional_village === 'number' ? item.no_of_functional_village : 0,
            no_of_partial_village: typeof item.no_of_partial_village === 'number' ? item.no_of_partial_village : 0,
            no_of_non_functional_village: typeof item.no_of_non_functional_village === 'number' ? item.no_of_non_functional_village : 0,
            fully_completed_villages: typeof item.fully_completed_villages === 'number' ? item.fully_completed_villages : 0,
            total_number_of_esr: typeof item.total_number_of_esr === 'number' ? item.total_number_of_esr : 0,
            scheme_functional_status: item.scheme_functional_status || "Functional",
            total_esr_integrated: typeof item.total_esr_integrated === 'number' ? item.total_esr_integrated : 0,
            no_fully_completed_esr: typeof item.no_fully_completed_esr === 'number' ? item.no_fully_completed_esr : 0,
            balance_to_complete_esr: typeof item.balance_to_complete_esr === 'number' ? item.balance_to_complete_esr : 0,
            flow_meters_connected: typeof item.flow_meters_connected === 'number' ? item.flow_meters_connected : 0,
            pressure_transmitter_connected: typeof item.pressure_transmitter_connected === 'number' ? item.pressure_transmitter_connected : 0,
            residual_chlorine_analyzer_connected: typeof item.residual_chlorine_analyzer_connected === 'number' ? item.residual_chlorine_analyzer_connected : 0,
            fully_completion_scheme_status: item.fully_completion_scheme_status || "In Progress",
            mjp_commissioned: item.mjp_commissioned || "",
            mjp_fully_completed: item.mjp_fully_completed || "",
            dashboard_url: item.dashboard_url || null, // Use dashboard_url from import if available
          };

          await storage.createScheme(schemeData);
          details += `Created new scheme: ${item.scheme_id}\n`;
        }

        updatedCount++;
      } catch (itemError) {
        console.error("Error processing scheme item:", itemError);
        details += `Error processing item: ${(itemError as Error).message}\n`;
      }
    }
  } else if (tableName === "region") {
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
            ...item,
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
            pressure_transmitter_integrated:
              item.pressure_transmitter_integrated || null,
          };

          await storage.createRegion(regionData);
          details += `Created new region: ${item.region_name}\n`;
        }

        updatedCount++;
      } catch (itemError) {
        console.error("Error processing region item:", itemError);
        details += `Error processing item: ${(itemError as Error).message}\n`;
      }
    }
  } else {
    throw new Error(`Unsupported table name: ${tableName}`);
  }

  return { updatedCount, details };
}
