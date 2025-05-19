import express from 'express';
import * as db from '../db';
import pg from 'pg';

const router = express.Router();

// Get scheme LPCD data - aggregated from village LPCD data
router.get('/', async (req, res) => {
  try {
    const { region, minLpcd, maxLpcd, mjpCommissioned } = req.query;
    
    // Use pg directly for this route to perform complex aggregation
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Build the SQL query to join water_scheme_data with scheme_status
      // and aggregate the data by scheme
      
      let baseQuery = `
        WITH scheme_aggregation AS (
          SELECT 
            wsd.scheme_id,
            wsd.scheme_name,
            wsd.region,
            wsd.circle,
            wsd.division,
            wsd.sub_division,
            wsd.block,
            SUM(wsd.population) as total_population,
            
            -- Water supply aggregation
            SUM(wsd.water_value_day1) as total_water_day1,
            SUM(wsd.water_value_day2) as total_water_day2,
            SUM(wsd.water_value_day3) as total_water_day3,
            SUM(wsd.water_value_day4) as total_water_day4,
            SUM(wsd.water_value_day5) as total_water_day5,
            SUM(wsd.water_value_day6) as total_water_day6,
            
            -- Keep the date values (will be the same per scheme)
            MAX(wsd.water_date_day1) as water_date_day1,
            MAX(wsd.water_date_day2) as water_date_day2,
            MAX(wsd.water_date_day3) as water_date_day3,
            MAX(wsd.water_date_day4) as water_date_day4,
            MAX(wsd.water_date_day5) as water_date_day5,
            MAX(wsd.water_date_day6) as water_date_day6,
            MAX(wsd.lpcd_date_day1) as lpcd_date_day1,
            MAX(wsd.lpcd_date_day2) as lpcd_date_day2,
            MAX(wsd.lpcd_date_day3) as lpcd_date_day3,
            MAX(wsd.lpcd_date_day4) as lpcd_date_day4,
            MAX(wsd.lpcd_date_day5) as lpcd_date_day5,
            MAX(wsd.lpcd_date_day6) as lpcd_date_day6,
            MAX(wsd.lpcd_date_day7) as lpcd_date_day7,
            
            -- Count stats based on the block-specific village counts
            -- This uses the correct village count for each block/scheme
            COUNT(wsd.village_name) as total_villages,
            -- Below 55 LPCD but above 0
            SUM(CASE WHEN wsd.lpcd_value_day7 < 55 AND wsd.lpcd_value_day7 > 0 THEN 1 ELSE 0 END) as villages_below_55,
            -- Above or equal to 55 LPCD
            SUM(CASE WHEN wsd.lpcd_value_day7 >= 55 THEN 1 ELSE 0 END) as villages_above_55,
            -- Zero or NULL LPCD value
            SUM(CASE WHEN wsd.lpcd_value_day7 = 0 OR wsd.lpcd_value_day7 IS NULL THEN 1 ELSE 0 END) as villages_zero_supply,
            
            -- Additional scheme info from scheme_status
            MAX(ss.dashboard_url) as dashboard_url,
            MAX(ss.mjp_commissioned) as mjp_commissioned
          FROM 
            water_scheme_data wsd
          LEFT JOIN
            scheme_status ss ON wsd.scheme_id = ss.scheme_id
          GROUP BY 
            wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.circle, wsd.division, wsd.sub_division, wsd.block
        )
        
        -- Calculate the LPCD values for each scheme using the formula:
        -- (Total water supply * 100000) / Total population
        SELECT 
          scheme_id,
          scheme_name,
          region,
          circle,
          division,
          sub_division,
          block,
          total_population,
          total_villages,
          villages_below_55,
          villages_above_55,
          villages_zero_supply,
          
          -- Calculate the LPCD values for each day
          CASE WHEN total_population > 0 THEN ROUND((total_water_day1 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day1,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day2 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day2,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day3 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day3,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day4 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day4,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day5 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day5,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day6 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day6,
          -- For day7, we calculate it based on the last valid days
          CASE WHEN total_population > 0 THEN ROUND((total_water_day6 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day7,
          
          -- Keep water supply totals
          total_water_day1,
          total_water_day2,
          total_water_day3,
          total_water_day4,
          total_water_day5,
          total_water_day6,
          
          -- Dates
          water_date_day1,
          water_date_day2,
          water_date_day3,
          water_date_day4,
          water_date_day5,
          water_date_day6,
          lpcd_date_day1,
          lpcd_date_day2,
          lpcd_date_day3,
          lpcd_date_day4,
          lpcd_date_day5,
          lpcd_date_day6,
          lpcd_date_day7,
          
          -- Additional scheme info
          dashboard_url,
          mjp_commissioned
        FROM 
          scheme_aggregation
      `;
      
      // Add WHERE clause for filtering
      const conditions: string[] = [];
      const queryParams: any[] = [];
      
      // Region filter
      if (region && region !== 'all') {
        conditions.push('region = $' + (queryParams.length + 1));
        queryParams.push(region);
      }
      
      // LPCD minimum filter
      if (minLpcd) {
        conditions.push('CASE WHEN total_population > 0 THEN ROUND((total_water_day1 * 100000) / total_population, 2) ELSE 0 END >= $' + (queryParams.length + 1));
        queryParams.push(Number(minLpcd));
      }
      
      // LPCD maximum filter
      if (maxLpcd) {
        conditions.push('CASE WHEN total_population > 0 THEN ROUND((total_water_day1 * 100000) / total_population, 2) ELSE 0 END <= $' + (queryParams.length + 1));
        queryParams.push(Number(maxLpcd));
      }
      
      // MJP Commissioned filter
      if (mjpCommissioned === 'Yes' || mjpCommissioned === 'No') {
        conditions.push('mjp_commissioned = $' + (queryParams.length + 1));
        queryParams.push(mjpCommissioned);
      }
      
      // Add WHERE clause if there are conditions
      if (conditions.length > 0) {
        baseQuery += ' WHERE ' + conditions.join(' AND ');
      }
      
      // Add ordering
      baseQuery += ' ORDER BY region, scheme_name';
      
      // Execute the query
      const result = await client.query(baseQuery, queryParams);
      
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching scheme LPCD data:', error);
    res.status(500).json({ error: 'Failed to fetch scheme LPCD data' });
  }
});

// Get scheme LPCD statistics
router.get('/lpcd-stats', async (req, res) => {
  try {
    const { region } = req.query;
    
    // Use pg directly for this route
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // First, get aggregated scheme data
      let aggregatedDataQuery = `
        WITH scheme_aggregation AS (
          SELECT 
            wsd.scheme_id,
            wsd.scheme_name,
            wsd.region,
            SUM(wsd.population) as total_population,
            SUM(wsd.water_value_day1) as total_water_day1
          FROM 
            water_scheme_data wsd
          GROUP BY 
            wsd.scheme_id, wsd.scheme_name, wsd.region
        )
        
        SELECT 
          scheme_id,
          scheme_name,
          region,
          total_population,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day1 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day1
        FROM 
          scheme_aggregation
      `;
      
      // Add WHERE clause for region filtering
      const queryParams: any[] = [];
      if (region && region !== 'all') {
        aggregatedDataQuery += ' WHERE region = $1';
        queryParams.push(region);
      }
      
      // Execute the aggregation query
      const schemeData = await client.query(aggregatedDataQuery, queryParams);
      
      // Calculate statistics from the result
      const stats = {
        above_55_count: 0,
        below_40_count: 0,
        between_40_55_count: 0,
        zero_lpcd_count: 0,
        total_schemes: schemeData.rows.length
      };
      
      // Count schemes in different LPCD ranges
      schemeData.rows.forEach((scheme) => {
        const lpcdValue = parseFloat(scheme.lpcd_value_day1);
        
        if (lpcdValue === 0) {
          stats.zero_lpcd_count += 1;
        } else if (lpcdValue > 55) {
          stats.above_55_count += 1;
        } else if (lpcdValue < 40) {
          stats.below_40_count += 1;
        } else { // Between 40-55
          stats.between_40_55_count += 1;
        }
      });
      
      res.json(stats);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching scheme LPCD statistics:', error);
    res.status(500).json({ error: 'Failed to fetch scheme LPCD statistics' });
  }
});

export default router;