import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { regions, schemeStatuses, users, waterSchemeData } from "@shared/schema";

const { Pool } = pg;

// Create a new pool instance using the DATABASE_URL
export function setupDatabase() {
  console.log("Setting up database connection...");

  // Ensure DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");
    throw new Error("DATABASE_URL environment variable is not set!");
  }

  try {
    // Only log the database host for security reasons
    const dbUrl = new URL(process.env.DATABASE_URL);
    console.log(`Connecting to: ${dbUrl.host}`);
  } catch (e) {
    console.log('Connecting to database...');
  }

  // Create the pool with correct options
  const poolConfig: any = {
    connectionString: process.env.DATABASE_URL
  };
  
  // Only add SSL config in production
  if (process.env.NODE_ENV === 'production') {
    poolConfig.ssl = {
      require: true,
      rejectUnauthorized: false, // Important for Neon DB connections
    };
  }
  
  const pool = new Pool(poolConfig);

  // Log successful connection
  pool.on("connect", () => {
    console.log("Connected to PostgreSQL database");
  });

  // Log errors
  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client", err);
  });

  // Create drizzle instance
  const db = drizzle(pool);
  return { db, pool };
}

// Initialize tables if they don't exist
export async function initializeTables(db: any) {
  try {
    console.log("Initializing database tables...");
    
    // Create regions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "region" (
        "region_id" SERIAL PRIMARY KEY,
        "region_name" TEXT NOT NULL,
        "total_esr_integrated" INTEGER,
        "fully_completed_esr" INTEGER,
        "partial_esr" INTEGER,
        "total_villages_integrated" INTEGER,
        "fully_completed_villages" INTEGER,
        "total_schemes_integrated" INTEGER,
        "fully_completed_schemes" INTEGER,
        "flow_meter_integrated" INTEGER,
        "rca_integrated" INTEGER,
        "pressure_transmitter_integrated" INTEGER
      );
    `);
    
    // Create scheme_status table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "scheme_status" (
        "sr_no" INTEGER,
        "scheme_id" TEXT PRIMARY KEY,
        "region" TEXT,
        "circle" TEXT,
        "division" TEXT,
        "sub_division" TEXT,
        "block" TEXT,
        "scheme_name" TEXT NOT NULL,
        "agency" TEXT,
        "number_of_village" INTEGER,
        "total_villages_integrated" INTEGER,
        "total_villages_in_scheme" INTEGER,
        "no_of_functional_village" INTEGER,
        "no_of_partial_village" INTEGER,
        "no_of_non_functional_village" INTEGER,
        "fully_completed_villages" INTEGER,
        "total_number_of_esr" INTEGER,
        "scheme_functional_status" TEXT,
        "total_esr_integrated" INTEGER,
        "no_fully_completed_esr" INTEGER,
        "balance_to_complete_esr" INTEGER,
        "flow_meters_connected" INTEGER,
        "pressure_transmitter_connected" INTEGER,
        "residual_chlorine_analyzer_connected" INTEGER,
        "fully_completion_scheme_status" TEXT
      );
    `);
    
    // Create users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "name" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user'
      );
    `);
    
    // Create app_state table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "app_state" (
        "key" TEXT PRIMARY KEY,
        "value" JSONB NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create water_scheme_data table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "water_scheme_data" (
        "region" TEXT,
        "circle" TEXT,
        "division" TEXT,
        "sub_division" TEXT,
        "block" TEXT,
        "scheme_id" VARCHAR(100),
        "scheme_name" TEXT,
        "village_name" TEXT,
        "population" INTEGER,
        "number_of_esr" INTEGER,
        "water_value_day1" DECIMAL(10,2),
        "water_value_day2" DECIMAL(10,2),
        "water_value_day3" DECIMAL(10,2),
        "water_value_day4" DECIMAL(10,2),
        "water_value_day5" DECIMAL(10,2),
        "water_value_day6" DECIMAL(10,2),
        "lpcd_value_day1" DECIMAL(10,2),
        "lpcd_value_day2" DECIMAL(10,2),
        "lpcd_value_day3" DECIMAL(10,2),
        "lpcd_value_day4" DECIMAL(10,2),
        "lpcd_value_day5" DECIMAL(10,2),
        "lpcd_value_day6" DECIMAL(10,2),
        "lpcd_value_day7" DECIMAL(10,2),
        "water_date_day1" VARCHAR(20),
        "water_date_day2" VARCHAR(20),
        "water_date_day3" VARCHAR(20),
        "water_date_day4" VARCHAR(20),
        "water_date_day5" VARCHAR(20),
        "water_date_day6" VARCHAR(20),
        "lpcd_date_day1" VARCHAR(20),
        "lpcd_date_day2" VARCHAR(20),
        "lpcd_date_day3" VARCHAR(20),
        "lpcd_date_day4" VARCHAR(20),
        "lpcd_date_day5" VARCHAR(20),
        "lpcd_date_day6" VARCHAR(20),
        "lpcd_date_day7" VARCHAR(20),
        "consistent_zero_lpcd_for_a_week" INTEGER,
        "below_55_lpcd_count" INTEGER,
        "above_55_lpcd_count" INTEGER,
        PRIMARY KEY ("scheme_id", "village_name")
      );
    `);
    
    // Check if the users table has any records using raw SQL to avoid Drizzle ORM issues
    try {
      const usersResult = await db.execute(`SELECT COUNT(*) FROM "users"`);
      const usersCount = parseInt(usersResult.rows[0].count, 10);
      
      if (usersCount === 0) {
        console.log("Creating default admin user...");
        // Use raw SQL to insert admin user to avoid potential ORM issues
        await db.execute(`
          INSERT INTO "users" ("username", "password", "name", "role") 
          VALUES ('admin', 'admin123', 'Administrator', 'admin')
        `);
        console.log("Default admin user created successfully");
      }
    } catch (error) {
      console.error("Error checking/creating users:", error);
      // Continue despite error to allow other tables to be created
    }
    
    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database tables:", error);
    throw error;
  }
}