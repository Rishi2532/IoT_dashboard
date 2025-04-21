import {
  users,
  regions,
  schemeStatuses,
  appState,
  waterSchemeData,
  type User,
  type InsertUser,
  type Region,
  type InsertRegion,
  type SchemeStatus,
  type InsertSchemeStatus,
  type WaterSchemeData,
  type InsertWaterSchemeData,
  type UpdateWaterSchemeData,
} from "@shared/schema";
import { getDB, initializeDatabase } from "./db";
import { eq, sql } from "drizzle-orm";

// Declare global variables for storing updates data
declare global {
  var todayUpdates: any[];
  var lastUpdateDay: string | null;
  var prevTotals: {
    villages: number;
    esr: number;
    completedSchemes: number;
    flowMeters: number;
    rca: number;
    pt: number;
  } | null;
}

// Filter type for water scheme data queries
export interface WaterSchemeDataFilter {
  region?: string;
  minLpcd?: number;
  maxLpcd?: number;
  zeroSupplyForWeek?: boolean;
}

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateUserCredentials(
    username: string,
    password: string,
  ): Promise<User | null>;

  // Region operations
  getAllRegions(): Promise<Region[]>;
  getRegionByName(regionName: string): Promise<Region | undefined>;
  getRegionSummary(regionName?: string): Promise<any>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(region: Region): Promise<Region>;

  // Scheme operations
  getAllSchemes(
    statusFilter?: string,
    schemeId?: string,
  ): Promise<SchemeStatus[]>;
  getSchemesByRegion(
    regionName: string,
    statusFilter?: string,
    schemeId?: string,
  ): Promise<SchemeStatus[]>;
  getSchemeById(schemeId: string): Promise<SchemeStatus | undefined>;
  createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus>;
  updateScheme(scheme: SchemeStatus): Promise<SchemeStatus>;
  deleteScheme(schemeId: string): Promise<boolean>;

  // Updates operations
  getTodayUpdates(): Promise<any[]>;
  
  // Water Scheme Data operations
  getAllWaterSchemeData(
    filter?: WaterSchemeDataFilter
  ): Promise<WaterSchemeData[]>;
  getWaterSchemeDataById(schemeId: string): Promise<WaterSchemeData | undefined>;
  createWaterSchemeData(data: InsertWaterSchemeData): Promise<WaterSchemeData>;
  updateWaterSchemeData(schemeId: string, data: UpdateWaterSchemeData): Promise<WaterSchemeData>;
  deleteWaterSchemeData(schemeId: string): Promise<boolean>;
  importWaterSchemeDataFromExcel(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }>;
  importWaterSchemeDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }>;
}

// PostgreSQL implementation
export class PostgresStorage implements IStorage {
  private db: any;
  private initialized: Promise<void>;
  
  // Excel column mapping for water scheme data
  private excelColumnMapping: Record<string, string> = {
    // Excel header -> Database field
    // Upper case variations
    "Region": "region",
    "REGION": "region",
    "region": "region",
    "Circle": "circle",
    "CIRCLE": "circle",
    "circle": "circle",
    "Division": "division",
    "DIVISION": "division",
    "division": "division",
    "Sub-Division": "sub_division",
    "SUB-DIVISION": "sub_division",
    "Sub Division": "sub_division",
    "SUB DIVISION": "sub_division",
    "sub division": "sub_division",
    "sub-division": "sub_division",
    "Block": "block",
    "BLOCK": "block",
    "block": "block",
    "Scheme ID": "scheme_id",
    "SCHEME ID": "scheme_id",
    "scheme id": "scheme_id",
    "Scheme_ID": "scheme_id",
    "scheme_id": "scheme_id",
    "Scheme Name": "scheme_name",
    "SCHEME NAME": "scheme_name",
    "scheme name": "scheme_name",
    "Scheme_Name": "scheme_name",
    "scheme_name": "scheme_name",
    "Village Name": "village_name",
    "VILLAGE NAME": "village_name",
    "village name": "village_name",
    "Village_Name": "village_name",
    "village_name": "village_name",
    "Population": "population",
    "POPULATION": "population",
    "population": "population",
    "Number of ESR": "number_of_esr",
    "NUMBER OF ESR": "number_of_esr",
    "number of esr": "number_of_esr",
    "No. of ESR": "number_of_esr",
    "ESR Count": "number_of_esr",
    
    // Water value fields - multiple formats
    "Water Value Day 1": "water_value_day1",
    "WATER VALUE DAY 1": "water_value_day1",
    "water value day 1": "water_value_day1",
    "Water Value Day1": "water_value_day1",
    "water value day1": "water_value_day1",
    "Water Value - Day 1": "water_value_day1",
    "Water_Value_Day_1": "water_value_day1",
    "water_value_day_1": "water_value_day1",
    "Water_Value_Day1": "water_value_day1",
    "water_value_day1": "water_value_day1",
    
    "Water Value Day 2": "water_value_day2",
    "WATER VALUE DAY 2": "water_value_day2",
    "water value day 2": "water_value_day2",
    "Water Value Day2": "water_value_day2",
    "water value day2": "water_value_day2",
    "Water Value - Day 2": "water_value_day2",
    "Water_Value_Day_2": "water_value_day2",
    "water_value_day_2": "water_value_day2",
    "Water_Value_Day2": "water_value_day2",
    "water_value_day2": "water_value_day2",
    
    "Water Value Day 3": "water_value_day3",
    "WATER VALUE DAY 3": "water_value_day3",
    "water value day 3": "water_value_day3",
    "Water Value Day3": "water_value_day3",
    "water value day3": "water_value_day3",
    "Water Value - Day 3": "water_value_day3",
    "Water_Value_Day_3": "water_value_day3",
    "water_value_day_3": "water_value_day3",
    "Water_Value_Day3": "water_value_day3",
    "water_value_day3": "water_value_day3",
    
    "Water Value Day 4": "water_value_day4",
    "WATER VALUE DAY 4": "water_value_day4",
    "water value day 4": "water_value_day4",
    "Water Value Day4": "water_value_day4",
    "water value day4": "water_value_day4",
    "Water Value - Day 4": "water_value_day4",
    "Water_Value_Day_4": "water_value_day4",
    "water_value_day_4": "water_value_day4",
    "Water_Value_Day4": "water_value_day4",
    "water_value_day4": "water_value_day4",
    
    "Water Value Day 5": "water_value_day5",
    "WATER VALUE DAY 5": "water_value_day5",
    "water value day 5": "water_value_day5",
    "Water Value Day5": "water_value_day5",
    "water value day5": "water_value_day5",
    "Water Value - Day 5": "water_value_day5",
    "Water_Value_Day_5": "water_value_day5",
    "water_value_day_5": "water_value_day5",
    "Water_Value_Day5": "water_value_day5",
    "water_value_day5": "water_value_day5",
    
    "Water Value Day 6": "water_value_day6",
    "WATER VALUE DAY 6": "water_value_day6",
    "water value day 6": "water_value_day6",
    "Water Value Day6": "water_value_day6",
    "water value day6": "water_value_day6",
    "Water Value - Day 6": "water_value_day6",
    "Water_Value_Day_6": "water_value_day6",
    "water_value_day_6": "water_value_day6",
    "Water_Value_Day6": "water_value_day6",
    "water_value_day6": "water_value_day6",
    
    "Water Value Day 7": "water_value_day7",
    "WATER VALUE DAY 7": "water_value_day7",
    "water value day 7": "water_value_day7",
    "Water Value Day7": "water_value_day7",
    "water value day7": "water_value_day7",
    "Water Value - Day 7": "water_value_day7",
    "Water_Value_Day_7": "water_value_day7",
    "water_value_day_7": "water_value_day7",
    "Water_Value_Day7": "water_value_day7",
    "water_value_day7": "water_value_day7",
    
    // LPCD value fields - multiple formats
    "LPCD Value Day 1": "lpcd_value_day1",
    "LPCD VALUE DAY 1": "lpcd_value_day1",
    "lpcd value day 1": "lpcd_value_day1",
    "LPCD Value Day1": "lpcd_value_day1",
    "lpcd value day1": "lpcd_value_day1",
    "LPCD Value - Day 1": "lpcd_value_day1",
    "LPCD_Value_Day_1": "lpcd_value_day1",
    "lpcd_value_day_1": "lpcd_value_day1",
    "LPCD_Value_Day1": "lpcd_value_day1",
    "lpcd_value_day1": "lpcd_value_day1",
    "Lpcd Value Day 1": "lpcd_value_day1",
    "Lpcd value day 1": "lpcd_value_day1",
    
    "LPCD Value Day 2": "lpcd_value_day2",
    "LPCD VALUE DAY 2": "lpcd_value_day2",
    "lpcd value day 2": "lpcd_value_day2",
    "LPCD Value Day2": "lpcd_value_day2",
    "lpcd value day2": "lpcd_value_day2",
    "LPCD Value - Day 2": "lpcd_value_day2",
    "LPCD_Value_Day_2": "lpcd_value_day2",
    "lpcd_value_day_2": "lpcd_value_day2",
    "LPCD_Value_Day2": "lpcd_value_day2",
    "lpcd_value_day2": "lpcd_value_day2",
    "Lpcd Value Day 2": "lpcd_value_day2",
    "Lpcd value day 2": "lpcd_value_day2",
    
    "LPCD Value Day 3": "lpcd_value_day3",
    "LPCD VALUE DAY 3": "lpcd_value_day3",
    "lpcd value day 3": "lpcd_value_day3",
    "LPCD Value Day3": "lpcd_value_day3",
    "lpcd value day3": "lpcd_value_day3",
    "LPCD Value - Day 3": "lpcd_value_day3",
    "LPCD_Value_Day_3": "lpcd_value_day3",
    "lpcd_value_day_3": "lpcd_value_day3",
    "LPCD_Value_Day3": "lpcd_value_day3",
    "lpcd_value_day3": "lpcd_value_day3",
    "Lpcd Value Day 3": "lpcd_value_day3",
    "Lpcd value day 3": "lpcd_value_day3",
    
    "LPCD Value Day 4": "lpcd_value_day4",
    "LPCD VALUE DAY 4": "lpcd_value_day4",
    "lpcd value day 4": "lpcd_value_day4",
    "LPCD Value Day4": "lpcd_value_day4",
    "lpcd value day4": "lpcd_value_day4",
    "LPCD Value - Day 4": "lpcd_value_day4",
    "LPCD_Value_Day_4": "lpcd_value_day4",
    "lpcd_value_day_4": "lpcd_value_day4",
    "LPCD_Value_Day4": "lpcd_value_day4",
    "lpcd_value_day4": "lpcd_value_day4",
    "Lpcd Value Day 4": "lpcd_value_day4",
    "Lpcd value day 4": "lpcd_value_day4",
    
    "LPCD Value Day 5": "lpcd_value_day5",
    "LPCD VALUE DAY 5": "lpcd_value_day5",
    "lpcd value day 5": "lpcd_value_day5",
    "LPCD Value Day5": "lpcd_value_day5",
    "lpcd value day5": "lpcd_value_day5",
    "LPCD Value - Day 5": "lpcd_value_day5",
    "LPCD_Value_Day_5": "lpcd_value_day5",
    "lpcd_value_day_5": "lpcd_value_day5",
    "LPCD_Value_Day5": "lpcd_value_day5",
    "lpcd_value_day5": "lpcd_value_day5",
    "Lpcd Value Day 5": "lpcd_value_day5",
    "Lpcd value day 5": "lpcd_value_day5",
    
    "LPCD Value Day 6": "lpcd_value_day6",
    "LPCD VALUE DAY 6": "lpcd_value_day6",
    "lpcd value day 6": "lpcd_value_day6",
    "LPCD Value Day6": "lpcd_value_day6",
    "lpcd value day6": "lpcd_value_day6",
    "LPCD Value - Day 6": "lpcd_value_day6",
    "LPCD_Value_Day_6": "lpcd_value_day6",
    "lpcd_value_day_6": "lpcd_value_day6",
    "LPCD_Value_Day6": "lpcd_value_day6",
    "lpcd_value_day6": "lpcd_value_day6",
    "Lpcd Value Day 6": "lpcd_value_day6",
    "Lpcd value day 6": "lpcd_value_day6",
    
    "LPCD Value Day 7": "lpcd_value_day7",
    "LPCD VALUE DAY 7": "lpcd_value_day7",
    "lpcd value day 7": "lpcd_value_day7",
    "LPCD Value Day7": "lpcd_value_day7",
    "lpcd value day7": "lpcd_value_day7",
    "LPCD Value - Day 7": "lpcd_value_day7",
    "LPCD_Value_Day_7": "lpcd_value_day7",
    "lpcd_value_day_7": "lpcd_value_day7",
    "LPCD_Value_Day7": "lpcd_value_day7",
    "lpcd_value_day7": "lpcd_value_day7",
    "Lpcd Value Day 7": "lpcd_value_day7",
    "Lpcd value day 7": "lpcd_value_day7",
    
    // Date fields - multiple formats
    "Water Date Day 1": "water_date_day1",
    "water date day 1": "water_date_day1",
    "Water Date Day1": "water_date_day1",
    "water date day1": "water_date_day1",
    "Water_Date_Day1": "water_date_day1",
    "water_date_day1": "water_date_day1",
    
    "Water Date Day 2": "water_date_day2",
    "water date day 2": "water_date_day2",
    "Water Date Day2": "water_date_day2",
    "water date day2": "water_date_day2",
    "Water_Date_Day2": "water_date_day2",
    "water_date_day2": "water_date_day2",
    
    "Water Date Day 3": "water_date_day3",
    "water date day 3": "water_date_day3",
    "Water Date Day3": "water_date_day3",
    "water date day3": "water_date_day3",
    "Water_Date_Day3": "water_date_day3",
    "water_date_day3": "water_date_day3",
    
    "Water Date Day 4": "water_date_day4",
    "water date day 4": "water_date_day4",
    "Water Date Day4": "water_date_day4",
    "water date day4": "water_date_day4",
    "Water_Date_Day4": "water_date_day4",
    "water_date_day4": "water_date_day4",
    
    "Water Date Day 5": "water_date_day5",
    "water date day 5": "water_date_day5",
    "Water Date Day5": "water_date_day5",
    "water date day5": "water_date_day5",
    "Water_Date_Day5": "water_date_day5",
    "water_date_day5": "water_date_day5",
    
    "Water Date Day 6": "water_date_day6",
    "water date day 6": "water_date_day6",
    "Water Date Day6": "water_date_day6",
    "water date day6": "water_date_day6",
    "Water_Date_Day6": "water_date_day6",
    "water_date_day6": "water_date_day6",
    
    "LPCD Date Day 1": "lpcd_date_day1",
    "lpcd date day 1": "lpcd_date_day1",
    "LPCD Date Day1": "lpcd_date_day1",
    "lpcd date day1": "lpcd_date_day1",
    "LPCD_Date_Day1": "lpcd_date_day1",
    "lpcd_date_day1": "lpcd_date_day1",
    
    "LPCD Date Day 2": "lpcd_date_day2",
    "lpcd date day 2": "lpcd_date_day2",
    "LPCD Date Day2": "lpcd_date_day2",
    "lpcd date day2": "lpcd_date_day2",
    "LPCD_Date_Day2": "lpcd_date_day2",
    "lpcd_date_day2": "lpcd_date_day2",
    
    "LPCD Date Day 3": "lpcd_date_day3",
    "lpcd date day 3": "lpcd_date_day3",
    "LPCD Date Day3": "lpcd_date_day3",
    "lpcd date day3": "lpcd_date_day3",
    "LPCD_Date_Day3": "lpcd_date_day3",
    "lpcd_date_day3": "lpcd_date_day3",
    
    "LPCD Date Day 4": "lpcd_date_day4",
    "lpcd date day 4": "lpcd_date_day4",
    "LPCD Date Day4": "lpcd_date_day4",
    "lpcd date day4": "lpcd_date_day4",
    "LPCD_Date_Day4": "lpcd_date_day4",
    "lpcd_date_day4": "lpcd_date_day4",
    
    "LPCD Date Day 5": "lpcd_date_day5",
    "lpcd date day 5": "lpcd_date_day5",
    "LPCD Date Day5": "lpcd_date_day5",
    "lpcd date day5": "lpcd_date_day5",
    "LPCD_Date_Day5": "lpcd_date_day5",
    "lpcd_date_day5": "lpcd_date_day5",
    
    "LPCD Date Day 6": "lpcd_date_day6",
    "lpcd date day 6": "lpcd_date_day6",
    "LPCD Date Day6": "lpcd_date_day6",
    "lpcd date day6": "lpcd_date_day6",
    "LPCD_Date_Day6": "lpcd_date_day6",
    "lpcd_date_day6": "lpcd_date_day6",
    
    "LPCD Date Day 7": "lpcd_date_day7",
    "lpcd date day 7": "lpcd_date_day7",
    "LPCD Date Day7": "lpcd_date_day7",
    "lpcd date day7": "lpcd_date_day7",
    "LPCD_Date_Day7": "lpcd_date_day7",
    "lpcd_date_day7": "lpcd_date_day7",
    
    // Other fields - multiple formats
    "Last Updated": "last_updated",
    "last updated": "last_updated",
    "LastUpdated": "last_updated",
    "last_updated": "last_updated",
    
    "Zero Supply Count": "zero_supply_count",
    "zero supply count": "zero_supply_count",
    "Zero_Supply_Count": "zero_supply_count",
    "zero_supply_count": "zero_supply_count",
    
    "Consistent Zero LPCD For A Week": "consistent_zero_lpcd_for_a_week",
    "Consistent Zero LPCD for a week": "consistent_zero_lpcd_for_a_week",
    "consistent zero lpcd for a week": "consistent_zero_lpcd_for_a_week",
    "Consistent_Zero_LPCD_For_A_Week": "consistent_zero_lpcd_for_a_week",
    "consistent_zero_lpcd_for_a_week": "consistent_zero_lpcd_for_a_week",
    
    "Below 40 LPCD Count": "below_40_lpcd_count",
    "below 40 lpcd count": "below_40_lpcd_count",
    "Below_40_LPCD_Count": "below_40_lpcd_count",
    "below_40_lpcd_count": "below_40_lpcd_count",
    
    "Below 55 LPCD Count": "below_55_lpcd_count",
    "below 55 lpcd count": "below_55_lpcd_count",
    "Below_55_LPCD_Count": "below_55_lpcd_count",
    "below_55_lpcd_count": "below_55_lpcd_count",
    "Consistent <55 LPCD for a week": "below_55_lpcd_count",
    
    "Between 40 55 LPCD Count": "between_40_55_lpcd_count",
    "between 40 55 lpcd count": "between_40_55_lpcd_count",
    "Between_40_55_LPCD_Count": "between_40_55_lpcd_count",
    "between_40_55_lpcd_count": "between_40_55_lpcd_count",
    
    "Above 55 LPCD Count": "above_55_lpcd_count",
    "above 55 lpcd count": "above_55_lpcd_count",
    "Above_55_LPCD_Count": "above_55_lpcd_count",
    "above_55_lpcd_count": "above_55_lpcd_count",
    "Consistent >55 LPCD for a week": "above_55_lpcd_count"
  };
  
  private csvColumnMapping: Record<number, string> = {
    0: "region",
    1: "circle",
    2: "division",
    3: "sub_division",
    4: "block",
    5: "scheme_id",
    6: "scheme_name",
    7: "village_name",
    8: "population",
    9: "number_of_esr",
    10: "water_value_day1",
    11: "water_value_day2",
    12: "water_value_day3",
    13: "water_value_day4",
    14: "water_value_day5",
    15: "water_value_day6",
    16: "lpcd_value_day1",
    17: "lpcd_value_day2",
    18: "lpcd_value_day3",
    19: "lpcd_value_day4",
    20: "lpcd_value_day5",
    21: "lpcd_value_day6",
    22: "lpcd_value_day7",
    23: "water_date_day1",
    24: "water_date_day2",
    25: "water_date_day3",
    26: "water_date_day4",
    27: "water_date_day5",
    28: "water_date_day6",
    29: "lpcd_date_day1",
    30: "lpcd_date_day2",
    31: "lpcd_date_day3",
    32: "lpcd_date_day4",
    33: "lpcd_date_day5",
    34: "lpcd_date_day6",
    35: "lpcd_date_day7",
    36: "consistent_zero_lpcd_for_a_week",
    37: "below_55_lpcd_count",
    38: "above_55_lpcd_count"
  };

  constructor() {
    this.initialized = this.initializeDb().catch((error) => {
      console.error("Failed to initialize database in constructor:", error);
      throw error;
    });
  }

  private async initializeDb() {
    try {
      // Initialize the PostgreSQL database
      await initializeDatabase();
    } catch (error) {
      console.error("Error initializing database in storage:", error);
      throw error;
    }
  }

  private async ensureInitialized() {
    await this.initialized;
    return getDB();
  }

  // User methods (from original schema)
  async getUser(id: number): Promise<User | undefined> {
    const db = await this.ensureInitialized();
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await this.ensureInitialized();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await this.ensureInitialized();
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async validateUserCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
    const db = await this.ensureInitialized();
    const user = await this.getUserByUsername(username);

    if (!user) {
      return null;
    }

    // Simple password check (in a real app, you would use bcrypt or similar)
    if (user.password === password) {
      return user;
    }

    return null;
  }

  // Region methods
  async getAllRegions(): Promise<Region[]> {
    const db = await this.ensureInitialized();
    return db.select().from(regions).orderBy(regions.region_name);
  }

  async getRegionByName(regionName: string): Promise<Region | undefined> {
    const db = await this.ensureInitialized();
    const result = await db
      .select()
      .from(regions)
      .where(eq(regions.region_name, regionName));
    return result.length > 0 ? result[0] : undefined;
  }

  async getRegionSummary(regionName?: string): Promise<any> {
    const db = await this.ensureInitialized();

    if (regionName) {
      // If region is specified, get summary for that region
      const region = await this.getRegionByName(regionName);
      if (!region) return null;

      // Use data directly from the regions table
      return {
        total_schemes_integrated: region.total_schemes_integrated || 0,
        fully_completed_schemes: region.fully_completed_schemes || 0,
        total_villages_integrated: region.total_villages_integrated || 0,
        fully_completed_villages: region.fully_completed_villages || 0,
        total_esr_integrated: region.total_esr_integrated || 0,
        fully_completed_esr: region.fully_completed_esr || 0,
        partial_esr: region.partial_esr || 0,
        flow_meter_integrated: region.flow_meter_integrated || 0,
        rca_integrated: region.rca_integrated || 0,
        pressure_transmitter_integrated:
          region.pressure_transmitter_integrated || 0,
      };
    } else {
      // Always dynamically calculate the sum of all regions instead of using global_summary
      console.log("Calculating dynamic sum of all regions");

      const result = await db
        .select({
          total_schemes_integrated: sql<number>`SUM(${regions.total_schemes_integrated})`,
          fully_completed_schemes: sql<number>`SUM(${regions.fully_completed_schemes})`,
          total_villages_integrated: sql<number>`SUM(${regions.total_villages_integrated})`,
          fully_completed_villages: sql<number>`SUM(${regions.fully_completed_villages})`,
          total_esr_integrated: sql<number>`SUM(${regions.total_esr_integrated})`,
          fully_completed_esr: sql<number>`SUM(${regions.fully_completed_esr})`,
          partial_esr: sql<number>`SUM(${regions.partial_esr})`,
          flow_meter_integrated: sql<number>`SUM(${regions.flow_meter_integrated})`,
          rca_integrated: sql<number>`SUM(${regions.rca_integrated})`,
          pressure_transmitter_integrated: sql<number>`SUM(${regions.pressure_transmitter_integrated})`,
        })
        .from(regions);

      // Log the dynamically calculated summary for debugging
      console.log("Dynamic region summary calculated:", result[0]);

      return result[0];
    }
  }

  async createRegion(region: InsertRegion): Promise<Region> {
    const db = await this.ensureInitialized();
    const result = await db.insert(regions).values(region).returning();
    return result[0];
  }

  async updateRegion(region: Region): Promise<Region> {
    const db = await this.ensureInitialized();
    await db
      .update(regions)
      .set({
        region_name: region.region_name,
        total_esr_integrated: region.total_esr_integrated,
        fully_completed_esr: region.fully_completed_esr,
        partial_esr: region.partial_esr,
        total_villages_integrated: region.total_villages_integrated,
        fully_completed_villages: region.fully_completed_villages,
        total_schemes_integrated: region.total_schemes_integrated,
        fully_completed_schemes: region.fully_completed_schemes,
        flow_meter_integrated: region.flow_meter_integrated,
        rca_integrated: region.rca_integrated,
        pressure_transmitter_integrated: region.pressure_transmitter_integrated,
      })
      .where(eq(regions.region_id, region.region_id));

    return region;
  }

  // Scheme methods
  async getAllSchemes(
    statusFilter?: string,
    schemeId?: string,
  ): Promise<SchemeStatus[]> {
    const db = await this.ensureInitialized();

    // Start with the basic query
    let query = db.select().from(schemeStatuses);

    // Apply scheme_id filter if provided
    if (schemeId) {
      query = query.where(eq(schemeStatuses.scheme_id, schemeId));
    }

    // Apply status filter if provided
    if (statusFilter && statusFilter !== "all") {
      // Handle both "Partial" and "In Progress" as the same filter
      if (statusFilter === "In Progress") {
        query = query.where(
          sql`${schemeStatuses.fully_completion_scheme_status} IN ('Partial', 'In Progress')`,
        );
      }
      // Handle Fully Completed status including "completed" and "Completed" values - with case insensitivity
      else if (statusFilter === "Fully Completed") {
        query = query.where(
          sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) 
              IN (LOWER('Completed'), LOWER('Fully-Completed'), LOWER('Fully Completed'), LOWER('fully completed'))`,
        );
      } else {
        query = query.where(
          eq(schemeStatuses.fully_completion_scheme_status, statusFilter),
        );
      }
    }

    return query.orderBy(schemeStatuses.region, schemeStatuses.scheme_name);
  }

  async getSchemesByRegion(
    regionName: string,
    statusFilter?: string,
    schemeId?: string,
  ): Promise<SchemeStatus[]> {
    const db = await this.ensureInitialized();

    // Start with the basic region filter
    let query = db
      .select()
      .from(schemeStatuses)
      .where(eq(schemeStatuses.region, regionName));

    // Apply scheme_id filter if provided
    if (schemeId) {
      query = query.where(eq(schemeStatuses.scheme_id, schemeId));
    }

    // Apply status filter if provided
    if (statusFilter && statusFilter !== "all") {
      // Handle both "Partial" and "In Progress" as the same filter
      if (statusFilter === "In Progress") {
        query = query.where(
          sql`${schemeStatuses.fully_completion_scheme_status} IN ('Partial', 'In Progress')`,
        );
      }
      // Handle Fully Completed status including "completed" and "Completed" values - with case insensitivity
      else if (statusFilter === "Fully Completed") {
        query = query.where(
          sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) 
              IN (LOWER('Completed'), LOWER('Fully-Completed'), LOWER('Fully Completed'), LOWER('fully completed'))`,
        );
      } else {
        query = query.where(
          eq(schemeStatuses.fully_completion_scheme_status, statusFilter),
        );
      }
    }

    return query.orderBy(schemeStatuses.scheme_name);
  }

  async getSchemeById(schemeId: string): Promise<SchemeStatus | undefined> {
    const db = await this.ensureInitialized();
    const result = await db
      .select()
      .from(schemeStatuses)
      .where(eq(schemeStatuses.scheme_id, schemeId));
    return result.length > 0 ? result[0] : undefined;
  }

  async createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus> {
    const db = await this.ensureInitialized();
    const result = await db.insert(schemeStatuses).values(scheme).returning();
    return result[0];
  }

  async updateScheme(scheme: SchemeStatus): Promise<SchemeStatus> {
    const db = await this.ensureInitialized();
    await db
      .update(schemeStatuses)
      .set({
        scheme_name: scheme.scheme_name,
        region: scheme.region,
        number_of_village: scheme.number_of_village,
        no_of_functional_village: scheme.no_of_functional_village,
        no_of_partial_village: scheme.no_of_partial_village,
        no_of_non_functional_village: scheme.no_of_non_functional_village,
        fully_completed_villages: scheme.fully_completed_villages,
        total_villages_integrated: scheme.total_villages_integrated,
        total_number_of_esr: scheme.total_number_of_esr,
        total_esr_integrated: scheme.total_esr_integrated,
        scheme_functional_status: scheme.scheme_functional_status,
        no_fully_completed_esr: scheme.no_fully_completed_esr,
        balance_to_complete_esr: scheme.balance_to_complete_esr,
        flow_meters_connected: scheme.flow_meters_connected,
        pressure_transmitter_connected: scheme.pressure_transmitter_connected,
        residual_chlorine_analyzer_connected:
          scheme.residual_chlorine_analyzer_connected,
        fully_completion_scheme_status: scheme.fully_completion_scheme_status,
      })
      .where(eq(schemeStatuses.scheme_id, scheme.scheme_id));

    return scheme;
  }

  async deleteScheme(schemeId: string): Promise<boolean> {
    const db = await this.ensureInitialized();
    const result = await db
      .delete(schemeStatuses)
      .where(eq(schemeStatuses.scheme_id, schemeId));
    return true;
  }

  // Water Scheme Data operations
  async getAllWaterSchemeData(filter?: WaterSchemeDataFilter): Promise<WaterSchemeData[]> {
    const db = await this.ensureInitialized();
    let query = db.select().from(waterSchemeData);
    
    if (filter) {
      // Apply region filter if provided
      if (filter.region) {
        query = query.where(eq(waterSchemeData.region, filter.region));
      }
      
      // Apply LPCD filters if provided
      if (filter.minLpcd !== undefined) {
        // Get latest lpcd value (day1 is most recent)
        query = query.where(sql`${waterSchemeData.lpcd_value_day1} >= ${filter.minLpcd}`);
      }
      
      if (filter.maxLpcd !== undefined) {
        // Get latest lpcd value (day1 is most recent)
        query = query.where(sql`${waterSchemeData.lpcd_value_day1} <= ${filter.maxLpcd}`);
      }
      
      // Filter for schemes with zero water supply for a week
      if (filter.zeroSupplyForWeek) {
        query = query.where(sql`${waterSchemeData.consistent_zero_lpcd_for_a_week} = 1`);
      }
    }
    
    return query.orderBy(waterSchemeData.region, waterSchemeData.scheme_name);
  }
  
  async getWaterSchemeDataById(schemeId: string): Promise<WaterSchemeData | undefined> {
    const db = await this.ensureInitialized();
    const result = await db
      .select()
      .from(waterSchemeData)
      .where(eq(waterSchemeData.scheme_id, schemeId));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async createWaterSchemeData(data: InsertWaterSchemeData): Promise<WaterSchemeData> {
    const db = await this.ensureInitialized();
    const result = await db.insert(waterSchemeData).values(data).returning();
    return result[0];
  }
  
  async updateWaterSchemeData(schemeId: string, data: UpdateWaterSchemeData): Promise<WaterSchemeData> {
    const db = await this.ensureInitialized();
    await db
      .update(waterSchemeData)
      .set(data)
      .where(eq(waterSchemeData.scheme_id, schemeId));
    
    // Fetch and return the updated record
    const updated = await this.getWaterSchemeDataById(schemeId);
    if (!updated) {
      throw new Error(`Failed to retrieve updated water scheme data for scheme ID: ${schemeId}`);
    }
    return updated;
  }
  
  async deleteWaterSchemeData(schemeId: string): Promise<boolean> {
    const db = await this.ensureInitialized();
    await db
      .delete(waterSchemeData)
      .where(eq(waterSchemeData.scheme_id, schemeId));
    return true;
  }
  
  async importWaterSchemeDataFromExcel(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }> {
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    
    try {
      // Import xlsx library
      const xlsx = require('xlsx');
      
      // Parse Excel file
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);
      
      // Process each row
      for (const row of jsonData) {
        try {
          // Map Excel columns to database fields
          const schemeData: Partial<InsertWaterSchemeData> = {};
          
          // Validate and extract scheme_id (required field)
          const schemeIdHeader = Object.keys(this.excelColumnMapping).find(
            key => this.excelColumnMapping[key] === 'scheme_id'
          );
          
          if (!schemeIdHeader || !row[schemeIdHeader]) {
            errors.push(`Row missing required field: ${schemeIdHeader || 'Scheme ID'}`);
            continue;
          }
          
          // Map fields from Excel to database schema
          for (const [excelHeader, dbField] of Object.entries(this.excelColumnMapping)) {
            if (row[excelHeader] !== undefined) {
              // Convert string values to numbers for numeric fields
              if (dbField.includes('value') || 
                  dbField === 'population' || 
                  dbField === 'number_of_esr' ||
                  dbField.includes('count')) {
                schemeData[dbField] = Number(row[excelHeader]);
              } else {
                schemeData[dbField] = row[excelHeader];
              }
            }
          }
          
          // Check if scheme already exists
          const existingScheme = await this.getWaterSchemeDataById(schemeData.scheme_id);
          
          if (existingScheme) {
            // Update existing scheme
            await this.updateWaterSchemeData(schemeData.scheme_id, schemeData);
            updated++;
          } else {
            // Insert new scheme
            await this.createWaterSchemeData(schemeData as InsertWaterSchemeData);
            inserted++;
          }
        } catch (rowError) {
          errors.push(`Error processing row: ${rowError.message}`);
        }
      }
      
      return { inserted, updated, errors };
    } catch (error) {
      errors.push(`Excel import error: ${error.message}`);
      return { inserted, updated, errors };
    }
  }
  
  async importWaterSchemeDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }> {
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    
    try {
      // Import csv-parse library
      const { parse } = require('csv-parse/sync');
      
      // Parse CSV file (no headers)
      const records = parse(fileBuffer, {
        delimiter: ',',
        columns: false, // No headers in CSV
        skip_empty_lines: true
      });
      
      // Process each row
      for (const record of records) {
        try {
          // Map CSV columns to database fields based on index
          const schemeData: Partial<InsertWaterSchemeData> = {};
          
          // Check if we have the scheme_id (required field)
          const schemeIdIndex = 5; // According to the mapping, scheme_id is at index 5
          if (!record[schemeIdIndex]) {
            errors.push(`Row missing required field: scheme_id at column ${schemeIdIndex}`);
            continue;
          }
          
          // Map fields from CSV to database schema based on column index
          for (const [indexStr, dbField] of Object.entries(this.csvColumnMapping)) {
            const index = parseInt(indexStr);
            if (record[index] !== undefined) {
              // Convert string values to numbers for numeric fields
              if (dbField.includes('value') || 
                  dbField === 'population' || 
                  dbField === 'number_of_esr' ||
                  dbField.includes('count')) {
                schemeData[dbField] = Number(record[index]);
              } else {
                schemeData[dbField] = record[index];
              }
            }
          }
          
          // Check if scheme already exists
          const existingScheme = await this.getWaterSchemeDataById(schemeData.scheme_id);
          
          if (existingScheme) {
            // Update existing scheme
            await this.updateWaterSchemeData(schemeData.scheme_id, schemeData);
            updated++;
          } else {
            // Insert new scheme
            await this.createWaterSchemeData(schemeData as InsertWaterSchemeData);
            inserted++;
          }
        } catch (rowError) {
          errors.push(`Error processing row: ${rowError.message}`);
        }
      }
      
      return { inserted, updated, errors };
    } catch (error) {
      errors.push(`CSV import error: ${error.message}`);
      return { inserted, updated, errors };
    }
  }

  // We're now using global variables instead of static class variables
  // This makes the data accessible across different instances and module reloads

  async getTodayUpdates(): Promise<any[]> {
    const db = await this.ensureInitialized();
    console.log("Fetching today's updates");

    try {
      // Get the current date (server's local time)
      const now = new Date();
      const today = now.toISOString().split("T")[0]; // Format: YYYY-MM-DD

      // First, try to retrieve daily updates from the database
      const updateKey = `daily_updates_${today}`;

      // Ensure the app_state table exists
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "app_state" (
          "key" TEXT PRIMARY KEY,
          "value" JSONB NOT NULL,
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Use SQL template to avoid parameter issues
      const storedUpdatesQuery = await db.execute(sql`
        SELECT value FROM app_state WHERE key = ${updateKey}
      `);

      let todayUpdates: any[] = [];
      let prevTotals: any = null;
      let lastUpdateDay = null;

      // Check if we have stored updates for today
      if (storedUpdatesQuery.rows.length > 0) {
        try {
          // Handle the case where value might be an object and not a JSON string
          const storedValue = storedUpdatesQuery.rows[0].value;
          let storedData;

          if (typeof storedValue === "string") {
            storedData = JSON.parse(storedValue);
          } else if (typeof storedValue === "object" && storedValue !== null) {
            storedData = storedValue;
          } else {
            // Default to an empty structure if the value is neither string nor object
            storedData = {
              updates: [],
              prevTotals: null,
              lastUpdateDay: today,
            };
          }

          todayUpdates = storedData.updates || [];
          prevTotals = storedData.prevTotals || null;
          lastUpdateDay = storedData.lastUpdateDay || today;
          console.log(
            `Loaded ${todayUpdates.length} stored updates for today (${today})`,
          );
        } catch (parseError) {
          console.error("Error parsing stored updates:", parseError);
          // Initialize with empty values since there was a parse error
          todayUpdates = [];
          prevTotals = null;
          lastUpdateDay = today;
        }
      } else {
        console.log(
          `No updates found for today (${today}), creating new record`,
        );
      }

      // Get current regions data
      const regionsData = await db.select().from(regions);
      const allSchemes = await this.getAllSchemes();

      // Get current totals
      const currentTotals = {
        villages: regionsData.reduce(
          (sum: number, region: any) =>
            sum + (region.total_villages_integrated || 0),
          0,
        ),
        esr: regionsData.reduce(
          (sum: number, region: any) =>
            sum + (region.total_esr_integrated || 0),
          0,
        ),
        completedSchemes: allSchemes.filter((scheme) => {
          const status =
            scheme.fully_completion_scheme_status?.toLowerCase() || "";
          return (
            status === "Fully-Completed" ||
            status === "Completed" ||
            status === "fully completed"
          );
        }).length,
        flowMeters: regionsData.reduce(
          (sum: number, region: any) =>
            sum + (region.flow_meter_integrated || 0),
          0,
        ),
        rca: regionsData.reduce(
          (sum: number, region: any) => sum + (region.rca_integrated || 0),
          0,
        ),
        pt: regionsData.reduce(
          (sum: number, region: any) =>
            sum + (region.pressure_transmitter_integrated || 0),
          0,
        ),
      };

      // Only detect new changes if we have previous totals
      // If this is the first run for today, just store the current totals
      const updates: any[] = [];

      if (prevTotals) {
        // Calculate differences since the previous update

        // Check for NEW village updates since last check
        const newVillages = currentTotals.villages - prevTotals.villages;
        if (newVillages > 0) {
          updates.push({
            type: "village",
            count: newVillages,
            status: "new",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }

        // Check for NEW ESR updates since last check
        const newESR = currentTotals.esr - prevTotals.esr;
        if (newESR > 0) {
          updates.push({
            type: "esr",
            count: newESR,
            status: "new",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }

        // Check for NEW completed schemes since last check
        const newCompletedSchemes =
          currentTotals.completedSchemes - prevTotals.completedSchemes;
        if (newCompletedSchemes > 0) {
          updates.push({
            type: "scheme",
            count: newCompletedSchemes,
            status: "completed",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }

        // Check for NEW flow meters since last check
        const newFlowMeters = currentTotals.flowMeters - prevTotals.flowMeters;
        if (newFlowMeters > 0) {
          updates.push({
            type: "flow_meter",
            count: newFlowMeters,
            status: "new",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }

        // Check for NEW RCAs since last check
        const newRCA = currentTotals.rca - prevTotals.rca;
        if (newRCA > 0) {
          updates.push({
            type: "rca",
            count: newRCA,
            status: "new",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }

        // Check for NEW pressure transmitters since last check
        const newPT = currentTotals.pt - prevTotals.pt;
        if (newPT > 0) {
          updates.push({
            type: "pressure_transmitter",
            count: newPT,
            status: "new",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }
      }

      // Add new updates to today's updates
      if (updates.length > 0) {
        console.log(`Adding ${updates.length} new updates`);
        // When there are specific region updates in the global todayUpdates variable, prioritize them
        if (
          (global as any).todayUpdates &&
          (global as any).todayUpdates.length > 0
        ) {
          // Extract region-specific updates (they have region property not equal to "All Regions")
          const regionSpecificUpdates = (global as any).todayUpdates.filter(
            (update: any) => update.region && update.region !== "All Regions",
          );

          // Add region-specific updates at the beginning for higher visibility
          todayUpdates = [
            ...regionSpecificUpdates,
            ...updates,
            ...todayUpdates,
          ];

          // Clear the global variable after we've processed them
          (global as any).todayUpdates = [];
          console.log(
            `Added ${regionSpecificUpdates.length} region-specific updates to the top of today's updates`,
          );
        } else {
          todayUpdates = [...updates, ...todayUpdates];
        }
      } else if (
        (global as any).todayUpdates &&
        (global as any).todayUpdates.length > 0
      ) {
        // If we have region updates but no general updates, still process them
        const regionSpecificUpdates = (global as any).todayUpdates;
        todayUpdates = [...regionSpecificUpdates, ...todayUpdates];
        (global as any).todayUpdates = [];
        console.log(
          `Added ${regionSpecificUpdates.length} region-specific updates to today's updates`,
        );
      }

      // Store current state in the database
      const stateToStore = {
        updates: todayUpdates,
        prevTotals: currentTotals,
        lastUpdateDay: today,
      };

      // Upsert the app_state record using SQL template literal for safety
      // Store as a proper JSONB object
      const jsonValue = JSON.stringify(stateToStore);
      await db.execute(sql`
        INSERT INTO app_state (key, value) 
        VALUES (${updateKey}, ${jsonValue}::jsonb)
        ON CONFLICT (key) 
        DO UPDATE SET value = ${jsonValue}::jsonb
      `);

      // Return updates for today
      return todayUpdates;
    } catch (error) {
      console.error("Error fetching today's updates:", error);
      throw error;
    }
  }
}

export const storage = new PostgresStorage();
