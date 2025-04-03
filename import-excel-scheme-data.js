import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection setup
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

// Map region names to their standardized format
const regionMapping = {
  'Nagpur': 'Nagpur',
  'Amravati': 'Amravati',
  'Nashik': 'Nashik',
  'Pune': 'Pune',
  'Konkan': 'Konkan',
  'CS': 'Chhatrapati Sambhajinagar',
  'Chhatrapati Sambhajinagar': 'Chhatrapati Sambhajinagar'
};

async function processExcelFile(filePath) {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(`Processing Excel file: ${filePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    console.log(`Successfully read Excel file with ${workbook.SheetNames.length} sheets`);
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\nProcessing sheet: ${sheetName}`);
      
      // Get sheet data
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (!data || data.length === 0) {
        console.log(`No data found in sheet ${sheetName}, skipping`);
        continue;
      }
      
      console.log(`Found ${data.length} rows in this sheet`);
      
      // Identify column headers
      const firstRow = data[0];
      const headers = Object.keys(firstRow);
      
      // Print headers for debugging
      console.log("Headers found:", headers);
      
      // Try to identify the region
      let regionName = null;
      
      // First look in the sheet name
      for (const [key, value] of Object.entries(regionMapping)) {
        if (sheetName.includes(key)) {
          regionName = value;
          break;
        }
      }
      
      // If not found in sheet name, try to find it in the data
      if (!regionName) {
        for (const row of data) {
          for (const header of headers) {
            if (row[header] && typeof row[header] === 'string') {
              for (const [key, value] of Object.entries(regionMapping)) {
                if (row[header].includes(key)) {
                  regionName = value;
                  break;
                }
              }
              if (regionName) break;
            }
          }
          if (regionName) break;
        }
      }
      
      if (!regionName) {
        console.log(`Could not identify region for sheet ${sheetName}, skipping`);
        continue;
      }
      
      console.log(`Identified region: ${regionName}`);
      
      // Find the scheme ID, name, and other required columns
      let schemeIdCol = findColumnByHeaderNames(headers, ['Scheme ID', 'SchemeID', 'Scheme Id', 'ID', 'scheme_id']);
      let schemeNameCol = findColumnByHeaderNames(headers, ['Scheme Name', 'SchemeName', 'Name', 'scheme_name']);
      let totalVillagesCol = findColumnByHeaderNames(headers, ['Number of Village', 'No. of Village', 'Total Villages', 'Villages', 'Number of Villages']);
      let functionalVillagesCol = findColumnByHeaderNames(headers, ['No. of Functional Village', 'Functional Villages', 'Functional Village']);
      let partialVillagesCol = findColumnByHeaderNames(headers, ['No. of Partial Village', 'Partial Villages', 'Partial Village']);
      let nonFunctionalVillagesCol = findColumnByHeaderNames(headers, ['No. of Non- Functional Village', 'Non Functional Villages', 'Non-Functional Village']);
      let fullyCompletedVillagesCol = findColumnByHeaderNames(headers, ['Fully completed Villages', 'Completed Villages', 'Fully Completed Villages']);
      let totalESRCol = findColumnByHeaderNames(headers, ['Total Number of ESR', 'ESR', 'Total ESR', 'Total Number of ESR']);
      let schemeFunctionalStatusCol = findColumnByHeaderNames(headers, ['Scheme Functional Status', 'Functional Status', 'Scheme Status']);
      let fullyCompletedESRCol = findColumnByHeaderNames(headers, ['No. Fully Completed ESR', 'Completed ESR', 'Fully Completed ESR']);
      let balanceESRCol = findColumnByHeaderNames(headers, ['Balance to Complete ESR', 'Balance ESR', 'Balance']);
      let flowMetersCol = findColumnByHeaderNames(headers, ['Flow Meters Conneted', 'Flow Meters', 'Flow Meter Connected']);
      let pressureTransmittersCol = findColumnByHeaderNames(headers, ['Pressure Transmitter Conneted', 'Pressure Transmitters', 'PT']);
      let residualChlorineCol = findColumnByHeaderNames(headers, ['Residual Chlorine Conneted', 'RCA', 'Chlorine', 'Residual Chlorine']);
      let schemeStatusCol = findColumnByHeaderNames(headers, ['Fully completion Scheme Status', 'Scheme Status', 'Status', 'Scheme Completion Status']);
      
      // If we couldn't find the key columns, try to use numerical patterns
      if (!schemeIdCol && headers.length > 6) schemeIdCol = headers[6]; // Usually 7th column
      if (!schemeNameCol && headers.length > 7) schemeNameCol = headers[7]; // Usually 8th column
      if (!totalVillagesCol && headers.length > 8) totalVillagesCol = headers[8]; // Usually 9th column
      
      console.log("Column mapping:");
      console.log(`  Scheme ID: ${schemeIdCol}`);
      console.log(`  Scheme Name: ${schemeNameCol}`);
      console.log(`  Total Villages: ${totalVillagesCol}`);
      console.log(`  Functional Villages: ${functionalVillagesCol}`);
      console.log(`  Scheme Status: ${schemeStatusCol}`);
      
      // Process each row for this region
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Skip rows without essential data
        if (!row[schemeIdCol] || !row[schemeNameCol]) {
          console.log(`Skipping row ${i + 1} - missing scheme ID or name`);
          continue;
        }
        
        // Extract data from row
        const schemeId = String(row[schemeIdCol]);
        const schemeName = String(row[schemeNameCol]);
        
        // Skip header rows
        if (schemeId === 'Scheme ID' || schemeName === 'Scheme Name' ||
            schemeId.toLowerCase().includes('sr') || schemeId.toLowerCase().includes('scheme id')) {
          console.log(`Skipping header row: ${schemeId} - ${schemeName}`);
          continue;
        }
        
        console.log(`Processing scheme: ${schemeId} - ${schemeName}`);
        
        // Extract all data
        const totalVillages = getNumericValue(row[totalVillagesCol]);
        const functionalVillages = getNumericValue(row[functionalVillagesCol]);
        const partialVillages = getNumericValue(row[partialVillagesCol]);
        const nonFunctionalVillages = getNumericValue(row[nonFunctionalVillagesCol]);
        const fullyCompletedVillages = getNumericValue(row[fullyCompletedVillagesCol]);
        const totalESR = getNumericValue(row[totalESRCol]);
        const schemeFunctionalStatus = row[schemeFunctionalStatusCol] || 'Partial';
        const fullyCompletedESR = getNumericValue(row[fullyCompletedESRCol]);
        const balanceESR = getNumericValue(row[balanceESRCol]);
        const flowMeters = getNumericValue(row[flowMetersCol]);
        const pressureTransmitters = getNumericValue(row[pressureTransmittersCol]);
        const residualChlorine = getNumericValue(row[residualChlorineCol]);
        const rawSchemeStatus = row[schemeStatusCol] || 'In Progress';
        
        // Determine scheme completion status
        let schemeCompletionStatus = 'Partial';
        if (rawSchemeStatus === 'Completed' || schemeFunctionalStatus === 'Functional') {
          schemeCompletionStatus = 'Fully-Completed';
        } else if (schemeFunctionalStatus === 'Non-Functional') {
          schemeCompletionStatus = 'Not-Connected';
        }
        
        // Get agency based on region
        const agency = getAgencyByRegion(regionName);
        
        // Check if this scheme already exists in the database
        const existingScheme = await pool.query(
          'SELECT * FROM scheme_status WHERE scheme_id = $1',
          [schemeId]
        );
        
        const schemeData = {
          scheme_id: schemeId,
          scheme_name: schemeName,
          region_name: regionName,
          total_villages: totalVillages,
          functional_villages: functionalVillages,
          partial_villages: partialVillages,
          non_functional_villages: nonFunctionalVillages,
          fully_completed_villages: fullyCompletedVillages,
          total_esr: totalESR,
          scheme_functional_status: schemeFunctionalStatus,
          fully_completed_esr: fullyCompletedESR,
          balance_esr: balanceESR || (totalESR - fullyCompletedESR),
          flow_meters_connected: flowMeters,
          pressure_transmitters_connected: pressureTransmitters,
          residual_chlorine_connected: residualChlorine,
          scheme_status: schemeCompletionStatus,
          agency: agency
        };
        
        if (existingScheme.rows.length === 0) {
          // Insert new scheme
          await pool.query(
            `INSERT INTO scheme_status (
              scheme_id, scheme_name, region_name, total_villages, functional_villages,
              partial_villages, non_functional_villages, fully_completed_villages,
              total_esr, scheme_functional_status, fully_completed_esr, balance_esr,
              flow_meters_connected, pressure_transmitters_connected, residual_chlorine_connected,
              scheme_status, agency
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            )`,
            [
              schemeData.scheme_id, schemeData.scheme_name, schemeData.region_name,
              schemeData.total_villages, schemeData.functional_villages,
              schemeData.partial_villages, schemeData.non_functional_villages,
              schemeData.fully_completed_villages, schemeData.total_esr,
              schemeData.scheme_functional_status, schemeData.fully_completed_esr,
              schemeData.balance_esr, schemeData.flow_meters_connected,
              schemeData.pressure_transmitters_connected, schemeData.residual_chlorine_connected,
              schemeData.scheme_status, schemeData.agency
            ]
          );
          console.log(`Inserted new scheme: ${schemeId} - ${schemeName}`);
        } else {
          // Update existing scheme
          await pool.query(
            `UPDATE scheme_status SET
              scheme_name = $1,
              region_name = $2,
              total_villages = $3,
              functional_villages = $4,
              partial_villages = $5,
              non_functional_villages = $6,
              fully_completed_villages = $7,
              total_esr = $8,
              scheme_functional_status = $9,
              fully_completed_esr = $10,
              balance_esr = $11,
              flow_meters_connected = $12,
              pressure_transmitters_connected = $13,
              residual_chlorine_connected = $14,
              scheme_status = $15,
              agency = $16
            WHERE scheme_id = $17`,
            [
              schemeData.scheme_name, schemeData.region_name,
              schemeData.total_villages, schemeData.functional_villages,
              schemeData.partial_villages, schemeData.non_functional_villages,
              schemeData.fully_completed_villages, schemeData.total_esr,
              schemeData.scheme_functional_status, schemeData.fully_completed_esr,
              schemeData.balance_esr, schemeData.flow_meters_connected,
              schemeData.pressure_transmitters_connected, schemeData.residual_chlorine_connected,
              schemeData.scheme_status, schemeData.agency, schemeData.scheme_id
            ]
          );
          console.log(`Updated existing scheme: ${schemeId} - ${schemeName}`);
        }
      }
    }
    
    // Update region summaries
    await updateRegionSummaries(pool);
    
    console.log("Excel import completed successfully");
    return true;
  } catch (error) {
    console.error("Error processing Excel file:", error);
    return false;
  } finally {
    await pool.end();
  }
}

// Helper function to find column by possible header names
function findColumnByHeaderNames(headers, possibleNames) {
  for (const header of headers) {
    for (const possibleName of possibleNames) {
      if (header.toLowerCase().includes(possibleName.toLowerCase())) {
        return header;
      }
    }
  }
  return null;
}

// Helper function to get numeric value
function getNumericValue(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value.replace(/[^0-9.-]+/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Get agency by region
function getAgencyByRegion(regionName) {
  const agencies = {
    'Nagpur': 'M/S Tata Consultancy Services',
    'Amravati': 'M/S Tata Consultancy Services',
    'Nashik': 'M/S Tata Consultancy Services',
    'Pune': 'M/S Tata Consultancy Services',
    'Konkan': 'M/S Tata Consultancy Services',
    'Chhatrapati Sambhajinagar': 'M/S Tata Consultancy Services'
  };
  
  return agencies[regionName] || 'M/S Tata Consultancy Services';
}

// Update region summaries
async function updateRegionSummaries(pool) {
  console.log("Updating region summaries...");
  
  try {
    // Get all the regions
    const regionsResult = await pool.query('SELECT region_name FROM region');
    const regions = regionsResult.rows.map(row => row.region_name);
    
    for (const region of regions) {
      // Calculate totals from scheme_status table
      const totalsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_schemes_integrated,
          SUM(CASE WHEN scheme_status = 'Fully-Completed' THEN 1 ELSE 0 END) as fully_completed_schemes,
          SUM(total_villages) as total_villages_integrated,
          SUM(fully_completed_villages) as fully_completed_villages,
          SUM(total_esr) as total_esr_integrated,
          SUM(fully_completed_esr) as fully_completed_esr,
          SUM(total_esr - fully_completed_esr) as partial_esr,
          SUM(flow_meters_connected) as flow_meter_integrated,
          SUM(residual_chlorine_connected) as rca_integrated,
          SUM(pressure_transmitters_connected) as pressure_transmitter_integrated
        FROM scheme_status
        WHERE region_name = $1
      `, [region]);
      
      if (totalsResult.rows.length > 0) {
        const totals = totalsResult.rows[0];
        
        // Update the region record
        await pool.query(`
          UPDATE region SET
            total_schemes_integrated = $1,
            fully_completed_schemes = $2,
            total_villages_integrated = $3,
            fully_completed_villages = $4,
            total_esr_integrated = $5,
            fully_completed_esr = $6,
            partial_esr = $7,
            flow_meter_integrated = $8,
            rca_integrated = $9,
            pressure_transmitter_integrated = $10
          WHERE region_name = $11
        `, [
          totals.total_schemes_integrated || 0,
          totals.fully_completed_schemes || 0,
          totals.total_villages_integrated || 0,
          totals.fully_completed_villages || 0,
          totals.total_esr_integrated || 0,
          totals.fully_completed_esr || 0,
          totals.partial_esr || 0,
          totals.flow_meter_integrated || 0,
          totals.rca_integrated || 0,
          totals.pressure_transmitter_integrated || 0,
          region
        ]);
        
        console.log(`Updated summary data for region: ${region}`);
      }
    }
    
    console.log("All region summaries updated successfully");
  } catch (error) {
    console.error("Error updating region summaries:", error);
  }
}

// Run the import function
const filePath = path.join(__dirname, 'attached_assets', 'scheme_status_table.xlsx');
console.log(`Starting import process for Excel file: ${filePath}`);

processExcelFile(filePath)
  .then(success => {
    if (success) {
      console.log("Excel data import completed successfully");
      process.exit(0);
    } else {
      console.error("Excel data import failed");
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Unhandled error in import script:", error);
    process.exit(1);
  });