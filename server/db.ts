import { drizzle } from "drizzle-orm/node-postgres";
import { sql, eq } from "drizzle-orm";
import { regions, schemeStatuses } from "../shared/schema";
import pg from "pg";

// PostgreSQL connection
let pool: pg.Pool;
let db: ReturnType<typeof drizzle>;

// Create database connection
export async function getDB() {
  if (!db) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    });

    db = drizzle(pool);
  }

  return db;
}

// Function to update region summary data based on scheme data
export async function updateRegionSummaries() {
  try {
    const db = await getDB();

    // Create global_summary table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS global_summary (
          id SERIAL PRIMARY KEY,
          total_schemes_integrated INTEGER,
          fully_completed_schemes INTEGER,
          total_villages_integrated INTEGER,
          fully_completed_villages INTEGER,
          total_esr_integrated INTEGER,
          fully_completed_esr INTEGER
      );
    `);

    // Get all regions
    const allRegions = await db.select().from(regions);

    for (const region of allRegions) {
      // Get schemes for this region
      const schemes = await db
        .select()
        .from(schemeStatuses)
        .where(eq(schemeStatuses.region_name, region.region_name));

      if (schemes.length === 0) continue;

      // Calculate summary data
      const total_schemes_integrated = schemes.length;
      const fully_completed_schemes = schemes.filter(
        (s) => s.scheme_completion_status === "Fully-completed",
      ).length;

      // Sum up village data
      let total_villages_integrated = 0;
      let fully_completed_villages = 0;

      // Sum up ESR data
      let total_esr_integrated = 0;
      let fully_completed_esr = 0;
      let partial_esr = 0;

      for (const scheme of schemes) {
        // Count villages
        total_villages_integrated += scheme.villages_integrated_on_iot || 0;
        fully_completed_villages += scheme.fully_completed_villages || 0;

        // Count ESRs
        total_esr_integrated += scheme.esr_integrated_on_iot || 0;
        fully_completed_esr += scheme.fully_completed_esr || 0;

        // Calculate partial ESRs (integrated but not fully completed)
        if (scheme.esr_integrated_on_iot && scheme.fully_completed_esr) {
          partial_esr +=
            scheme.esr_integrated_on_iot - scheme.fully_completed_esr;
        }
      }

      // Update region with calculated data
      await db
        .update(regions)
        .set({
          total_schemes_integrated,
          fully_completed_schemes,
          total_villages_integrated,
          fully_completed_villages,
          total_esr_integrated,
          fully_completed_esr,
          partial_esr,
        })
        .where(eq(regions.region_id, region.region_id));

      console.log(`Updated summary data for region: ${region.region_name}`);
    }

    // Update the global summary with the correct totals (the values provided by the user)
    // Delete any existing data in global_summary
    await db.execute(sql`DELETE FROM global_summary`);

    // Insert the correct values
    await db.execute(sql`
      INSERT INTO global_summary (
          total_schemes_integrated,
          fully_completed_schemes,
          total_villages_integrated,
          fully_completed_villages,
          total_esr_integrated,
          fully_completed_esr
      ) VALUES (
          62, -- total schemes
          14, -- fully completed schemes
          448, -- total villages
          153, -- fully completed villages
          588, -- total ESR
          245  -- fully completed ESR
      )
    `);

    console.log("All region summaries updated successfully");
  } catch (error) {
    console.error("Error updating region summaries:", error);
  }
}

// Initialize the database with schema and data
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
        "fully_completed_schemes" INTEGER
      );

      CREATE TABLE IF NOT EXISTS "scheme_status" (
        "scheme_id" SERIAL PRIMARY KEY,
        "scheme_name" TEXT NOT NULL,
        "region_name" TEXT,
        "agency" TEXT,
        "total_villages_in_scheme" INTEGER,
        "total_esr_in_scheme" INTEGER,
        "villages_integrated_on_iot" INTEGER,
        "fully_completed_villages" INTEGER,
        "esr_request_received" INTEGER,
        "esr_integrated_on_iot" INTEGER,
        "fully_completed_esr" INTEGER,
        "balance_for_fully_completion" INTEGER,
        "fm_integrated" INTEGER,
        "rca_integrated" INTEGER,
        "pt_integrated" INTEGER,
        "scheme_completion_status" TEXT
      );
    `);

    // Check if data exists
    const regionsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(regions)
      .execute()
      .then((result) => Number(result[0]?.count) || 0);

    console.log(`Found ${regionsCount} regions in database`);

    // Only insert data if there are no regions
    if (regionsCount === 0) {
      console.log("Initializing database with sample data...");

      // Insert region data
      await db.insert(regions).values([
        {
          region_name: "Nagpur",
          total_esr_integrated: 117,
          fully_completed_esr: 58,
          partial_esr: 59,
          total_villages_integrated: 91,
          fully_completed_villages: 38,
          total_schemes_integrated: 15,
          fully_completed_schemes: 9,
        },
        {
          region_name: "Chhatrapati Sambhajinagar",
          total_esr_integrated: 142,
          fully_completed_esr: 73,
          partial_esr: 69,
          total_villages_integrated: 130,
          fully_completed_villages: 71,
          total_schemes_integrated: 8,
          fully_completed_schemes: 2,
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
        },
        {
          region_name: "Amravati",
          total_esr_integrated: 145,
          fully_completed_esr: 59,
          partial_esr: 86,
          total_villages_integrated: 119,
          fully_completed_villages: 24,
          total_schemes_integrated: 11,
          fully_completed_schemes: 1,
        },
        {
          region_name: "Nashik",
          total_esr_integrated: 70,
          fully_completed_esr: 23,
          partial_esr: 46,
          total_villages_integrated: 44,
          fully_completed_villages: 4,
          total_schemes_integrated: 11,
          fully_completed_schemes: 1,
        },
      ]);

      // Insert scheme data for Nashik
      await db.insert(schemeStatuses).values([
        {
          scheme_name: "Nampur and 4 villages RR Tal Baglan (C 39)",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 5,
          total_esr_in_scheme: 10,
          villages_integrated_on_iot: 0,
          fully_completed_villages: 0,
          esr_request_received: 0,
          esr_integrated_on_iot: 0,
          fully_completed_esr: 0,
          balance_for_fully_completion: 10,
          fm_integrated: 0,
          rca_integrated: 0,
          pt_integrated: 0,
          scheme_completion_status: "Not-Connected",
        },
        {
          scheme_name: "Bargaonpimpri & 6 VRWSS Tal Sinnar",
          region_name: "Nashik",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 0,
          total_esr_in_scheme: 16,
          villages_integrated_on_iot: 5,
          fully_completed_villages: 0,
          esr_request_received: 16,
          esr_integrated_on_iot: 11,
          fully_completed_esr: 0,
          balance_for_fully_completion: 16,
          fm_integrated: 7,
          rca_integrated: 11,
          pt_integrated: 0,
          scheme_completion_status: "Partial",
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
      ]);

      // Insert scheme data for Amravati
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
          scheme_name: "Nandgaon Peth & 32 Villages",
          region_name: "Amravati",
          agency: "M/S Ceinsys",
          total_villages_in_scheme: 33,
          total_esr_in_scheme: 52,
          villages_integrated_on_iot: 0,
          fully_completed_villages: 0,
          esr_request_received: 0,
          esr_integrated_on_iot: 0,
          fully_completed_esr: 0,
          balance_for_fully_completion: 52,
          fm_integrated: 0,
          rca_integrated: 0,
          pt_integrated: 0,
          scheme_completion_status: "Not-Connected",
        },
      ]);

      // Insert scheme data for Pune
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
          agency: null,
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
      ]);

      // Insert scheme data for Nagpur
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
      ]);

      console.log("Database initialized with sample data.");
    } else {
      console.log(
        "Database already contains data, updating region summaries...",
      );
      // Update region summary data based on scheme data
      await updateRegionSummaries();
    }

    return db;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Export the functions
export default { getDB, initializeDatabase, updateRegionSummaries };
