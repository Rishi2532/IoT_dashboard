import { Router } from "express";
import { z } from "zod";
import { eq, sql, and, desc, asc, like } from "drizzle-orm";
import { getDB } from "../db";
import { communicationStatus } from "../../shared/schema";
import multer from "multer";
import * as csv from "csv-parse";
import fs from "fs";

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Get communication status overview with geographic aggregation
router.get("/overview", async (req, res) => {
  try {
    const db = await getDB();
    const region = req.query.region as string;
    const circle = req.query.circle as string;
    const division = req.query.division as string;
    const subdivision = req.query.subdivision as string;
    const block = req.query.block as string;

    // Build filter conditions
    const conditions = [];
    if (region && region !== 'all') conditions.push(eq(communicationStatus.region, region));
    if (circle && circle !== 'all') conditions.push(eq(communicationStatus.circle, circle));
    if (division && division !== 'all') conditions.push(eq(communicationStatus.division, division));
    if (subdivision && subdivision !== 'all') conditions.push(eq(communicationStatus.sub_division, subdivision));
    if (block && block !== 'all') conditions.push(eq(communicationStatus.block, block));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const stats = await db
      .select({
        total_esrs: sql<number>`count(*)`,
        chlorine_online: sql<number>`sum(case when ${communicationStatus.chlorine_status} = 'Online' then 1 else 0 end)`,
        pressure_online: sql<number>`sum(case when ${communicationStatus.pressure_status} = 'Online' then 1 else 0 end)`,
        flow_meter_online: sql<number>`sum(case when ${communicationStatus.flow_meter_status} = 'Online' then 1 else 0 end)`,
        chlorine_connected: sql<number>`sum(case when ${communicationStatus.chlorine_connected} = 'Yes' then 1 else 0 end)`,
        pressure_connected: sql<number>`sum(case when ${communicationStatus.pressure_connected} = 'Yes' then 1 else 0 end)`,
        flow_meter_connected: sql<number>`sum(case when ${communicationStatus.flow_meter_connected} = 'Yes' then 1 else 0 end)`,
        chlorine_less_72h: sql<number>`sum(case when ${communicationStatus.chlorine_0h_72h} != '' and ${communicationStatus.chlorine_0h_72h} is not null then 1 else 0 end)`,
        chlorine_more_72h: sql<number>`sum(case when ${communicationStatus.chlorine_72h} != '' and ${communicationStatus.chlorine_72h} is not null then 1 else 0 end)`,
        pressure_less_72h: sql<number>`sum(case when ${communicationStatus.pressure_0h_72h} != '' and ${communicationStatus.pressure_0h_72h} is not null then 1 else 0 end)`,
        pressure_more_72h: sql<number>`sum(case when ${communicationStatus.pressure_72h} != '' and ${communicationStatus.pressure_72h} is not null then 1 else 0 end)`,
        flow_meter_less_72h: sql<number>`sum(case when ${communicationStatus.flow_meter_0h_72h} != '' and ${communicationStatus.flow_meter_0h_72h} is not null then 1 else 0 end)`,
        flow_meter_more_72h: sql<number>`sum(case when ${communicationStatus.flow_meter_72h} != '' and ${communicationStatus.flow_meter_72h} is not null then 1 else 0 end)`,
      })
      .from(communicationStatus)
      .where(whereClause);

    res.json(stats[0] || {
      total_esrs: 0,
      chlorine_online: 0,
      pressure_online: 0,
      flow_meter_online: 0,
      chlorine_connected: 0,
      pressure_connected: 0,
      flow_meter_connected: 0,
      chlorine_less_72h: 0,
      chlorine_more_72h: 0,
      pressure_less_72h: 0,
      pressure_more_72h: 0,
      flow_meter_less_72h: 0,
      flow_meter_more_72h: 0,
    });
  } catch (error) {
    console.error("Error fetching communication status overview:", error);
    res.status(500).json({ error: "Failed to fetch communication status overview" });
  }
});

// Get regional statistics
router.get("/stats", async (req, res) => {
  try {
    const db = await getDB();
    
    const stats = await db
      .select({
        region: communicationStatus.region,
        total_records: sql<number>`count(*)`,
        total_schemes: sql<number>`count(distinct ${communicationStatus.scheme_id})`,
        total_villages: sql<number>`count(distinct ${communicationStatus.village_name})`,
        online_chlorine: sql<number>`sum(case when ${communicationStatus.chlorine_status} = 'Online' then 1 else 0 end)`,
        online_pressure: sql<number>`sum(case when ${communicationStatus.pressure_status} = 'Online' then 1 else 0 end)`,
        online_flow_meter: sql<number>`sum(case when ${communicationStatus.flow_meter_status} = 'Online' then 1 else 0 end)`,
      })
      .from(communicationStatus)
      .groupBy(communicationStatus.region)
      .orderBy(asc(communicationStatus.region));

    res.json(stats);
  } catch (error) {
    console.error("Error fetching communication status stats:", error);
    res.status(500).json({ error: "Failed to fetch communication status stats" });
  }
});

// Get unique schemes with communication status
router.get("/schemes", async (req, res) => {
  try {
    const db = await getDB();
    const region = req.query.region as string;
    const circle = req.query.circle as string;
    const division = req.query.division as string;
    const subdivision = req.query.subdivision as string;
    const block = req.query.block as string;

    // Build filter conditions
    const conditions = [];
    if (region && region !== 'all') conditions.push(eq(communicationStatus.region, region));
    if (circle && circle !== 'all') conditions.push(eq(communicationStatus.circle, circle));
    if (division && division !== 'all') conditions.push(eq(communicationStatus.division, division));
    if (subdivision && subdivision !== 'all') conditions.push(eq(communicationStatus.sub_division, subdivision));
    if (block && block !== 'all') conditions.push(eq(communicationStatus.block, block));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const schemes = await db
      .select({
        scheme_id: communicationStatus.scheme_id,
        scheme_name: communicationStatus.scheme_name,
        village_name: communicationStatus.village_name,
        esr_name: communicationStatus.esr_name,
        region: communicationStatus.region,
        circle: communicationStatus.circle,
        division: communicationStatus.division,
        sub_division: communicationStatus.sub_division,
        block: communicationStatus.block,
        chlorine_status: communicationStatus.chlorine_status,
        pressure_status: communicationStatus.pressure_status,
        flow_meter_status: communicationStatus.flow_meter_status,
        overall_status: communicationStatus.overall_status,
        chlorine_0h_72h: communicationStatus.chlorine_0h_72h,
        chlorine_72h: communicationStatus.chlorine_72h,
        pressure_0h_72h: communicationStatus.pressure_0h_72h,
        pressure_72h: communicationStatus.pressure_72h,
        flow_meter_0h_72h: communicationStatus.flow_meter_0h_72h,
        flow_meter_72h: communicationStatus.flow_meter_72h,
      })
      .from(communicationStatus)
      .where(whereClause)
      .orderBy(asc(communicationStatus.scheme_name), asc(communicationStatus.village_name));

    res.json(schemes);
  } catch (error) {
    console.error("Error fetching communication status schemes:", error);
    res.status(500).json({ error: "Failed to fetch communication status schemes" });
  }
});

// Get filter options
router.get("/filters", async (req, res) => {
  try {
    const db = await getDB();

    const regions = await db
      .selectDistinct({ value: communicationStatus.region })
      .from(communicationStatus)
      .where(sql`${communicationStatus.region} is not null and ${communicationStatus.region} != ''`)
      .orderBy(asc(communicationStatus.region));

    const circles = await db
      .selectDistinct({ value: communicationStatus.circle })
      .from(communicationStatus)
      .where(sql`${communicationStatus.circle} is not null and ${communicationStatus.circle} != ''`)
      .orderBy(asc(communicationStatus.circle));

    const divisions = await db
      .selectDistinct({ value: communicationStatus.division })
      .from(communicationStatus)
      .where(sql`${communicationStatus.division} is not null and ${communicationStatus.division} != ''`)
      .orderBy(asc(communicationStatus.division));

    const subdivisions = await db
      .selectDistinct({ value: communicationStatus.sub_division })
      .from(communicationStatus)
      .where(sql`${communicationStatus.sub_division} is not null and ${communicationStatus.sub_division} != ''`)
      .orderBy(asc(communicationStatus.sub_division));

    const blocks = await db
      .selectDistinct({ value: communicationStatus.block })
      .from(communicationStatus)
      .where(sql`${communicationStatus.block} is not null and ${communicationStatus.block} != ''`)
      .orderBy(asc(communicationStatus.block));

    res.json({
      regions: regions.map(r => r.value),
      circles: circles.map(c => c.value),
      divisions: divisions.map(d => d.value),
      subdivisions: subdivisions.map(s => s.value),
      blocks: blocks.map(b => b.value),
    });
  } catch (error) {
    console.error("Error fetching communication status filters:", error);
    res.status(500).json({ error: "Failed to fetch communication status filters" });
  }
});

// Import communication status data from CSV
router.post("/import", upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const db = await getDB();
    const filePath = req.file.path;
    
    // Read and parse CSV
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records: any[] = [];
    
    const parser = csv.parse({
      skip_empty_lines: true,
      trim: true,
    });
    
    parser.on('data', (row: string[]) => {
      records.push(row);
    });
    
    await new Promise((resolve, reject) => {
      parser.on('end', resolve);
      parser.on('error', reject);
      parser.write(fileContent);
      parser.end();
    });

    console.log(`Parsed ${records.length} records from CSV`);

    // Clear existing data
    await db.delete(communicationStatus);
    console.log("Cleared existing communication status data");

    let imported = 0;
    const batchSize = 100;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const insertData = batch.map(row => ({
        region: row[0] || '',
        circle: row[1] || '',
        division: row[2] || '',
        sub_division: row[3] || '',
        block: row[4] || '',
        scheme_id: row[5] || '',
        scheme_name: row[6] || '',
        village_name: row[7] || '',
        esr_name: row[8] || '',
        chlorine_connected: row[9] || '',
        pressure_connected: row[10] || '',
        flow_meter_connected: row[11] || '',
        chlorine_status: row[12] || '',
        pressure_status: row[13] || '',
        flow_meter_status: row[14] || '',
        overall_status: row[15] || '',
        chlorine_0h_72h: row[16] || '',
        chlorine_72h: row[17] || '',
        pressure_0h_72h: row[18] || '',
        pressure_72h: row[19] || '',
        flow_meter_0h_72h: row[20] || '',
        flow_meter_72h: row[21] || '',
      }));

      await db.insert(communicationStatus).values(insertData);
      imported += insertData.length;
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log(`Successfully imported ${imported} communication status records`);
    res.json({
      message: "Communication status data imported successfully",
      imported,
      total: records.length
    });

  } catch (error) {
    console.error("Error importing communication status data:", error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: "Failed to import communication status data" });
  }
});

export default router;