/**
 * Migration script to add the 'dashboard_url' column to the scheme_status table
 * This column is used to store the URL for accessing the PI Vision dashboard for a scheme
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function addDashboardUrlColumn() {
  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    
    // Check if the column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scheme_status' 
      AND column_name = 'dashboard_url';
    `;
    
    const checkResult = await pool.query(checkColumnQuery);
    
    if (checkResult.rows.length === 0) {
      console.log('Adding dashboard_url column to scheme_status table...');
      
      // Add the dashboard_url column
      const addColumnQuery = `
        ALTER TABLE scheme_status 
        ADD COLUMN dashboard_url TEXT;
      `;
      
      await pool.query(addColumnQuery);
      console.log('✅ Successfully added dashboard_url column to scheme_status table');
    } else {
      console.log('Dashboard_url column already exists in scheme_status table');
    }
  } catch (error) {
    console.error('Error adding dashboard_url column:', error);
  } finally {
    // Close the pool
    await pool.end();
    console.log('Database connection closed');
  }
}

// Execute the migration
addDashboardUrlColumn();