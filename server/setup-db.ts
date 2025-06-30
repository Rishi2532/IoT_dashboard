import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from 'fs';
import path from 'path';
import { regions, schemeStatuses, users, waterSchemeData, chlorineData, pressureData, reportFiles } from "@shared/schema";

const { Pool } = pg;

// Detect if running in VS Code with pgAdmin configuration
function isVSCodePgAdmin() {
  try {
    const envVscodePath = path.join(process.cwd(), '.env.vscode');
    return fs.existsSync(envVscodePath);
  } catch (error) {
    return false;
  }
}

// Create a new pool instance using the DATABASE_URL
export function setupDatabase() {
  console.log("Setting up database connection...");
  
  // Check if running in VS Code with pgAdmin configuration
  const isVSCode = isVSCodePgAdmin();
  if (isVSCode) {
    console.log("VS Code pgAdmin configuration detected!");
  }

  // Check for Replit environment first
  const isReplit = process.env.REPL_ID || process.env.REPLIT;
  if (isReplit) {
    console.log("Replit environment detected!");
  }

  // Ensure DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");
    
    // If in VS Code, suggest using the pgAdmin setup
    if (isVSCode) {
      console.log("Try running the application with F5 in VS Code or use the .env.vscode file");
    } else if (isReplit) {
      console.log("In Replit, the DATABASE_URL should be automatically provided. Please check if PostgreSQL database is properly configured.");
    }
    
    throw new Error("DATABASE_URL environment variable is not set!");
  }

  try {
    // Only log the database host for security reasons
    const dbUrl = new URL(process.env.DATABASE_URL);
    console.log(`Connecting to: ${dbUrl.host}`);
    
    // If connecting to localhost, it's likely pgAdmin
    if (dbUrl.host === 'localhost') {
      console.log("Using local database (likely pgAdmin)");
    }
  } catch (e) {
    console.log('Connecting to database...');
  }

  // Create the pool with correct options
  const poolConfig: any = {
    connectionString: process.env.DATABASE_URL
  };
  
  // Add SSL config for cloud databases (like Neon)
  const isLocalHost = process.env.DATABASE_URL.includes('localhost') || 
                      process.env.DATABASE_URL.includes('127.0.0.1');
                      
  if (!isLocalHost) {
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
    
    // Create scheme_status table - without primary key to allow duplicate entries
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "scheme_status" (
        "sr_no" INTEGER,
        "scheme_id" TEXT NOT NULL,
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
        "fully_completion_scheme_status" TEXT,
        "mjp_commissioned" TEXT DEFAULT 'No',
        "mjp_fully_completed" TEXT DEFAULT 'In Progress',
        "dashboard_url" TEXT
      );
    `);
    
    // Check if mjp_commissioned and mjp_fully_completed columns exist, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'scheme_status' AND column_name IN ('mjp_commissioned', 'mjp_fully_completed');
      `);
      
      const existingColumns = result.rows.map((row: any) => row.column_name);
      
      if (!existingColumns.includes('mjp_commissioned')) {
        console.log('Adding missing mjp_commissioned column to scheme_status table...');
        await db.execute(`ALTER TABLE "scheme_status" ADD COLUMN "mjp_commissioned" TEXT DEFAULT 'No';`);
        console.log('Successfully added mjp_commissioned column to scheme_status table');
      }
      
      if (!existingColumns.includes('mjp_fully_completed')) {
        console.log('Adding missing mjp_fully_completed column to scheme_status table...');
        await db.execute(`ALTER TABLE "scheme_status" ADD COLUMN "mjp_fully_completed" TEXT DEFAULT 'In Progress';`);
        console.log('Successfully added mjp_fully_completed column to scheme_status table');
      }
    } catch (error) {
      console.error('Error checking for MJP columns in scheme_status:', error);
    }
    
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
        "water_value_day1" DECIMAL(20,6),
        "water_value_day2" DECIMAL(20,6),
        "water_value_day3" DECIMAL(20,6),
        "water_value_day4" DECIMAL(20,6),
        "water_value_day5" DECIMAL(20,6),
        "water_value_day6" DECIMAL(20,6),
        "lpcd_value_day1" DECIMAL(20,6),
        "lpcd_value_day2" DECIMAL(20,6),
        "lpcd_value_day3" DECIMAL(20,6),
        "lpcd_value_day4" DECIMAL(20,6),
        "lpcd_value_day5" DECIMAL(20,6),
        "lpcd_value_day6" DECIMAL(20,6),
        "lpcd_value_day7" DECIMAL(20,6),
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
        "dashboard_url" TEXT,
        PRIMARY KEY ("scheme_id", "village_name")
      );
    `);
    
    // Check if dashboard_url column exists in water_scheme_data, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'water_scheme_data' AND column_name = 'dashboard_url';
      `);
      
      if (result.rows.length === 0) {
        console.log('Adding missing dashboard_url column to water_scheme_data table...');
        await db.execute(`ALTER TABLE "water_scheme_data" ADD COLUMN "dashboard_url" TEXT;`);
        console.log('Successfully added dashboard_url column to water_scheme_data table');
      }
    } catch (error) {
      console.error('Error checking for dashboard_url column:', error);
    }
    
    // Create chlorine_data table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "chlorine_data" (
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "esr_name" VARCHAR(255),
        "chlorine_value_1" NUMERIC(12,2),
        "chlorine_value_2" NUMERIC(12,2),
        "chlorine_value_3" NUMERIC(12,2),
        "chlorine_value_4" NUMERIC(12,2),
        "chlorine_value_5" NUMERIC(12,2),
        "chlorine_value_6" NUMERIC(12,2),
        "chlorine_value_7" NUMERIC(12,2),
        "chlorine_date_day_1" VARCHAR(15),
        "chlorine_date_day_2" VARCHAR(15),
        "chlorine_date_day_3" VARCHAR(15),
        "chlorine_date_day_4" VARCHAR(15),
        "chlorine_date_day_5" VARCHAR(15),
        "chlorine_date_day_6" VARCHAR(15),
        "chlorine_date_day_7" VARCHAR(15),
        "number_of_consistent_zero_value_in_chlorine" INTEGER,
        "chlorine_less_than_02_mgl" NUMERIC(12,2),
        "chlorine_between_02_05_mgl" NUMERIC(12,2),
        "chlorine_greater_than_05_mgl" NUMERIC(12,2),
        "dashboard_url" TEXT,
        PRIMARY KEY ("scheme_id", "village_name", "esr_name")
      );
    `);
    
    // Check if dashboard_url column exists in chlorine_data, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'chlorine_data' AND column_name = 'dashboard_url';
      `);
      
      if (result.rows.length === 0) {
        console.log('Adding missing dashboard_url column to chlorine_data table...');
        await db.execute(`ALTER TABLE "chlorine_data" ADD COLUMN "dashboard_url" TEXT;`);
        console.log('Successfully added dashboard_url column to chlorine_data table');
      }
    } catch (error) {
      console.error('Error checking for dashboard_url column in chlorine_data:', error);
    }
    
    // Create chlorine_history table for permanent historical storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "chlorine_history" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "esr_name" VARCHAR(255),
        "chlorine_date" VARCHAR(15) NOT NULL,
        "chlorine_value" NUMERIC,
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "upload_batch_id" VARCHAR(50),
        "dashboard_url" TEXT,
        UNIQUE("scheme_id", "village_name", "esr_name", "chlorine_date", "uploaded_at")
      );
    `);
    
    // Create index on chlorine_history for efficient date range queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_chlorine_history_date_range" 
      ON "chlorine_history" ("chlorine_date", "scheme_id", "village_name", "esr_name");
    `);
    
    // Create index on chlorine_history for efficient latest record queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_chlorine_history_latest" 
      ON "chlorine_history" ("scheme_id", "village_name", "esr_name", "chlorine_date", "uploaded_at" DESC);
    `);
    
    // Create pressure_data table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "pressure_data" (
        "region" TEXT,
        "circle" TEXT,
        "division" TEXT,
        "sub_division" TEXT,
        "block" TEXT,
        "scheme_id" TEXT,
        "scheme_name" TEXT,
        "village_name" TEXT,
        "esr_name" TEXT,
        "pressure_value_1" DECIMAL(12,2),
        "pressure_value_2" DECIMAL(12,2),
        "pressure_value_3" DECIMAL(12,2),
        "pressure_value_4" DECIMAL(12,2),
        "pressure_value_5" DECIMAL(12,2),
        "pressure_value_6" DECIMAL(12,2),
        "pressure_value_7" DECIMAL(12,2),
        "pressure_date_day_1" VARCHAR(15),
        "pressure_date_day_2" VARCHAR(15),
        "pressure_date_day_3" VARCHAR(15),
        "pressure_date_day_4" VARCHAR(15),
        "pressure_date_day_5" VARCHAR(15),
        "pressure_date_day_6" VARCHAR(15),
        "pressure_date_day_7" VARCHAR(15),
        "number_of_consistent_zero_value_in_pressure" INTEGER,
        "pressure_less_than_02_bar" DECIMAL(12,2),
        "pressure_between_02_07_bar" DECIMAL(12,2),
        "pressure_greater_than_07_bar" DECIMAL(12,2),
        "dashboard_url" TEXT,
        PRIMARY KEY ("scheme_id", "village_name", "esr_name")
      );
    `);
    
    // Check if dashboard_url column exists in pressure_data, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'pressure_data' AND column_name = 'dashboard_url';
      `);
      
      if (result.rows.length === 0) {
        console.log('Adding missing dashboard_url column to pressure_data table...');
        await db.execute(`ALTER TABLE "pressure_data" ADD COLUMN "dashboard_url" TEXT;`);
        console.log('Successfully added dashboard_url column to pressure_data table');
      }
    } catch (error) {
      console.error('Error checking for dashboard_url column in pressure_data:', error);
    }
    
    // Create pressure_history table for permanent historical storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "pressure_history" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "esr_name" VARCHAR(255),
        "pressure_date" VARCHAR(15) NOT NULL,
        "pressure_value" NUMERIC,
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "upload_batch_id" VARCHAR(50),
        "dashboard_url" TEXT,
        UNIQUE("scheme_id", "village_name", "esr_name", "pressure_date", "uploaded_at")
      );
    `);
    
    // Create index on pressure_history for efficient date range queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_pressure_history_date_range" 
      ON "pressure_history" ("pressure_date", "scheme_id", "village_name", "esr_name");
    `);
    
    // Create index on pressure_history for efficient latest record queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_pressure_history_latest" 
      ON "pressure_history" ("scheme_id", "village_name", "esr_name", "pressure_date", "uploaded_at" DESC);
    `);
    
    // Create water_scheme_data_history table for permanent historical storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "water_scheme_data_history" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "population" INTEGER,
        "number_of_esr" INTEGER,
        "data_date" VARCHAR(15) NOT NULL,
        "water_value" DECIMAL(20,6),
        "lpcd_value" DECIMAL(20,6),
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "upload_batch_id" VARCHAR(50),
        "dashboard_url" TEXT,
        UNIQUE("scheme_id", "village_name", "data_date", "uploaded_at")
      );
    `);
    
    // Create index on water_scheme_data_history for efficient date range queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_water_scheme_data_history_date_range" 
      ON "water_scheme_data_history" ("data_date", "scheme_id", "village_name");
    `);
    
    // Create index on water_scheme_data_history for efficient latest record queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_water_scheme_data_history_latest" 
      ON "water_scheme_data_history" ("scheme_id", "village_name", "data_date", "uploaded_at" DESC);
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
    
    // Create report_files table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "report_files" (
        "id" SERIAL PRIMARY KEY,
        "file_name" TEXT NOT NULL,
        "original_name" TEXT NOT NULL,
        "file_path" TEXT NOT NULL,
        "report_type" TEXT NOT NULL,
        "upload_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "uploaded_by" INTEGER REFERENCES "users"("id"),
        "file_size" INTEGER,
        "is_active" BOOLEAN DEFAULT TRUE
      );
    `);
    
    // Create user_activity_logs table for comprehensive activity tracking
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "user_activity_logs" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "username" TEXT NOT NULL,
        "session_id" TEXT NOT NULL,
        "activity_type" TEXT NOT NULL,
        "activity_description" TEXT NOT NULL,
        "file_name" TEXT,
        "file_type" TEXT,
        "page_url" TEXT,
        "ip_address" TEXT,
        "user_agent" TEXT,
        "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "metadata" JSONB
      );
    `);
    
    // Create population_tracking table for daily total population storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "population_tracking" (
        "id" SERIAL PRIMARY KEY,
        "date" TEXT NOT NULL UNIQUE,
        "total_population" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create region_population_tracking table for daily regional population storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "region_population_tracking" (
        "id" SERIAL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "region" TEXT NOT NULL,
        "total_population" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("date", "region")
      );
    `);
    
    // Create communication_status table for ESR sensor connectivity monitoring
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "communication_status" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "esr_name" VARCHAR(255),
        "chlorine_connected" VARCHAR(10),
        "pressure_connected" VARCHAR(10),
        "flow_meter_connected" VARCHAR(10),
        "chlorine_status" VARCHAR(20),
        "pressure_status" VARCHAR(20),
        "flow_meter_status" VARCHAR(20),
        "overall_status" VARCHAR(20),
        "chlorine_0h_72h" VARCHAR(20),
        "chlorine_72h" VARCHAR(20),
        "pressure_0h_72h" VARCHAR(20),
        "pressure_72h" VARCHAR(20),
        "flow_meter_0h_72h" VARCHAR(20),
        "flow_meter_72h" VARCHAR(20),
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("scheme_id", "village_name", "esr_name")
      );
    `);

    // Create index on communication_status for efficient queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_communication_status_region" 
      ON "communication_status" ("region");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_communication_status_scheme" 
      ON "communication_status" ("scheme_id");
    `);
    
    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database tables:", error);
    throw error;
  }
}

