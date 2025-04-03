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

// Map region to prefix for scheme_id generation
const regionPrefixes = {
  'Nagpur': 'NG',
  'Amravati': 'AM',
  'Nashik': 'NS',
  'Pune': 'PN',
  'Konkan': 'KK',
  'Chhatrapati Sambhajinagar': 'CS'
};

// Read the JSON file
async function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    return null;
  }
}

// Map scheme data from JSON to our database schema
function mapSchemeData(item, region) {
  // Extract the data using the appropriate keys based on the region
  let schemeName, totalVillages, functionalVillages, partialVillages;
  let nonFunctionalVillages, fullyCompletedVillages, totalESR, schemeFunctionalStatus;
  let fullyCompletedESR, balanceESR, flowMeters, pressureTransmitters, residualChlorine, schemeStatus;
  let schemeId;

  if (region === 'Nagpur') {
    // Nagpur has a different structure with direct keys
    schemeName = item['Scheme Name'] || '';
    totalVillages = parseInt(item['Number of Village'] || 0);
    functionalVillages = parseInt(item['No. of Functional Village'] || 0);
    partialVillages = parseInt(item['No. of Partial Village'] || 0);
    nonFunctionalVillages = parseInt(item['No. of Non- Functional Village'] || 0);
    fullyCompletedVillages = parseInt(item['Fully completed Villages'] || 0);
    totalESR = parseInt(item['Total Number of ESR'] || 0);
    schemeFunctionalStatus = item['Scheme Functional Status'] || 'Partial';
    fullyCompletedESR = parseInt(item['No. Fully Completed ESR'] || 0);
    balanceESR = parseInt(item['Balance to Complete ESR'] || 0);
    flowMeters = parseInt(item[' Flow Meters Conneted'] || 0);
    pressureTransmitters = parseInt(item['Pressure Transmitter Conneted'] || 0);
    residualChlorine = parseInt(item['Residual Chlorine Conneted'] || 0);
    schemeStatus = item['Fully completion Scheme Status'] || 'In Progress';
    schemeId = item['Scheme ID'] || '';
  } else {
    // Other regions have a column-based structure
    schemeName = item['Column8'] || '';
    totalVillages = parseInt(item['Column9'] || 0);
    functionalVillages = parseInt(item['Column10'] || 0);
    partialVillages = parseInt(item['Column11'] || 0);
    nonFunctionalVillages = parseInt(item['Column12'] || 0);
    fullyCompletedVillages = parseInt(item['Column13'] || 0);
    totalESR = parseInt(item['Column14'] || 0);
    schemeFunctionalStatus = item['Column15'] || 'Partial';
    fullyCompletedESR = parseInt(item['Column16'] || 0);
    balanceESR = parseInt(item['Column17'] || 0);
    flowMeters = parseInt(item['Column18'] || 0);
    pressureTransmitters = parseInt(item['Column19'] || 0);
    residualChlorine = parseInt(item['Column20'] || 0);
    schemeStatus = item['Column21'] || 'In Progress';
    schemeId = item['Column7'] || '';
  }

  // Determine the appropriate scheme completion status
  let schemeCompletionStatus = 'Partial';
  if (schemeStatus === 'Completed' || schemeFunctionalStatus === 'Functional') {
    schemeCompletionStatus = 'Fully-Completed';
  } else if (schemeFunctionalStatus === 'Non-Functional') {
    schemeCompletionStatus = 'Not-Connected';
  }

  return {
    originalSchemeId: schemeId,
    scheme_name: schemeName,
    region_name: region,
    total_villages: totalVillages,
    functional_villages: functionalVillages,
    partial_villages: partialVillages,
    non_functional_villages: nonFunctionalVillages,
    fully_completed_villages: fullyCompletedVillages,
    total_esr: totalESR,
    scheme_functional_status: schemeFunctionalStatus,
    fully_completed_esr: fullyCompletedESR,
    balance_esr: balanceESR,
    flow_meters_connected: flowMeters,
    pressure_transmitters_connected: pressureTransmitters,
    residual_chlorine_connected: residualChlorine,
    scheme_status: schemeCompletionStatus,
    agency: getAgencyByRegion(region)
  };
}

// Get agency name based on region
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

// Check if a scheme exists in the database
async function schemeExists(schemeId) {
  const pool = new pg.Pool(dbConfig);
  try {
    const result = await pool.query('SELECT * FROM scheme_status WHERE scheme_id = $1', [schemeId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking if scheme exists:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Import data from JSON to database
async function importData(data) {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Get existing scheme IDs
    const existingSchemes = await pool.query('SELECT scheme_id, scheme_name, region_name FROM scheme_status');
    const existingIds = existingSchemes.rows.map(row => row.scheme_id);
    const existingSchemesMap = {};
    
    existingSchemes.rows.forEach(scheme => {
      const key = `${scheme.region_name}:${scheme.scheme_name}`;
      existingSchemesMap[key] = scheme.scheme_id;
    });
    
    console.log(`Found ${existingIds.length} existing scheme IDs in database`);
    
    // Track scheme IDs per region for new schemes
    const regionCounters = {};
    
    // Process each region
    for (const regionKey in data) {
      // Extract region name from the key (e.g., "Region - Nagpur" -> "Nagpur")
      let regionName = regionKey.replace('Region - ', '').trim();
      
      // Normalize region name
      for (const [key, value] of Object.entries(regionMapping)) {
        if (regionName.includes(key)) {
          regionName = value;
          break;
        }
      }
      
      console.log(`\nProcessing region: ${regionName}`);
      
      // Initialize counter for this region if not exists
      if (!regionCounters[regionName]) {
        // Find the highest existing scheme number for this region
        const regionPrefix = regionPrefixes[regionName] || 'XX';
        const existingRegionSchemes = existingSchemes.rows
          .filter(scheme => scheme.scheme_id.startsWith(regionPrefix))
          .map(scheme => {
            const match = scheme.scheme_id.match(/-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          });
          
        regionCounters[regionName] = existingRegionSchemes.length > 0 
          ? Math.max(...existingRegionSchemes) + 1 
          : 1;
      }
      
      // Get the region data
      const regionData = data[regionKey];
      
      if (!Array.isArray(regionData) || regionData.length === 0) {
        console.log(`No data found for region ${regionName}, skipping`);
        continue;
      }
      
      console.log(`Found ${regionData.length} items in region ${regionName}`);
      
      // Skip the header rows (if any)
      const itemsToProcess = regionData.filter(item => {
        if (!item) return false;
        
        // Skip header rows
        if (regionName === 'Nagpur') {
          return item['Sr No.'] !== 'Sr No.' && item['Sr No.'] !== undefined;
        } else {
          return item['Column1'] !== 'Sr No.' && item['Column1'] !== undefined;
        }
      });
      
      console.log(`Processing ${itemsToProcess.length} schemes for region ${regionName}`);
      
      // Process each scheme
      for (const item of itemsToProcess) {
        try {
          // Map the data
          const schemeData = mapSchemeData(item, regionName);
          
          // Skip items without a scheme name
          if (!schemeData.scheme_name) {
            console.log("Skipping item without scheme name");
            continue;
          }
          
          console.log(`Processing scheme: ${schemeData.scheme_name}`);
          
          // Check if scheme already exists by name and region
          const schemeKey = `${regionName}:${schemeData.scheme_name}`;
          let schemeId = existingSchemesMap[schemeKey];
          
          // If scheme doesn't exist, generate a new ID
          if (!schemeId) {
            const prefix = regionPrefixes[regionName] || 'XX';
            schemeId = `${prefix}-${regionCounters[regionName].toString().padStart(3, '0')}`;
            regionCounters[regionName]++;
            existingSchemesMap[schemeKey] = schemeId;
            console.log(`Generated new scheme ID: ${schemeId} for scheme: ${schemeData.scheme_name}`);
          } else {
            console.log(`Found existing scheme ID: ${schemeId} for scheme: ${schemeData.scheme_name}`);
          }
          
          // Set the scheme ID
          schemeData.scheme_id = schemeId;
          
          // Check if scheme exists in database
          const schemeExists = await pool.query('SELECT * FROM scheme_status WHERE scheme_id = $1', [schemeId]);
          
          if (schemeExists.rows.length === 0) {
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
            console.log(`Inserted new scheme: ${schemeData.scheme_name} with ID ${schemeId}`);
          } else {
            // Update existing scheme
            await pool.query(
              `UPDATE scheme_status SET
                scheme_name = $1,
                total_villages = $2,
                functional_villages = $3,
                partial_villages = $4,
                non_functional_villages = $5,
                fully_completed_villages = $6,
                total_esr = $7,
                scheme_functional_status = $8,
                fully_completed_esr = $9,
                balance_esr = $10,
                flow_meters_connected = $11,
                pressure_transmitters_connected = $12,
                residual_chlorine_connected = $13,
                scheme_status = $14,
                agency = $15
              WHERE scheme_id = $16`,
              [
                schemeData.scheme_name,
                schemeData.total_villages, schemeData.functional_villages,
                schemeData.partial_villages, schemeData.non_functional_villages,
                schemeData.fully_completed_villages, schemeData.total_esr,
                schemeData.scheme_functional_status, schemeData.fully_completed_esr,
                schemeData.balance_esr, schemeData.flow_meters_connected,
                schemeData.pressure_transmitters_connected, schemeData.residual_chlorine_connected,
                schemeData.scheme_status, schemeData.agency, schemeData.scheme_id
              ]
            );
            console.log(`Updated existing scheme: ${schemeData.scheme_name} with ID ${schemeId}`);
          }
        } catch (error) {
          console.error(`Error processing scheme:`, error);
        }
      }
    }
    
    // Update region summaries
    await updateRegionSummaries(pool);
    
    console.log("\nImport completed successfully!");
    return true;
  } catch (error) {
    console.error("Error importing data:", error);
    return false;
  } finally {
    await pool.end();
  }
}

// Function to update region summaries
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

// Main function
async function main() {
  try {
    // Path to the JSON file
    const jsonFilePath = path.join(__dirname, 'attached_assets', 'scheme_status_table (2).json');
    console.log(`Reading JSON data from: ${jsonFilePath}`);
    
    // Read the JSON data
    const data = await readJsonFile(jsonFilePath);
    
    if (!data) {
      console.error("Failed to read JSON data");
      return;
    }
    
    // Import the data
    const success = await importData(data);
    
    if (success) {
      console.log("Data import completed successfully");
    } else {
      console.error("Data import failed");
    }
  } catch (error) {
    console.error("Unhandled error:", error);
  }
}

// Run the main function
main();