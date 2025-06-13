import express from 'express';
import * as db from '../db';
import multer from 'multer';
import * as uuid from 'uuid';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { storage as storageInstance } from '../storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        // When setting a minimum LPCD, exclude zero/null values and ensure it's greater than the min value
        conditions.push('(lpcd_value_day1 > 0 AND lpcd_value_day1 >= $' + (queryParams.length + 1) + ')');
        queryParams.push(Number(minLpcd));
      }
      
      if (maxLpcd) {
        // When setting a maximum, include only values less than or equal to max but greater than 0
        conditions.push('(lpcd_value_day1 > 0 AND lpcd_value_day1 <= $' + (queryParams.length + 1) + ')');
        queryParams.push(Number(maxLpcd));
      }
      
      if (zeroSupplyForWeek === 'true') {
        conditions.push('consistent_zero_lpcd_for_a_week = $' + (queryParams.length + 1));
        queryParams.push(1); // Using 1 instead of true since the field is an integer
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

// Get village counts with proper MJP filtering and deduplication
router.get('/village-counts', async (req, res) => {
  try {
    const { region, mjpCommissioned } = req.query;
    
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      let baseQuery = `
        WITH deduplicated_villages AS (
          SELECT DISTINCT ON (wsd.village_name, wsd.region)
            wsd.village_name,
            wsd.region,
            wsd.scheme_id,
            wsd.population,
            wsd.lpcd_value_day7,
            wsd.lpcd_value_day6,
            wsd.lpcd_value_day5,
            wsd.lpcd_value_day4,
            wsd.lpcd_value_day3,
            wsd.lpcd_value_day2,
            wsd.lpcd_value_day1,
            COALESCE(ss.mjp_commissioned, 'No') as mjp_commissioned
          FROM water_scheme_data wsd
          LEFT JOIN scheme_status ss ON wsd.scheme_id = ss.scheme_id
          WHERE wsd.village_name IS NOT NULL AND wsd.village_name != ''
          ORDER BY wsd.village_name, wsd.region, wsd.scheme_id
        )
        SELECT 
          COUNT(*) as total_villages,
          COUNT(CASE WHEN mjp_commissioned = 'Yes' THEN 1 END) as mjp_commissioned_villages,
          COUNT(CASE WHEN mjp_commissioned != 'Yes' THEN 1 END) as mjp_not_commissioned_villages,
          COUNT(CASE WHEN lpcd_value_day7 > 55 THEN 1 END) as villages_above_55_lpcd,
          COUNT(CASE WHEN lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 THEN 1 END) as villages_below_55_lpcd,
          COUNT(CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN 1 END) as villages_zero_lpcd
        FROM deduplicated_villages
      `;
      
      const queryParams: any[] = [];
      const conditions: string[] = [];
      
      if (region && region !== 'all') {
        conditions.push('region = $' + (queryParams.length + 1));
        queryParams.push(region);
      }
      
      if (mjpCommissioned) {
        if (mjpCommissioned === 'yes') {
          conditions.push("mjp_commissioned = 'Yes'");
        } else if (mjpCommissioned === 'no') {
          conditions.push("mjp_commissioned != 'Yes'");
        }
      }
      
      if (conditions.length > 0) {
        baseQuery = baseQuery.replace('FROM deduplicated_villages', 'FROM deduplicated_villages WHERE ' + conditions.join(' AND '));
      }
      
      const result = await client.query(baseQuery, queryParams);
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching village counts:', error);
    res.status(500).json({ error: 'Failed to fetch village counts' });
  }
});

// Get village statistics from water_scheme_data
router.get('/village-stats', async (req, res) => {
  try {
    const { region } = req.query;
    
    // Use pg directly for this route
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      let baseQuery = `
        WITH unique_villages AS (
          SELECT DISTINCT
            village_name,
            scheme_id,
            region,
            water_value_day6,
            water_value_day5,
            lpcd_value_day7,
            lpcd_value_day6
          FROM water_scheme_data 
          WHERE village_name IS NOT NULL AND village_name != ''
        )
        SELECT 
          COUNT(DISTINCT CONCAT(village_name, '|', scheme_id)) as total_villages,
          
          -- Villages receiving water (water_value_day6 > 0)
          COUNT(CASE WHEN water_value_day6 > 0 THEN 1 END) as villages_with_water,
          ROUND((COUNT(CASE WHEN water_value_day6 > 0 THEN 1 END) * 100.0 / COUNT(DISTINCT CONCAT(village_name, '|', scheme_id))), 2) as percent_villages_with_water,
          
          -- Villages not receiving water (water_value_day6 = 0 or NULL)
          COUNT(CASE WHEN water_value_day6 = 0 OR water_value_day6 IS NULL THEN 1 END) as villages_without_water,
          ROUND((COUNT(CASE WHEN water_value_day6 = 0 OR water_value_day6 IS NULL THEN 1 END) * 100.0 / COUNT(DISTINCT CONCAT(village_name, '|', scheme_id))), 2) as percent_villages_without_water,
          
          -- Villages with LPCD > 55
          COUNT(CASE WHEN lpcd_value_day7 > 55 THEN 1 END) as villages_lpcd_above_55,
          ROUND((COUNT(CASE WHEN lpcd_value_day7 > 55 THEN 1 END) * 100.0 / COUNT(DISTINCT CONCAT(village_name, '|', scheme_id))), 2) as percent_villages_lpcd_above_55,
          
          -- Villages with LPCD <= 55 (but > 0)
          COUNT(CASE WHEN lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 THEN 1 END) as villages_lpcd_below_55,
          ROUND((COUNT(CASE WHEN lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 THEN 1 END) * 100.0 / COUNT(DISTINCT CONCAT(village_name, '|', scheme_id))), 2) as percent_villages_lpcd_below_55,
          
          -- Daily change calculations (comparing day 6 vs day 5)
          COUNT(CASE WHEN water_value_day6 > 0 AND (water_value_day5 = 0 OR water_value_day5 IS NULL) THEN 1 END) as villages_gained_water,
          COUNT(CASE WHEN (water_value_day6 = 0 OR water_value_day6 IS NULL) AND water_value_day5 > 0 THEN 1 END) as villages_lost_water,
          
          -- Villages with water on day 5 for comparison
          COUNT(CASE WHEN water_value_day5 > 0 THEN 1 END) as villages_with_water_day5,
          COUNT(CASE WHEN water_value_day5 = 0 OR water_value_day5 IS NULL THEN 1 END) as villages_without_water_day5,
          
          -- LPCD change calculations (day 7 vs day 6)
          COUNT(CASE WHEN lpcd_value_day7 > 55 THEN 1 END) as villages_lpcd_above_55_day7,
          COUNT(CASE WHEN lpcd_value_day6 > 55 THEN 1 END) as villages_lpcd_above_55_day6,
          COUNT(CASE WHEN lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 THEN 1 END) as villages_lpcd_below_55_day7,
          COUNT(CASE WHEN lpcd_value_day6 <= 55 AND lpcd_value_day6 > 0 THEN 1 END) as villages_lpcd_below_55_day6
          
        FROM unique_villages
      `;
      
      const queryParams: any[] = [];
      
      if (region && region !== 'all') {
        baseQuery = baseQuery.replace('FROM unique_villages', 'FROM unique_villages WHERE region = $1');
        queryParams.push(region);
      }
      
      const result = await client.query(baseQuery, queryParams);
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching village statistics:', error);
    res.status(500).json({ error: 'Failed to fetch village statistics' });
  }
});

// Get population statistics from water_scheme_data
router.get('/population-stats', async (req, res) => {
  try {
    const { region } = req.query;
    
    // Use pg directly for this route
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      let baseQuery = `
        WITH unique_villages AS (
          SELECT DISTINCT
            village_name,
            scheme_id,
            TRIM(region) as region,
            population,
            water_value_day6,
            water_value_day5,
            lpcd_value_day7,
            lpcd_value_day6
          FROM water_scheme_data 
          WHERE population IS NOT NULL AND population > 0
        )
        SELECT 
          COUNT(DISTINCT CONCAT(village_name, '|', scheme_id)) as total_villages,
          SUM(population) as total_population,
          
          -- Villages and population receiving water (water_value_day6 > 0)
          COUNT(CASE WHEN water_value_day6 > 0 THEN 1 END) as villages_with_water,
          SUM(CASE WHEN water_value_day6 > 0 THEN population ELSE 0 END) as population_with_water,
          ROUND((COUNT(CASE WHEN water_value_day6 > 0 THEN 1 END) * 100.0 / COUNT(DISTINCT CONCAT(village_name, '|', scheme_id))), 2) as percent_villages_with_water,
          ROUND((SUM(CASE WHEN water_value_day6 > 0 THEN population ELSE 0 END) * 100.0 / SUM(population)), 2) as percent_population_with_water,
          
          -- Villages and population with no water (water_value_day6 = 0 or NULL)
          COUNT(CASE WHEN water_value_day6 = 0 OR water_value_day6 IS NULL THEN 1 END) as villages_no_water,
          SUM(CASE WHEN water_value_day6 = 0 OR water_value_day6 IS NULL THEN population ELSE 0 END) as population_no_water,
          ROUND((COUNT(CASE WHEN water_value_day6 = 0 OR water_value_day6 IS NULL THEN 1 END) * 100.0 / COUNT(DISTINCT CONCAT(village_name, '|', scheme_id))), 2) as percent_villages_no_water,
          ROUND((SUM(CASE WHEN water_value_day6 = 0 OR water_value_day6 IS NULL THEN population ELSE 0 END) * 100.0 / SUM(population)), 2) as percent_population_no_water,
          
          -- LPCD analysis based on latest lpcd_date_day7
          COUNT(CASE WHEN lpcd_value_day7 > 55 THEN 1 END) as villages_lpcd_above_55,
          COUNT(CASE WHEN lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 THEN 1 END) as villages_lpcd_below_55,
          
          -- Population analysis for LPCD categories
          SUM(CASE WHEN lpcd_value_day7 > 55 THEN population ELSE 0 END) as population_lpcd_above_55,
          SUM(CASE WHEN lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 THEN population ELSE 0 END) as population_lpcd_below_55,
          
          -- Population change analysis (day6 vs day5) - Net change calculation
          -- Net change in population with water (day6 - day5)
          SUM(CASE WHEN water_value_day6 > 0 THEN population ELSE 0 END) - SUM(CASE WHEN water_value_day5 > 0 THEN population ELSE 0 END) as population_gained_water,
          -- Net change in population without water (day6 - day5)  
          SUM(CASE WHEN water_value_day6 = 0 OR water_value_day6 IS NULL THEN population ELSE 0 END) - SUM(CASE WHEN water_value_day5 = 0 OR water_value_day5 IS NULL THEN population ELSE 0 END) as population_lost_water,
          
          -- Day 5 baseline for comparison
          SUM(CASE WHEN water_value_day5 > 0 THEN population ELSE 0 END) as population_with_water_day5,
          SUM(CASE WHEN water_value_day5 = 0 OR water_value_day5 IS NULL THEN population ELSE 0 END) as population_no_water_day5,
          
          -- LPCD statistics for day 7 and day 6 comparison
          SUM(CASE WHEN lpcd_value_day7 > 55 THEN population ELSE 0 END) as population_lpcd_above_55_day7,
          SUM(CASE WHEN lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 THEN population ELSE 0 END) as population_lpcd_below_55_day7,
          SUM(CASE WHEN lpcd_value_day6 > 55 THEN population ELSE 0 END) as population_lpcd_above_55_day6,
          SUM(CASE WHEN lpcd_value_day6 <= 55 AND lpcd_value_day6 > 0 THEN population ELSE 0 END) as population_lpcd_below_55_day6,
          
          -- Village counts for LPCD (keep existing for compatibility)
          COUNT(CASE WHEN lpcd_value_day7 > 55 THEN 1 END) as villages_lpcd_above_55,
          COUNT(CASE WHEN lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 THEN 1 END) as villages_lpcd_below_55,
          
          -- Current LPCD population totals (using day 7 as current)
          SUM(CASE WHEN lpcd_value_day7 > 55 THEN population ELSE 0 END) as population_lpcd_above_55,
          SUM(CASE WHEN lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 THEN population ELSE 0 END) as population_lpcd_below_55
          
        FROM unique_villages
      `;
      
      // Add WHERE clause for region filtering in the CTE
      const queryParams: any[] = [];
      if (region && region !== 'all') {
        baseQuery = baseQuery.replace(
          'WHERE population IS NOT NULL AND population > 0',
          'WHERE population IS NOT NULL AND population > 0 AND region = $1'
        );
        queryParams.push(region);
      }
      
      // Execute query
      const result = await client.query(baseQuery, queryParams);
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching population statistics:', error);
    res.status(500).json({ error: 'Failed to fetch population statistics' });
  }
});

// Get population change statistics from tracking tables
router.get('/population-change', async (req, res) => {
  try {
    const { region } = req.query;
    
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      let query;
      const queryParams: any[] = [];
      
      if (region && region !== 'all') {
        // Get regional population change
        query = `
          WITH today_data AS (
            SELECT population 
            FROM region_population_tracking 
            WHERE region = $1 AND date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
          ),
          yesterday_data AS (
            SELECT population 
            FROM region_population_tracking 
            WHERE region = $2 AND date = TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD')
          )
          SELECT 
            COALESCE(today_data.population, 0) as current_population,
            COALESCE(yesterday_data.population, 0) as previous_population,
            COALESCE(today_data.population, 0) - COALESCE(yesterday_data.population, 0) as population_change
          FROM today_data 
          FULL OUTER JOIN yesterday_data ON 1=1
        `;
        queryParams.push(region, region);
      } else {
        // Get total population change
        query = `
          WITH today_data AS (
            SELECT total_population 
            FROM population_tracking 
            WHERE date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
          ),
          yesterday_data AS (
            SELECT total_population 
            FROM population_tracking 
            WHERE date = TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD')
          )
          SELECT 
            COALESCE(today_data.total_population, 0) as current_population,
            COALESCE(yesterday_data.total_population, 0) as previous_population,
            COALESCE(today_data.total_population, 0) - COALESCE(yesterday_data.total_population, 0) as population_change
          FROM today_data 
          FULL OUTER JOIN yesterday_data ON 1=1
        `;
      }
      
      const result = await client.query(query, queryParams);
      const data = result.rows[0] || { current_population: 0, previous_population: 0, population_change: 0 };
      
      res.json(data);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching population change:', error);
    res.status(500).json({ error: 'Failed to fetch population change' });
  }
});

// Get LPCD statistics - counts villages with different LPCD ranges
router.get('/lpcd-stats', async (req, res) => {
  try {
    const { region } = req.query;
    
    // Use pg directly for this route
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Get statistics using deduplicated data to match population cards
      let baseQuery = `
        WITH unique_villages AS (
          SELECT DISTINCT
            village_name,
            scheme_id,
            region,
            population,
            lpcd_value_day1,
            lpcd_value_day7,
            consistent_zero_lpcd_for_a_week
          FROM water_scheme_data 
          WHERE population IS NOT NULL AND population > 0
        )
        SELECT 
          COUNT(*) FILTER (WHERE lpcd_value_day7 > 55) AS above_55_count,
          COUNT(*) FILTER (WHERE lpcd_value_day7 < 40 AND lpcd_value_day7 > 0) AS below_40_count,
          COUNT(*) FILTER (WHERE lpcd_value_day7 >= 40 AND lpcd_value_day7 <= 55) AS between_40_55_count,
          COUNT(*) FILTER (WHERE lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL) AS zero_lpcd_count,
          COUNT(*) FILTER (WHERE consistent_zero_lpcd_for_a_week = 1) AS consistent_zero_count,
          COUNT(DISTINCT CONCAT(village_name, '|', scheme_id)) AS total_villages,
          SUM(population) AS total_population,
          SUM(CASE WHEN lpcd_value_day7 > 55 THEN population ELSE 0 END) AS above_55_population,
          SUM(CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN population ELSE 0 END) AS below_55_population
        FROM unique_villages
      `;
      
      // Add WHERE clause for region filtering in the CTE
      const queryParams: any[] = [];
      if (region && region !== 'all') {
        baseQuery = baseQuery.replace(
          'WHERE population IS NOT NULL AND population > 0',
          'WHERE population IS NOT NULL AND population > 0 AND region = $1'
        );
        queryParams.push(region);
      }
      
      // Execute query
      const result = await client.query(baseQuery, queryParams);
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching LPCD statistics:', error);
    res.status(500).json({ error: 'Failed to fetch LPCD statistics' });
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
    
    // Automatically update population tracking after successful import
    try {
      console.log('📊 Triggering population tracking update after data import...');
      await storageInstance.storePopulationData();
      console.log('✅ Population tracking data updated successfully');
    } catch (popError) {
      console.error('❌ Error updating population tracking:', popError);
      // Don't fail the import if population tracking fails
    }
    
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
    
    // Automatically update population tracking after successful import
    try {
      console.log('📊 Triggering population tracking update after data import...');
      await storageInstance.storePopulationData();
      console.log('✅ Population tracking data updated successfully');
    } catch (popError) {
      console.error('❌ Error updating population tracking:', popError);
      // Don't fail the import if population tracking fails
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error importing from CSV:', error);
    res.status(500).json({ error: 'Failed to import data from CSV file' });
  }
});

// Download LPCD data template
router.get('/template', (req, res) => {
  try {
    // First, check if template exists in the templates directory
    const templateDir = path.join(__dirname, '..', '..', 'templates');
    const templatePath = path.join(templateDir, 'lpcd_data_template.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      // If template doesn't exist, create it on the fly
      const wb = XLSX.utils.book_new();
      
      // Define the headers
      const headers = [
        'Region',
        'Circle',
        'Division',
        'Sub Division',
        'Block',
        'Scheme ID',
        'Scheme Name',
        'Village Name', 
        'Population',
        'Number of ESR',
        'Water Value Day 1',
        'Water Value Day 2',
        'Water Value Day 3',
        'Water Value Day 4',
        'Water Value Day 5',
        'Water Value Day 6',
        'LPCD Value Day 1',
        'LPCD Value Day 2',
        'LPCD Value Day 3',
        'LPCD Value Day 4',
        'LPCD Value Day 5',
        'LPCD Value Day 6',
        'LPCD Value Day 7',
        'Water Date Day 1',
        'Water Date Day 2',
        'Water Date Day 3',
        'Water Date Day 4',
        'Water Date Day 5',
        'Water Date Day 6',
        'LPCD Date Day 1',
        'LPCD Date Day 2',
        'LPCD Date Day 3',
        'LPCD Date Day 4',
        'LPCD Date Day 5',
        'LPCD Date Day 6',
        'LPCD Date Day 7',
        'Consistent Zero LPCD For A Week',
        'Below 55 LPCD Count',
        'Above 55 LPCD Count'
      ];
      
      // Create an array to hold the worksheet data
      const wsData = [headers];
      
      // Add sample data rows
      // Sample 1: Pune
      wsData.push([
        'Pune',                // Region
        'Pune',                // Circle
        'Pune Division',       // Division
        'Pune East',           // Sub Division
        'Wagholi',             // Block
        'PU-001',              // Scheme ID
        'Pune Rural Supply',   // Scheme Name
        'Wagholi',             // Village Name
        '5000',                // Population (as string for template)
        '2',                   // Number of ESR (as string for template)
        '120.5',               // Water Value Day 1
        '115.3',               // Water Value Day 2
        '110.2',               // Water Value Day 3
        '118.7',               // Water Value Day 4
        '122.1',               // Water Value Day 5
        '119.8',               // Water Value Day 6
        '65.2',                // LPCD Value Day 1
        '62.3',                // LPCD Value Day 2
        '59.5',                // LPCD Value Day 3
        '64.1',                // LPCD Value Day 4
        '66.0',                // LPCD Value Day 5
        '64.8',                // LPCD Value Day 6
        '63.9',                // LPCD Value Day 7
        '11-Apr',              // Water Date Day 1
        '12-Apr',              // Water Date Day 2
        '13-Apr',              // Water Date Day 3
        '14-Apr',              // Water Date Day 4
        '15-Apr',              // Water Date Day 5
        '16-Apr',              // Water Date Day 6
        '10-Apr',              // LPCD Date Day 1
        '11-Apr',              // LPCD Date Day 2
        '12-Apr',              // LPCD Date Day 3
        '13-Apr',              // LPCD Date Day 4
        '14-Apr',              // LPCD Date Day 5
        '15-Apr',              // LPCD Date Day 6
        '16-Apr',              // LPCD Date Day 7
        'No',                  // Consistent Zero LPCD For A Week
        '0',                   // Below 55 LPCD Count (as string for template)
        '7'                    // Above 55 LPCD Count (as string for template)
      ]);
      
      // Sample 2: Nagpur with lower LPCD
      wsData.push([
        'Nagpur',              // Region
        'Nagpur',              // Circle
        'Nagpur Division',     // Division
        'Nagpur West',         // Sub Division
        'Hingna',              // Block
        'NG-001',              // Scheme ID
        'Hingna Rural Supply', // Scheme Name
        'Hingna',              // Village Name
        '3200',                // Population
        '1',                   // Number of ESR
        '85.5',                // Water Value Day 1
        '82.3',                // Water Value Day 2
        '79.2',                // Water Value Day 3
        '81.7',                // Water Value Day 4
        '80.1',                // Water Value Day 5
        '82.8',                // Water Value Day 6
        '45.2',                // LPCD Value Day 1
        '42.3',                // LPCD Value Day 2
        '40.5',                // LPCD Value Day 3
        '44.1',                // LPCD Value Day 4
        '46.0',                // LPCD Value Day 5
        '44.8',                // LPCD Value Day 6
        '43.9',                // LPCD Value Day 7
        '11-Apr',              // Water Date Day 1
        '12-Apr',              // Water Date Day 2
        '13-Apr',              // Water Date Day 3
        '14-Apr',              // Water Date Day 4
        '15-Apr',              // Water Date Day 5
        '16-Apr',              // Water Date Day 6
        '10-Apr',              // LPCD Date Day 1
        '11-Apr',              // LPCD Date Day 2
        '12-Apr',              // LPCD Date Day 3
        '13-Apr',              // LPCD Date Day 4
        '14-Apr',              // LPCD Date Day 5
        '15-Apr',              // LPCD Date Day 6
        '16-Apr',              // LPCD Date Day 7
        'No',                  // Consistent Zero LPCD For A Week
        '7',                   // Below 55 LPCD Count
        '0'                    // Above 55 LPCD Count
      ]);
      
      // Create the worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Format the column widths for better readability
      ws['!cols'] = headers.map(() => ({ wch: 15 })); // Default width of 15 for all columns
      
      // Set a wider width for specific columns
      ws['!cols'][6] = { wch: 25 };  // Scheme Name
      ws['!cols'][7] = { wch: 25 };  // Village Name
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, 'LPCD_Data_Template');
      
      // Create the temp directory if it doesn't exist
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }
      
      // Write the file to disk temporarily
      XLSX.writeFile(wb, templatePath);
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=lpcd_data_template.xlsx');
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(templatePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
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
  
  // Analyze the file to detect if it's our custom LPCD template or a different format
  let isLpcdTemplate = false;
  
  if (data && data.length > 0) {
    const firstRow = data[0] as Record<string, unknown>;
    
    // Check if firstRow is an object we can analyze
    if (firstRow && typeof firstRow === 'object') {
      const headers = Object.keys(firstRow);
      
      // Check for the presence of water and LPCD value columns
      const waterValueColumns = headers.filter(h => h.includes('Water Value'));
      const lpcdValueColumns = headers.filter(h => h.includes('LPCD Value'));
    
      isLpcdTemplate = waterValueColumns.length > 0 || lpcdValueColumns.length > 0;
      
      console.log('Excel import analysis:');
      console.log('- Headers:', headers);
      console.log('- Water value columns:', waterValueColumns);
      console.log('- LPCD value columns:', lpcdValueColumns);
      console.log('- Is LPCD template:', isLpcdTemplate);
    }
  }
  
  return importDataToDatabase(data, true, isLpcdTemplate);
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
        // Check if this is a properly formatted CSV with headers
        let hasLpcdHeaders = false;
        
        if (data.length > 0) {
          // Check the first row for possible headers
          const firstRow = data[0];
          if (Array.isArray(firstRow)) {
            const headerRow = firstRow.map(h => String(h).trim());
            const waterValueColumns = headerRow.filter(h => 
              h.includes('Water Value') || h.includes('water value'));
            const lpcdValueColumns = headerRow.filter(h => 
              h.includes('LPCD Value') || h.includes('lpcd value'));
              
            hasLpcdHeaders = waterValueColumns.length > 0 || lpcdValueColumns.length > 0;
            
            console.log('CSV import analysis:');
            console.log('- Headers:', headerRow);
            console.log('- Water value columns:', waterValueColumns);
            console.log('- LPCD value columns:', lpcdValueColumns);
            console.log('- Has LPCD headers:', hasLpcdHeaders);
          }
        }
        
        const result = await importDataToDatabase(data, false, hasLpcdHeaders);
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

// Import dashboard URL generation functions from auto-generate-dashboard-urls.ts
import { generateVillageDashboardUrl, generateDashboardUrl } from '../auto-generate-dashboard-urls';

// Import data to database
async function importDataToDatabase(data: any[], isExcel: boolean, isLpcdTemplate: boolean = false) {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  
  // Use pg directly for this route
  const { Pool } = pg;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Performance optimization: process in batches
    const BATCH_SIZE = 25; // Number of records to process in a single batch
    let currentBatch: any[] = [];
    
    // Pre-process and validate all records first
    const validRecords: any[] = [];
    for (const row of data) {
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
        continue;
      }
      
      // Ensure both scheme_id and village_name are present
      if (!record.scheme_id || !record.village_name) {
        errors.push(`Skipped row - missing required fields: ${!record.scheme_id ? 'scheme_id' : ''} ${!record.village_name ? 'village_name' : ''}`);
        continue;
      }
      
      validRecords.push(record);
    }
    
    // Process in batches
    for (let i = 0; i < validRecords.length; i++) {
      const record = validRecords[i];
      currentBatch.push(record);
      
      // Process batch when it reaches the batch size or at the end of the data
      if (currentBatch.length >= BATCH_SIZE || i === validRecords.length - 1) {
        await client.query('BEGIN');
        
        try {
          // Process each record in the batch
          for (const batchRecord of currentBatch) {
            try {
              // Check if record exists
              const checkResult = await client.query(
                'SELECT scheme_id, village_name FROM water_scheme_data WHERE scheme_id = $1 AND village_name = $2',
                [batchRecord.scheme_id, batchRecord.village_name]
              );
              
              if (checkResult.rows.length > 0) {
                // Update existing record - exclude primary key fields from the update
                const updateFields = Object.keys(batchRecord).filter(key => key !== 'scheme_id' && key !== 'village_name');
                
                if (updateFields.length === 0) {
                  // No fields to update other than the primary key
                  continue;
                }
                
                // Check if we need to generate a dashboard URL for this record
                if (!batchRecord.dashboard_url) {
                  // Get the full record data from the database first
                  const existingRecord = await client.query(
                    'SELECT * FROM water_scheme_data WHERE scheme_id = $1 AND village_name = $2',
                    [batchRecord.scheme_id, batchRecord.village_name]
                  );
                  
                  if (existingRecord.rows.length > 0) {
                    const fullRecord = {...existingRecord.rows[0], ...batchRecord};
                    batchRecord.dashboard_url = generateVillageDashboardUrl(fullRecord);
                    
                    if (batchRecord.dashboard_url) {
                      console.log(`Generated dashboard URL for existing village: ${batchRecord.village_name} in scheme: ${batchRecord.scheme_id}`);
                      // Add dashboard_url to updateFields if it's not already there
                      if (!updateFields.includes('dashboard_url')) {
                        updateFields.push('dashboard_url');
                      }
                    }
                  }
                }
                
                const updateQuery = `
                  UPDATE water_scheme_data 
                  SET ${updateFields.map((key, idx) => `${key} = $${idx + 3}`).join(', ')} 
                  WHERE scheme_id = $1 AND village_name = $2
                `;
                
                const updateValues = [batchRecord.scheme_id, batchRecord.village_name];
                updateFields.forEach(key => {
                  updateValues.push(batchRecord[key]);
                });
                
                await client.query(updateQuery, updateValues);
                updated++;
              } else {
                // For new records, generate dashboard URL if not already present
                if (!batchRecord.dashboard_url) {
                  batchRecord.dashboard_url = generateVillageDashboardUrl(batchRecord);
                  if (batchRecord.dashboard_url) {
                    console.log(`Generated dashboard URL for village: ${batchRecord.village_name} in scheme: ${batchRecord.scheme_id}`);
                  }
                }
                
                // Insert new record
                const fields = Object.keys(batchRecord);
                const insertQuery = `
                  INSERT INTO water_scheme_data (${fields.join(', ')}) 
                  VALUES (${fields.map((_, idx) => `$${idx + 1}`).join(', ')})
                `;
                
                const insertValues = fields.map(field => batchRecord[field]);
                await client.query(insertQuery, insertValues);
                inserted++;
              }
            } catch (error: any) {
              // Handle specific errors but don't rollback the whole batch
              if (error.code === '23505') {
                // Duplicate key error
                errors.push(`Duplicate key error for scheme_id: ${batchRecord.scheme_id}, village_name: ${batchRecord.village_name}`);
              } else {
                errors.push(`Error processing row: ${error.message || 'Unknown error'}`);
              }
            }
          }
          
          // Commit the batch transaction
          await client.query('COMMIT');
          
          // Clear the batch for the next round
          currentBatch = [];
        } catch (batchError: any) {
          // Rollback the entire batch if there was an error
          await client.query('ROLLBACK');
          console.error('Error processing batch:', batchError);
          errors.push(`Failed to process batch: ${batchError.message || String(batchError)}`);
        }
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
        } else if (typeof value === 'boolean') {
          record[field] = value ? 1 : 0;
        } else if (typeof value === 'number') {
          record[field] = value > 0 ? 1 : 0;
        } else {
          record[field] = 0; // Default to 0 for null or undefined
        }
      } else {
        // Keep as string but handle null/undefined
        record[field] = value !== null && value !== undefined ? String(value) : null;
      }
    }
  });
  
  return record;
}

// Get water value trends for mini charts - Population WITH water (last 6 days)
router.get("/water-trends", async (req, res) => {
  try {
    const { region } = req.query;
    
    // Get average water values for the last 6 days
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    let whereClause = '';
    if (region && region !== 'all') {
      whereClause = `WHERE region = '${region}'`;
    }
    
    try {
      const result = await client.query(`
        SELECT 
          SUM(CASE WHEN water_value_day1 > 0 THEN CAST(population AS INTEGER) ELSE 0 END) as day1,
          SUM(CASE WHEN water_value_day2 > 0 THEN CAST(population AS INTEGER) ELSE 0 END) as day2,
          SUM(CASE WHEN water_value_day3 > 0 THEN CAST(population AS INTEGER) ELSE 0 END) as day3,
          SUM(CASE WHEN water_value_day4 > 0 THEN CAST(population AS INTEGER) ELSE 0 END) as day4,
          SUM(CASE WHEN water_value_day5 > 0 THEN CAST(population AS INTEGER) ELSE 0 END) as day5,
          SUM(CASE WHEN water_value_day6 > 0 THEN CAST(population AS INTEGER) ELSE 0 END) as day6
        FROM water_scheme_data 
        WHERE population IS NOT NULL AND population > 0
        ${region && region !== 'all' ? 'AND region = \'' + region + '\'' : ''}
      `);
    
      const row = result.rows[0];
      const trendData = [
        parseFloat(row.day1) || 0,
        parseFloat(row.day2) || 0,
        parseFloat(row.day3) || 0,
        parseFloat(row.day4) || 0,
        parseFloat(row.day5) || 0,
        parseFloat(row.day6) || 0
      ];
      
      res.json({
        success: true,
        data: trendData
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching water trends:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch water trends"
    });
  }
});

// Get water value trends for mini charts - Population WITHOUT water (last 6 days)
router.get("/no-water-trends", async (req, res) => {
  try {
    const { region } = req.query;
    
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          SUM(CASE WHEN water_value_day1 = 0 OR water_value_day1 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day1,
          SUM(CASE WHEN water_value_day2 = 0 OR water_value_day2 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day2,
          SUM(CASE WHEN water_value_day3 = 0 OR water_value_day3 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day3,
          SUM(CASE WHEN water_value_day4 = 0 OR water_value_day4 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day4,
          SUM(CASE WHEN water_value_day5 = 0 OR water_value_day5 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day5,
          SUM(CASE WHEN water_value_day6 = 0 OR water_value_day6 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day6
        FROM water_scheme_data 
        WHERE population IS NOT NULL AND population > 0
        ${region && region !== 'all' ? 'AND region = \'' + region + '\'' : ''}
      `);
    
      const row = result.rows[0];
      const trendData = [
        parseFloat(row.day1) || 0,
        parseFloat(row.day2) || 0,
        parseFloat(row.day3) || 0,
        parseFloat(row.day4) || 0,
        parseFloat(row.day5) || 0,
        parseFloat(row.day6) || 0
      ];
      
      res.json({
        success: true,
        data: trendData
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching no water trends:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch no water trends"
    });
  }
});

// Get LPCD trends for mini charts - Population with LPCD > 55 (last 7 days)
router.get("/lpcd-trends", async (req, res) => {
  try {
    const { region } = req.query;
    
    // Get average LPCD values for the last 7 days
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      let whereClause = '';
      if (region && region !== 'all') {
        whereClause = `WHERE region = '${region}'`;
      }
      
      const result = await client.query(`
        SELECT 
          SUM(CASE WHEN lpcd_value_day1 > 55 AND lpcd_value_day1 <= 200 THEN CAST(population AS INTEGER) ELSE 0 END) as day1,
          SUM(CASE WHEN lpcd_value_day2 > 55 AND lpcd_value_day2 <= 200 THEN CAST(population AS INTEGER) ELSE 0 END) as day2,
          SUM(CASE WHEN lpcd_value_day3 > 55 AND lpcd_value_day3 <= 200 THEN CAST(population AS INTEGER) ELSE 0 END) as day3,
          SUM(CASE WHEN lpcd_value_day4 > 55 AND lpcd_value_day4 <= 200 THEN CAST(population AS INTEGER) ELSE 0 END) as day4,
          SUM(CASE WHEN lpcd_value_day5 > 55 AND lpcd_value_day5 <= 200 THEN CAST(population AS INTEGER) ELSE 0 END) as day5,
          SUM(CASE WHEN lpcd_value_day6 > 55 AND lpcd_value_day6 <= 200 THEN CAST(population AS INTEGER) ELSE 0 END) as day6,
          SUM(CASE WHEN lpcd_value_day7 > 55 AND lpcd_value_day7 <= 200 THEN CAST(population AS INTEGER) ELSE 0 END) as day7
        FROM water_scheme_data 
        WHERE population IS NOT NULL AND population > 0
        ${region && region !== 'all' ? 'AND region = \'' + region + '\'' : ''}
      `);
      
      const row = result.rows[0];
      const trendData = [
        parseFloat(row.day1) || 0,
        parseFloat(row.day2) || 0,
        parseFloat(row.day3) || 0,
        parseFloat(row.day4) || 0,
        parseFloat(row.day5) || 0,
        parseFloat(row.day6) || 0,
        parseFloat(row.day7) || 0
      ];
      
      res.json({
        success: true,
        data: trendData
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching LPCD trends:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch LPCD trends"
    });
  }
});

// Get LPCD trends for mini charts - Population with LPCD < 55 (last 7 days)
router.get("/lpcd-below-55-trends", async (req, res) => {
  try {
    const { region } = req.query;
    
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          SUM(CASE WHEN (lpcd_value_day1 > 0 AND lpcd_value_day1 < 55) OR lpcd_value_day1 = 0 OR lpcd_value_day1 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day1,
          SUM(CASE WHEN (lpcd_value_day2 > 0 AND lpcd_value_day2 < 55) OR lpcd_value_day2 = 0 OR lpcd_value_day2 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day2,
          SUM(CASE WHEN (lpcd_value_day3 > 0 AND lpcd_value_day3 < 55) OR lpcd_value_day3 = 0 OR lpcd_value_day3 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day3,
          SUM(CASE WHEN (lpcd_value_day4 > 0 AND lpcd_value_day4 < 55) OR lpcd_value_day4 = 0 OR lpcd_value_day4 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day4,
          SUM(CASE WHEN (lpcd_value_day5 > 0 AND lpcd_value_day5 < 55) OR lpcd_value_day5 = 0 OR lpcd_value_day5 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day5,
          SUM(CASE WHEN (lpcd_value_day6 > 0 AND lpcd_value_day6 < 55) OR lpcd_value_day6 = 0 OR lpcd_value_day6 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day6,
          SUM(CASE WHEN (lpcd_value_day7 > 0 AND lpcd_value_day7 < 55) OR lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN CAST(population AS INTEGER) ELSE 0 END) as day7
        FROM water_scheme_data 
        WHERE population IS NOT NULL AND population > 0
        ${region && region !== 'all' ? 'AND region = \'' + region + '\'' : ''}
      `);
      
      const row = result.rows[0];
      const trendData = [
        parseFloat(row.day1) || 0,
        parseFloat(row.day2) || 0,
        parseFloat(row.day3) || 0,
        parseFloat(row.day4) || 0,
        parseFloat(row.day5) || 0,
        parseFloat(row.day6) || 0,
        parseFloat(row.day7) || 0
      ];
      
      res.json({
        success: true,
        data: trendData
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching LPCD below 55 trends:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch LPCD below 55 trends"
    });
  }
});

// Get population trends from population tracking tables
router.get("/population-trends", async (req, res) => {
  try {
    const { region } = req.query;
    
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      let query;
      const queryParams: any[] = [];
      
      if (region && region !== 'all') {
        // Get regional population trends from region_population_tracking
        query = `
          SELECT 
            date,
            total_population as population
          FROM region_population_tracking 
          WHERE region = $1
          ORDER BY date DESC 
          LIMIT 7
        `;
        queryParams.push(region);
      } else {
        // Get total population trends from population_tracking
        query = `
          SELECT 
            date,
            total_population as population
          FROM population_tracking 
          ORDER BY date DESC 
          LIMIT 7
        `;
      }
      
      const result = await client.query(query, queryParams);
      
      // Reverse to get chronological order and extract just population values
      const trendData = result.rows.reverse().map(row => row.population || 0);
      
      res.json({
        success: true,
        data: trendData
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching population trends:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch population trends' 
    });
  }
});

export default router;