import XLSX from 'xlsx';
import { setupDatabase } from './server/setup-db.ts';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importESRData() {
  const filePath = path.join(__dirname, 'attached_assets', '01. Live Site Data - ESR Level_2025_06_19_1750419089068.xlsx');
  
  try {
    console.log('Starting ESR data import...');
    
    // Setup database connection
    const { db } = setupDatabase();
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    
    // Process each region's data
    const regionSheets = [
      'Region - Amravati Data',
      'Region - Nashik Data', 
      'Region - Nagpur Data',
      'Region - Pune Data',
      'Region - Konkan Data',
      'Region - CS Data'
    ];
    
    let totalImported = 0;
    
    for (const sheetName of regionSheets) {
      if (workbook.SheetNames.includes(sheetName)) {
        console.log(`Processing ${sheetName}...`);
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) continue;
        
        // Extract region name
        const regionName = sheetName.replace('Region - ', '').replace(' Data', '');
        
        for (const row of jsonData) {
          try {
            // Insert ESR monitoring data
            await db.execute(`
              INSERT INTO esr_monitoring (
                region_name, circle, division, sub_division, block,
                scheme_id, scheme_name, village_name, esr_name,
                chlorine_connected, pressure_connected, flow_meter_connected,
                chlorine_status, pressure_status, flow_meter_status,
                overall_status, last_updated
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT (scheme_id, village_name, esr_name) 
              DO UPDATE SET
                chlorine_connected = EXCLUDED.chlorine_connected,
                pressure_connected = EXCLUDED.pressure_connected,
                flow_meter_connected = EXCLUDED.flow_meter_connected,
                chlorine_status = EXCLUDED.chlorine_status,
                pressure_status = EXCLUDED.pressure_status,
                flow_meter_status = EXCLUDED.flow_meter_status,
                overall_status = EXCLUDED.overall_status,
                last_updated = CURRENT_TIMESTAMP
            `, [
              regionName,
              row['Circle'] || '',
              row['Division'] || '',
              row['Sub Division'] || '',
              row['Block'] || '',
              row['Scheme ID'] || '',
              row['Scheme Name'] || '',
              row['Village Name'] || '',
              row['ESR Name'] || '',
              row['Chlorine - Connected or not'] === 'Yes' ? 1 : 0,
              row['Pressure - Connected or not'] === 'Yes' ? 1 : 0,
              row['Flow Meter - Connected or not'] === 'Yes' ? 1 : 0,
              row['Chlorine - Online or Offline'] || 'Unknown',
              row['Pressure - Online or Offline'] || 'Unknown',
              row['Flow Meter - Online or Offline'] || 'Unknown',
              row['Status'] || 'Unknown'
            ]);
            
            totalImported++;
          } catch (error) {
            console.error(`Error importing row for ${row['Village Name']}:`, error.message);
          }
        }
        
        console.log(`Completed ${sheetName}: ${jsonData.length} records processed`);
      }
    }
    
    console.log(`ESR data import completed. Total records imported: ${totalImported}`);
    
    // Update region statistics
    await updateRegionStats(db);
    
  } catch (error) {
    console.error('Error importing ESR data:', error);
    throw error;
  }
}

async function updateRegionStats(db) {
  console.log('Updating region statistics...');
  
  try {
    // Update region table with ESR monitoring stats
    await db.execute(`
      UPDATE region SET
        flow_meter_integrated = (
          SELECT COUNT(*) FROM esr_monitoring 
          WHERE region_name = region.region_name AND flow_meter_connected = 1
        ),
        rca_integrated = (
          SELECT COUNT(*) FROM esr_monitoring 
          WHERE region_name = region.region_name AND chlorine_connected = 1
        ),
        pressure_transmitter_integrated = (
          SELECT COUNT(*) FROM esr_monitoring 
          WHERE region_name = region.region_name AND pressure_connected = 1
        )
    `);
    
    console.log('Region statistics updated successfully');
  } catch (error) {
    console.error('Error updating region statistics:', error);
  }
}

// Create ESR monitoring table if it doesn't exist
async function createESRTable() {
  const { db } = setupDatabase();
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS esr_monitoring (
      id SERIAL PRIMARY KEY,
      region_name TEXT NOT NULL,
      circle TEXT,
      division TEXT,
      sub_division TEXT,
      block TEXT,
      scheme_id TEXT,
      scheme_name TEXT,
      village_name TEXT,
      esr_name TEXT,
      chlorine_connected INTEGER DEFAULT 0,
      pressure_connected INTEGER DEFAULT 0,
      flow_meter_connected INTEGER DEFAULT 0,
      chlorine_status TEXT,
      pressure_status TEXT,
      flow_meter_status TEXT,
      overall_status TEXT,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(scheme_id, village_name, esr_name)
    )
  `);
  
  console.log('ESR monitoring table created/verified');
}

// Run the import
async function main() {
  try {
    await createESRTable();
    await importESRData();
    console.log('ESR data import process completed successfully');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();