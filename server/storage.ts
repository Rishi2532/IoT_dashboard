import {
  users,
  regions,
  schemeStatuses,
  appState,
  waterSchemeData,
  chlorineData,
  type User,
  type InsertUser,
  type Region,
  type InsertRegion,
  type SchemeStatus,
  type InsertSchemeStatus,
  type WaterSchemeData,
  type InsertWaterSchemeData,
  type UpdateWaterSchemeData,
  type ChlorineData,
  type InsertChlorineData,
  type UpdateChlorineData,
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

// Filter type for chlorine data queries
export interface ChlorineDataFilter {
  region?: string;
  minChlorine?: number;
  maxChlorine?: number;
  chlorineRange?: 'below_0.2' | 'between_0.2_0.5' | 'above_0.5';
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
  
  // Chlorine Data operations
  getAllChlorineData(
    filter?: ChlorineDataFilter
  ): Promise<ChlorineData[]>;
  getChlorineDataByCompositeKey(schemeId: string, villageName: string, esrName: string): Promise<ChlorineData | undefined>;
  createChlorineData(data: InsertChlorineData): Promise<ChlorineData>;
  updateChlorineData(schemeId: string, villageName: string, esrName: string, data: UpdateChlorineData): Promise<ChlorineData>;
  deleteChlorineData(schemeId: string, villageName: string, esrName: string): Promise<boolean>;
  importChlorineDataFromExcel(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }>;
  importChlorineDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }>;
  
  // Chlorine Dashboard operations
  getChlorineDashboardStats(regionName?: string): Promise<{
    totalSensors: number;
    belowRangeSensors: number;
    optimalRangeSensors: number;
    aboveRangeSensors: number;
  }>;
}

// PostgreSQL implementation
export class PostgresStorage implements IStorage {
  private db: any;
  private initialized: Promise<void>;
  
  // Excel column mapping for water scheme and chlorine data
  private excelColumnMapping: Record<string, string> = {
    // ESR and Chlorine specific fields
    "ESR Name": "esr_name",
    "ESR_Name": "esr_name", 
    "esr name": "esr_name",
    "esr_name": "esr_name",
    "ESR ID": "esr_name",
    "ESR_ID": "esr_name",
    
    // Chlorine value fields
    "Chlorine Value Day 1": "Chlorine_value_1",
    "Chlorine_Value_1": "Chlorine_value_1",
    "chlorine_value_1": "Chlorine_value_1",
    "Chlorine Value 1": "Chlorine_value_1",
    
    "Chlorine Value Day 2": "Chlorine_value_2",
    "Chlorine_Value_2": "Chlorine_value_2",
    "chlorine_value_2": "Chlorine_value_2",
    "Chlorine Value 2": "Chlorine_value_2",
    
    "Chlorine Value Day 3": "Chlorine_value_3",
    "Chlorine_Value_3": "Chlorine_value_3",
    "chlorine_value_3": "Chlorine_value_3",
    "Chlorine Value 3": "Chlorine_value_3",
    
    "Chlorine Value Day 4": "Chlorine_value_4",
    "Chlorine_Value_4": "Chlorine_value_4",
    "chlorine_value_4": "Chlorine_value_4",
    "Chlorine Value 4": "Chlorine_value_4",
    
    "Chlorine Value Day 5": "Chlorine_value_5",
    "Chlorine_Value_5": "Chlorine_value_5",
    "chlorine_value_5": "Chlorine_value_5",
    "Chlorine Value 5": "Chlorine_value_5",
    
    "Chlorine Value Day 6": "Chlorine_value_6",
    "Chlorine_Value_6": "Chlorine_value_6",
    "chlorine_value_6": "Chlorine_value_6",
    "Chlorine Value 6": "Chlorine_value_6",
    
    "Chlorine Value Day 7": "Chlorine_value_7",
    "Chlorine_Value_7": "Chlorine_value_7",
    "chlorine_value_7": "Chlorine_value_7",
    "Chlorine Value 7": "Chlorine_value_7",
    
    // Chlorine date fields
    "Chlorine Date Day 1": "Chlorine_date_day_1",
    "Chlorine_Date_Day_1": "Chlorine_date_day_1",
    "chlorine_date_day_1": "Chlorine_date_day_1",
    
    "Chlorine Date Day 2": "Chlorine_date_day_2",
    "Chlorine_Date_Day_2": "Chlorine_date_day_2",
    "chlorine_date_day_2": "Chlorine_date_day_2",
    
    "Chlorine Date Day 3": "Chlorine_date_day_3",
    "Chlorine_Date_Day_3": "Chlorine_date_day_3",
    "chlorine_date_day_3": "Chlorine_date_day_3",
    
    "Chlorine Date Day 4": "Chlorine_date_day_4",
    "Chlorine_Date_Day_4": "Chlorine_date_day_4",
    "chlorine_date_day_4": "Chlorine_date_day_4",
    
    "Chlorine Date Day 5": "Chlorine_date_day_5",
    "Chlorine_Date_Day_5": "Chlorine_date_day_5",
    "chlorine_date_day_5": "Chlorine_date_day_5",
    
    "Chlorine Date Day 6": "Chlorine_date_day_6",
    "Chlorine_Date_Day_6": "Chlorine_date_day_6",
    "chlorine_date_day_6": "Chlorine_date_day_6",
    
    "Chlorine Date Day 7": "Chlorine_date_day_7",
    "Chlorine_Date_Day_7": "Chlorine_date_day_7",
    "chlorine_date_day_7": "Chlorine_date_day_7",
    
    // Analysis fields
    "Consistent Zero Chlorine": "number_of_consistent_zero_value_in_Chlorine",
    "consistent_zero_chlorine": "number_of_consistent_zero_value_in_Chlorine",
    "Zero Chlorine Count": "number_of_consistent_zero_value_in_Chlorine",
    
    "Below 0.2 mg/l Count": "Chlorine_less_than_02_mgl",
    "chlorine_less_than_02_mgl": "Chlorine_less_than_02_mgl",
    
    "Between 0.2-0.5 mg/l Count": "Chlorine_between_02__05_mgl",
    "chlorine_between_02__05_mgl": "Chlorine_between_02__05_mgl",
    
    "Above 0.5 mg/l Count": "Chlorine_greater_than_05_mgl",
    "chlorine_greater_than_05_mgl": "Chlorine_greater_than_05_mgl",
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

  /**
   * Improved numeric value parsing that handles various formats and validation
   * @param value - The value to parse into a number
   * @returns The parsed numeric value or null if invalid
   */
  private getNumericValue(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    
    // If already a number, return it (with validation)
    if (typeof value === 'number') {
      // Validate reasonable limits for water metrics
      if (value > 100000000) { // More than 100 million liters is likely an error
        console.log(`Warning: Extreme water value detected: ${value}, capping to null`);
        return null;
      }
      return isFinite(value) ? value : null;
    }
    
    // If it's a string, try to convert it
    if (typeof value === 'string') {
      // Handle empty strings and non-numeric strings
      if (value.trim() === '' || 
          value.toLowerCase() === 'n/a' || 
          value.toLowerCase() === 'no data recorded' ||
          value.toLowerCase() === 'no data' || 
          value.toLowerCase() === '-' ||
          value.toLowerCase() === 'nil') {
        return null;
      }
      
      // Remove any non-numeric characters except decimal point
      // This will handle values with units like '15000 L' or '70 lpcd'
      const cleanedValue = value.replace(/[^0-9.]/g, '');
      if (cleanedValue === '') {
        return null;
      }
      
      // Parse to float and ensure it's a valid number
      const numValue = parseFloat(cleanedValue);
      
      // If we got NaN but had a non-empty string, it's a format issue
      if (isNaN(numValue)) {
        console.log(`Warning: Could not parse numeric value from: ${value}`);
        return null;
      }
      
      // Ensure it's actually a finite number and within reasonable limits
      if (!isFinite(numValue)) {
        return null;
      }
      
      // Validate reasonable limits for water consumption metrics
      if (numValue > 100000000) { // More than 100 million liters is likely an error
        console.log(`Warning: Extreme water value detected: ${numValue}, capping to null`);
        return null;
      }
      
      return numValue;
    }
    
    return null;
  }
  
  /**
   * Calculate derived values based on water scheme data
   * @param schemeData - The water scheme data object to calculate derived values for
   */
  private calculateDerivedValues(schemeData: Partial<InsertWaterSchemeData>): void {
    // Count days with zero LPCD values
    let zeroLpcdCount = 0;
    let below55LpcdCount = 0;
    let above55LpcdCount = 0;
    
    // Check each day's LPCD values
    for (let i = 1; i <= 7; i++) {
      const lpcdField = `lpcd_value_day${i}` as keyof InsertWaterSchemeData;
      const lpcdValue = schemeData[lpcdField] as number | null;
      
      if (lpcdValue === 0 || lpcdValue === null) {
        zeroLpcdCount++;
      } else if (lpcdValue < 55) {
        below55LpcdCount++;
      } else if (lpcdValue >= 55) {
        above55LpcdCount++;
      }
    }
    
    // Set the derived values
    schemeData.consistent_zero_lpcd_for_a_week = zeroLpcdCount === 7 ? 1 : 0;
    schemeData.below_55_lpcd_count = below55LpcdCount;
    schemeData.above_55_lpcd_count = above55LpcdCount;
  }

  constructor() {
    this.initialized = this.initializeDb().catch((error) => {
      console.error("Failed to initialize database in constructor:", error);
      throw error;
    });
  }
  
  // Chlorine Data CRUD operations
  async getAllChlorineData(filter?: ChlorineDataFilter): Promise<ChlorineData[]> {
    await this.initialized;
    const { db } = getDB();
    
    try {
      let query = db.select().from(chlorineData);
      
      // Apply filters if provided
      if (filter) {
        if (filter.region) {
          query = query.where(eq(chlorineData.region, filter.region));
        }
        
        if (filter.chlorineRange) {
          switch (filter.chlorineRange) {
            case 'below_0.2':
              // ESRs with chlorine value below 0.2 mg/l
              query = query.where(sql`${chlorineData.Chlorine_value_7} < 0.2 AND ${chlorineData.Chlorine_value_7} >= 0`);
              break;
            case 'between_0.2_0.5':
              // ESRs with chlorine value between 0.2 and 0.5 mg/l
              query = query.where(sql`${chlorineData.Chlorine_value_7} >= 0.2 AND ${chlorineData.Chlorine_value_7} <= 0.5`);
              break;
            case 'above_0.5':
              // ESRs with chlorine value above 0.5 mg/l
              query = query.where(sql`${chlorineData.Chlorine_value_7} > 0.5`);
              break;
          }
        } else {
          // Apply min/max filters if range is not specified
          if (filter.minChlorine !== undefined) {
            query = query.where(sql`${chlorineData.Chlorine_value_7} >= ${filter.minChlorine}`);
          }
          
          if (filter.maxChlorine !== undefined) {
            query = query.where(sql`${chlorineData.Chlorine_value_7} <= ${filter.maxChlorine}`);
          }
        }
      }
      
      return await query;
    } catch (error) {
      console.error("Error fetching chlorine data:", error);
      return [];
    }
  }
  
  async getChlorineDataByCompositeKey(
    schemeId: string,
    villageName: string,
    esrName: string
  ): Promise<ChlorineData | undefined> {
    await this.initialized;
    const { db } = getDB();
    
    try {
      const result = await db
        .select()
        .from(chlorineData)
        .where(
          sql`${chlorineData.scheme_id} = ${schemeId} 
              AND ${chlorineData.village_name} = ${villageName}
              AND ${chlorineData.esr_name} = ${esrName}`
        );
      
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error fetching chlorine data by composite key:", error);
      return undefined;
    }
  }
  
  async createChlorineData(data: InsertChlorineData): Promise<ChlorineData> {
    await this.initialized;
    const { db } = getDB();
    
    try {
      // Calculate derived fields for analysis
      const enhancedData = this.calculateChlorineAnalysisFields(data);
      
      // Insert the data
      const result = await db
        .insert(chlorineData)
        .values(enhancedData)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating chlorine data:", error);
      throw new Error(`Failed to create chlorine data: ${error}`);
    }
  }
  
  async updateChlorineData(
    schemeId: string,
    villageName: string,
    esrName: string,
    data: UpdateChlorineData
  ): Promise<ChlorineData> {
    await this.initialized;
    const { db } = getDB();
    
    try {
      // Calculate derived fields for analysis
      const enhancedData = this.calculateChlorineAnalysisFields(data);
      
      // Update the data
      const result = await db
        .update(chlorineData)
        .set(enhancedData)
        .where(
          sql`${chlorineData.scheme_id} = ${schemeId} 
              AND ${chlorineData.village_name} = ${villageName}
              AND ${chlorineData.esr_name} = ${esrName}`
        )
        .returning();
      
      if (!result.length) {
        throw new Error("Chlorine data not found");
      }
      
      return result[0];
    } catch (error) {
      console.error("Error updating chlorine data:", error);
      throw new Error(`Failed to update chlorine data: ${error}`);
    }
  }
  
  async deleteChlorineData(
    schemeId: string,
    villageName: string,
    esrName: string
  ): Promise<boolean> {
    await this.initialized;
    const { db } = getDB();
    
    try {
      await db
        .delete(chlorineData)
        .where(
          sql`${chlorineData.scheme_id} = ${schemeId} 
              AND ${chlorineData.village_name} = ${villageName}
              AND ${chlorineData.esr_name} = ${esrName}`
        );
      
      return true;
    } catch (error) {
      console.error("Error deleting chlorine data:", error);
      return false;
    }
  }
  
  // Helper function to calculate analysis fields for chlorine data
  private calculateChlorineAnalysisFields(data: Partial<InsertChlorineData>): any {
    const enhancedData = { ...data };
    
    // Count how many consecutive days have zero chlorine values
    let zeroCount = 0;
    let below02Count = 0;
    let between02And05Count = 0;
    let above05Count = 0;
    
    // Check all 7 days
    for (let i = 1; i <= 7; i++) {
      const value = enhancedData[`chlorine_value_${i}` as keyof InsertChlorineData] as number | undefined;
      
      if (value !== undefined) {
        if (value === 0) {
          zeroCount++;
        }
        
        if (value < 0.2 && value >= 0) {
          below02Count++;
        } else if (value >= 0.2 && value <= 0.5) {
          between02And05Count++;
        } else if (value > 0.5) {
          above05Count++;
        }
      }
    }
    
    // Update analysis fields
    enhancedData.number_of_consistent_zero_value_in_chlorine = zeroCount;
    enhancedData.chlorine_less_than_02_mgl = below02Count;
    enhancedData.chlorine_between_02__05_mgl = between02And05Count;
    enhancedData.chlorine_greater_than_05_mgl = above05Count;
    
    return enhancedData;
  }
  
  // Import methods for chlorine data
  async importChlorineDataFromExcel(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }> {
    await this.initialized;
    const { db } = getDB();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;

    try {
      const xlsx = require('xlsx');
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

      // Process each sheet in the workbook
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        // Find the header row
        const headerRow = this.findHeaderRow(data);
        if (headerRow === -1) {
          errors.push(`No header row found in sheet ${sheetName}`);
          continue;
        }

        // Extract headers and create column mapping
        const headers = data[headerRow];
        const columnMap: Record<number, string> = {};
        
        // Map Excel columns to database fields
        headers.forEach((header: string, index: number) => {
          if (header && typeof header === 'string') {
            const dbField = this.excelColumnMapping[header.trim()];
            if (dbField) {
              columnMap[index] = dbField;
            }
          }
        });

        // Process data rows
        for (let i = headerRow + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          try {
            const recordData: Partial<InsertChlorineData> = {};
            
            // Extract data from each column
            for (let j = 0; j < row.length; j++) {
              if (columnMap[j]) {
                const value = row[j];
                const fieldName = columnMap[j];
                
                // Handle numeric chlorine values and ensure they are decimal numbers
                if (fieldName.startsWith('Chlorine_value_')) {
                  recordData[fieldName as keyof InsertChlorineData] = this.parseNumericValue(value);
                } else {
                  recordData[fieldName as keyof InsertChlorineData] = value;
                }
              }
            }

            // Skip rows without required fields
            if (!recordData.scheme_id || !recordData.village_name || !recordData.esr_name) {
              errors.push(`Row ${i + 1}: Missing required fields (scheme_id, village_name, or esr_name)`);
              continue;
            }

            // Calculate analysis fields
            const enhancedData = this.calculateChlorineAnalysisFields(recordData);

            // Check if record exists
            const existingRecord = await this.getChlorineDataByCompositeKey(
              recordData.scheme_id, 
              recordData.village_name, 
              recordData.esr_name
            );

            if (existingRecord) {
              // Update existing record
              await db
                .update(chlorineData)
                .set(enhancedData)
                .where(
                  sql`${chlorineData.scheme_id} = ${recordData.scheme_id} 
                      AND ${chlorineData.village_name} = ${recordData.village_name}
                      AND ${chlorineData.esr_name} = ${recordData.esr_name}`
                );
              updated++;
            } else {
              // Insert new record
              await db.insert(chlorineData).values(enhancedData);
              inserted++;
            }
          } catch (rowError) {
            errors.push(`Row ${i + 1}: ${rowError}`);
          }
        }
      }

      return { inserted, updated, errors };
    } catch (error) {
      console.error("Error importing chlorine data from Excel:", error);
      errors.push(`General import error: ${error}`);
      return { inserted, updated, errors };
    }
  }

  async importChlorineDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }> {
    await this.initialized;
    const { db } = getDB();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;

    try {
      const csvString = fileBuffer.toString('utf8');
      const { parse } = require('csv-parse/sync');
      const records = parse(csvString, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      if (records.length === 0) {
        errors.push("No data found in CSV file");
        return { inserted, updated, errors };
      }

      // Process each row in the CSV
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          const recordData: Partial<InsertChlorineData> = {};
          
          // Map CSV headers to database fields
          for (const [header, value] of Object.entries(row)) {
            const fieldName = this.excelColumnMapping[header.trim()];
            if (fieldName) {
              // Handle numeric chlorine values and ensure they are decimal numbers
              if (fieldName.startsWith('Chlorine_value_')) {
                recordData[fieldName as keyof InsertChlorineData] = this.parseNumericValue(value as string);
              } else {
                recordData[fieldName as keyof InsertChlorineData] = value;
              }
            }
          }

          // Skip rows without required fields
          if (!recordData.scheme_id || !recordData.village_name || !recordData.esr_name) {
            errors.push(`Row ${i + 1}: Missing required fields (scheme_id, village_name, or esr_name)`);
            continue;
          }

          // Calculate analysis fields
          const enhancedData = this.calculateChlorineAnalysisFields(recordData);

          // Check if record exists
          const existingRecord = await this.getChlorineDataByCompositeKey(
            recordData.scheme_id, 
            recordData.village_name, 
            recordData.esr_name
          );

          if (existingRecord) {
            // Update existing record
            await db
              .update(chlorineData)
              .set(enhancedData)
              .where(
                sql`${chlorineData.scheme_id} = ${recordData.scheme_id} 
                    AND ${chlorineData.village_name} = ${recordData.village_name}
                    AND ${chlorineData.esr_name} = ${recordData.esr_name}`
              );
            updated++;
          } else {
            // Insert new record
            await db.insert(chlorineData).values(enhancedData);
            inserted++;
          }
        } catch (rowError) {
          errors.push(`Row ${i + 1}: ${rowError}`);
        }
      }

      return { inserted, updated, errors };
    } catch (error) {
      console.error("Error importing chlorine data from CSV:", error);
      errors.push(`General import error: ${error}`);
      return { inserted, updated, errors };
    }
  }

  // Helper for parsing numeric values from Excel/CSV
  private parseNumericValue(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // Convert string to number
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
    
    // Check if it's a valid number
    if (isNaN(num)) {
      return null;
    }
    
    return num;
  }
  
  // Find header row in Excel sheet
  private findHeaderRow(data: any[]): number {
    if (!data || data.length === 0) return -1;
    
    // Look for rows with key column headers
    const keyColumns = ['scheme_id', 'Scheme ID', 'scheme id', 'ESR Name', 'esr name', 'ESR_Name'];
    
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      
      // Check if any cell in this row matches our key columns
      for (const cell of row) {
        if (cell && typeof cell === 'string' && keyColumns.some(key => 
          cell.toLowerCase() === key.toLowerCase())) {
          return i;
        }
      }
    }
    
    return 0; // Default to first row if no good match found
  }
  
  // Dashboard statistics for chlorine data
  async getChlorineDashboardStats(regionName?: string): Promise<{
    totalSensors: number;
    belowRangeSensors: number;
    optimalRangeSensors: number;
    aboveRangeSensors: number;
  }> {
    await this.initialized;
    const { db } = getDB();
    
    try {
      // Base query - filter by region if specified
      let baseQuery = db.select().from(chlorineData);
      if (regionName) {
        baseQuery = baseQuery.where(eq(chlorineData.region, regionName));
      }
      
      // Get total count
      const totalResult = await baseQuery.count();
      const totalSensors = parseInt(totalResult[0].count, 10) || 0;
      
      // Get below 0.2 mg/l count
      const belowRangeResult = await baseQuery
        .where(sql`${chlorineData.chlorine_value_7} < 0.2 AND ${chlorineData.chlorine_value_7} >= 0`)
        .count();
      const belowRangeSensors = parseInt(belowRangeResult[0].count, 10) || 0;
      
      // Get optimal range (0.2-0.5 mg/l) count
      const optimalRangeResult = await baseQuery
        .where(sql`${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5`)
        .count();
      const optimalRangeSensors = parseInt(optimalRangeResult[0].count, 10) || 0;
      
      // Get above 0.5 mg/l count
      const aboveRangeResult = await baseQuery
        .where(sql`${chlorineData.chlorine_value_7} > 0.5`)
        .count();
      const aboveRangeSensors = parseInt(aboveRangeResult[0].count, 10) || 0;
      
      return {
        totalSensors,
        belowRangeSensors,
        optimalRangeSensors,
        aboveRangeSensors
      };
    } catch (error) {
      console.error("Error fetching chlorine dashboard stats:", error);
      return {
        totalSensors: 0,
        belowRangeSensors: 0,
        optimalRangeSensors: 0,
        aboveRangeSensors: 0
      };
    }
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
    
    console.log("Filter received:", filter); // Debug log
    
    if (filter) {
      // Apply region filter if provided
      if (filter.region) {
        query = query.where(eq(waterSchemeData.region, filter.region));
      }
      
      // Apply LPCD filters if provided
      if (filter.minLpcd !== undefined) {
        // Apply minimum LPCD filter
        // Make sure to use the most recent day with data (try day7, then day6, etc.)
        const minLpcdValue = parseFloat(filter.minLpcd.toString());
        console.log("minLpcdValue:", minLpcdValue); // Debug log
        
        // Important fix: FIRST exclude all records that have zero LPCDs for the entire week
        // This is the key change that fixes the filtering issue
        query = query.where(sql`(${waterSchemeData.consistent_zero_lpcd_for_a_week} = 0 OR ${waterSchemeData.consistent_zero_lpcd_for_a_week} IS NULL)`);
        
        // Important: When filtering for values above 55, ensure values are not zero
        if (minLpcdValue >= 55) {
          // For threshold like 55, ensure we get records with at least one value >= 55
          query = query.where(
            sql`(
              ${waterSchemeData.lpcd_value_day7} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day6} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day5} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day4} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day3} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day2} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day1} >= ${minLpcdValue}
            )`
          );
          
          console.log("Applying Above 55 LPCD filter"); // Debug log
        } else {
          // For other minimum thresholds
          query = query.where(
            sql`(
              ${waterSchemeData.lpcd_value_day7} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day6} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day5} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day4} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day3} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day2} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day1} >= ${minLpcdValue}
            )`
          );
        }
      }
      
      if (filter.maxLpcd !== undefined) {
        // Apply maximum LPCD filter (for any day)
        const maxLpcdValue = parseFloat(filter.maxLpcd.toString());
        console.log("maxLpcdValue:", maxLpcdValue); // Debug log
        
        // If filtering for below 55, also ensure we exclude zero values
        // Unless we're specifically filtering for zero supply
        if (maxLpcdValue <= 55 && !filter.zeroSupplyForWeek) {
          // Ensure we're excluding zero values (should have at least one non-zero value below the threshold)
          query = query.where(sql`(${waterSchemeData.consistent_zero_lpcd_for_a_week} = 0 OR ${waterSchemeData.consistent_zero_lpcd_for_a_week} IS NULL)`);
          
          query = query.where(
            sql`(
              (${waterSchemeData.lpcd_value_day7} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day7} > 0) OR
              (${waterSchemeData.lpcd_value_day6} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day6} > 0) OR
              (${waterSchemeData.lpcd_value_day5} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day5} > 0) OR
              (${waterSchemeData.lpcd_value_day4} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day4} > 0) OR
              (${waterSchemeData.lpcd_value_day3} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day3} > 0) OR
              (${waterSchemeData.lpcd_value_day2} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day2} > 0) OR
              (${waterSchemeData.lpcd_value_day1} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day1} > 0)
            )`
          );
          
          console.log("Applying Below 55 LPCD filter with zero exclusions"); // Debug log
        } else {
          // For other maximum thresholds apply standard filter
          query = query.where(
            sql`(
              ${waterSchemeData.lpcd_value_day7} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day6} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day5} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day4} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day3} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day2} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day1} <= ${maxLpcdValue}
            )`
          );
        }
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
  
  // Function to safely convert various cell values to numbers
  private getNumericValue(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    
    // If already a number, return it
    if (typeof value === 'number') {
      return value;
    }
    
    // If it's a string, try to convert it
    if (typeof value === 'string') {
      // Handle empty strings and non-numeric strings
      if (value.trim() === '' || value.toLowerCase() === 'n/a') {
        return null;
      }
      
      // Remove any non-numeric characters except decimal point
      const cleanedValue = value.replace(/[^0-9.]/g, '');
      if (cleanedValue === '') {
        return null;
      }
      
      // Parse to float and ensure it's a valid number
      const numValue = parseFloat(cleanedValue);
      
      // If we got NaN but had a non-empty string, it's a format issue
      if (isNaN(numValue)) {
        console.log(`Warning: Could not parse numeric value from: ${value}`);
        return null;
      }
      
      // Ensure it's actually a finite number
      return isFinite(numValue) ? numValue : null;
    }
    
    return null;
  }
  
  // Function to calculate derived values like consistent zeros, below/above LPCD counts
  private calculateDerivedValues(data: any): any {
    // Extract LPCD values
    const lpcdValues = [
      this.getNumericValue(data.lpcd_value_day1),
      this.getNumericValue(data.lpcd_value_day2),
      this.getNumericValue(data.lpcd_value_day3),
      this.getNumericValue(data.lpcd_value_day4),
      this.getNumericValue(data.lpcd_value_day5),
      this.getNumericValue(data.lpcd_value_day6),
      this.getNumericValue(data.lpcd_value_day7)
    ].filter(val => val !== null);
    
    // If no LPCD values, set derived values to 0
    if (lpcdValues.length === 0) {
      data.consistent_zero_lpcd_for_a_week = 0;
      data.below_55_lpcd_count = 0;
      data.above_55_lpcd_count = 0;
      return data;
    }
    
    // Calculate consistent zero LPCD - only set to 1 if all 7 days have zero values
    const allZeros = lpcdValues.every(val => val === 0);
    data.consistent_zero_lpcd_for_a_week = (allZeros && lpcdValues.length === 7) ? 1 : 0;
    
    // Special handling for all-zero values
    if (allZeros && lpcdValues.length > 0) {
      // If all values are zero, all days are below 55
      data.below_55_lpcd_count = lpcdValues.length;
      data.above_55_lpcd_count = 0;
    } else {
      // Normal calculation for non-zero values
      data.below_55_lpcd_count = lpcdValues.filter(val => val < 55).length;
      data.above_55_lpcd_count = lpcdValues.filter(val => val >= 55).length;
    }
    
    return data;
  }
  
  // Enhanced column mapping for the positional data format
  private positionalColumnMapping: { [key: number]: string } = {
    // Assuming position matches the Excel columns (0-based)
    0: 'region',
    1: 'circle',
    2: 'division',
    3: 'sub_division',
    4: 'block',
    5: 'scheme_id',
    6: 'scheme_name',
    7: 'village_name',
    8: 'population',
    9: 'number_of_esr',
    10: 'water_value_day1',
    11: 'water_value_day2',
    12: 'water_value_day3',
    13: 'water_value_day4',
    14: 'water_value_day5',
    15: 'water_value_day6',
    16: 'lpcd_value_day1',
    17: 'lpcd_value_day2',
    18: 'lpcd_value_day3',
    19: 'lpcd_value_day4',
    20: 'lpcd_value_day5',
    21: 'lpcd_value_day6',
    22: 'lpcd_value_day7',
    23: 'water_date_day1',
    24: 'water_date_day2',
    25: 'water_date_day3',
    26: 'water_date_day4',
    27: 'water_date_day5',
    28: 'water_date_day6',
    29: 'lpcd_date_day1',
    30: 'lpcd_date_day2',
    31: 'lpcd_date_day3',
    32: 'lpcd_date_day4',
    33: 'lpcd_date_day5',
    34: 'lpcd_date_day6',
    35: 'lpcd_date_day7',
    36: 'consistent_zero_lpcd_for_a_week',
    37: 'below_55_lpcd_count',
    38: 'above_55_lpcd_count'
  };
  
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
      
      console.log(`Processing Excel file, sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with raw values to preserve numbers
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { 
        raw: true, 
        defval: null,
        dateNF: 'yyyy-mm-dd'
      });
      
      // Log first row to see what column headers are available
      if (jsonData.length > 0) {
        console.log("Excel first row column headers:", Object.keys(jsonData[0]));
      } else {
        console.log("No data found in Excel file");
        return { inserted: 0, updated: 0, errors: ["No data found in Excel file"] };
      }
      
      // Determine if the file uses numeric positional columns or named headers
      // This handles both types of Excel files
      const firstRow = jsonData[0];
      const hasPositionalColumns = Object.keys(firstRow).some(key => !isNaN(Number(key)));
      
      console.log(`Excel format: ${hasPositionalColumns ? 'Positional' : 'Named headers'}`);
      
      // Process each row
      for (const row of jsonData) {
        try {
          // Map to database schema format
          const schemeData: Record<string, any> = {};
          
          if (hasPositionalColumns) {
            // Handle positional format (column numbers as keys)
            for (const [position, dbField] of Object.entries(this.positionalColumnMapping)) {
              if (row[position] !== undefined) {
                // Convert numeric fields properly
                if (dbField.includes('value') || 
                    dbField === 'population' || 
                    dbField === 'number_of_esr' ||
                    dbField.includes('count')) {
                  schemeData[dbField] = this.getNumericValue(row[position]);
                } else {
                  schemeData[dbField] = row[position];
                }
              }
            }
          } else {
            // Handle named header format
            // First try exact column matches
            for (const [excelHeader, dbField] of Object.entries(this.excelColumnMapping)) {
              if (row[excelHeader] !== undefined) {
                // Convert numeric fields properly
                if (dbField.includes('value') || 
                    dbField === 'population' || 
                    dbField === 'number_of_esr' ||
                    dbField.includes('count')) {
                  schemeData[dbField] = this.getNumericValue(row[excelHeader]);
                } else {
                  schemeData[dbField] = row[excelHeader];
                }
              }
            }
            
            // Try case-insensitive matching if regular mapping failed
            if (!schemeData.scheme_id) {
              for (const origHeader of Object.keys(row)) {
                const lowerHeader = origHeader.toLowerCase();
                // Find matching schema field
                for (const [excelHeader, dbField] of Object.entries(this.excelColumnMapping)) {
                  if (excelHeader.toLowerCase() === lowerHeader) {
                    // Convert numeric fields properly
                    if (dbField.includes('value') || 
                        dbField === 'population' || 
                        dbField === 'number_of_esr' ||
                        dbField.includes('count')) {
                      schemeData[dbField] = this.getNumericValue(row[origHeader]);
                    } else {
                      schemeData[dbField] = row[origHeader];
                    }
                    break;
                  }
                }
              }
            }
          }
          
          // Validate required fields
          if (!schemeData.scheme_id || !schemeData.village_name) {
            console.log('Skipping row with missing scheme_id or village_name:', 
              JSON.stringify({scheme_id: schemeData.scheme_id, village_name: schemeData.village_name}));
            continue;
          }
          
          // Calculate derived values (consistency metrics)
          this.calculateDerivedValues(schemeData);
          
          console.log(`Processed record for scheme_id ${schemeData.scheme_id}, village ${schemeData.village_name}: ` +
                     `water_value_day1=${schemeData.water_value_day1}, lpcd_value_day1=${schemeData.lpcd_value_day1}`);
          
          // Check if scheme already exists
          let existingScheme;
          try {
            existingScheme = await this.getWaterSchemeDataById(schemeData.scheme_id);
          } catch (error) {
            console.error(`Error checking for existing scheme: ${error}`);
            existingScheme = null;
          }
          
          try {
            if (existingScheme) {
              // Update existing scheme
              await this.updateWaterSchemeData(schemeData.scheme_id, schemeData);
              updated++;
            } else {
              // Insert new scheme
              await this.createWaterSchemeData(schemeData as InsertWaterSchemeData);
              inserted++;
            }
          } catch (saveError: any) {
            console.error(`Error saving data: ${saveError.message}`);
            errors.push(`Error saving data for ${schemeData.scheme_id}: ${saveError.message}`);
          }
        } catch (rowError: any) {
          console.error(`Row processing error: ${rowError.message}`);
          errors.push(`Error processing row: ${rowError.message}`);
        }
      }
      
      console.log(`Successfully processed water scheme data: ${inserted} inserted, ${updated} updated`);
      return { inserted, updated, errors };
    } catch (error: any) {
      console.error(`Excel import error: ${error.message}`);
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
      
      // Show headers for debugging
      if (records.length > 0) {
        console.log('CSV import analysis:');
        console.log('- Headers:', records[0]);
        console.log('- Water value columns:', records[0].filter((h: string) => h?.includes('water')));
        console.log('- LPCD value columns:', records[0].filter((h: string) => h?.includes('lpcd')));
        console.log('- Has LPCD headers:', records[0].some((h: string) => h?.includes('lpcd')));
      }
      
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
          for (const [indexStr, dbField] of Object.entries(this.positionalColumnMapping)) {
            const index = parseInt(indexStr);
            if (record[index] !== undefined && record[index] !== "") {
              // Convert string values to numbers for numeric fields, with safety check
              if (dbField.includes('value') || 
                  dbField === 'population' || 
                  dbField === 'number_of_esr' ||
                  dbField.includes('count')) {
                try {
                  // Handle overflow issues by capping values to safe range
                  let numberValue = parseFloat(String(record[index]).replace(/,/g, ""));
                  
                  // Check if number is within safe range for decimal(20,6)
                  if (!isNaN(numberValue)) {
                    // Max value for decimal(20,6) is approximately 10^14
                    const MAX_SAFE_DECIMAL = 1e14;
                    
                    if (Math.abs(numberValue) > MAX_SAFE_DECIMAL) {
                      console.warn(`Value too large for ${dbField}: ${numberValue}, capping to ${MAX_SAFE_DECIMAL}`);
                      numberValue = numberValue > 0 ? MAX_SAFE_DECIMAL : -MAX_SAFE_DECIMAL;
                    }
                    
                    schemeData[dbField] = numberValue;
                  } else {
                    // Skip invalid number values
                    console.warn(`Invalid number for ${dbField}: ${record[index]}, using null instead`);
                  }
                } catch (e) {
                  console.warn(`Error converting value for ${dbField}: ${e.message}`);
                }
              } else {
                schemeData[dbField] = record[index];
              }
            }
          }
          
          // Ensure village_name is present (required for composite primary key)
          if (!schemeData.village_name) {
            errors.push(`Row missing required field: village_name for scheme_id ${schemeData.scheme_id}`);
            continue;
          }
          
          // Calculate derived values (consistent zero, below/above 55 LPCD)
          this.calculateDerivedValues(schemeData);
          
          // Generate a composite key for lookup
          const lookupKey = `${schemeData.scheme_id}-${schemeData.village_name}`;
          
          // Check if scheme already exists
          let existingScheme = null;
          try {
            const schemes = await db.select().from(waterSchemeData)
              .where(sql`${waterSchemeData.scheme_id} = ${schemeData.scheme_id} AND 
                     ${waterSchemeData.village_name} = ${schemeData.village_name}`);
            
            if (schemes.length > 0) {
              existingScheme = schemes[0];
            }
          } catch (error) {
            console.error(`Error checking for existing scheme: ${error}`);
          }
          
          try {
            if (existingScheme) {
              // Update existing scheme
              await this.updateWaterSchemeData(schemeData.scheme_id, schemeData);
              updated++;
            } else {
              // Insert new scheme
              await this.createWaterSchemeData(schemeData as InsertWaterSchemeData);
              inserted++;
            }
          } catch (saveError) {
            console.error(`Error saving data: ${saveError.message}`);
            errors.push(`Error saving data for ${lookupKey}: ${saveError.message}`);
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
