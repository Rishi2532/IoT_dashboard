import { drizzle } from "drizzle-orm/node-postgres";
import { sql, eq, like, and, not } from "drizzle-orm";
import { regions, schemeStatuses, users, appState } from "../shared/schema";
import { createRequire } from "module";

// Use createRequire to load CommonJS modules from ESM
const require = createRequire(import.meta.url);
const dotenv = require("dotenv");
dotenv.config();

// We're using a separate CommonJS module for PostgreSQL connection
// This avoids the ESM compatibility issues with pg
let pool: any;
let db: any;

// Create database connection
export async function getDB() {
  if (!db) {
    try {
      // Import the pool from CommonJS module
      // Always use pg-adapter.cjs when DATABASE_URL is available
      if (process.env.DATABASE_URL) {
        pool = require("./pg-adapter.cjs");
        console.log("PostgreSQL pool imported from default adapter with DATABASE_URL");
      } 
      // In Replit environment, we always use the PostgreSQL adapter
      else {
        console.log("Using the default PostgreSQL adapter");
        pool = require("./pg-adapter.cjs");
      }

      // Create drizzle instance with the pool
      db = drizzle(pool);
    } catch (error) {
      console.error("Failed to initialize PostgreSQL connection:", error);
      throw error;
    }
  }

  return db;
}

// Function to update region summary data based on scheme data
export async function updateRegionSummaries() {
  try {
    const db = await getDB();

    // Get all regions and print their actual values for debugging
    const allRegions = await db.select().from(regions);

    // Debug: Print all flow meter values
    console.log("Current flow meter values in database:");
    for (const region of allRegions) {
      console.log(`Region: ${region.region_name}, Flow Meter: ${region.flow_meter_integrated}, RCA: ${region.rca_integrated}, PT: ${region.pressure_transmitter_integrated}`);
    }

    // Create global_summary table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS global_summary (
          id SERIAL PRIMARY KEY,
          total_schemes_integrated INTEGER,
          fully_completed_schemes INTEGER,
          total_villages_integrated INTEGER,
          fully_completed_villages INTEGER,
          total_esr_integrated INTEGER,
          fully_completed_esr INTEGER,
          flow_meter_integrated INTEGER,
          rca_integrated INTEGER,
          pressure_transmitter_integrated INTEGER
      );
    `);

    // Calculate totals from regions table
    const totals = await db
      .select({
        total_schemes_integrated: sql<number>`SUM(${regions.total_schemes_integrated})`,
        fully_completed_schemes: sql<number>`SUM(${regions.fully_completed_schemes})`,
        total_villages_integrated: sql<number>`SUM(${regions.total_villages_integrated})`,
        fully_completed_villages: sql<number>`SUM(${regions.fully_completed_villages})`,
        total_esr_integrated: sql<number>`SUM(${regions.total_esr_integrated})`,
        fully_completed_esr: sql<number>`SUM(${regions.fully_completed_esr})`,
        flow_meter_integrated: sql<number>`SUM(${regions.flow_meter_integrated})`,
        rca_integrated: sql<number>`SUM(${regions.rca_integrated})`,
        pressure_transmitter_integrated: sql<number>`SUM(${regions.pressure_transmitter_integrated})`
      })
      .from(regions);
    
    console.log("Calculated totals from regions table:", totals[0]);

    // Update the global summary with the dynamic totals from regions table
    await db.execute(sql`DELETE FROM global_summary`);

    // Insert the calculated values
    await db.execute(sql`
      INSERT INTO global_summary (
          total_schemes_integrated,
          fully_completed_schemes,
          total_villages_integrated,
          fully_completed_villages,
          total_esr_integrated,
          fully_completed_esr,
          flow_meter_integrated,
          rca_integrated,
          pressure_transmitter_integrated
      ) VALUES (
          ${totals[0].total_schemes_integrated || 0},
          ${totals[0].fully_completed_schemes || 0},
          ${totals[0].total_villages_integrated || 0},
          ${totals[0].fully_completed_villages || 0},
          ${totals[0].total_esr_integrated || 0},
          ${totals[0].fully_completed_esr || 0},
          ${totals[0].flow_meter_integrated || 0},
          ${totals[0].rca_integrated || 0},
          ${totals[0].pressure_transmitter_integrated || 0}
      )
    `);

    for (const region of allRegions) {
      console.log(`Updated summary data for region: ${region.region_name}`);
    }

    console.log("All region summaries updated successfully");
  } catch (error) {
    console.error("Error updating region summaries:", error);
  }
}

// Initialize the database with schema and data
// Helper function to clean up old update records
export async function cleanupOldUpdates() {
  try {
    console.log("Cleaning up old update records...");
    const db = await getDB();
    
    // Get current date
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Create app_state table using SQL if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "app_state" (
        "key" TEXT PRIMARY KEY,
        "value" JSONB NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Delete all daily update records except for today's
    // We need to use raw SQL here because Drizzle doesn't support LIKE operator easily with parameters
    const updateKey = `daily_updates_${today}`;
    const pattern = 'daily_updates_%';
    
    await db.execute(sql`
      DELETE FROM app_state 
      WHERE key LIKE ${pattern} 
      AND key != ${updateKey}
    `);
    
    console.log("Cleaned up old update records successfully");
  } catch (error) {
    console.error("Error cleaning up old updates:", error);
  }
}

export async function initializeDatabase() {
  const db = await getDB();

  try {
    // Check if tables exist and create them if they don't
    await db.execute(sql`
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
    
    await db.execute(sql`
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
        "fm_integrated" INTEGER,
        "pressure_transmitter_connected" INTEGER,
        "pt_integrated" INTEGER,
        "residual_chlorine_analyzer_connected" INTEGER,
        "rca_integrated" INTEGER,
        "fully_completion_scheme_status" TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "name" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user'
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "app_state" (
        "key" TEXT PRIMARY KEY,
        "value" JSONB NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if data exists
    const regionsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(regions)
      .execute()
      .then((result: any) => Number(result[0]?.count) || 0);

    const usersCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .execute()
      .then((result: any) => Number(result[0]?.count) || 0);

    console.log(
      `Found ${regionsCount} regions and ${usersCount} users in database`,
    );

    // Create default admin user if no users exist
    if (usersCount === 0) {
      console.log("Creating default admin user...");
      await db.insert(users).values({
        username: "admin",
        password: "admin123",
        name: "Administrator",
        role: "admin",
      });
      console.log("Default admin user created successfully");
    }

    // Skip sample data insertion for schema update
    if (false && regionsCount === 0) {
      console.log("Initializing database with sample data...");

      // Insert region data
      await db.insert(regions).values([
        {
          region_name: "Nagpur",
          total_esr_integrated: 117,
          fully_completed_esr: 58,
          partial_esr: 58,
          total_villages_integrated: 91,
          fully_completed_villages: 38,
          total_schemes_integrated: 15,
          fully_completed_schemes: 9,
          flow_meter_integrated: 113,
          rca_integrated: 113,
          pressure_transmitter_integrated: 63,
        },
        {
          region_name: "Chhatrapati Sambhajinagar",
          total_esr_integrated: 147,
          fully_completed_esr: 73,
          partial_esr: 69,
          total_villages_integrated: 140,
          fully_completed_villages: 71,
          total_schemes_integrated: 10,
          fully_completed_schemes: 2,
          flow_meter_integrated: 132,
          rca_integrated: 138,
          pressure_transmitter_integrated: 93,
        },
        {
          region_name: "Pune",
          total_esr_integrated: 97,
          fully_completed_esr: 31,
          partial_esr: 66,
          total_villages_integrated: 53,
          fully_completed_villages: 16,
          total_schemes_integrated: 9,
          fully_completed_schemes: 0,
          flow_meter_integrated: 95,
          rca_integrated: 65,
          pressure_transmitter_integrated: 49,
        },
        {
          region_name: "Konkan",
          total_esr_integrated: 11,
          fully_completed_esr: 1,
          partial_esr: 10,
          total_villages_integrated: 11,
          fully_completed_villages: 0,
          total_schemes_integrated: 4,
          fully_completed_schemes: 0,
          flow_meter_integrated: 11,
          rca_integrated: 10,
          pressure_transmitter_integrated: 3,
        },
        {
          region_name: "Amravati",
          total_esr_integrated: 149,
          fully_completed_esr: 59,
          partial_esr: 86,
          total_villages_integrated: 121,
          fully_completed_villages: 24,
          total_schemes_integrated: 11,
          fully_completed_schemes: 1,
          flow_meter_integrated: 143,
          rca_integrated: 95,
          pressure_transmitter_integrated: 111,
        },
        {
          region_name: "Nashik",
          total_esr_integrated: 106,
          fully_completed_esr: 23,
          partial_esr: 46,
          total_villages_integrated: 76,
          fully_completed_villages: 4,
          total_schemes_integrated: 14,
          fully_completed_schemes: 1,
          flow_meter_integrated: 81,
          rca_integrated: 82,
          pressure_transmitter_integrated: 38,
        },
      ]);

      // Insert scheme data for Nashik (21 schemes) - Updated with new schema
      await db.insert(schemeStatuses).values([
        {
          region_name: "Nashik",
          scheme_id: "NS-001",
          scheme_name: "Retro. Bargaonpimpri & 6 VRWSS Tal Sinnar",
          total_villages: 7,
          functional_villages: 5,
          partial_villages: 2,
          non_functional_villages: 0,
          fully_completed_villages: 0,
          total_esr: 16,
          scheme_functional_status: "Functional",
          fully_completed_esr: 0,
          balance_esr: 16,
          flow_meters_connected: 7,
          residual_chlorine_connected: 11,
          pressure_transmitters_connected: 0,
          scheme_status: "Partial",
          agency: "M/S Ceinsys",
        },
        {
          scheme_name: "Nirhale-Fatehpur and 5 villages, Tal. Sinnar",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 5,
          total_esr_in_scheme: 11,
          villages_integrated_on_iot: 3,
          fully_completed_villages: 0,
          esr_request_received: 8,
          esr_integrated_on_iot: 2,
          fully_completed_esr: 0,
          balance_for_fully_completion: 11,
          fm_integrated: 3,
          rca_integrated: 2,
          pt_integrated: 1,
          scheme_completion_status: "Partial",
        },

        {
          scheme_name: "Retro.Chandwad and WSS 44 villages. Ta. Chandwad",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 58,
          total_esr_in_scheme: 68,
          villages_integrated_on_iot: 7,
          fully_completed_villages: 0,
          esr_request_received: 25,
          esr_integrated_on_iot: 7,
          fully_completed_esr: 0,
          balance_for_fully_completion: 68,
          fm_integrated: 0,
          rca_integrated: 2,
          pt_integrated: 5,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Retrofitting To Wadzire (Naigaon) & 4 Villages RRWSS",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 4,
          total_esr_in_scheme: 5,
          villages_integrated_on_iot: 1,
          fully_completed_villages: 0,
          esr_request_received: 4,
          esr_integrated_on_iot: 1,
          fully_completed_esr: 0,
          balance_for_fully_completion: 5,
          fm_integrated: 1,
          rca_integrated: 1,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Ozar-Sakore & 2 Villages",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 4,
          total_esr_in_scheme: 10,
          villages_integrated_on_iot: 4,
          fully_completed_villages: 1,
          esr_request_received: 9,
          esr_integrated_on_iot: 8,
          fully_completed_esr: 5,
          balance_for_fully_completion: 5,
          fm_integrated: 6,
          rca_integrated: 7,
          pt_integrated: 5,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Paldhi (bk& Kh) RR Tal DHARANGAON",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 2,
          total_esr_in_scheme: 6,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 2,
          esr_request_received: 5,
          esr_integrated_on_iot: 5,
          fully_completed_esr: 5,
          balance_for_fully_completion: 1,
          fm_integrated: 5,
          rca_integrated: 5,
          pt_integrated: 5,
          scheme_completion_status: "Fully-Completed",
        },

        {
          scheme_name: "Retro.Sonai Karjgaon and 16 villages, Tal. Nevasa",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 18,
          total_esr_in_scheme: 35,
          villages_integrated_on_iot: 5,
          fully_completed_villages: 0,
          esr_request_received: 6,
          esr_integrated_on_iot: 6,
          fully_completed_esr: 0,
          balance_for_fully_completion: 35,
          fm_integrated: 4,
          rca_integrated: 5,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Burahnnagar & 45 Vill. Retro RRWSS Ta- Nagar",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 0,
          total_esr_in_scheme: 80,
          villages_integrated_on_iot: 0,
          fully_completed_villages: 0,
          esr_request_received: 0,
          esr_integrated_on_iot: 0,
          fully_completed_esr: 0,
          balance_for_fully_completion: 80,
          fm_integrated: 0,
          rca_integrated: 0,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Retro Rui & Shingave R.R.W.S.S Tal Rahata",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 2,
          total_esr_in_scheme: 6,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 2,
          esr_request_received: 6,
          esr_integrated_on_iot: 6,
          fully_completed_esr: 6,
          balance_for_fully_completion: 0,
          fm_integrated: 6,
          rca_integrated: 5,
          pt_integrated: 4,
          scheme_completion_status: "Fully-Completed",
        },

        {
          scheme_name: "Retro.Kelvad Bk.& 2 villages RRWSS. Ta.Rahta",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 3,
          total_esr_in_scheme: 5,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 0,
          esr_request_received: 2,
          esr_integrated_on_iot: 2,
          fully_completed_esr: 0,
          balance_for_fully_completion: 5,
          fm_integrated: 2,
          rca_integrated: 2,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Retro.Talegaon Dighe and 16 villages, Tal. Sangamner",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 20,
          total_esr_in_scheme: 48,
          villages_integrated_on_iot: 4,
          fully_completed_villages: 0,
          esr_request_received: 6,
          esr_integrated_on_iot: 6,
          fully_completed_esr: 4,
          balance_for_fully_completion: 44,
          fm_integrated: 6,
          rca_integrated: 6,
          pt_integrated: 4,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Retro.Nimon and 4 villages, Tal. Sangamner",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 6,
          total_esr_in_scheme: 15,
          villages_integrated_on_iot: 5,
          fully_completed_villages: 0,
          esr_request_received: 12,
          esr_integrated_on_iot: 12,
          fully_completed_esr: 5,
          balance_for_fully_completion: 10,
          fm_integrated: 11,
          rca_integrated: 5,
          pt_integrated: 7,
          scheme_completion_status: "Partial",
        },
      ]);

      // Insert scheme data for Amravati (19 schemes)
      await db.insert(schemeStatuses).values([
        {
          scheme_name: "83 Village RRWS Scheme MJP RR (C 39)",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 87,
          total_esr_in_scheme: 124,
          villages_integrated_on_iot: 24,
          fully_completed_villages: 8,
          esr_request_received: 27,
          esr_integrated_on_iot: 27,
          fully_completed_esr: 24,
          balance_for_fully_completion: 100,
          fm_integrated: 27,
          rca_integrated: 27,
          pt_integrated: 24,
          scheme_completion_status: "Partial",
        },

        {
          scheme_name: "105 villages RRWSS",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 113,
          total_esr_in_scheme: 173,
          villages_integrated_on_iot: 41,
          fully_completed_villages: 1,
          esr_request_received: 63,
          esr_integrated_on_iot: 52,
          fully_completed_esr: 10,
          balance_for_fully_completion: 163,
          fm_integrated: 51,
          rca_integrated: 14,
          pt_integrated: 40,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Shahanur & 9 Villages RRWS",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 10,
          total_esr_in_scheme: 14,
          villages_integrated_on_iot: 7,
          fully_completed_villages: 1,
          esr_request_received: 8,
          esr_integrated_on_iot: 8,
          fully_completed_esr: 3,
          balance_for_fully_completion: 11,
          fm_integrated: 6,
          rca_integrated: 6,
          pt_integrated: 6,
          scheme_completion_status: "Partial",
        },

        {
          scheme_name: "Takli & 4 Villages RRWS",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 5,
          total_esr_in_scheme: 8,
          villages_integrated_on_iot: 5,
          fully_completed_villages: 0,
          esr_request_received: 7,
          esr_integrated_on_iot: 7,
          fully_completed_esr: 0,
          balance_for_fully_completion: 8,
          fm_integrated: 6,
          rca_integrated: 3,
          pt_integrated: 2,
          scheme_completion_status: "Partial",
        },

        {
          scheme_name: "Malpathar 28 villages, (Reju.)",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 30,
          total_esr_in_scheme: 51,
          villages_integrated_on_iot: 8,
          fully_completed_villages: 0,
          esr_request_received: 10,
          esr_integrated_on_iot: 10,
          fully_completed_esr: 0,
          balance_for_fully_completion: 51,
          fm_integrated: 7,
          rca_integrated: 0,
          pt_integrated: 9,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Akot 84 VRRWSS Tq. Akola, Akot & Telhara Dist. Akola",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 82,
          total_esr_in_scheme: 104,
          villages_integrated_on_iot: 3,
          fully_completed_villages: 1,
          esr_request_received: 5,
          esr_integrated_on_iot: 4,
          fully_completed_esr: 0,
          balance_for_fully_completion: 104,
          fm_integrated: 3,
          rca_integrated: 3,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Langhapur 50 VRRWSS Tq. Murtizapur Dist. Akola",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 52,
          total_esr_in_scheme: 60,
          villages_integrated_on_iot: 1,
          fully_completed_villages: 0,
          esr_request_received: 1,
          esr_integrated_on_iot: 1,
          fully_completed_esr: 0,
          balance_for_fully_completion: 60,
          fm_integrated: 1,
          rca_integrated: 0,
          pt_integrated: 1,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Hingne Gavhad 13 Vill RRWS (C39, MJP)",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 16,
          total_esr_in_scheme: 30,
          villages_integrated_on_iot: 0,
          fully_completed_villages: 0,
          esr_request_received: 0,
          esr_integrated_on_iot: 0,
          fully_completed_esr: 0,
          balance_for_fully_completion: 30,
          fm_integrated: 0,
          rca_integrated: 0,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Kurha and 2 villages, Tal. Motala",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 3,
          total_esr_in_scheme: 4,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 1,
          esr_request_received: 4,
          esr_integrated_on_iot: 3,
          fully_completed_esr: 1,
          balance_for_fully_completion: 3,
          fm_integrated: 3,
          rca_integrated: 3,
          pt_integrated: 1,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Padli and 5 villages",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 6,
          total_esr_in_scheme: 7,
          villages_integrated_on_iot: 6,
          fully_completed_villages: 6,
          esr_request_received: 7,
          esr_integrated_on_iot: 7,
          fully_completed_esr: 7,
          balance_for_fully_completion: 0,
          fm_integrated: 7,
          rca_integrated: 7,
          pt_integrated: 7,
          scheme_completion_status: "Fully-Completed",
        },

        {
          scheme_name: "Dhamangaon Deshmukh and 10 villages RRWSS",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 10,
          total_esr_in_scheme: 15,
          villages_integrated_on_iot: 10,
          fully_completed_villages: 4,
          esr_request_received: 15,
          esr_integrated_on_iot: 15,
          fully_completed_esr: 9,
          balance_for_fully_completion: 6,
          fm_integrated: 15,
          rca_integrated: 13,
          pt_integrated: 9,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Pophali & 3 VRRWSS",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 0,
          total_esr_in_scheme: 7,
          villages_integrated_on_iot: 4,
          fully_completed_villages: 2,
          esr_request_received: 7,
          esr_integrated_on_iot: 6,
          fully_completed_esr: 5,
          balance_for_fully_completion: 2,
          fm_integrated: 6,
          rca_integrated: 6,
          pt_integrated: 5,
          scheme_completion_status: "Partial",
        },
      ]);

      // Insert scheme data for Pune (18 schemes)
      await db.insert(schemeStatuses).values([
        {
          scheme_name: "Wangani RRWSS",
          region_name: "Pune",
          agency: "Chetas",
          total_villages_in_scheme: 3,
          total_esr_in_scheme: 6,
          villages_integrated_on_iot: 4,
          fully_completed_villages: 0,
          esr_request_received: 6,
          esr_integrated_on_iot: 6,
          fully_completed_esr: 0,
          balance_for_fully_completion: 6,
          fm_integrated: 6,
          rca_integrated: 4,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "RR Girvi WSS",
          region_name: "Pune",
          agency: "Chetas",
          total_villages_in_scheme: 4,
          total_esr_in_scheme: 5,
          villages_integrated_on_iot: 5,
          fully_completed_villages: 0,
          esr_request_received: 5,
          esr_integrated_on_iot: 5,
          fully_completed_esr: 2,
          balance_for_fully_completion: 3,
          fm_integrated: 5,
          rca_integrated: 5,
          pt_integrated: 2,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Peth & two Villages",
          region_name: "Pune",
          agency: "Chetas",
          total_villages_in_scheme: 3,
          total_esr_in_scheme: 5,
          villages_integrated_on_iot: 3,
          fully_completed_villages: 0,
          esr_request_received: 5,
          esr_integrated_on_iot: 5,
          fully_completed_esr: 0,
          balance_for_fully_completion: 5,
          fm_integrated: 4,
          rca_integrated: 5,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "MURTI & 7 VILLAGES RRWSS",
          region_name: "Pune",
          agency: "Chetas",
          total_villages_in_scheme: 6,
          total_esr_in_scheme: 13,
          villages_integrated_on_iot: 7,
          fully_completed_villages: 2,
          esr_request_received: 13,
          esr_integrated_on_iot: 13,
          fully_completed_esr: 6,
          balance_for_fully_completion: 7,
          fm_integrated: 13,
          rca_integrated: 5,
          pt_integrated: 7,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "HOL SASTEWADI",
          region_name: "Pune",
          agency: "Chetas",
          total_villages_in_scheme: 4,
          total_esr_in_scheme: 8,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 0,
          esr_request_received: 8,
          esr_integrated_on_iot: 8,
          fully_completed_esr: 3,
          balance_for_fully_completion: 5,
          fm_integrated: 8,
          rca_integrated: 7,
          pt_integrated: 3,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "LONI BHAPKAR RRWSS",
          region_name: "Pune",
          agency: "Chetas",
          total_villages_in_scheme: 9,
          total_esr_in_scheme: 20,
          villages_integrated_on_iot: 8,
          fully_completed_villages: 1,
          esr_request_received: 20,
          esr_integrated_on_iot: 20,
          fully_completed_esr: 14,
          balance_for_fully_completion: 6,
          fm_integrated: 20,
          rca_integrated: 12,
          pt_integrated: 16,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Done Adhale RR",
          region_name: "Pune",
          agency: "Chetas",
          total_villages_in_scheme: 4,
          total_esr_in_scheme: 4,
          villages_integrated_on_iot: 4,
          fully_completed_villages: 1,
          esr_request_received: 4,
          esr_integrated_on_iot: 4,
          fully_completed_esr: 2,
          balance_for_fully_completion: 2,
          fm_integrated: 7,
          rca_integrated: 5,
          pt_integrated: 3,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Alegaon shirbhavi 82 Village",
          region_name: "Pune",
          agency: "Chetas",
          total_villages_in_scheme: 82,
          total_esr_in_scheme: 60,
          villages_integrated_on_iot: 17,
          fully_completed_villages: 8,
          esr_request_received: 22,
          esr_integrated_on_iot: 22,
          fully_completed_esr: 11,
          balance_for_fully_completion: 49,
          fm_integrated: 22,
          rca_integrated: 16,
          pt_integrated: 17,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Peth RR",
          region_name: "Pune",
          agency: "Chetas",
          total_villages_in_scheme: 8,
          total_esr_in_scheme: 32,
          villages_integrated_on_iot: 3,
          fully_completed_villages: 0,
          esr_request_received: 11,
          esr_integrated_on_iot: 11,
          fully_completed_esr: 0,
          balance_for_fully_completion: 32,
          fm_integrated: 10,
          rca_integrated: 6,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
      ]);

      // Insert scheme data for Konkan (7 schemes)
      await db.insert(schemeStatuses).values([
        {
          scheme_name: "Shahapada 38 Villages-20020563",
          region_name: "Konkan",
          agency: "Indo Chetas JV",
          total_villages_in_scheme: 38,
          total_esr_in_scheme: 6,
          villages_integrated_on_iot: 5,
          fully_completed_villages: 2,
          esr_request_received: 5,
          esr_integrated_on_iot: 5,
          fully_completed_esr: 0,
          balance_for_fully_completion: 6,
          fm_integrated: 5,
          rca_integrated: 5,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Devnhave water supply scheme-20028168",
          region_name: "Konkan",
          agency: "Indo Chetas JV",
          total_villages_in_scheme: 4,
          total_esr_in_scheme: 1,
          villages_integrated_on_iot: 1,
          fully_completed_villages: 0,
          esr_request_received: 1,
          esr_integrated_on_iot: 1,
          fully_completed_esr: 0,
          balance_for_fully_completion: 1,
          fm_integrated: 1,
          rca_integrated: 1,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name:
            "Retrofiting of Gotheghar Dahisar R.R. Water Supply Scheme-20092478",
          region_name: "Konkan",
          agency: "Indo Chetas JV",
          total_villages_in_scheme: 4,
          total_esr_in_scheme: 1,
          villages_integrated_on_iot: 1,
          fully_completed_villages: 0,
          esr_request_received: 1,
          esr_integrated_on_iot: 1,
          fully_completed_esr: 0,
          balance_for_fully_completion: 1,
          fm_integrated: 1,
          rca_integrated: 0,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Modgaon & Tornipada RWSS-20047871",
          region_name: "Konkan",
          agency: "Indo Chetas JV",
          total_villages_in_scheme: 2,
          total_esr_in_scheme: 4,
          villages_integrated_on_iot: 4,
          fully_completed_villages: 0,
          esr_request_received: 4,
          esr_integrated_on_iot: 4,
          fully_completed_esr: 0,
          balance_for_fully_completion: 4,
          fm_integrated: 4,
          rca_integrated: 4,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Mokhada taluka 58 villages RRWS-20028070",
          region_name: "Konkan",
          agency: "Indo Chetas JV",
          total_villages_in_scheme: 58,
          total_esr_in_scheme: 89,
          villages_integrated_on_iot: 0,
          fully_completed_villages: 0,
          esr_request_received: 0,
          esr_integrated_on_iot: 0,
          fully_completed_esr: 0,
          balance_for_fully_completion: 89,
          fm_integrated: 0,
          rca_integrated: 0,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Bada Pokharana Retrofitting RPWSS-4918426",
          region_name: "Konkan",
          agency: "Indo Chetas JV",
          total_villages_in_scheme: 29,
          total_esr_in_scheme: 66,
          villages_integrated_on_iot: 0,
          fully_completed_villages: 0,
          esr_request_received: 0,
          esr_integrated_on_iot: 0,
          fully_completed_esr: 0,
          balance_for_fully_completion: 66,
          fm_integrated: 0,
          rca_integrated: 0,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Padghe & 19 villages PWSS-20017952",
          region_name: "Konkan",
          agency: "Indo Chetas JV",
          total_villages_in_scheme: 19,
          total_esr_in_scheme: 31,
          villages_integrated_on_iot: 0,
          fully_completed_villages: 0,
          esr_request_received: 0,
          esr_integrated_on_iot: 0,
          fully_completed_esr: 0,
          balance_for_fully_completion: 31,
          fm_integrated: 0,
          rca_integrated: 0,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
      ]);

      // Insert scheme data for Nagpur (15 schemes)
      await db.insert(schemeStatuses).values([
        {
          scheme_name: "20036500 Vyahad & 2 Village RR WSS",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 3,
          total_esr_in_scheme: 5,
          villages_integrated_on_iot: 3,
          fully_completed_villages: 0,
          esr_request_received: 3,
          esr_integrated_on_iot: 3,
          fully_completed_esr: 0,
          balance_for_fully_completion: 5,
          fm_integrated: 3,
          rca_integrated: 3,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "20036536 Bothali & 7 Villages Rrwss",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 8,
          total_esr_in_scheme: 8,
          villages_integrated_on_iot: 8,
          fully_completed_villages: 6,
          esr_request_received: 8,
          esr_integrated_on_iot: 8,
          fully_completed_esr: 5,
          balance_for_fully_completion: 3,
          fm_integrated: 8,
          rca_integrated: 8,
          pt_integrated: 5,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "20036862 Bor Chandli 5 Village Rr Wss",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 5,
          total_esr_in_scheme: 5,
          villages_integrated_on_iot: 5,
          fully_completed_villages: 5,
          esr_request_received: 5,
          esr_integrated_on_iot: 5,
          fully_completed_esr: 5,
          balance_for_fully_completion: 0,
          fm_integrated: 5,
          rca_integrated: 5,
          pt_integrated: 5,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name: "2009882 Ghot Rrwss",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 3,
          total_esr_in_scheme: 4,
          villages_integrated_on_iot: 3,
          fully_completed_villages: 3,
          esr_request_received: 4,
          esr_integrated_on_iot: 4,
          fully_completed_esr: 4,
          balance_for_fully_completion: 0,
          fm_integrated: 4,
          rca_integrated: 4,
          pt_integrated: 3,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name: "631010 Gobarwahi RR Retrofitting",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 9,
          total_esr_in_scheme: 11,
          villages_integrated_on_iot: 9,
          fully_completed_villages: 9,
          esr_request_received: 11,
          esr_integrated_on_iot: 11,
          fully_completed_esr: 11,
          balance_for_fully_completion: 0,
          fm_integrated: 11,
          rca_integrated: 10,
          pt_integrated: 9,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name: "7890965 Mul 24 Villages RR WSS Retrofitting",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 25,
          total_esr_in_scheme: 28,
          villages_integrated_on_iot: 11,
          fully_completed_villages: 1,
          esr_request_received: 11,
          esr_integrated_on_iot: 11,
          fully_completed_esr: 0,
          balance_for_fully_completion: 28,
          fm_integrated: 10,
          rca_integrated: 11,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "7891298 Pipri Meghe and 13 villages RR WSS",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 13,
          total_esr_in_scheme: 23,
          villages_integrated_on_iot: 9,
          fully_completed_villages: 5,
          esr_request_received: 15,
          esr_integrated_on_iot: 14,
          fully_completed_esr: 10,
          balance_for_fully_completion: 13,
          fm_integrated: 14,
          rca_integrated: 14,
          pt_integrated: 10,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "7940695 Bidgaon Tarodi Wss",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 2,
          total_esr_in_scheme: 4,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 2,
          esr_request_received: 4,
          esr_integrated_on_iot: 4,
          fully_completed_esr: 4,
          balance_for_fully_completion: 0,
          fm_integrated: 4,
          rca_integrated: 4,
          pt_integrated: 4,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name: "GOREGAON RR Retrofitting (20019216)",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 5,
          total_esr_in_scheme: 7,
          villages_integrated_on_iot: 5,
          fully_completed_villages: 5,
          esr_request_received: 7,
          esr_integrated_on_iot: 7,
          fully_completed_esr: 7,
          balance_for_fully_completion: 0,
          fm_integrated: 7,
          rca_integrated: 7,
          pt_integrated: 5,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name: "Kudwa-Katangikala Peri Urban RR- (2003645)",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 2,
          total_esr_in_scheme: 5,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 2,
          esr_request_received: 5,
          esr_integrated_on_iot: 5,
          fully_completed_esr: 4,
          balance_for_fully_completion: 1,
          fm_integrated: 5,
          rca_integrated: 5,
          pt_integrated: 3,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name: "Allapalli-Nagapalli RR (7890975)",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 2,
          total_esr_in_scheme: 2,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 2,
          esr_request_received: 2,
          esr_integrated_on_iot: 2,
          fully_completed_esr: 2,
          balance_for_fully_completion: 0,
          fm_integrated: 2,
          rca_integrated: 2,
          pt_integrated: 2,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name: "Pombhurna Grid & 15 Villages RR Retrofitting (7928270)",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 17,
          total_esr_in_scheme: 22,
          villages_integrated_on_iot: 15,
          fully_completed_villages: 0,
          esr_request_received: 17,
          esr_integrated_on_iot: 17,
          fully_completed_esr: 0,
          balance_for_fully_completion: 22,
          fm_integrated: 16,
          rca_integrated: 17,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Dewadi RR WSS (20017217)",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 6,
          total_esr_in_scheme: 7,
          villages_integrated_on_iot: 6,
          fully_completed_villages: 6,
          esr_request_received: 7,
          esr_integrated_on_iot: 7,
          fully_completed_esr: 6,
          balance_for_fully_completion: 1,
          fm_integrated: 7,
          rca_integrated: 7,
          pt_integrated: 6,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name: "Wadhamna WSS (20009650)",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 2,
          total_esr_in_scheme: 7,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 1,
          esr_request_received: 7,
          esr_integrated_on_iot: 7,
          fully_completed_esr: 4,
          balance_for_fully_completion: 3,
          fm_integrated: 7,
          rca_integrated: 7,
          pt_integrated: 4,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name:
            "Chinchala and 7 Villages RR Water Supply Scheme(20050368)",
          region_name: "Nagpur",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 8,
          total_esr_in_scheme: 10,
          villages_integrated_on_iot: 8,
          fully_completed_villages: 0,
          esr_request_received: 9,
          esr_integrated_on_iot: 9,
          fully_completed_esr: 0,
          balance_for_fully_completion: 10,
          fm_integrated: 9,
          rca_integrated: 8,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
      ]);

      // Insert scheme data for Chhatrapati Sambhajinagar (10 schemes)
      await db.insert(schemeStatuses).values([
        {
          scheme_name: "Pangaon 10 villages WSS (20030820)",
          region_name: "Chhatrapati Sambhajinagar",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 5,
          total_esr_in_scheme: 8,
          villages_integrated_on_iot: 0,
          fully_completed_villages: 0,
          esr_request_received: 0,
          esr_integrated_on_iot: 0,
          fully_completed_esr: 0,
          balance_for_fully_completion: 8,
          fm_integrated: 0,
          rca_integrated: 0,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Osmamnagar Shirdhon Combined WS (7338000)",
          region_name: "Chhatrapati Sambhajinagar",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 4,
          total_esr_in_scheme: 7,
          villages_integrated_on_iot: 4,
          fully_completed_villages: 0,
          esr_request_received: 7,
          esr_integrated_on_iot: 7,
          fully_completed_esr: 0,
          balance_for_fully_completion: 7,
          fm_integrated: 6,
          rca_integrated: 7,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Sakol 7 villages WSS (20030815)",
          region_name: "Chhatrapati Sambhajinagar",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 3,
          total_esr_in_scheme: 4,
          villages_integrated_on_iot: 3,
          fully_completed_villages: 0,
          esr_request_received: 4,
          esr_integrated_on_iot: 4,
          fully_completed_esr: 0,
          balance_for_fully_completion: 4,
          fm_integrated: 3,
          rca_integrated: 2,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Rachnawadi 6 villages WSS (20030459)",
          region_name: "Chhatrapati Sambhajinagar",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 2,
          total_esr_in_scheme: 2,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 2,
          esr_request_received: 2,
          esr_integrated_on_iot: 2,
          fully_completed_esr: 1,
          balance_for_fully_completion: 1,
          fm_integrated: 2,
          rca_integrated: 2,
          pt_integrated: 1,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name: "Manjram WSS (7942142)",
          region_name: "Chhatrapati Sambhajinagar",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 2,
          total_esr_in_scheme: 2,
          villages_integrated_on_iot: 2,
          fully_completed_villages: 2,
          esr_request_received: 2,
          esr_integrated_on_iot: 2,
          fully_completed_esr: 0,
          balance_for_fully_completion: 2,
          fm_integrated: 2,
          rca_integrated: 2,
          pt_integrated: 0,
          scheme_completion_status: "Fully-Completed",
        },
        {
          scheme_name: "Kawtha Bk & 9 Vill RR WSS (20023330)",
          region_name: "Chhatrapati Sambhajinagar",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 23,
          total_esr_in_scheme: 23,
          villages_integrated_on_iot: 1,
          fully_completed_villages: 0,
          esr_request_received: 23,
          esr_integrated_on_iot: 1,
          fully_completed_esr: 0,
          balance_for_fully_completion: 23,
          fm_integrated: 1,
          rca_integrated: 1,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Shirsala & 4 Village RRWS (20017395)",
          region_name: "Chhatrapati Sambhajinagar",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 5,
          total_esr_in_scheme: 7,
          villages_integrated_on_iot: 0,
          fully_completed_villages: 0,
          esr_request_received: 0,
          esr_integrated_on_iot: 0,
          fully_completed_esr: 0,
          balance_for_fully_completion: 7,
          fm_integrated: 0,
          rca_integrated: 0,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Hadgaon & Himayatnagar 132 Villages Grid WSS",
          region_name: "Chhatrapati Sambhajinagar",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 92,
          total_esr_in_scheme: 92,
          villages_integrated_on_iot: 35,
          fully_completed_villages: 14,
          esr_request_received: 37,
          esr_integrated_on_iot: 34,
          fully_completed_esr: 14,
          balance_for_fully_completion: 78,
          fm_integrated: 30,
          rca_integrated: 33,
          pt_integrated: 17,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "Paithan Taluka 178 Villages Grid WS",
          region_name: "Chhatrapati Sambhajinagar",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 53,
          total_esr_in_scheme: 53,
          villages_integrated_on_iot: 43,
          fully_completed_villages: 38,
          esr_request_received: 46,
          esr_integrated_on_iot: 44,
          fully_completed_esr: 38,
          balance_for_fully_completion: 15,
          fm_integrated: 43,
          rca_integrated: 43,
          pt_integrated: 37,
          scheme_completion_status: "Partial",
        },
        {
          scheme_name: "373 Villages Gangapur-Vaijapur Grid WS",
          region_name: "Chhatrapati Sambhajinagar",
          agency: "M/S Rite Water",
          total_villages_in_scheme: 56,
          total_esr_in_scheme: 57,
          villages_integrated_on_iot: 39,
          fully_completed_villages: 19,
          esr_request_received: 43,
          esr_integrated_on_iot: 40,
          fully_completed_esr: 18,
          balance_for_fully_completion: 39,
          fm_integrated: 34,
          rca_integrated: 34,
          pt_integrated: 25,
          scheme_completion_status: "Partial",
        },
      ]);

      console.log("Database initialized with sample data.");
    } else {
      console.log(
        "Database already contains data, updating region summaries...",
      );
      // We no longer automatically reset region data to allow manual updates to persist
    }

    // Clean up old update records
    await cleanupOldUpdates();
    
    // Always update region summaries, whether the database was just initialized or not
    await updateRegionSummaries();

    return db;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Function to reset region data to original values
export async function resetRegionData() {
  try {
    const db = await getDB();

    // Nagpur
    await db
      .update(regions)
      .set({
        total_esr_integrated: 117,
        fully_completed_esr: 58,
        partial_esr: 58,
        total_villages_integrated: 91,
        fully_completed_villages: 38,
        total_schemes_integrated: 15,
        fully_completed_schemes: 9,
      })
      .where(eq(regions.region_name, "Nagpur"));

    // Chhatrapati Sambhajinagar
    await db
      .update(regions)
      .set({
        total_esr_integrated: 147,
        fully_completed_esr: 73,
        partial_esr: 69,
        total_villages_integrated: 140,
        fully_completed_villages: 71,
        total_schemes_integrated: 10,
        fully_completed_schemes: 2,
      })
      .where(eq(regions.region_name, "Chhatrapati Sambhajinagar"));

    // Pune
    await db
      .update(regions)
      .set({
        total_esr_integrated: 97,
        fully_completed_esr: 31,
        partial_esr: 66,
        total_villages_integrated: 53,
        fully_completed_villages: 16,
        total_schemes_integrated: 9,
        fully_completed_schemes: 0,
      })
      .where(eq(regions.region_name, "Pune"));

    // Konkan
    await db
      .update(regions)
      .set({
        total_esr_integrated: 11,
        fully_completed_esr: 1,
        partial_esr: 10,
        total_villages_integrated: 11,
        fully_completed_villages: 0,
        total_schemes_integrated: 4,
        fully_completed_schemes: 0,
      })
      .where(eq(regions.region_name, "Konkan"));

    // Amravati
    await db
      .update(regions)
      .set({
        total_esr_integrated: 150,
        fully_completed_esr: 59,
        partial_esr: 86,
        total_villages_integrated: 121,
        fully_completed_villages: 24,
        total_schemes_integrated: 11,
        fully_completed_schemes: 1,
      })
      .where(eq(regions.region_name, "Amravati"));

    // Nashik
    await db
      .update(regions)
      .set({
        total_esr_integrated: 109,
        fully_completed_esr: 23,
        partial_esr: 46,
        total_villages_integrated: 78,
        fully_completed_villages: 4,
        total_schemes_integrated: 14,
        fully_completed_schemes: 1,
      })
      .where(eq(regions.region_name, "Nashik"));

    console.log("Reset all region data to original values");
  } catch (error) {
    console.error("Error resetting region data:", error);
  }
}

// Export the functions
export default {
  getDB,
  initializeDatabase,
  updateRegionSummaries,
  resetRegionData,
};
