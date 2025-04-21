import express from 'express';
import * as db from '../db';
import multer from 'multer';
import * as uuid from 'uuid';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse';
import pg from 'pg';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const uniqueFilename = `${uuid.v4()}${fileExt}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept Excel and CSV files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) or CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get all water scheme data with optional filtering
router.get('/', async (req, res) => {
  try {
    const { region, minLpcd, maxLpcd, zeroSupplyForWeek } = req.query;
    
    // Use pg directly for this route
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      let query = 'SELECT * FROM water_scheme_data';
      const queryParams: any[] = [];
      const conditions: string[] = [];
      
      // Add filter conditions
      if (region && region !== 'all') {
        conditions.push('region = $' + (queryParams.length + 1));
        queryParams.push(region);
      }
      
      if (minLpcd) {
        conditions.push('lpcd_value_day1 >= $' + (queryParams.length + 1));
        queryParams.push(Number(minLpcd));
      }
      
      if (maxLpcd) {
        conditions.push('lpcd_value_day1 <= $' + (queryParams.length + 1));
        queryParams.push(Number(maxLpcd));
      }
      
      if (zeroSupplyForWeek === 'true') {
        conditions.push('consistent_zero_lpcd_for_a_week = $' + (queryParams.length + 1));
        queryParams.push(true);
      }
      
      // Build final query with conditions
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY region, scheme_id, village_name';
      
      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching water scheme data:', error);
    res.status(500).json({ error: 'Failed to fetch water scheme data' });
  }
});

// Import data from Excel file
router.post('/import/excel', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const filePath = req.file.path;
    const result = await processExcelFile(filePath);
    
    // Remove temp file after processing
    fs.unlinkSync(filePath);
    
    res.json(result);
  } catch (error) {
    console.error('Error importing from Excel:', error);
    res.status(500).json({ error: 'Failed to import data from Excel file' });
  }
});

// Import data from CSV file
router.post('/import/csv', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const filePath = req.file.path;
    const result = await processCsvFile(filePath);
    
    // Remove temp file after processing
    fs.unlinkSync(filePath);
    
    res.json(result);
  } catch (error) {
    console.error('Error importing from CSV:', error);
    res.status(500).json({ error: 'Failed to import data from CSV file' });
  }
});

// Process Excel file and import data
async function processExcelFile(filePath: string) {
  // Read file as buffer first
  const fileBuffer = fs.readFileSync(filePath);
  // Use read() instead of readFile()
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return importDataToDatabase(data, true);
}

// Process CSV file and import data
async function processCsvFile(filePath: string) {
  return new Promise<any>((resolve, reject) => {
    const data: any[] = [];
    const parser = fs.createReadStream(filePath)
      .pipe(parse({
        columns: false,
        skip_empty_lines: true
      }));
    
    parser.on('data', (record) => {
      data.push(record);
    });
    
    parser.on('end', async () => {
      try {
        const result = await importDataToDatabase(data, false);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    parser.on('error', (error) => {
      reject(error);
    });
  });
}

// Import data to database
async function importDataToDatabase(data: any[], isExcel: boolean) {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  
  // Use pg directly for this route
  const { Pool } = pg;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Process each row in its own transaction
    for (const row of data) {
      try {
        await client.query('BEGIN');
        
        let record: any;
        
        if (isExcel) {
          // Excel file with headers
          record = mapExcelFields(row);
        } else {
          // CSV file without headers
          record = mapCsvFields(row);
        }
        
        // Skip rows without scheme_id
        if (!record.scheme_id) {
          errors.push(`Skipped row - missing scheme_id: ${JSON.stringify(row)}`);
          await client.query('COMMIT'); // End this row's transaction
          continue;
        }
        
        // Ensure both scheme_id and village_name are present
        if (!record.scheme_id || !record.village_name) {
          errors.push(`Skipped row - missing required fields: ${!record.scheme_id ? 'scheme_id' : ''} ${!record.village_name ? 'village_name' : ''}`);
          await client.query('COMMIT'); // End this row's transaction
          continue;
        }

        try {
          // Check if record exists
          const checkResult = await client.query(
            'SELECT scheme_id, village_name FROM water_scheme_data WHERE scheme_id = $1 AND village_name = $2',
            [record.scheme_id, record.village_name]
          );
          
          if (checkResult.rows.length > 0) {
            // Update existing record - exclude primary key fields from the update
            const updateFields = Object.keys(record).filter(key => key !== 'scheme_id' && key !== 'village_name');
            
            if (updateFields.length === 0) {
              // No fields to update other than the primary key
              await client.query('COMMIT'); // End this row's transaction
              continue;
            }
            
            const updateQuery = `
              UPDATE water_scheme_data 
              SET ${updateFields.map((key, idx) => `${key} = $${idx + 3}`).join(', ')} 
              WHERE scheme_id = $1 AND village_name = $2
            `;
            
            const updateValues = [record.scheme_id, record.village_name];
            updateFields.forEach(key => {
              updateValues.push(record[key]);
            });
            
            await client.query(updateQuery, updateValues);
            updated++;
          } else {
            // Insert new record
            const fields = Object.keys(record);
            const insertQuery = `
              INSERT INTO water_scheme_data (${fields.join(', ')}) 
              VALUES (${fields.map((_, idx) => `$${idx + 1}`).join(', ')})
            `;
            
            const insertValues = fields.map(field => record[field]);
            await client.query(insertQuery, insertValues);
            inserted++;
          }
          
          await client.query('COMMIT'); // Commit this row's transaction
        } catch (error: any) {
          await client.query('ROLLBACK'); // Rollback just this row's transaction
          
          // Handle specific errors
          if (error.code === '23505') {
            // Duplicate key error
            errors.push(`Duplicate key error for scheme_id: ${record.scheme_id}, village_name: ${record.village_name}`);
          } else {
            errors.push(`Error processing row: ${error.message || 'Unknown error'}`);
          }
        }
      } catch (rowError: any) {
        await client.query('ROLLBACK'); // Make sure to rollback if there was an error
        console.error('Error processing row:', rowError);
        errors.push(`Failed to import row: ${rowError.message || String(rowError)}`);
      }
    }
    
    return {
      message: `Successfully processed ${inserted + updated} records.`,
      inserted,
      updated,
      errors
    };
  } catch (error: any) {
    console.error('Database import error:', error);
    throw new Error(`Import failed: ${error.message || String(error)}`);
  } finally {
    client.release(); // Make sure to release the client back to the pool
  }
}

// Map Excel fields to database columns
function mapExcelFields(row: any) {
  const record: any = {};
  
  // Map Excel headers to database fields
  const fieldMapping: Record<string, string> = {
    'Region': 'region',
    'Circle': 'circle',
    'Division': 'division',
    'Sub-Division': 'sub_division',
    'Block': 'block',
    'Scheme ID': 'scheme_id',
    'Scheme Name': 'scheme_name',
    'Village Name': 'village_name',
    'Population': 'population',
    'Number of ESR': 'number_of_esr',
    'Water Value Day 1': 'water_value_day1',
    'Water Value Day 2': 'water_value_day2',
    'Water Value Day 3': 'water_value_day3',
    'Water Value Day 4': 'water_value_day4',
    'Water Value Day 5': 'water_value_day5',
    'Water Value Day 6': 'water_value_day6',
    'LPCD Value Day 1': 'lpcd_value_day1',
    'LPCD Value Day 2': 'lpcd_value_day2',
    'LPCD Value Day 3': 'lpcd_value_day3',
    'LPCD Value Day 4': 'lpcd_value_day4',
    'LPCD Value Day 5': 'lpcd_value_day5',
    'LPCD Value Day 6': 'lpcd_value_day6',
    'LPCD Value Day 7': 'lpcd_value_day7',
    'Water Date Day 1': 'water_date_day1',
    'Water Date Day 2': 'water_date_day2',
    'Water Date Day 3': 'water_date_day3',
    'Water Date Day 4': 'water_date_day4',
    'Water Date Day 5': 'water_date_day5',
    'Water Date Day 6': 'water_date_day6',
    'LPCD Date Day 1': 'lpcd_date_day1',
    'LPCD Date Day 2': 'lpcd_date_day2',
    'LPCD Date Day 3': 'lpcd_date_day3',
    'LPCD Date Day 4': 'lpcd_date_day4',
    'LPCD Date Day 5': 'lpcd_date_day5',
    'LPCD Date Day 6': 'lpcd_date_day6',
    'LPCD Date Day 7': 'lpcd_date_day7',
    'Consistent Zero LPCD For A Week': 'consistent_zero_lpcd_for_a_week',
    'Below 55 LPCD Count': 'below_55_lpcd_count',
    'Above 55 LPCD Count': 'above_55_lpcd_count'
  };
  
  // Map fields from Excel column names
  for (const excelField in row) {
    const dbField = fieldMapping[excelField];
    if (dbField) {
      const value = row[excelField];
      
      // Convert numeric fields to proper number types
      if (['population', 'number_of_esr', 'water_value_day1', 'water_value_day2', 'water_value_day3', 
           'water_value_day4', 'water_value_day5', 'water_value_day6', 'lpcd_value_day1', 'lpcd_value_day2', 
           'lpcd_value_day3', 'lpcd_value_day4', 'lpcd_value_day5', 'lpcd_value_day6', 'lpcd_value_day7',
           'below_55_lpcd_count', 'above_55_lpcd_count'].includes(dbField)) {
        // Handle different Excel value types
        if (value === '' || value === null || value === undefined) {
          record[dbField] = null;
        } else {
          // Parse numeric value - handle both string and number inputs
          const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
          record[dbField] = isNaN(numValue) ? null : numValue;
        }
      } else if (dbField === 'consistent_zero_lpcd_for_a_week') {
        // Convert to boolean/integer
        if (typeof value === 'boolean') {
          record[dbField] = value ? 1 : 0;
        } else if (typeof value === 'number') {
          record[dbField] = value > 0 ? 1 : 0;
        } else if (typeof value === 'string') {
          record[dbField] = ['true', 'yes', '1', 'y'].includes(value.toLowerCase()) ? 1 : 0;
        } else {
          record[dbField] = 0; // Default to false/0
        }
      } else {
        // For text/string fields, ensure they're strings
        record[dbField] = value !== null && value !== undefined ? String(value) : null;
      }
    }
  }
  
  // Log a sample of the processed record for debugging
  if (record.scheme_id) {
    console.log(`Processed record for scheme_id ${record.scheme_id}, village ${record.village_name}:`, 
                `water_value_day1=${record.water_value_day1}, lpcd_value_day1=${record.lpcd_value_day1}`);
  }
  
  return record;
}

// Map CSV fields to database columns (no headers)
function mapCsvFields(row: string[]) {
  const record: any = {};
  
  // CSV column order
  const columnMapping = [
    'region',
    'circle',
    'division',
    'sub_division',
    'block',
    'scheme_id',
    'scheme_name',
    'village_name',
    'population',
    'number_of_esr',
    'water_value_day1',
    'water_value_day2',
    'water_value_day3',
    'water_value_day4',
    'water_value_day5',
    'water_value_day6',
    'lpcd_value_day1',
    'lpcd_value_day2',
    'lpcd_value_day3',
    'lpcd_value_day4',
    'lpcd_value_day5',
    'lpcd_value_day6',
    'lpcd_value_day7',
    'water_date_day1',
    'water_date_day2',
    'water_date_day3',
    'water_date_day4',
    'water_date_day5',
    'water_date_day6',
    'lpcd_date_day1',
    'lpcd_date_day2',
    'lpcd_date_day3',
    'lpcd_date_day4',
    'lpcd_date_day5',
    'lpcd_date_day6',
    'lpcd_date_day7',
    'consistent_zero_lpcd_for_a_week',
    'below_55_lpcd_count',
    'above_55_lpcd_count'
  ];
  
  // Map fields based on column position
  columnMapping.forEach((field, index) => {
    if (index < row.length) {
      const value = row[index];
      
      // Convert value to appropriate type
      if (['population', 'number_of_esr', 'water_value_day1', 'water_value_day2', 'water_value_day3', 
           'water_value_day4', 'water_value_day5', 'water_value_day6', 'lpcd_value_day1', 'lpcd_value_day2', 
           'lpcd_value_day3', 'lpcd_value_day4', 'lpcd_value_day5', 'lpcd_value_day6', 'lpcd_value_day7',
           'below_55_lpcd_count', 'above_55_lpcd_count'].includes(field)) {
        // Handle empty values
        if (value === '' || value === null || value === undefined) {
          record[field] = null;
        } else {
          // Parse numeric value - handle commas in numbers (e.g., "1,234.56")
          const numValue = parseFloat(String(value).replace(/,/g, ''));
          record[field] = isNaN(numValue) ? null : numValue;
        }
      } else if (field === 'consistent_zero_lpcd_for_a_week') {
        // Convert to boolean/integer for database
        if (typeof value === 'string') {
          record[field] = ['true', 'yes', '1', 'y'].includes(value.toLowerCase()) ? 1 : 0;
        } else {
          record[field] = value ? 1 : 0;
        }
      } else {
        // Keep as string but handle null/undefined
        record[field] = value !== null && value !== undefined ? String(value) : null;
      }
    }
  });
  
  return record;
}

export default router;