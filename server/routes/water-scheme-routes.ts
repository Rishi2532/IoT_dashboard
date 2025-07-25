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



// Update scheme_status table when status changes are detected
async function updateSchemeStatusFromRecord(client: any, record: any) {
  try {
    // Only proceed if we have status fields to update
    if (!record.scheme_functional_status && !record.fully_completion_scheme_status) {
      return;
    }

    // Ensure we have the necessary identification fields
    if (!record.scheme_id || !record.scheme_name || !record.block) {
      return;
    }

    console.log(`Checking scheme_status update for scheme: ${record.scheme_name}, block: ${record.block}`);

    // Check if scheme_status record exists for this scheme and block
    const existingSchemeStatus = await client.query(
      'SELECT * FROM scheme_status WHERE scheme_id = $1 AND block = $2',
      [record.scheme_id, record.block]
    );

    if (existingSchemeStatus.rows.length > 0) {
      // Update existing scheme_status record
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 3; // Starting from $3 since $1 and $2 are for WHERE clause

      if (record.scheme_functional_status) {
        updateFields.push(`scheme_functional_status = $${paramIndex}`);
        updateValues.push(record.scheme_functional_status);
        paramIndex++;
      }

      if (record.fully_completion_scheme_status) {
        updateFields.push(`fully_completion_scheme_status = $${paramIndex}`);
        updateValues.push(record.fully_completion_scheme_status);
        paramIndex++;
      }

      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE scheme_status 
          SET ${updateFields.join(', ')} 
          WHERE scheme_id = $1 AND block = $2
        `;

        const finalValues = [record.scheme_id, record.block, ...updateValues];
        await client.query(updateQuery, finalValues);

        console.log(`✅ Updated scheme_status for scheme: ${record.scheme_name}, block: ${record.block}`);
        console.log(`   - scheme_functional_status: ${record.scheme_functional_status || 'unchanged'}`);
        console.log(`   - fully_completion_scheme_status: ${record.fully_completion_scheme_status || 'unchanged'}`);
      }
    } else {
      // Create new scheme_status record if it doesn't exist
      console.log(`Creating new scheme_status record for scheme: ${record.scheme_name}, block: ${record.block}`);

      const insertData = {
        scheme_id: record.scheme_id,
        scheme_name: record.scheme_name,
        region: record.region || null,
        circle: record.circle || null,
        division: record.division || null,
        sub_division: record.sub_division || null,
        block: record.block,
        scheme_functional_status: record.scheme_functional_status || null,
        fully_completion_scheme_status: record.fully_completion_scheme_status || null
      };

      const fields = Object.keys(insertData);
      const insertQuery = `
        INSERT INTO scheme_status (${fields.join(', ')}) 
        VALUES (${fields.map((_, idx) => `$${idx + 1}`).join(', ')})
      `;

      const insertValues = fields.map(field => (insertData as any)[field]);
      await client.query(insertQuery, insertValues);

      console.log(`✅ Created new scheme_status record for scheme: ${record.scheme_name}, block: ${record.block}`);
    }

  } catch (error: any) {
    console.error(`Error updating scheme_status for scheme ${record.scheme_name}, block ${record.block}:`, error.message);
    // Don't throw error to avoid breaking the import process
  }
}

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

    // Pre-process and validate all records first, removing duplicates
    const validRecords: any[] = [];
    const seenRecords = new Set<string>();

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

      // Create unique key for duplicate detection (including block field)
      const uniqueKey = `${record.scheme_id}-${record.village_name}-${record.block || ''}`;

      if (seenRecords.has(uniqueKey)) {
        errors.push(`Duplicate record detected and skipped: scheme_id: ${record.scheme_id}, village_name: ${record.village_name}, block: ${record.block || 'N/A'}`);
        continue;
      }

      seenRecords.add(uniqueKey);
      validRecords.push(record);
    }

    // Process in batches
    for (let i = 0; i < validRecords.length; i++) {
      const record = validRecords[i];
      currentBatch.push(record);

      // Process batch when it reaches the batch size or at the end of the data
      if (currentBatch.length >= BATCH_SIZE || i === validRecords.length - 1) {
        // Process each record in the batch using individual UPSERT operations (no transactions)
        for (const batchRecord of currentBatch) {
          try {
            // Generate dashboard URL if not already present
            if (!batchRecord.dashboard_url) {
              batchRecord.dashboard_url = generateVillageDashboardUrl(batchRecord);
              if (batchRecord.dashboard_url) {
                console.log(`Generated dashboard URL for village: ${batchRecord.village_name} in scheme: ${batchRecord.scheme_id}`);
              }
            }

            // Use UPSERT to handle duplicates gracefully
            const fields = Object.keys(batchRecord);
            const nonPkFields = fields.filter(key => key !== 'scheme_id' && key !== 'village_name' && key !== 'block');

            if (nonPkFields.length === 0) {
              // Only primary key fields present, skip this record
              continue;
            }

            const upsertQuery = `
              INSERT INTO water_scheme_data (${fields.join(', ')}) 
              VALUES (${fields.map((_, idx) => `$${idx + 1}`).join(', ')})
              ON CONFLICT (scheme_id, village_name, block) 
              DO UPDATE SET 
                ${nonPkFields.map(key => `${key} = EXCLUDED.${key}`).join(', ')}
              RETURNING (xmax = 0) AS inserted
            `;

            const upsertValues = fields.map(field => batchRecord[field]);
            const result = await client.query(upsertQuery, upsertValues);

            if (result.rows[0].inserted) {
              inserted++;
            } else {
              updated++;
            }

            // IMPORTANT: Update scheme_status table if status fields are present
            await updateSchemeStatusFromRecord(client, batchRecord);

          } catch (error: any) {
            // Handle specific errors but don't fail the entire batch
            if (error.code === '23505') {
              // Duplicate key error (shouldn't happen with UPSERT, but just in case)
              errors.push(`Duplicate key error for scheme_id: ${batchRecord.scheme_id}, village_name: ${batchRecord.village_name}, block: ${batchRecord.block}`);
            } else {
              console.error('Error processing record:', error);
              errors.push(`Error processing row: ${error.message || 'Unknown error'}`);
            }
          }
        }

        // Clear the batch for the next round
        currentBatch = [];
      }
    }

    // Store historical water scheme data after successful import
    try {
      console.log("🔄 Storing historical water scheme data from CSV import...");

      // Get all the imported records for historical storage
      const allImportedRecords = [];
      for (const row of data) {
        let record: any;
        if (isExcel) {
          record = mapExcelFields(row);
        } else {
          record = mapCsvFields(row);
        }

        if (record.scheme_id && record.village_name) {
          allImportedRecords.push(record);
        }
      }

      console.log(`📊 Processing ${allImportedRecords.length} records for historical storage...`);

      if (allImportedRecords.length > 0) {
        // Store historical data directly using PostgreSQL client
        const uploadBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const historicalRecords: any[] = [];

        for (const record of allImportedRecords) {
          if (!record.scheme_id || !record.village_name) {
            continue;
          }

          // Process water values (days 1-6)
          for (let day = 1; day <= 6; day++) {
            const waterDateField = `water_date_day${day}`;
            const waterValueField = `water_value_day${day}`;

            const waterDate = record[waterDateField];
            const waterValue = record[waterValueField];

            if (waterDate && waterValue !== null && waterValue !== undefined && waterValue !== '') {
              historicalRecords.push({
                region: record.region || null,
                circle: record.circle || null,
                division: record.division || null,
                sub_division: record.sub_division || null,
                block: record.block || null,
                scheme_id: record.scheme_id,
                scheme_name: record.scheme_name || null,
                village_name: record.village_name,
                population: record.population || null,
                number_of_esr: record.number_of_esr || null,
                data_date: waterDate,
                water_value: parseFloat(waterValue),
                lpcd_value: null,
                upload_batch_id: uploadBatchId,
                dashboard_url: record.dashboard_url || null
              });
            }
          }

          // Process LPCD values (days 1-7)
          for (let day = 1; day <= 7; day++) {
            const lpcdDateField = `lpcd_date_day${day}`;
            const lpcdValueField = `lpcd_value_day${day}`;

            const lpcdDate = record[lpcdDateField];
            const lpcdValue = record[lpcdValueField];

            if (lpcdDate && lpcdValue !== null && lpcdValue !== undefined && lpcdValue !== '') {
              historicalRecords.push({
                region: record.region || null,
                circle: record.circle || null,
                division: record.division || null,
                sub_division: record.sub_division || null,
                block: record.block || null,
                scheme_id: record.scheme_id,
                scheme_name: record.scheme_name || null,
                village_name: record.village_name,
                population: record.population || null,
                number_of_esr: record.number_of_esr || null,
                data_date: lpcdDate,
                water_value: null,
                lpcd_value: parseFloat(lpcdValue),
                upload_batch_id: uploadBatchId,
                dashboard_url: record.dashboard_url || null
              });
            }
          }
        }

        if (historicalRecords.length > 0) {
          console.log(`Inserting ${historicalRecords.length} historical records into water_scheme_data_history...`);

          // Insert records in batches
          const batchSize = 50;
          for (let i = 0; i < historicalRecords.length; i += batchSize) {
            const batch = historicalRecords.slice(i, i + batchSize);

            try {
              // Build individual insert statements for each record
              for (const histRecord of batch) {
                const insertQuery = `
                  INSERT INTO water_scheme_data_history 
                  (region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, 
                   population, number_of_esr, data_date, water_value, lpcd_value, upload_batch_id, dashboard_url) 
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `;

                const values = [
                  histRecord.region, histRecord.circle, histRecord.division, histRecord.sub_division,
                  histRecord.block, histRecord.scheme_id, histRecord.scheme_name, histRecord.village_name,
                  histRecord.population, histRecord.number_of_esr, histRecord.data_date,
                  histRecord.water_value, histRecord.lpcd_value, histRecord.upload_batch_id, histRecord.dashboard_url
                ];

                await client.query(insertQuery, values);
              }

              console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(historicalRecords.length/batchSize)} into water_scheme_data_history`);
            } catch (batchError) {
              console.error(`Error inserting historical batch ${Math.floor(i/batchSize) + 1}:`, batchError);
            }
          }

          console.log(`✅ Successfully stored ${historicalRecords.length} historical records with batch ID: ${uploadBatchId}`);
        }

        console.log("✅ Historical water scheme data stored successfully in water_scheme_data_history table");
      } else {
        console.log("⚠️ No valid records found for historical storage");
      }
    } catch (historicalError) {
      console.error('❌ Error storing historical water scheme data after import:', historicalError);
      console.error('Historical error details:', historicalError);
      errors.push('Failed to store historical water scheme data');
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

  // CSV column order - extended to include scheme status fields
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
    'water_value_day7',
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
    'water_date_day7',
    'lpcd_date_day1',
    'lpcd_date_day2',
    'lpcd_date_day3',
    'lpcd_date_day4',
    'lpcd_date_day5',
    'lpcd_date_day6',
    'lpcd_date_day7',
    'consistent_zero_lpcd_for_a_week',
    'below_55_lpcd_count',
    'above_55_lpcd_count',
    'scheme_functional_status',
    'fully_completion_scheme_status'
  ];

  // Map fields based on column position
  columnMapping.forEach((field, index) => {
    if (index < row.length) {
      const value = row[index];

      // Convert value to appropriate type
      if (['population', 'number_of_esr', 'water_value_day1', 'water_value_day2', 'water_value_day3', 
           'water_value_day4', 'water_value_day5', 'water_value_day6', 'water_value_day7', 'lpcd_value_day1', 'lpcd_value_day2', 
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
      } else if (field === 'scheme_functional_status' || field === 'fully_completion_scheme_status') {
        // Normalize status values
        if (value !== null && value !== undefined) {
          const status = String(value).trim();
          record[field] = normalizeStatusValue(status);
        } else {
          record[field] = null;
        }
      } else {
        // Keep as string but handle null/undefined
        record[field] = value !== null && value !== undefined ? String(value) : null;
      }
    }
  });

  return record;
}

// Normalize status values to standard format
function normalizeStatusValue(status: string): string {
  const lowerStatus = status.toLowerCase().trim();

  // Standard status mapping
  const statusMap: Record<string, string> = {
    'not-connected': 'Not-Connected',
    'not connected': 'Not-Connected',
    'notconnected': 'Not-Connected',
    'in progress': 'In Progress',
    'inprogress': 'In Progress',
    'partial': 'In Progress',
    'fully completed': 'Fully-Completed',
    'fully-completed': 'Fully-Completed',
    'fullycompleted': 'Fully-Completed',
    'completed': 'Fully-Completed',
    'functional': 'Functional',
    'non-functional': 'Non-Functional',
    'non functional': 'Non-Functional',
    'nonfunctional': 'Non-Functional'
  };

  // Try exact match first
  if (statusMap[lowerStatus]) {
    return statusMap[lowerStatus];
  }

  // Pattern matching for partial matches
  if (lowerStatus.includes('not') && lowerStatus.includes('connect')) {
    return 'Not-Connected';
  }
  if (lowerStatus.includes('progress') || lowerStatus.includes('partial')) {
    return 'In Progress';
  }
  if (lowerStatus.includes('fully') && lowerStatus.includes('complet')) {
    return 'Fully-Completed';
  }
  if (lowerStatus.includes('complet') && !lowerStatus.includes('non')) {
    return 'Fully-Completed';
  }
  if (lowerStatus.includes('function') && !lowerStatus.includes('non')) {
    return 'Functional';
  }
  if (lowerStatus.includes('non') && lowerStatus.includes('function')) {
    return 'Non-Functional';
  }

  // Return original if no match found
  return status;
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

// Get water scheme data history with date range functionality
router.get('/history', async (req, res) => {
  try {
    const { scheme_id, village_name, start_date, end_date, region } = req.query;

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      let query = `
        SELECT 
          *
        FROM water_scheme_data_history 
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      if (scheme_id) {
        query += ` AND scheme_id = $${paramIndex++}`;
        queryParams.push(scheme_id);
      }

      if (village_name) {
        query += ` AND village_name = $${paramIndex++}`;
        queryParams.push(village_name);
      }

      if (region) {
        query += ` AND region = $${paramIndex++}`;
        queryParams.push(region);
      }

      if (start_date) {
        query += ` AND data_date >= $${paramIndex++}`;
        queryParams.push(start_date);
      }

      if (end_date) {
        query += ` AND data_date <= $${paramIndex++}`;
        queryParams.push(end_date);
      }

      query += ` ORDER BY data_date DESC, uploaded_at DESC`;

      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching water scheme data history:', error);
    res.status(500).json({ error: 'Failed to fetch water scheme data history' });
  }
});

// Get LPCD trends for a specific village over date range
router.get('/lpcd-trends', async (req, res) => {
  try {
    const { scheme_id, village_name, start_date, end_date, days = 30 } = req.query;

    if (!scheme_id || !village_name) {
      return res.status(400).json({ error: 'scheme_id and village_name are required' });
    }

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      let query = `
        SELECT 
          data_date,
          lpcd_value,
          water_value,
          uploaded_at
        FROM water_scheme_data_history 
        WHERE scheme_id = $1 AND village_name = $2
      `;

      const queryParams: any[] = [scheme_id, village_name];
      let paramIndex = 3;

      if (start_date) {
        query += ` AND data_date >= $${paramIndex++}`;
        queryParams.push(start_date);
      }

      if (end_date) {
        query += ` AND data_date <= $${paramIndex++}`;
        queryParams.push(end_date);
      } else if (!start_date) {
        // If no date range specified, get last X days
        query += ` AND data_date >= (CURRENT_DATE - INTERVAL '${days} days')::text`;
      }

      query += ` ORDER BY data_date ASC`;

      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching LPCD trends:', error);
    res.status(500).json({ error: 'Failed to fetch LPCD trends' });
  }
});

// Export water scheme data history with date range
router.get('/export/history', async (req, res) => {
  try {
    const { scheme_id, village_name, start_date, end_date, region, format = 'xlsx' } = req.query;

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      let query = `
        SELECT 
          region,
          circle,
          division,
          sub_division,
          block,
          scheme_id,
          scheme_name,
          village_name,
          population,
          number_of_esr,
          data_date,
          water_value,
          lpcd_value,
          uploaded_at,
          upload_batch_id
        FROM water_scheme_data_history 
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      if (scheme_id) {
        query += ` AND scheme_id = $${paramIndex++}`;
        queryParams.push(scheme_id);
      }

      if (village_name) {
        query += ` AND village_name = $${paramIndex++}`;
        queryParams.push(village_name);
      }

      if (region) {
        query += ` AND region = $${paramIndex++}`;
        queryParams.push(region);
      }

      if (start_date) {
        query += ` AND data_date >= $${paramIndex++}`;
        queryParams.push(start_date);
      }

      if (end_date) {
        query += ` AND data_date <= $${paramIndex++}`;
        queryParams.push(end_date);
      }

      query += ` ORDER BY data_date DESC, village_name ASC`;

      const result = await client.query(query, queryParams);

      if (format === 'csv') {
        // Generate CSV
        const headers = Object.keys(result.rows[0] || {});
        let csvContent = headers.join(',') + '\n';

        result.rows.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            return value !== null && value !== undefined ? `"${value}"` : '';
          });
          csvContent += values.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="water_scheme_history_${Date.now()}.csv"`);
        res.send(csvContent);
      } else {
        // Generate Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(result.rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Water_Scheme_History');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="water_scheme_history_${Date.now()}.xlsx"`);
        res.send(buffer);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error exporting water scheme data history:', error);
    res.status(500).json({ error: 'Failed to export water scheme data history' });
  }
});

// Get historical LPCD data with date range filtering
router.get('/historical', async (req, res) => {
  try {
    const { startDate, endDate, region } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required parameters' 
      });
    }

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // Convert date formats if needed
      // If dates come in YYYY-MM-DD format, convert to DD-MMM format
      let formattedStartDate = startDate;
      let formattedEndDate = endDate;

      // Check if dates are in YYYY-MM-DD format and convert to DD-MMM
      if (typeof startDate === 'string' && startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const startDateObj = new Date(startDate + 'T00:00:00Z');
        formattedStartDate = startDateObj.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short' 
        });
      }

      if (typeof endDate === 'string' && endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const endDateObj = new Date(endDate + 'T00:00:00Z');
        formattedEndDate = endDateObj.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short' 
        });
      }

      // Since dates are stored in DD-MMM format, get all data and return it
      // The frontend will handle date filtering or we return all available data
      let query = `
        SELECT 
          region,
          circle,
          division,
          sub_division,
          block,
          scheme_id,
          scheme_name,
          village_name,
          population,
          number_of_esr,
          data_date,
          water_value,
          lpcd_value,
          upload_batch_id,
          uploaded_at
        FROM water_scheme_data_history 
        WHERE (lpcd_value IS NOT NULL OR water_value IS NOT NULL)
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add region filter if specified
      if (region && region !== 'all') {
        query += ` AND region = $${paramIndex++}`;
        queryParams.push(region);
      }

      query += ' ORDER BY data_date DESC, village_name ASC';

      console.log('Executing historical LPCD query:', query);
      console.log('With parameters:', queryParams);
      console.log('Date range requested:', startDate, 'to', endDate);
      console.log('Formatted dates:', formattedStartDate, 'to', formattedEndDate);

      const result = await client.query(query, queryParams);

      console.log(`Found ${result.rows.length} historical LPCD records`);
      const dates = result.rows.map(r => r.data_date);
      const uniqueDates = dates.filter((date, index) => dates.indexOf(date) === index).sort();
      console.log('Available dates:', uniqueDates);

      res.json(result.rows);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching historical LPCD data:', error);
    res.status(500).json({ error: 'Failed to fetch historical LPCD data' });
  }
});

// Download historical village LPCD data with date range filtering
router.get('/download/village-lpcd-history', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      region, 
      scheme_id, 
      village_name,
      minLpcd,
      maxLpcd,
      format = 'xlsx' 
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required parameters (format: YYYY-MM-DD)' 
      });
    }

    console.log(`Village LPCD historical export request: startDate=${startDate}, endDate=${endDate}, region=${region}`);

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // Convert YYYY-MM-DD dates to Date objects for proper filtering
      const startDateObj = new Date(startDate + 'T00:00:00Z');
      const endDateObj = new Date(endDate + 'T23:59:59Z');

      console.log(`Date range: ${startDate} to ${endDate} (${startDateObj.toISOString()} to ${endDateObj.toISOString()})`);

      // First get all historical data, then filter by date range in JavaScript
      // since dates are stored in DD-MMM format which is hard to filter in SQL
      let query = `
        SELECT 
          region,
          circle,
          division,
          sub_division,
          block,
          scheme_id,
          scheme_name,
          village_name,
          population,
          number_of_esr,
          data_date,
          lpcd_value,
          water_value,
          upload_batch_id,
          uploaded_at
        FROM water_scheme_data_history 
        WHERE (lpcd_value IS NOT NULL OR water_value IS NOT NULL)
      `;

      const queryParams = [];
      let paramIndex = 1;

      // Add region filter
      if (region && region !== 'all') {
        query += ` AND region = $${paramIndex++}`;
        queryParams.push(region);
      }

      // Add scheme filter
      if (scheme_id) {
        query += ` AND scheme_id = $${paramIndex++}`;
        queryParams.push(scheme_id);
      }

      // Add village filter
      if (village_name) {
        query += ` AND village_name = $${paramIndex++}`;
        queryParams.push(village_name);
      }

      // Add LPCD range filters
      if (minLpcd) {
        query += ` AND lpcd_value >= $${paramIndex++}`;
        queryParams.push(String(minLpcd));
      }

      if (maxLpcd) {
        query += ` AND lpcd_value <= $${paramIndex++}`;
        queryParams.push(String(maxLpcd));
      }

      query += ` ORDER BY data_date DESC, region ASC, village_name ASC`;

      const result = await client.query(query, queryParams);

      console.log(`Retrieved ${result.rows.length} total historical records from database`);

      // Helper function to parse DD-MMM date format to Date object
      const parseDDMMMDate = (dateStr: any): Date | null => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        try {
          // Handle formats like "11-Jun", "15-Dec" etc.
          const [day, month] = dateStr.split('-');
          const currentYear = new Date().getFullYear();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthIndex = monthNames.indexOf(month);
          if (monthIndex === -1) return null;
          return new Date(currentYear, monthIndex, parseInt(day));
        } catch (error) {
          return null;
        }
      };

      // Filter results by date range
      const filteredRows = result.rows.filter(row => {
        const rowDate = parseDDMMMDate(row.data_date);
        if (!rowDate) return false;
        return rowDate >= startDateObj && rowDate <= endDateObj;
      });

      console.log(`Filtered to ${filteredRows.length} records within date range`);

      const filteredResult = { ...result, rows: filteredRows };

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'No LPCD data found for the specified date range and filters' 
        });
      }

      // Generate filename with date range
      const filename = `Village_LPCD_History_${startDate}_to_${endDate}_${Date.now()}`;

      if (format === 'csv') {
        // Generate CSV
        const headers = [
          'Region', 'Circle', 'Division', 'Sub Division', 'Block',
          'Scheme ID', 'Scheme Name', 'Village Name', 'Population',
          'Date', 'LPCD Value', 'Water Value', 'Upload Batch', 'Uploaded At'
        ];

        let csvContent = headers.join(',') + '\n';

        result.rows.forEach(row => {
          const values = [
            row.region || '',
            row.circle || '',
            row.division || '',
            row.sub_division || '',
            row.block || '',
            row.scheme_id || '',
            row.scheme_name || '',
            row.village_name || '',
            row.population || '',
            row.data_date || '',
            row.lpcd_value || '',
            row.water_value || '',
            row.upload_batch_id || '',
            row.uploaded_at || ''
          ];
          csvContent += values.map(v => `"${v}"`).join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csvContent);
      } else {
        // Generate Excel with proper pivot structure - dates as headers
        const wb = XLSX.utils.book_new();

        // Get unique dates and sort them
        const dates = filteredResult.rows.map(row => row.data_date);
        const uniqueDatesSet = new Set(dates);
        const uniqueDates = Array.from(uniqueDatesSet).sort();

        console.log('Creating proper pivot Excel structure');
        console.log('Unique dates found:', uniqueDates);

        // Create village lookup map for consolidation
        const villageData = new Map();

        // First pass: collect all village base information
        filteredResult.rows.forEach(row => {
          const villageKey = `${row.scheme_id}|${row.village_name}`;

          if (!villageData.has(villageKey)) {
            villageData.set(villageKey, {
              baseInfo: {
                region: row.region || '',
                circle: row.circle || '',
                division: row.division || '',
                sub_division: row.sub_division || '',
                block: row.block || '',
                scheme_id: row.scheme_id || '',
                scheme_name: row.scheme_name || '',
                village_name: row.village_name || '',
                population: row.population || '',
                number_of_esr: row.number_of_esr || 0
              },
              dateValues: new Map()
            });
          }

          // Store values for this date, merging with existing data if present
          const existingDateData = villageData.get(villageKey).dateValues.get(row.data_date) || {
            water_value: '',
            lpcd_value: ''
          };

          villageData.get(villageKey).dateValues.set(row.data_date, {
            water_value: row.water_value || existingDateData.water_value || '',
            lpcd_value: row.lpcd_value || existingDateData.lpcd_value || ''
          });
        });

        // Create the pivot table structure manually
        const pivotRows = [];

        // Build header row
        const headerRow = [
          'Region', 'Circle', 'Division', 'Sub Division', 'Block',
          'Scheme ID', 'Scheme Name', 'Village Name', 'Population', 'Number of ESR'
        ];

        // Add date headers in pairs
        uniqueDates.forEach(date => {
          headerRow.push(`${date} Water Value (ML)`);
          headerRow.push(`${date} LPCD Value`);
        });

        pivotRows.push(headerRow);

        // Build data rows
        villageData.forEach((village) => {
          const dataRow = [
            village.baseInfo.region,
            village.baseInfo.circle,
            village.baseInfo.division,
            village.baseInfo.sub_division,
            village.baseInfo.block,
            village.baseInfo.scheme_id,
            village.baseInfo.scheme_name,
            village.baseInfo.village_name,
            village.baseInfo.population,
            village.baseInfo.number_of_esr
          ];

          // Add date values in order
          uniqueDates.forEach(date => {
            const dateVal = village.dateValues.get(date);
            if (dateVal) {
              dataRow.push(dateVal.water_value);
              dataRow.push(dateVal.lpcd_value);
            } else {
              dataRow.push(''); // Empty water value
              dataRow.push(''); // Empty LPCD value
            }
          });

          pivotRows.push(dataRow);
        });

        console.log(`FINAL PIVOT: ${pivotRows.length - 1} villages, ${headerRow.length} columns total`);

        // Create worksheet from the pivot array
        const ws = XLSX.utils.aoa_to_sheet(pivotRows);

        // Set column widths
        const colWidths = [
          { width: 15 }, // Region
          { width: 15 }, // Circle
          { width: 15 }, // Division
          { width: 15 }, // Sub Division
          { width: 15 }, // Block
          { width: 12 }, // Scheme ID
          { width: 25 }, // Scheme Name
          { width: 20 }, // Village Name
          { width: 12 }, // Population
          { width: 15 }  // Number of ESR
        ];

        // Add column widths for date columns
        uniqueDates.forEach(() => {
          colWidths.push({ width: 15 }); // Water Value
          colWidths.push({ width: 12 }); // LPCD Value
        });

        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Pivot Data');

        // Add summary sheet
        const summaryData = [
          { 'Filter': 'Date Range', 'Value': `${startDate} to ${endDate}` },
          { 'Filter': 'Region', 'Value': region || 'All Regions' },
          { 'Filter': 'Total Records', 'Value': filteredResult.rows.length },
          { 'Filter': 'Min LPCD Filter', 'Value': minLpcd || 'None' },
          { 'Filter': 'Max LPCD Filter', 'Value': maxLpcd || 'None' },
          { 'Filter': 'Generated At', 'Value': new Date().toISOString() }
        ];

        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        summaryWs['!cols'] = [{ width: 20 }, { width: 30 }];
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Filter Summary');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(buffer);
      }

      console.log(`Downloaded ${filteredResult.rows.length} historical LPCD records for date range ${startDate} to ${endDate}`);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error downloading village LPCD history:', error);
    res.status(500).json({ error: 'Failed to download village LPCD history' });
  }
});

// Populate water_scheme_data_history from current water_scheme_data
router.post('/populate-history', async (req, res) => {
  try {
    console.log('📊 Manual trigger to populate water_scheme_data_history from current data');

    await storageInstance.populateHistoryFromCurrentData();

    res.json({
      success: true,
      message: 'Successfully populated water_scheme_data_history from current data'
    });
  } catch (error) {
    console.error('Error populating history from current data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to populate history from current data'
    });
  }
});

export default router;