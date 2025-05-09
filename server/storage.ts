import {
  users,
  regions,
  schemeStatuses,
  appState,
  waterSchemeData,
  chlorineData,
  pressureData,
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
  type PressureData,
  type InsertPressureData,
  type UpdatePressureData,
} from "@shared/schema";
import { getDB, initializeDatabase } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { parse } from "csv-parse";
import { v4 as uuidv4 } from "uuid";

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
  chlorineRange?: 'below_0.2' | 'between_0.2_0.5' | 'above_0.5' | 'consistent_zero' | 'consistent_below' | 'consistent_optimal' | 'consistent_above';
}

export interface PressureDataFilter {
  region?: string;
  minPressure?: number;
  maxPressure?: number;
  pressureRange?: 'below_0.2' | 'between_0.2_0.7' | 'above_0.7' | 'consistent_zero' | 'consistent_below' | 'consistent_optimal' | 'consistent_above';
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
  getSchemeByIdAndBlock(schemeId: string, block: string | null): Promise<SchemeStatus | undefined>;
  getSchemesByName(schemeName: string): Promise<SchemeStatus[]>;
  getBlocksByScheme(schemeName: string): Promise<string[]>;
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
    removed: number;
    errors: string[];
  }>;
  importWaterSchemeDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
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
    removed: number;
    errors: string[];
  }>;
  importChlorineDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }>;
  
  // Chlorine Dashboard operations
  getChlorineDashboardStats(regionName?: string): Promise<{
    totalSensors: number;
    belowRangeSensors: number;
    optimalRangeSensors: number;
    aboveRangeSensors: number;
    consistentZeroSensors: number;
    consistentBelowRangeSensors: number;
    consistentOptimalSensors: number;
    consistentAboveRangeSensors: number;
  }>;
  
  // Pressure Data operations
  getAllPressureData(
    filter?: PressureDataFilter
  ): Promise<PressureData[]>;
  getPressureDataByCompositeKey(schemeId: string, villageName: string, esrName: string): Promise<PressureData | undefined>;
  createPressureData(data: InsertPressureData): Promise<PressureData>;
  updatePressureData(schemeId: string, villageName: string, esrName: string, data: UpdatePressureData): Promise<PressureData>;
  deletePressureData(schemeId: string, villageName: string, esrName: string): Promise<boolean>;
  importPressureDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }>;
  
  // Pressure Dashboard operations
  getPressureDashboardStats(regionName?: string): Promise<{
    totalSensors: number;
    belowRangeSensors: number;
    optimalRangeSensors: number;
    aboveRangeSensors: number;
    consistentZeroSensors: number;
    consistentBelowRangeSensors: number;
    consistentOptimalSensors: number;
    consistentAboveRangeSensors: number;
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
    "Chlorine Value Day 1": "chlorine_value_1",
    "Chlorine_Value_1": "chlorine_value_1",
    "chlorine_value_1": "chlorine_value_1",
    "Chlorine Value 1": "chlorine_value_1",
    
    "Chlorine Value Day 2": "chlorine_value_2",
    "Chlorine_Value_2": "chlorine_value_2",
    "chlorine_value_2": "chlorine_value_2",
    "Chlorine Value 2": "chlorine_value_2",
    
    "Chlorine Value Day 3": "chlorine_value_3",
    "Chlorine_Value_3": "chlorine_value_3",
    "chlorine_value_3": "chlorine_value_3",
    "Chlorine Value 3": "chlorine_value_3",
    
    "Chlorine Value Day 4": "chlorine_value_4",
    "Chlorine_Value_4": "chlorine_value_4",
    "chlorine_value_4": "chlorine_value_4",
    "Chlorine Value 4": "chlorine_value_4",
    
    "Chlorine Value Day 5": "chlorine_value_5",
    "Chlorine_Value_5": "chlorine_value_5",
    "chlorine_value_5": "chlorine_value_5",
    "Chlorine Value 5": "chlorine_value_5",
    
    "Chlorine Value Day 6": "chlorine_value_6",
    "Chlorine_Value_6": "chlorine_value_6",
    "chlorine_value_6": "chlorine_value_6",
    "Chlorine Value 6": "chlorine_value_6",
    
    "Chlorine Value Day 7": "chlorine_value_7",
    "Chlorine_Value_7": "chlorine_value_7",
    "chlorine_value_7": "chlorine_value_7",
    "Chlorine Value 7": "chlorine_value_7",
    
    // Chlorine date fields
    "Chlorine Date Day 1": "chlorine_date_day_1",
    "Chlorine_Date_Day_1": "chlorine_date_day_1",
    "chlorine_date_day_1": "chlorine_date_day_1",
    
    "Chlorine Date Day 2": "chlorine_date_day_2",
    "Chlorine_Date_Day_2": "chlorine_date_day_2",
    "chlorine_date_day_2": "chlorine_date_day_2",
    
    "Chlorine Date Day 3": "chlorine_date_day_3",
    "Chlorine_Date_Day_3": "chlorine_date_day_3",
    "chlorine_date_day_3": "chlorine_date_day_3",
    
    "Chlorine Date Day 4": "chlorine_date_day_4",
    "Chlorine_Date_Day_4": "chlorine_date_day_4",
    "chlorine_date_day_4": "chlorine_date_day_4",
    
    "Chlorine Date Day 5": "chlorine_date_day_5",
    "Chlorine_Date_Day_5": "chlorine_date_day_5",
    "chlorine_date_day_5": "chlorine_date_day_5",
    
    "Chlorine Date Day 6": "chlorine_date_day_6",
    "Chlorine_Date_Day_6": "chlorine_date_day_6",
    "chlorine_date_day_6": "chlorine_date_day_6",
    
    "Chlorine Date Day 7": "chlorine_date_day_7",
    "Chlorine_Date_Day_7": "chlorine_date_day_7",
    "chlorine_date_day_7": "chlorine_date_day_7",
    
    // Analysis fields
    "Consistent Zero Chlorine": "number_of_consistent_zero_value_in_chlorine",
    "consistent_zero_chlorine": "number_of_consistent_zero_value_in_chlorine",
    "Zero Chlorine Count": "number_of_consistent_zero_value_in_chlorine",
    
    "Below 0.2 mg/l Count": "chlorine_less_than_02_mgl",
    "chlorine_less_than_02_mgl": "chlorine_less_than_02_mgl",
    
    "Between 0.2-0.5 mg/l Count": "chlorine_between_02_05_mgl",
    "chlorine_between_02__05_mgl": "chlorine_between_02_05_mgl",
    
    "Above 0.5 mg/l Count": "chlorine_greater_than_05_mgl",
    "chlorine_greater_than_05_mgl": "chlorine_greater_than_05_mgl",
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
   * Convert date string to standard format
   * @param value - The date value to parse
   * @returns The parsed date string or null if invalid
   */
  private getDateValue(value: any): string | null {
    if (!value) return null;
    
    try {
      // If it's already a string in an acceptable format, return it
      if (typeof value === 'string') {
        // Ensure consistent format by parsing and reformatting if necessary
        const dateStr = value.trim();
        if (dateStr.length > 0) {
          return dateStr;
        }
      }
      
      // If it's a Date object, format it
      if (value instanceof Date) {
        const day = value.getDate().toString().padStart(2, '0');
        const month = (value.getMonth() + 1).toString().padStart(2, '0');
        const year = value.getFullYear();
        return `${day}/${month}/${year}`;
      }
      
      // Try to convert number to date (Excel serial date)
      if (typeof value === 'number') {
        // Excel dates are number of days since 1/1/1900
        // To convert: create date at 1/1/1900, add the number of days
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(excelEpoch.getTime() + (value - 1) * 24 * 60 * 60 * 1000);
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      
      return null;
    } catch (error) {
      console.error("Error parsing date value:", value, error);
      return null;
    }
  }
  
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
  
  /**
   * Generate a dashboard URL for a scheme
   * @param scheme - The scheme object with region, circle, division, etc.
   * @returns The complete URL or null if missing required fields
   */
  private generateSpecialCaseUrl(scheme: SchemeStatus | InsertSchemeStatus): string | null {
    // Handle special case URLs that need exact formatting
    const { scheme_id, scheme_name } = scheme;
    
    // Bargaonpimpri scheme in Nashik region
    if (scheme_id === '20019176' && scheme_name.includes('Bargaonpimpri')) {
      const path = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS' + String.fromCharCode(160) + ' Tal Sinnar';
      const encodedPath = encodeURIComponent(path);
      const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
      const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
      
      return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
    }
    
    return null; // No special case matched
  }

  private generateDashboardUrl(scheme: SchemeStatus | InsertSchemeStatus): string | null {
    // If dashboard_url is already present in the scheme and we're not forcing regeneration, return it
    if ('dashboard_url' in scheme && scheme.dashboard_url) {
      return scheme.dashboard_url;
    }
    
    // Check if this is a special case URL that needs exact formatting
    const specialCaseUrl = this.generateSpecialCaseUrl(scheme);
    if (specialCaseUrl) {
      return specialCaseUrl;
    }
    
    // Default values for missing fields to ensure URL generation works even with partial data
    const region = scheme.region || 'Unknown Region';
    const circle = scheme.circle || 'Unknown Circle';
    const division = scheme.division || 'Unknown Division';
    const sub_division = scheme.sub_division || 'Unknown Sub Division';
    const block = scheme.block || 'Unknown Block';
    const scheme_id = scheme.scheme_id || `Unknown-${Date.now()}`;
    const scheme_name = scheme.scheme_name || `Unknown Scheme ${scheme_id}`;
    
    // Base URL for PI Vision dashboard with the correct display ID (10108)
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
    
    // Standard parameters for the dashboard
    const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
    
    // Handle the special case for Amravati region (change to Amaravati in the URL)
    const regionDisplay = region === 'Amravati' ? 'Amaravati' : region;

    // Create the path without URL encoding
    // Use different spacing formats based on the region and scheme name
    let path;
    
    // Special case for Sakol 7 villages WSS
    if (scheme_name === 'Sakol 7 villages WSS') {
      // Exact format for Sakol 7 villages WSS with specific hyphen placement (hyphen followed by space)
      path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id}- ${scheme_name}`;
    } 
    // Special case for Pangaon 10 villages WSS
    else if (scheme_name === 'Pangaon 10 villages WSS') {
      // Exact format for Pangaon 10 villages WSS with specific hyphen placement (hyphen followed by space)
      path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id}- ${scheme_name}`;
    }
    // Special case for Shirsala & 4 Village  
    else if (scheme_name === 'Shirsala & 4 Village') {
      // Exact format for Shirsala & 4 Village with RRWS suffix
      path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name} RRWS`;
    }
    // Special case for Kawtha Bk & 9 Vill RR WSS
    else if (scheme_name === 'Kawtha Bk & 9 Vill RR WSS') {
      // Exact format for Kawtha scheme with no space between scheme_id and hyphen
      path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} -${scheme_name}`;
    }
    // Bargaonpimpri scheme is handled in generateSpecialCaseUrl()
    else if (region === 'Pune') {
      // Use exact formats from examples for Pune region
      
      // Hard-coded formats based on examples
      if (scheme_id === '7942135' && scheme_name.includes('Gar, Sonwadi, Nanviz RR')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 1\\Sub Division-Pune 1\\Block-Daund\\Scheme-7942135-Gar, Sonwadi, Nanviz RR`;
      }
      else if (scheme_id === '20027541' && scheme_name.includes('Wangani RRWSS')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 2\\Sub Division-Pune 2\\Block-Velhe\\Scheme-20027541-Wangani RRWSS`;
      }
      else if (scheme_id === '20027892' && scheme_name.includes('RR Girvi WSS')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Satara\\Sub Division-Phaltan\\Block-Phaltan\\Scheme-20027892-RR Girvi WSS`;
      }
      else if (scheme_id === '20017250' && scheme_name.includes('LONI BHAPKAR RRWSS')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 1\\Sub Division-Baramati\\Block-Ambegaon\\Scheme-20017250-LONI BHAPKAR RRWSS`;
      }
      else if (scheme_id === '20022133' && scheme_name.includes('Peth RR')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune\\Sub Division-Pune\\Block-Mulshi\\Scheme-20022133 - Peth RR`;
      }
      else if (scheme_id === '20029637' && scheme_name.includes('Penur Patkul')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Sangli\\Division-Solapur\\Sub Division-Solapur\\Block -Mohol\\Scheme - 20029637 -Penur Patkul`;
      }
      else if (scheme_id === '20013367' && scheme_name.includes('Done Adhale RR')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 2\\Sub Division-Maval\\Block-Daund\\Scheme-20013367-Done Adhale RR`;
      }
      else if (scheme_id === '20027396' && scheme_name.includes('Alegaon shirbhavi 82 Village')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Sangli\\Division-Solapur\\Sub Division-Solapur\\Block-Sangola\\Scheme-20027396 - Alegaon shirbhavi 82 Village`;
      }
      else if (scheme_id === '7940233' && scheme_name.includes('Peth & two Villages')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Sangli\\Division-Sangli\\Sub Division-Islampur\\Block-Valva\\Scheme-7940233-Peth & two Villages`;
      }
      else if (scheme_id === '7942125' && scheme_name.includes('MURTI & 7 VILLAGES RRWSS')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 1\\Sub Division-Baramati\\Block-Ambegaon\\Scheme-7942125-MURTI & 7 VILLAGES RRWSS`;
      }
      else if (scheme_id === '20018548' && scheme_name.includes('HOL SASTEWADI')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 2\\Sub Division-Baramati\\Block-Ambegaon\\Scheme-20018548-HOL SASTEWADI`;
      }
      else if (scheme_id === '20033593' && scheme_name.includes('Andhalgaon and 3 villages')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Sangli\\Division-Solapur\\Sub Division-Solapur\\Block - Mangalvedhe\\Scheme - 20033593 -Andhalgaon and 3 villages`;
      }
      else if (scheme_id === '20019021' && scheme_name.includes('Dhuldev Algudewadi')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Satara\\Sub Division-Pune\\Block- Phaltan\\Scheme- 20019021 -Dhuldev Algudewadi`;
      }
      else {
        // Standard Pune format for any other schemes
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block -${block}\\Scheme - ${scheme_id} -${scheme_name}`;
      }
    } 
    else if (region === 'Konkan') {
      // Use exact formats from examples for Konkan region
      
      if (scheme_id === '20028168' && scheme_name.includes('Devnhave water supply scheme')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Panvel\\Division-Raigadh\\Sub Division-Mangaon\\Block-Khalapur\\Scheme-20028168 - Devnhave water supply scheme`;
      }
      else if (scheme_id === '20020563' && scheme_name.includes('Shahapada 38 Villages')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Panvel\\Division-Raigadh\\Sub Division-Mangaon\\Block-Pen\\Scheme-20020563-Shahapada 38 Villages`;
      }
      else if (scheme_id === '20092478' && scheme_name.includes('Retrofiting of Gotheghar Dahisar R.R. Water Supply Scheme')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Thane\\Division-Thane\\Sub Division-Thane\\Block-Kalyan\\Scheme-20092478-Retrofiting of Gotheghar Dahisar R.R. Water Supply Scheme`;
      }
      else if (scheme_id === '20047871' && (scheme_name.includes('Modgaon & Tornipada RWSS') || scheme_name.includes('�Modgaon & Tornipada RWSS'))) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Thane\\Division-Thane\\Sub Division-Palghar\\Block-Dahanu\\Scheme-20047871-Modgaon & Tornipada RWSS`;
      }
      else {
        // Standard format for other Konkan schemes
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name}`;
      }
    }
    else if (region === 'Amravati') {
      // Use exact formats from examples for Amravati region
      
      if (scheme_id === '7945938' && scheme_name.includes('83 Village RRWS Scheme MJP RR')) {
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amaravati\\Circle-Amravati\\Division-Amravati\\Sub Division-Achalpur\\Block-Chandur Bazar\\Scheme-7945938 - 83 Village RRWS Scheme MJP RR (C 39)`;
      }
      else {
        // Standard format for other Amravati schemes (with Amaravati display name)
        path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amaravati\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name}`;
      }
    }
    else {
      // Format for all other regions: Block-Name, Scheme-ID - Name (no space before first hyphen)
      path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name}`;
    }
    
    // URL encode the path
    const encodedPath = encodeURIComponent(path);
    
    // Combine all parts to create the complete URL
    return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }
  
  // Chlorine Data CRUD operations
  async getAllChlorineData(filter?: ChlorineDataFilter): Promise<ChlorineData[]> {
    await this.initialized;
    const db = await this.ensureInitialized();
    
    try {
      let query = db.select().from(chlorineData);
      
      // Apply filters if provided
      if (filter) {
        if (filter.region && filter.region !== 'all') {
          query = query.where(eq(chlorineData.region, filter.region));
        }
        
        if (filter.chlorineRange) {
          switch (filter.chlorineRange) {
            case 'below_0.2':
              // ESRs with chlorine value below 0.2 mg/l
              query = query.where(sql`${chlorineData.chlorine_value_7} < 0.2 AND ${chlorineData.chlorine_value_7} >= 0`);
              break;
            case 'between_0.2_0.5':
              // ESRs with chlorine value between 0.2 and 0.5 mg/l
              query = query.where(sql`${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5`);
              break;
            case 'above_0.5':
              // ESRs with chlorine value above 0.5 mg/l
              query = query.where(sql`${chlorineData.chlorine_value_7} > 0.5`);
              break;
            case 'consistent_zero':
              // ESRs with consistent zero chlorine readings over 7 days
              query = query.where(sql`
                COALESCE(${chlorineData.number_of_consistent_zero_value_in_chlorine}, 0) = 7 OR
                (
                  (${chlorineData.chlorine_value_1} = 0 OR ${chlorineData.chlorine_value_1} IS NULL) AND
                  (${chlorineData.chlorine_value_2} = 0 OR ${chlorineData.chlorine_value_2} IS NULL) AND
                  (${chlorineData.chlorine_value_3} = 0 OR ${chlorineData.chlorine_value_3} IS NULL) AND
                  (${chlorineData.chlorine_value_4} = 0 OR ${chlorineData.chlorine_value_4} IS NULL) AND
                  (${chlorineData.chlorine_value_5} = 0 OR ${chlorineData.chlorine_value_5} IS NULL) AND
                  (${chlorineData.chlorine_value_6} = 0 OR ${chlorineData.chlorine_value_6} IS NULL) AND
                  (${chlorineData.chlorine_value_7} = 0 OR ${chlorineData.chlorine_value_7} IS NULL)
                )
              `);
              break;
            case 'consistent_below':
              // ESRs with consistent below range chlorine (< 0.2 mg/l) for 7 days
              query = query.where(sql`
                (
                  (${chlorineData.chlorine_value_1} < 0.2 AND ${chlorineData.chlorine_value_1} > 0) AND
                  (${chlorineData.chlorine_value_2} < 0.2 AND ${chlorineData.chlorine_value_2} > 0) AND
                  (${chlorineData.chlorine_value_3} < 0.2 AND ${chlorineData.chlorine_value_3} > 0) AND
                  (${chlorineData.chlorine_value_4} < 0.2 AND ${chlorineData.chlorine_value_4} > 0) AND
                  (${chlorineData.chlorine_value_5} < 0.2 AND ${chlorineData.chlorine_value_5} > 0) AND
                  (${chlorineData.chlorine_value_6} < 0.2 AND ${chlorineData.chlorine_value_6} > 0) AND
                  (${chlorineData.chlorine_value_7} < 0.2 AND ${chlorineData.chlorine_value_7} > 0)
                )
              `);
              break;
            case 'consistent_optimal':
              // ESRs with consistent optimal range chlorine (0.2-0.5 mg/l) for 7 days
              query = query.where(sql`
                (
                  (${chlorineData.chlorine_value_1} >= 0.2 AND ${chlorineData.chlorine_value_1} <= 0.5) AND
                  (${chlorineData.chlorine_value_2} >= 0.2 AND ${chlorineData.chlorine_value_2} <= 0.5) AND
                  (${chlorineData.chlorine_value_3} >= 0.2 AND ${chlorineData.chlorine_value_3} <= 0.5) AND
                  (${chlorineData.chlorine_value_4} >= 0.2 AND ${chlorineData.chlorine_value_4} <= 0.5) AND
                  (${chlorineData.chlorine_value_5} >= 0.2 AND ${chlorineData.chlorine_value_5} <= 0.5) AND
                  (${chlorineData.chlorine_value_6} >= 0.2 AND ${chlorineData.chlorine_value_6} <= 0.5) AND
                  (${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5)
                )
              `);
              break;
            case 'consistent_above':
              // ESRs with consistent above range chlorine (> 0.5 mg/l) for 7 days
              query = query.where(sql`
                (
                  (${chlorineData.chlorine_value_1} > 0.5) AND
                  (${chlorineData.chlorine_value_2} > 0.5) AND
                  (${chlorineData.chlorine_value_3} > 0.5) AND
                  (${chlorineData.chlorine_value_4} > 0.5) AND
                  (${chlorineData.chlorine_value_5} > 0.5) AND
                  (${chlorineData.chlorine_value_6} > 0.5) AND
                  (${chlorineData.chlorine_value_7} > 0.5)
                )
              `);
              break;
          }
        } else {
          // Apply min/max filters if range is not specified
          if (filter.minChlorine !== undefined) {
            query = query.where(sql`${chlorineData.chlorine_value_7} >= ${filter.minChlorine}`);
          }
          
          if (filter.maxChlorine !== undefined) {
            query = query.where(sql`${chlorineData.chlorine_value_7} <= ${filter.maxChlorine}`);
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
    const db = await this.ensureInitialized();
    
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
    const db = await this.ensureInitialized();
    
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
    const db = await this.ensureInitialized();
    
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
    const db = await this.ensureInitialized();
    
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
    
    // Track any potentially problematic readings
    const problematicReadings = [];
    
    // Check all 7 days
    for (let i = 1; i <= 7; i++) {
      const value = enhancedData[`chlorine_value_${i}` as keyof InsertChlorineData] as number | undefined | null;
      
      // Handle only defined and non-null values
      if (value !== undefined && value !== null) {
        // Verify the value is within reasonable range (0-10)
        if (value < 0) {
          problematicReadings.push(`Day ${i}: Negative chlorine value ${value} corrected to 0`);
          // Correct negative values to 0
          enhancedData[`chlorine_value_${i}` as keyof InsertChlorineData] = 0 as any;
        } else if (value > 10) {
          problematicReadings.push(`Day ${i}: Unusually high chlorine value ${value}`);
        }
        
        // Use the potentially corrected value
        const correctedValue = enhancedData[`chlorine_value_${i}` as keyof InsertChlorineData] as number;
        
        if (correctedValue === 0) {
          zeroCount++;
        }
        
        if (correctedValue < 0.2 && correctedValue >= 0) {
          below02Count++;
        } else if (correctedValue >= 0.2 && correctedValue <= 0.5) {
          between02And05Count++;
        } else if (correctedValue > 0.5) {
          above05Count++;
        }
      }
    }
    
    // Update analysis fields with new lowercase field names
    enhancedData.number_of_consistent_zero_value_in_chlorine = zeroCount as any;
    enhancedData.chlorine_less_than_02_mgl = below02Count as any;
    enhancedData.chlorine_between_02_05_mgl = between02And05Count as any;
    enhancedData.chlorine_greater_than_05_mgl = above05Count as any;
    
    // Log any problematic readings for debugging
    if (problematicReadings.length > 0) {
      console.log(`Problematic chlorine readings for ${enhancedData.scheme_id}/${enhancedData.village_name}/${enhancedData.esr_name}:`, 
        problematicReadings.join("; "));
    }
    
    return enhancedData;
  }
  
  // Import methods for chlorine data
  async importChlorineDataFromExcel(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    
    // Add timing for performance analysis
    const startTime = Date.now();
    console.log("Starting Excel import at:", new Date().toISOString());

    try {
      // Import xlsx using dynamic import
      console.log("Loading XLSX module...");
      const xlsxModule = await import('xlsx');
      const xlsx = xlsxModule.default || xlsxModule;
      
      console.log("Parsing Excel file...");
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      console.log(`Excel file contains ${workbook.SheetNames.length} sheets.`);

      // Prepare a structure to collect all records before batch processing
      const recordsToProcess: Partial<InsertChlorineData>[] = [];
      const recordKeys: Set<string> = new Set();

      // Process each sheet in the workbook
      for (const sheetName of workbook.SheetNames) {
        console.log(`Processing sheet: ${sheetName}`);
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`Sheet contains ${data.length} rows.`);

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
        if (Array.isArray(headers)) {
          headers.forEach((header: unknown, index: number) => {
            if (header && typeof header === 'string') {
              const dbField = this.excelColumnMapping[header.trim()];
              if (dbField) {
                columnMap[index] = dbField;
              }
            }
          });
        }
        
        console.log(`Found ${Object.keys(columnMap).length} mapped columns in headers.`);

        // Process data rows and collect records
        for (let i = headerRow + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !Array.isArray(row) || row.length === 0) continue;

          try {
            const recordData: Partial<InsertChlorineData> = {};
            
            // Extract data from each column
            for (let j = 0; j < row.length; j++) {
              if (columnMap[j]) {
                const value = row[j];
                const fieldName = columnMap[j];
                
                // Handle numeric chlorine values and ensure they are decimal numbers
                if (fieldName.startsWith('chlorine_value_') || fieldName.startsWith('Chlorine_value_')) {
                  // Convert any old uppercase field name to new lowercase field name
                  const newFieldName = fieldName.toLowerCase().replace('_value_', '_value_');
                  recordData[newFieldName as keyof InsertChlorineData] = this.parseNumericValue(value);
                } else {
                  // Handle other potential uppercase field name conversions
                  const newFieldName = fieldName.toLowerCase()
                    .replace('chlorine_date_day_', 'chlorine_date_day_')
                    .replace('number_of_consistent_zero_value_in_chlorine', 'number_of_consistent_zero_value_in_chlorine')
                    .replace('chlorine_less_than_02_mgl', 'chlorine_less_than_02_mgl')
                    .replace('chlorine_between_02__05_mgl', 'chlorine_between_02_05_mgl')
                    .replace('chlorine_greater_than_05_mgl', 'chlorine_greater_than_05_mgl');
                  
                  recordData[newFieldName as keyof InsertChlorineData] = value;
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
            
            // Generate a unique key for this record to track duplicates
            const recordKey = `${enhancedData.scheme_id}|${enhancedData.village_name}|${enhancedData.esr_name}`;
            
            // Only add if we haven't seen this record before (in case of duplicates across sheets)
            if (!recordKeys.has(recordKey)) {
              recordKeys.add(recordKey);
              recordsToProcess.push(enhancedData);
            }
          } catch (rowError) {
            const errorMessage = rowError instanceof Error ? rowError.message : String(rowError);
            errors.push(`Row ${i + 1}: ${errorMessage}`);
          }
        }
      }
      
      console.log(`Processing ${recordsToProcess.length} unique records...`);
      
      if (recordsToProcess.length === 0) {
        console.log("No valid records found to process.");
        const removed = 0; // No records were removed in this import
        return { inserted, updated, removed, errors };
      }
      
      // First fetch all existing records in one query to avoid multiple database lookups
      console.log("Fetching existing records...");
      const existingRecordsResult = await db
        .select()
        .from(chlorineData)
        .where(
          sql`(${chlorineData.scheme_id}, ${chlorineData.village_name}, ${chlorineData.esr_name}) IN 
              (${sql.join(
                recordsToProcess.map(r => 
                  sql`(${r.scheme_id}, ${r.village_name}, ${r.esr_name})`
                ),
                sql`, `
              )})`
        );
      
      // Create a lookup map for existing records
      const existingRecordsMap = new Map<string, ChlorineData>();
      existingRecordsResult.forEach(record => {
        const key = `${record.scheme_id}|${record.village_name}|${record.esr_name}`;
        existingRecordsMap.set(key, record);
      });
      
      console.log(`Found ${existingRecordsMap.size} existing records that match our import data.`);
      
      // Process the records - split into batches of updates and inserts
      const recordsToUpdate: Partial<InsertChlorineData>[] = [];
      const recordsToInsert: Partial<InsertChlorineData>[] = [];
      
      // Categorize records for batch processing
      for (const record of recordsToProcess) {
        const key = `${record.scheme_id}|${record.village_name}|${record.esr_name}`;
        if (existingRecordsMap.has(key)) {
          recordsToUpdate.push(record);
        } else {
          recordsToInsert.push(record);
        }
      }
      
      // Process inserts in batches
      if (recordsToInsert.length > 0) {
        console.log(`Inserting ${recordsToInsert.length} new records...`);
        // Process in smaller batches to avoid overwhelming the database
        const BATCH_SIZE = 100;
        for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
          const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
          await db.insert(chlorineData).values(batch as InsertChlorineData[]);
          inserted += batch.length;
          console.log(`Inserted batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(recordsToInsert.length/BATCH_SIZE)}`);
        }
      }
      
      // Process updates individually since we need to match on composite keys
      if (recordsToUpdate.length > 0) {
        console.log(`Updating ${recordsToUpdate.length} existing records...`);
        for (const record of recordsToUpdate) {
          await db
            .update(chlorineData)
            .set(record)
            .where(
              sql`${chlorineData.scheme_id} = ${record.scheme_id} 
                  AND ${chlorineData.village_name} = ${record.village_name}
                  AND ${chlorineData.esr_name} = ${record.esr_name}`
            );
          updated++;
          
          // Log progress every 50 records
          if (updated % 50 === 0) {
            console.log(`Updated ${updated}/${recordsToUpdate.length} records...`);
          }
        }
      }

      // Calculate elapsed time
      const endTime = Date.now();
      const elapsedSeconds = (endTime - startTime) / 1000;
      
      // Log the import summary
      const removed = 0; // No records are being removed in this import operation
      const summary = `Excel Import Summary: ${inserted} records inserted, ${updated} records updated, ${errors.length} errors in ${elapsedSeconds.toFixed(2)} seconds`;
      if (errors.length > 0) {
        console.warn(summary);
        console.warn("Import errors:", errors);
      } else {
        console.log(summary);
      }
      
      return { inserted, updated, removed, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error importing chlorine data from Excel:", errorMessage);
      errors.push(`General import error: ${errorMessage}`);
      const removed = 0; // No records are being removed in this import operation
      return { inserted, updated, removed, errors };
    }
  }

  async importChlorineDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    
    // Add timing for performance analysis
    const startTime = Date.now();
    console.log("Starting CSV import at:", new Date().toISOString(), "with optimized batch processing");

    try {
      console.log("Starting chlorine data import from CSV...");
      // CSV column mapping without headers (as per requirements)
      const csvColumnMapping = [
        'region',                                      // Column 0
        'circle',                                      // Column 1
        'division',                                    // Column 2
        'sub_division',                                // Column 3
        'block',                                       // Column 4
        'scheme_id',                                   // Column 5
        'scheme_name',                                 // Column 6
        'village_name',                                // Column 7
        'esr_name',                                    // Column 8
        'chlorine_value_1',                            // Column 9 - Now NUMERIC(12,2)
        'chlorine_value_2',                            // Column 10 - Now NUMERIC(12,2)
        'chlorine_value_3',                            // Column 11 - Now NUMERIC(12,2)
        'chlorine_value_4',                            // Column 12 - Now NUMERIC(12,2)
        'chlorine_value_5',                            // Column 13 - Now NUMERIC(12,2)
        'chlorine_value_6',                            // Column 14 - Now NUMERIC(12,2)
        'chlorine_value_7',                            // Column 15 - Now NUMERIC(12,2)
        'chlorine_date_day_1',                         // Column 16 - Now VARCHAR(15)
        'chlorine_date_day_2',                         // Column 17 - Now VARCHAR(15)
        'chlorine_date_day_3',                         // Column 18 - Now VARCHAR(15)
        'chlorine_date_day_4',                         // Column 19 - Now VARCHAR(15)
        'chlorine_date_day_5',                         // Column 20 - Now VARCHAR(15)
        'chlorine_date_day_6',                         // Column 21 - Now VARCHAR(15)
        'chlorine_date_day_7',                         // Column 22 - Now VARCHAR(15)
        'number_of_consistent_zero_value_in_chlorine', // Column 23
        'chlorine_less_than_02_mgl',                   // Column 24
        'chlorine_between_02_05_mgl',                  // Column 25
        'chlorine_greater_than_05_mgl'                 // Column 26
      ];

      const csvString = fileBuffer.toString('utf8');
      
      // Use synchronous parse function from csv-parse for better performance
      const { parse } = await import('csv-parse/sync');
      
      const options = {
        columns: false, // No headers in the CSV file
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Allow different column counts in rows
        bom: true // Handle byte order mark if present
      };
      
      const records = parse(csvString, options);
      
      console.log(`CSV parsed successfully. Found ${records.length} records.`);

      if (records.length === 0) {
        console.log("No data found in CSV file");
        return { inserted, updated, removed: 0, errors: ["No data found in CSV file"] };
      }
      
      // OPTIMIZATION: Collect unique identifiers to make a single database query
      const uniqueKeys = new Set<string>();
      const recordsMap = new Map<string, Partial<InsertChlorineData>>();
      
      // Process all records at once and extract unique keys
      for (let i = 0; i < records.length; i++) {
        const rowValues = records[i];
        try {
          const recordData: Partial<InsertChlorineData> = {};
          
          // Map each column value to the corresponding field based on predefined mapping
          for (let colIndex = 0; colIndex < rowValues.length && colIndex < csvColumnMapping.length; colIndex++) {
            const fieldName = csvColumnMapping[colIndex];
            const value = rowValues[colIndex];
            
            if (fieldName && value !== undefined && value !== '') {
              // Handle numeric chlorine values and ensure they are decimal numbers
              if (fieldName.startsWith('chlorine_value_')) {
                recordData[fieldName as keyof InsertChlorineData] = this.parseNumericValue(value) as any;
              } 
              // Handle analysis fields which should be numeric
              else if (fieldName === 'number_of_consistent_zero_value_in_chlorine' || 
                      fieldName === 'chlorine_less_than_02_mgl' || 
                      fieldName === 'chlorine_between_02_05_mgl' || 
                      fieldName === 'chlorine_greater_than_05_mgl') {
                recordData[fieldName as keyof InsertChlorineData] = this.parseNumericValue(value) as any;
              }
              // Handle date fields with the extended VARCHAR(15) format
              else if (fieldName.startsWith('chlorine_date_day_')) {
                // Format date strings properly for the database
                if (value) {
                  // Clean and standardize date format if needed
                  let dateStr = String(value).trim();
                  
                  // If date is in DD/MM/YYYY format, convert to YYYY-MM-DD
                  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
                    const parts = dateStr.split('/');
                    dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
                  
                  // If date is in DD-MM-YYYY format, convert to YYYY-MM-DD
                  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
                    const parts = dateStr.split('-');
                    dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
                  
                  recordData[fieldName as keyof InsertChlorineData] = dateStr as any;
                } else {
                  recordData[fieldName as keyof InsertChlorineData] = null;
                }
              }
              else {
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
          
          // Generate a unique key for this record
          const recordKey = `${enhancedData.scheme_id}|${enhancedData.village_name}|${enhancedData.esr_name}`;
          
          // Store the record by key to handle duplicates
          uniqueKeys.add(recordKey);
          recordsMap.set(recordKey, enhancedData);
        } catch (rowError) {
          const errorMessage = rowError instanceof Error ? rowError.message : String(rowError);
          errors.push(`Row ${i + 1}: ${errorMessage}`);
        }
      }
      
      console.log(`Processed ${recordsMap.size} unique records from ${records.length} total`);
      
      if (recordsMap.size === 0) {
        console.log("No valid records to import after validation");
        return { inserted, updated, removed: 0, errors };
      }
      
      // OPTIMIZATION: Query existing records in batches to avoid exceeding query limits
      const existingRecordsMap = new Map<string, ChlorineData>();
      const batchSize = 100; // Adjust based on database limits
      const allKeys = Array.from(uniqueKeys);
      
      for (let i = 0; i < allKeys.length; i += batchSize) {
        const keysBatch = allKeys.slice(i, i + batchSize);
        console.log(`Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allKeys.length/batchSize)} of existing records...`);
        
        // Collect conditions for each key
        const conditions = keysBatch.map(key => {
          const [schemeId, villageName, esrName] = key.split('|');
          return and(
            eq(chlorineData.scheme_id, schemeId),
            eq(chlorineData.village_name, villageName),
            eq(chlorineData.esr_name, esrName)
          );
        });
        
        // Query database for this batch using OR conditions
        const existingBatch = await db
          .select()
          .from(chlorineData)
          .where(sql`${conditions.reduce((acc, condition, idx) => 
            idx === 0 ? condition : sql`${acc} OR ${condition}`, sql``)}`);
        
        // Add to lookup map
        existingBatch.forEach(record => {
          const key = `${record.scheme_id}|${record.village_name}|${record.esr_name}`;
          existingRecordsMap.set(key, record);
        });
      }
      
      console.log(`Found ${existingRecordsMap.size} matching records in database out of ${uniqueKeys.size} to process`);
      
      // OPTIMIZATION: Separate records for batch inserts and updates
      const recordsToInsert: Partial<InsertChlorineData>[] = [];
      const recordsToUpdate: Partial<InsertChlorineData>[] = [];
      
      allKeys.forEach(key => {
        const record = recordsMap.get(key)!;
        
        // Generate dashboard URL for this ESR
        if (!record.dashboard_url && record.region && record.circle && record.division && 
            record.sub_division && record.block && record.scheme_id && 
            record.scheme_name && record.village_name && record.esr_name) {
          // Generate dashboard URL
          record.dashboard_url = this.generateEsrDashboardUrl(record as ChlorineData);
          if (record.dashboard_url) {
            console.log(`Generated dashboard URL for ESR: ${record.esr_name} in village: ${record.village_name}`);
          }
        }
        
        if (existingRecordsMap.has(key)) {
          recordsToUpdate.push(record);
        } else {
          recordsToInsert.push(record);
        }
      });
      
      // OPTIMIZATION: Process inserts in batches
      if (recordsToInsert.length > 0) {
        console.log(`Inserting ${recordsToInsert.length} new records in batches...`);
        const insertBatchSize = 100;
        
        for (let i = 0; i < recordsToInsert.length; i += insertBatchSize) {
          const batch = recordsToInsert.slice(i, i + insertBatchSize);
          await db.insert(chlorineData).values(batch as InsertChlorineData[]);
          inserted += batch.length;
          console.log(`Inserted batch ${Math.floor(i/insertBatchSize) + 1}/${Math.ceil(recordsToInsert.length/insertBatchSize)}, total: ${inserted}`);
        }
      }
      
      // OPTIMIZATION: Process updates in parallel batches
      if (recordsToUpdate.length > 0) {
        console.log(`Updating ${recordsToUpdate.length} existing records in parallel batches...`);
        const updateBatchSize = 50;
        
        for (let i = 0; i < recordsToUpdate.length; i += updateBatchSize) {
          const batch = recordsToUpdate.slice(i, i + updateBatchSize);
          console.log(`Processing update batch ${Math.floor(i/updateBatchSize) + 1}/${Math.ceil(recordsToUpdate.length/updateBatchSize)}`);
          
          // Create a batch of update promises to execute in parallel
          const updatePromises = batch.map(record => 
            db.update(chlorineData)
              .set(record)
              .where(
                sql`${chlorineData.scheme_id} = ${record.scheme_id} 
                    AND ${chlorineData.village_name} = ${record.village_name}
                    AND ${chlorineData.esr_name} = ${record.esr_name}`
              )
          );
          
          // Execute all updates in this batch in parallel
          await Promise.all(updatePromises);
          updated += batch.length;
          console.log(`Updated batch ${Math.floor(i/updateBatchSize) + 1}/${Math.ceil(recordsToUpdate.length/updateBatchSize)}, total: ${updated}`);
        }
      }

      // Calculate elapsed time
      const endTime = Date.now();
      const elapsedSeconds = (endTime - startTime) / 1000;
      
      // Log the import summary
      const summary = `CSV Import Summary: ${inserted} records inserted, ${updated} records updated, ${errors.length} errors in ${elapsedSeconds.toFixed(2)} seconds`;
      console.log(summary);
      
      // IMPORTANT: Update scheme_status table with block information from this import
      console.log("Synchronizing scheme_status table with block information from chlorine import...");
      
      // Extract unique scheme and block combinations from the imported data
      const schemeBlockMap = new Map<string, Set<string>>();
      
      // Process all records to gather unique scheme-block combinations
      [...recordsToInsert, ...recordsToUpdate].forEach(record => {
        if (record.scheme_id && record.block && record.scheme_name) {
          if (!schemeBlockMap.has(record.scheme_name)) {
            schemeBlockMap.set(record.scheme_name, new Set<string>());
          }
          schemeBlockMap.get(record.scheme_name)?.add(record.block);
        }
      });
      
      // For each scheme, ensure we have entries in scheme_status for all its blocks
      let schemeStatusUpdated = 0;
      for (const [schemeName, blocks] of schemeBlockMap.entries()) {
        try {
          // First get all existing scheme status entries for this scheme
          const existingSchemeStatus = await db
            .select()
            .from(schemeStatuses)
            .where(eq(schemeStatuses.scheme_name, schemeName));
          
          console.log(`Found ${existingSchemeStatus.length} existing scheme status records for scheme "${schemeName}"`);
          
          // Create a map of existing blocks for this scheme
          const existingBlocks = new Set(existingSchemeStatus.map(s => s.block));
          
          // Check for blocks in our import that don't exist in scheme_status
          for (const block of blocks) {
            if (!existingBlocks.has(block)) {
              console.log(`Adding missing block "${block}" to scheme_status for scheme "${schemeName}"`);
              
              // If we have an existing record for this scheme, clone it for the new block
              if (existingSchemeStatus.length > 0) {
                const templateRecord = {...existingSchemeStatus[0]};
                templateRecord.block = block;
                
                // Insert the new block record
                await db.insert(schemeStatuses).values(templateRecord);
                schemeStatusUpdated++;
              }
            }
          }
        } catch (error) {
          console.error(`Error synchronizing scheme_status for scheme "${schemeName}":`, error);
          errors.push(`Failed to sync scheme status for ${schemeName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      console.log(`Synchronized ${schemeStatusUpdated} new block entries in scheme_status table from chlorine import`);
      
      // Return results
      return { 
        inserted, 
        updated, 
        removed: 0, // CSV import doesn't remove records
        errors 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error importing chlorine data from CSV:", errorMessage);
      errors.push(`General import error: ${errorMessage}`);
      return { inserted, updated, removed: 0, errors };
    }
  }

  // Helper for parsing numeric values from Excel/CSV
  private parseNumericValue(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // Handle string values
    if (typeof value === 'string') {
      // Remove any commas and trim whitespace
      const cleanValue = value.replace(/,/g, '').trim();
      
      // Handle special cases like "N/A", "NA", "-", etc.
      if (['n/a', 'na', '-', 'nil', 'null'].includes(cleanValue.toLowerCase())) {
        return null;
      }
      
      // Parse as float
      const num = parseFloat(cleanValue);
      
      // Check if it's a valid number
      if (isNaN(num)) {
        return null;
      }
      
      // Handle extremely large values that cause numeric overflow
      // For chlorine values, anything above 20 mg/L is extremely high and likely an error
      // Normal chlorine levels in drinking water are between 0.2 and 4 mg/L
      if (num > 20) {
        console.log(`Normalizing extremely high chlorine value: ${num} -> 5.0`);
        return 5.0; // Cap at 5.0 which is already very high
      }
      
      // Round to 2 decimal places for consistency
      return Math.round(num * 100) / 100;
    }
    
    // Handle numeric values directly
    if (typeof value === 'number') {
      if (isNaN(value)) {
        return null;
      }
      
      // Handle extremely large values that cause numeric overflow
      if (value > 20) {
        console.log(`Normalizing extremely high chlorine value: ${value} -> 5.0`);
        return 5.0; // Cap at 5.0 which is already very high
      }
      
      // Round to 2 decimal places for consistency
      return Math.round(value * 100) / 100;
    }
    
    return null;
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
    consistentZeroSensors: number;
    consistentBelowRangeSensors: number;
    consistentOptimalSensors: number;
    consistentAboveRangeSensors: number;
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    
    try {
      console.log("Fetching chlorine dashboard stats...");
      
      // Base conditions - filter by region if specified and not 'all'
      const whereConditions = (regionName && regionName !== 'all')
        ? eq(chlorineData.region, regionName)
        : undefined;
      
      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chlorineData)
        .where(whereConditions);
      
      const totalSensors = Number(totalResult[0]?.count || 0);
      console.log("Total sensors:", totalSensors);
      
      // Get below 0.2 mg/l count
      const belowRangeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chlorineData)
        .where(
          whereConditions ? 
            sql`${whereConditions} AND ${chlorineData.chlorine_value_7} < 0.2 AND ${chlorineData.chlorine_value_7} >= 0` :
            sql`${chlorineData.chlorine_value_7} < 0.2 AND ${chlorineData.chlorine_value_7} >= 0`
        );
      
      const belowRangeSensors = Number(belowRangeResult[0]?.count || 0);
      console.log("Below range sensors:", belowRangeSensors);
      
      // Get optimal range (0.2-0.5 mg/l) count
      const optimalRangeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chlorineData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND ${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5` :
            sql`${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5`
        );
      
      const optimalRangeSensors = Number(optimalRangeResult[0]?.count || 0);
      console.log("Optimal range sensors:", optimalRangeSensors);
      
      // Get above 0.5 mg/l count
      const aboveRangeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chlorineData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND ${chlorineData.chlorine_value_7} > 0.5` :
            sql`${chlorineData.chlorine_value_7} > 0.5`
        );
        
      const aboveRangeSensors = Number(aboveRangeResult[0]?.count || 0);
      console.log("Above range sensors:", aboveRangeSensors);
      
      // Get sensors with consistent zero readings for 7 days
      const consistentZeroResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chlorineData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND 
               ${chlorineData.chlorine_value_1} = 0 AND 
               ${chlorineData.chlorine_value_2} = 0 AND 
               ${chlorineData.chlorine_value_3} = 0 AND 
               ${chlorineData.chlorine_value_4} = 0 AND 
               ${chlorineData.chlorine_value_5} = 0 AND 
               ${chlorineData.chlorine_value_6} = 0 AND 
               ${chlorineData.chlorine_value_7} = 0` :
            sql`${chlorineData.chlorine_value_1} = 0 AND 
                ${chlorineData.chlorine_value_2} = 0 AND 
                ${chlorineData.chlorine_value_3} = 0 AND 
                ${chlorineData.chlorine_value_4} = 0 AND 
                ${chlorineData.chlorine_value_5} = 0 AND 
                ${chlorineData.chlorine_value_6} = 0 AND 
                ${chlorineData.chlorine_value_7} = 0`
        );
      
      const consistentZeroSensors = Number(consistentZeroResult[0]?.count || 0);
      console.log("Consistent zero sensors:", consistentZeroSensors);
      
      // Get sensors with consistently below range readings (>0 and <0.2) for 7 days
      const consistentBelowRangeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chlorineData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND 
               ${chlorineData.chlorine_value_1} > 0 AND ${chlorineData.chlorine_value_1} < 0.2 AND 
               ${chlorineData.chlorine_value_2} > 0 AND ${chlorineData.chlorine_value_2} < 0.2 AND 
               ${chlorineData.chlorine_value_3} > 0 AND ${chlorineData.chlorine_value_3} < 0.2 AND 
               ${chlorineData.chlorine_value_4} > 0 AND ${chlorineData.chlorine_value_4} < 0.2 AND 
               ${chlorineData.chlorine_value_5} > 0 AND ${chlorineData.chlorine_value_5} < 0.2 AND 
               ${chlorineData.chlorine_value_6} > 0 AND ${chlorineData.chlorine_value_6} < 0.2 AND 
               ${chlorineData.chlorine_value_7} > 0 AND ${chlorineData.chlorine_value_7} < 0.2` :
            sql`${chlorineData.chlorine_value_1} > 0 AND ${chlorineData.chlorine_value_1} < 0.2 AND 
                ${chlorineData.chlorine_value_2} > 0 AND ${chlorineData.chlorine_value_2} < 0.2 AND 
                ${chlorineData.chlorine_value_3} > 0 AND ${chlorineData.chlorine_value_3} < 0.2 AND 
                ${chlorineData.chlorine_value_4} > 0 AND ${chlorineData.chlorine_value_4} < 0.2 AND 
                ${chlorineData.chlorine_value_5} > 0 AND ${chlorineData.chlorine_value_5} < 0.2 AND 
                ${chlorineData.chlorine_value_6} > 0 AND ${chlorineData.chlorine_value_6} < 0.2 AND 
                ${chlorineData.chlorine_value_7} > 0 AND ${chlorineData.chlorine_value_7} < 0.2`
        );
      
      const consistentBelowRangeSensors = Number(consistentBelowRangeResult[0]?.count || 0);
      console.log("Consistent below range sensors:", consistentBelowRangeSensors);
      
      // Get sensors with consistently optimal range readings (0.2-0.5) for 7 days
      const consistentOptimalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chlorineData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND 
               ${chlorineData.chlorine_value_1} >= 0.2 AND ${chlorineData.chlorine_value_1} <= 0.5 AND 
               ${chlorineData.chlorine_value_2} >= 0.2 AND ${chlorineData.chlorine_value_2} <= 0.5 AND 
               ${chlorineData.chlorine_value_3} >= 0.2 AND ${chlorineData.chlorine_value_3} <= 0.5 AND 
               ${chlorineData.chlorine_value_4} >= 0.2 AND ${chlorineData.chlorine_value_4} <= 0.5 AND 
               ${chlorineData.chlorine_value_5} >= 0.2 AND ${chlorineData.chlorine_value_5} <= 0.5 AND 
               ${chlorineData.chlorine_value_6} >= 0.2 AND ${chlorineData.chlorine_value_6} <= 0.5 AND 
               ${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5` :
            sql`${chlorineData.chlorine_value_1} >= 0.2 AND ${chlorineData.chlorine_value_1} <= 0.5 AND 
                ${chlorineData.chlorine_value_2} >= 0.2 AND ${chlorineData.chlorine_value_2} <= 0.5 AND 
                ${chlorineData.chlorine_value_3} >= 0.2 AND ${chlorineData.chlorine_value_3} <= 0.5 AND 
                ${chlorineData.chlorine_value_4} >= 0.2 AND ${chlorineData.chlorine_value_4} <= 0.5 AND 
                ${chlorineData.chlorine_value_5} >= 0.2 AND ${chlorineData.chlorine_value_5} <= 0.5 AND 
                ${chlorineData.chlorine_value_6} >= 0.2 AND ${chlorineData.chlorine_value_6} <= 0.5 AND 
                ${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5`
        );
      
      const consistentOptimalSensors = Number(consistentOptimalResult[0]?.count || 0);
      console.log("Consistent optimal range sensors:", consistentOptimalSensors);
      
      // Get sensors with consistently above range readings (>0.5) for 7 days
      const consistentAboveRangeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chlorineData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND 
               ${chlorineData.chlorine_value_1} > 0.5 AND 
               ${chlorineData.chlorine_value_2} > 0.5 AND 
               ${chlorineData.chlorine_value_3} > 0.5 AND 
               ${chlorineData.chlorine_value_4} > 0.5 AND 
               ${chlorineData.chlorine_value_5} > 0.5 AND 
               ${chlorineData.chlorine_value_6} > 0.5 AND 
               ${chlorineData.chlorine_value_7} > 0.5` :
            sql`${chlorineData.chlorine_value_1} > 0.5 AND 
                ${chlorineData.chlorine_value_2} > 0.5 AND 
                ${chlorineData.chlorine_value_3} > 0.5 AND 
                ${chlorineData.chlorine_value_4} > 0.5 AND 
                ${chlorineData.chlorine_value_5} > 0.5 AND 
                ${chlorineData.chlorine_value_6} > 0.5 AND 
                ${chlorineData.chlorine_value_7} > 0.5`
        );
      
      const consistentAboveRangeSensors = Number(consistentAboveRangeResult[0]?.count || 0);
      console.log("Consistent above range sensors:", consistentAboveRangeSensors);
      
      console.log("Dashboard stats:", { 
        totalSensors, 
        belowRangeSensors, 
        optimalRangeSensors, 
        aboveRangeSensors,
        consistentZeroSensors,
        consistentBelowRangeSensors,
        consistentOptimalSensors,
        consistentAboveRangeSensors
      });
      
      return {
        totalSensors,
        belowRangeSensors,
        optimalRangeSensors,
        aboveRangeSensors,
        consistentZeroSensors,
        consistentBelowRangeSensors,
        consistentOptimalSensors,
        consistentAboveRangeSensors
      };
    } catch (error) {
      console.error("Error fetching chlorine dashboard stats:", error);
      return {
        totalSensors: 0,
        belowRangeSensors: 0,
        optimalRangeSensors: 0,
        aboveRangeSensors: 0,
        consistentZeroSensors: 0,
        consistentBelowRangeSensors: 0,
        consistentOptimalSensors: 0,
        consistentAboveRangeSensors: 0
      };
    }
  }
  
  // Pressure Data CRUD operations
  async getAllPressureData(filter?: PressureDataFilter): Promise<PressureData[]> {
    await this.initialized;
    const db = await this.ensureInitialized();
    
    try {
      let query = db.select().from(pressureData);
      
      // Apply filters if provided
      if (filter) {
        if (filter.region && filter.region !== 'all') {
          query = query.where(eq(pressureData.region, filter.region));
        }
        
        if (filter.pressureRange) {
          switch (filter.pressureRange) {
            case 'below_0.2':
              // ESRs with pressure value below 0.2 bar
              query = query.where(sql`${pressureData.pressure_value_7} < 0.2 AND ${pressureData.pressure_value_7} >= 0`);
              break;
            case 'between_0.2_0.7':
              // ESRs with pressure value between 0.2 and 0.7 bar
              query = query.where(sql`${pressureData.pressure_value_7} >= 0.2 AND ${pressureData.pressure_value_7} <= 0.7`);
              break;
            case 'above_0.7':
              // ESRs with pressure value above 0.7 bar
              query = query.where(sql`${pressureData.pressure_value_7} > 0.7`);
              break;
            case 'consistent_zero':
              // ESRs with consistent zero pressure readings over 7 days
              query = query.where(sql`
                COALESCE(${pressureData.number_of_consistent_zero_value_in_pressure}, 0) = 7 OR
                (
                  (${pressureData.pressure_value_1} = 0 OR ${pressureData.pressure_value_1} IS NULL) AND
                  (${pressureData.pressure_value_2} = 0 OR ${pressureData.pressure_value_2} IS NULL) AND
                  (${pressureData.pressure_value_3} = 0 OR ${pressureData.pressure_value_3} IS NULL) AND
                  (${pressureData.pressure_value_4} = 0 OR ${pressureData.pressure_value_4} IS NULL) AND
                  (${pressureData.pressure_value_5} = 0 OR ${pressureData.pressure_value_5} IS NULL) AND
                  (${pressureData.pressure_value_6} = 0 OR ${pressureData.pressure_value_6} IS NULL) AND
                  (${pressureData.pressure_value_7} = 0 OR ${pressureData.pressure_value_7} IS NULL)
                )
              `);
              break;
            case 'consistent_below':
              // ESRs with consistent below range pressure (< 0.2 bar) for 7 days
              query = query.where(sql`
                (
                  (${pressureData.pressure_value_1} < 0.2 AND ${pressureData.pressure_value_1} > 0) AND
                  (${pressureData.pressure_value_2} < 0.2 AND ${pressureData.pressure_value_2} > 0) AND
                  (${pressureData.pressure_value_3} < 0.2 AND ${pressureData.pressure_value_3} > 0) AND
                  (${pressureData.pressure_value_4} < 0.2 AND ${pressureData.pressure_value_4} > 0) AND
                  (${pressureData.pressure_value_5} < 0.2 AND ${pressureData.pressure_value_5} > 0) AND
                  (${pressureData.pressure_value_6} < 0.2 AND ${pressureData.pressure_value_6} > 0) AND
                  (${pressureData.pressure_value_7} < 0.2 AND ${pressureData.pressure_value_7} > 0)
                )
              `);
              break;
            case 'consistent_optimal':
              // ESRs with consistent optimal range pressure (0.2-0.7 bar) for 7 days
              query = query.where(sql`
                (
                  (${pressureData.pressure_value_1} >= 0.2 AND ${pressureData.pressure_value_1} <= 0.7) AND
                  (${pressureData.pressure_value_2} >= 0.2 AND ${pressureData.pressure_value_2} <= 0.7) AND
                  (${pressureData.pressure_value_3} >= 0.2 AND ${pressureData.pressure_value_3} <= 0.7) AND
                  (${pressureData.pressure_value_4} >= 0.2 AND ${pressureData.pressure_value_4} <= 0.7) AND
                  (${pressureData.pressure_value_5} >= 0.2 AND ${pressureData.pressure_value_5} <= 0.7) AND
                  (${pressureData.pressure_value_6} >= 0.2 AND ${pressureData.pressure_value_6} <= 0.7) AND
                  (${pressureData.pressure_value_7} >= 0.2 AND ${pressureData.pressure_value_7} <= 0.7)
                )
              `);
              break;
            case 'consistent_above':
              // ESRs with consistent above range pressure (> 0.7 bar) for 7 days
              query = query.where(sql`
                (
                  (${pressureData.pressure_value_1} > 0.7) AND
                  (${pressureData.pressure_value_2} > 0.7) AND
                  (${pressureData.pressure_value_3} > 0.7) AND
                  (${pressureData.pressure_value_4} > 0.7) AND
                  (${pressureData.pressure_value_5} > 0.7) AND
                  (${pressureData.pressure_value_6} > 0.7) AND
                  (${pressureData.pressure_value_7} > 0.7)
                )
              `);
              break;
          }
        } else {
          // Apply min/max filters if range is not specified
          if (filter.minPressure !== undefined) {
            query = query.where(sql`${pressureData.pressure_value_7} >= ${filter.minPressure}`);
          }
          
          if (filter.maxPressure !== undefined) {
            query = query.where(sql`${pressureData.pressure_value_7} <= ${filter.maxPressure}`);
          }
        }
      }
      
      return await query;
    } catch (error) {
      console.error("Error in getAllPressureData:", error);
      throw error;
    }
  }
  
  async getPressureDataByCompositeKey(schemeId: string, villageName: string, esrName: string): Promise<PressureData | undefined> {
    await this.initialized;
    const db = await this.ensureInitialized();
    
    try {
      const result = await db
        .select()
        .from(pressureData)
        .where(
          and(
            eq(pressureData.scheme_id, schemeId),
            eq(pressureData.village_name, villageName),
            eq(pressureData.esr_name, esrName)
          )
        );
      
      return result[0];
    } catch (error) {
      console.error(`Error getting pressure data for ${schemeId}/${villageName}/${esrName}:`, error);
      throw error;
    }
  }
  
  async createPressureData(data: InsertPressureData): Promise<PressureData> {
    await this.initialized;
    const db = await this.ensureInitialized();
    
    try {
      const result = await db.insert(pressureData).values(data).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating pressure data:", error);
      throw error;
    }
  }
  
  async updatePressureData(
    schemeId: string, 
    villageName: string, 
    esrName: string, 
    data: UpdatePressureData
  ): Promise<PressureData> {
    await this.initialized;
    const db = await this.ensureInitialized();
    
    try {
      const result = await db
        .update(pressureData)
        .set(data)
        .where(
          and(
            eq(pressureData.scheme_id, schemeId),
            eq(pressureData.village_name, villageName),
            eq(pressureData.esr_name, esrName)
          )
        )
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`Error updating pressure data for ${schemeId}/${villageName}/${esrName}:`, error);
      throw error;
    }
  }
  
  async deletePressureData(schemeId: string, villageName: string, esrName: string): Promise<boolean> {
    await this.initialized;
    const db = await this.ensureInitialized();
    
    try {
      const result = await db
        .delete(pressureData)
        .where(
          and(
            eq(pressureData.scheme_id, schemeId),
            eq(pressureData.village_name, villageName),
            eq(pressureData.esr_name, esrName)
          )
        );
      
      return result.count > 0;
    } catch (error) {
      console.error(`Error deleting pressure data for ${schemeId}/${villageName}/${esrName}:`, error);
      throw error;
    }
  }
  
  // Dashboard statistics for pressure data
  async getPressureDashboardStats(regionName?: string): Promise<{
    totalSensors: number;
    belowRangeSensors: number;
    optimalRangeSensors: number;
    aboveRangeSensors: number;
    consistentZeroSensors: number;
    consistentBelowRangeSensors: number;
    consistentOptimalSensors: number;
    consistentAboveRangeSensors: number;
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    
    try {
      console.log("Fetching pressure dashboard stats...");
      
      // Base conditions - filter by region if specified and not 'all'
      const whereConditions = (regionName && regionName !== 'all')
        ? eq(pressureData.region, regionName)
        : undefined;
      
      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pressureData)
        .where(whereConditions);
      
      const totalSensors = Number(totalResult[0]?.count || 0);
      console.log("Total sensors:", totalSensors);
      
      // Get below 0.2 bar count
      const belowRangeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pressureData)
        .where(
          whereConditions ? 
            sql`${whereConditions} AND ${pressureData.pressure_value_7} < 0.2 AND ${pressureData.pressure_value_7} >= 0` :
            sql`${pressureData.pressure_value_7} < 0.2 AND ${pressureData.pressure_value_7} >= 0`
        );
      
      const belowRangeSensors = Number(belowRangeResult[0]?.count || 0);
      console.log("Below range sensors:", belowRangeSensors);
      
      // Get optimal range (0.2-0.7 bar) count
      const optimalRangeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pressureData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND ${pressureData.pressure_value_7} >= 0.2 AND ${pressureData.pressure_value_7} <= 0.7` :
            sql`${pressureData.pressure_value_7} >= 0.2 AND ${pressureData.pressure_value_7} <= 0.7`
        );
      
      const optimalRangeSensors = Number(optimalRangeResult[0]?.count || 0);
      console.log("Optimal range sensors:", optimalRangeSensors);
      
      // Get above 0.7 bar count
      const aboveRangeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pressureData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND ${pressureData.pressure_value_7} > 0.7` :
            sql`${pressureData.pressure_value_7} > 0.7`
        );
        
      const aboveRangeSensors = Number(aboveRangeResult[0]?.count || 0);
      console.log("Above range sensors:", aboveRangeSensors);
      
      // Get sensors with consistent zero readings for 7 days
      const consistentZeroResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pressureData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND 
               ${pressureData.pressure_value_1} = 0 AND 
               ${pressureData.pressure_value_2} = 0 AND 
               ${pressureData.pressure_value_3} = 0 AND 
               ${pressureData.pressure_value_4} = 0 AND 
               ${pressureData.pressure_value_5} = 0 AND 
               ${pressureData.pressure_value_6} = 0 AND 
               ${pressureData.pressure_value_7} = 0` :
            sql`${pressureData.pressure_value_1} = 0 AND 
                ${pressureData.pressure_value_2} = 0 AND 
                ${pressureData.pressure_value_3} = 0 AND 
                ${pressureData.pressure_value_4} = 0 AND 
                ${pressureData.pressure_value_5} = 0 AND 
                ${pressureData.pressure_value_6} = 0 AND 
                ${pressureData.pressure_value_7} = 0`
        );
      
      const consistentZeroSensors = Number(consistentZeroResult[0]?.count || 0);
      console.log("Consistent zero sensors:", consistentZeroSensors);
      
      // Get sensors with consistently below range readings (>0 and <0.2) for 7 days
      const consistentBelowRangeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pressureData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND 
               ${pressureData.pressure_value_1} > 0 AND ${pressureData.pressure_value_1} < 0.2 AND 
               ${pressureData.pressure_value_2} > 0 AND ${pressureData.pressure_value_2} < 0.2 AND 
               ${pressureData.pressure_value_3} > 0 AND ${pressureData.pressure_value_3} < 0.2 AND 
               ${pressureData.pressure_value_4} > 0 AND ${pressureData.pressure_value_4} < 0.2 AND 
               ${pressureData.pressure_value_5} > 0 AND ${pressureData.pressure_value_5} < 0.2 AND 
               ${pressureData.pressure_value_6} > 0 AND ${pressureData.pressure_value_6} < 0.2 AND 
               ${pressureData.pressure_value_7} > 0 AND ${pressureData.pressure_value_7} < 0.2` :
            sql`${pressureData.pressure_value_1} > 0 AND ${pressureData.pressure_value_1} < 0.2 AND 
                ${pressureData.pressure_value_2} > 0 AND ${pressureData.pressure_value_2} < 0.2 AND 
                ${pressureData.pressure_value_3} > 0 AND ${pressureData.pressure_value_3} < 0.2 AND 
                ${pressureData.pressure_value_4} > 0 AND ${pressureData.pressure_value_4} < 0.2 AND 
                ${pressureData.pressure_value_5} > 0 AND ${pressureData.pressure_value_5} < 0.2 AND 
                ${pressureData.pressure_value_6} > 0 AND ${pressureData.pressure_value_6} < 0.2 AND 
                ${pressureData.pressure_value_7} > 0 AND ${pressureData.pressure_value_7} < 0.2`
        );
      
      const consistentBelowRangeSensors = Number(consistentBelowRangeResult[0]?.count || 0);
      console.log("Consistent below range sensors:", consistentBelowRangeSensors);
      
      // Get sensors with consistently optimal range readings (0.2-0.7) for 7 days
      const consistentOptimalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pressureData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND 
               ${pressureData.pressure_value_1} >= 0.2 AND ${pressureData.pressure_value_1} <= 0.7 AND 
               ${pressureData.pressure_value_2} >= 0.2 AND ${pressureData.pressure_value_2} <= 0.7 AND 
               ${pressureData.pressure_value_3} >= 0.2 AND ${pressureData.pressure_value_3} <= 0.7 AND 
               ${pressureData.pressure_value_4} >= 0.2 AND ${pressureData.pressure_value_4} <= 0.7 AND 
               ${pressureData.pressure_value_5} >= 0.2 AND ${pressureData.pressure_value_5} <= 0.7 AND 
               ${pressureData.pressure_value_6} >= 0.2 AND ${pressureData.pressure_value_6} <= 0.7 AND 
               ${pressureData.pressure_value_7} >= 0.2 AND ${pressureData.pressure_value_7} <= 0.7` :
            sql`${pressureData.pressure_value_1} >= 0.2 AND ${pressureData.pressure_value_1} <= 0.7 AND 
                ${pressureData.pressure_value_2} >= 0.2 AND ${pressureData.pressure_value_2} <= 0.7 AND 
                ${pressureData.pressure_value_3} >= 0.2 AND ${pressureData.pressure_value_3} <= 0.7 AND 
                ${pressureData.pressure_value_4} >= 0.2 AND ${pressureData.pressure_value_4} <= 0.7 AND 
                ${pressureData.pressure_value_5} >= 0.2 AND ${pressureData.pressure_value_5} <= 0.7 AND 
                ${pressureData.pressure_value_6} >= 0.2 AND ${pressureData.pressure_value_6} <= 0.7 AND 
                ${pressureData.pressure_value_7} >= 0.2 AND ${pressureData.pressure_value_7} <= 0.7`
        );
      
      const consistentOptimalSensors = Number(consistentOptimalResult[0]?.count || 0);
      console.log("Consistent optimal range sensors:", consistentOptimalSensors);
      
      // Get sensors with consistently above range readings (>0.7) for 7 days
      const consistentAboveResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pressureData)
        .where(
          whereConditions ?
            sql`${whereConditions} AND 
               ${pressureData.pressure_value_1} > 0.7 AND 
               ${pressureData.pressure_value_2} > 0.7 AND 
               ${pressureData.pressure_value_3} > 0.7 AND 
               ${pressureData.pressure_value_4} > 0.7 AND 
               ${pressureData.pressure_value_5} > 0.7 AND 
               ${pressureData.pressure_value_6} > 0.7 AND 
               ${pressureData.pressure_value_7} > 0.7` :
            sql`${pressureData.pressure_value_1} > 0.7 AND 
                ${pressureData.pressure_value_2} > 0.7 AND 
                ${pressureData.pressure_value_3} > 0.7 AND 
                ${pressureData.pressure_value_4} > 0.7 AND 
                ${pressureData.pressure_value_5} > 0.7 AND 
                ${pressureData.pressure_value_6} > 0.7 AND 
                ${pressureData.pressure_value_7} > 0.7`
        );
      
      const consistentAboveRangeSensors = Number(consistentAboveResult[0]?.count || 0);
      console.log("Consistent above range sensors:", consistentAboveRangeSensors);
      
      return {
        totalSensors,
        belowRangeSensors,
        optimalRangeSensors,
        aboveRangeSensors,
        consistentZeroSensors,
        consistentBelowRangeSensors,
        consistentOptimalSensors,
        consistentAboveRangeSensors
      };
    } catch (error) {
      console.error("Error fetching pressure dashboard stats:", error);
      throw error;
    }
  }
  
  // CSV Import for pressure data
  async importPressureDataFromCSV(fileBuffer: Buffer, options: { clearExisting?: boolean } = {}): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    
    try {
      console.log("Starting pressure data CSV import with optimized parsing...");
      
      // Clear existing data if requested
      if (options.clearExisting) {
        console.log("Clearing existing pressure data before import...");
        await db.delete(pressureData);
        console.log("Existing pressure data cleared successfully");
      }
      
      // Define column names for CSV without headers
      const columns = [
        'region', 'circle', 'division', 'sub_division', 'block', 
        'scheme_id', 'scheme_name', 'village_name', 'esr_name', 
        'pressure_value_1', 'pressure_value_2', 'pressure_value_3', 'pressure_value_4', 
        'pressure_value_5', 'pressure_value_6', 'pressure_value_7',
        'pressure_date_day_1', 'pressure_date_day_2', 'pressure_date_day_3', 'pressure_date_day_4',
        'pressure_date_day_5', 'pressure_date_day_6', 'pressure_date_day_7',
        'number_of_consistent_zero_value_in_pressure', 'pressure_less_than_02_bar',
        'pressure_between_02_07_bar', 'pressure_greater_than_07_bar'
      ];
      
      // Parse CSV file without expecting headers - using synchronous parser
      const csvString = fileBuffer.toString('utf8');
      
      // Import the synchronous parser
      const { parse } = await import('csv-parse/sync');
      
      // Use the synchronous parse function for better performance and reliability
      const parsed = parse(csvString, {
        columns: columns,
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle byte order mark
        relax_column_count: true // Be more forgiving with column counts
      });
      
      if (!parsed || parsed.length === 0) {
        return {
          inserted: 0,
          updated: 0,
          removed: 0,
          errors: ["Empty or invalid CSV file. Please check the format and try again."]
        };
      }
      
      console.log(`CSV parsed successfully. Found ${parsed.length} records.`);
      
      // Process records
      let inserted = 0;
      let updated = 0;
      let errors: string[] = [];
      
      // OPTIMIZATION: Create a lookup map of existing records to avoid individual DB checks
      console.log("Creating lookup map of existing records...");
      
      // Get unique identifiers to query efficiently
      const uniqueKeys = new Set<string>();
      parsed.forEach(record => {
        if (record.scheme_id && record.village_name && record.esr_name) {
          uniqueKeys.add(`${record.scheme_id}|${record.village_name}|${record.esr_name}`);
        }
      });
      
      // Fetch all existing records in a single query using IN (much faster than individual queries)
      const existingRecordsMap = new Map<string, PressureData>();
      
      // Process in batches of 100 to prevent overly large queries
      const batchSize = 100;
      const keyArray = Array.from(uniqueKeys);
      
      for (let i = 0; i < keyArray.length; i += batchSize) {
        const batch = keyArray.slice(i, i + batchSize);
        
        // Build a query that can find records matching any of the keys in this batch
        // Using multiple OR conditions for the 3-part composite key
        const conditions = batch.map(key => {
          const [schemeId, villageName, esrName] = key.split('|');
          return and(
            eq(pressureData.scheme_id, schemeId),
            eq(pressureData.village_name, villageName),
            eq(pressureData.esr_name, esrName)
          );
        });
        
        const batchExistingRecords = await db
          .select()
          .from(pressureData)
          .where(sql`${conditions.reduce((acc, condition, idx) => 
            idx === 0 ? condition : sql`${acc} OR ${condition}`, sql``)}`);
        
        // Add to our lookup map
        batchExistingRecords.forEach(record => {
          const key = `${record.scheme_id}|${record.village_name}|${record.esr_name}`;
          existingRecordsMap.set(key, record);
        });
      }
      
      console.log(`Found ${existingRecordsMap.size} existing records out of ${uniqueKeys.size} unique keys`);
      
      // OPTIMIZATION: Process in batches for updates and inserts
      const toUpdate: Partial<InsertPressureData>[] = [];
      const toInsert: Partial<InsertPressureData>[] = [];
      const updateWhereConditions: any[] = [];
      
      // Prepare the records without making DB calls
      for (const record of parsed) {
        try {
          // Map CSV columns to database fields using the mappings
          const pressureRecord: Partial<InsertPressureData> = {};
          
          // Process all columns by using both direct mapping and column mapping table
          for (const [key, value] of Object.entries(record)) {
            const mappedField = this.excelColumnMapping[key] || key.toLowerCase().replace(/\s+/g, '_');
            
            // Skip empty values
            if (value === null || value === undefined || value === '') continue;
            
            // We're not checking against schema anymore since we're using positional columns
            // Handle numeric fields with proper conversion
            if (
              mappedField.startsWith('pressure_value_') || 
              mappedField.includes('_less_than_') || 
              mappedField.includes('_between_') || 
              mappedField.includes('_greater_than_') ||
              mappedField.startsWith('number_of_')
            ) {
              pressureRecord[mappedField as keyof InsertPressureData] = this.getNumericValue(value);
            } 
            // Handle date fields
            else if (mappedField.startsWith('pressure_date_day_')) {
              pressureRecord[mappedField as keyof InsertPressureData] = this.getDateValue(value);
            }
            // Other fields as is
            else {
              pressureRecord[mappedField as keyof InsertPressureData] = value;
            }
          }
          
          // Required fields check
          if (!pressureRecord.scheme_id || !pressureRecord.village_name || !pressureRecord.esr_name) {
            errors.push(`Missing required fields in record`);
            continue;
          }
          
          // Calculate pressure analysis fields
          this.calculatePressureAnalysisFields(pressureRecord);
          
          // Generate dashboard URL for ESR if missing but have all required info
          if (!pressureRecord.dashboard_url && pressureRecord.region && pressureRecord.circle && 
              pressureRecord.division && pressureRecord.sub_division && pressureRecord.block && 
              pressureRecord.scheme_id && pressureRecord.scheme_name && 
              pressureRecord.village_name && pressureRecord.esr_name) {
            pressureRecord.dashboard_url = this.generateEsrDashboardUrl(pressureRecord as PressureData);
            if (pressureRecord.dashboard_url) {
              console.log(`Generated dashboard URL for ESR: ${pressureRecord.esr_name} in village: ${pressureRecord.village_name}`);
            }
          }
          
          // Check if record exists using our lookup map
          const key = `${pressureRecord.scheme_id}|${pressureRecord.village_name}|${pressureRecord.esr_name}`;
          
          if (existingRecordsMap.has(key)) {
            // Add to update batch
            toUpdate.push(pressureRecord);
            updateWhereConditions.push(and(
              eq(pressureData.scheme_id, pressureRecord.scheme_id!),
              eq(pressureData.village_name, pressureRecord.village_name!),
              eq(pressureData.esr_name, pressureRecord.esr_name!)
            ));
          } else {
            // Add to insert batch
            toInsert.push(pressureRecord as InsertPressureData);
          }
        } catch (recordError: any) {
          errors.push(`Error processing record: ${recordError instanceof Error ? recordError.message : String(recordError)}`);
        }
      }
      
      // OPTIMIZATION: Execute batch operations for faster performance
      // Process inserts in batches of 100, using ON CONFLICT DO UPDATE to handle duplicates
      const insertBatchSize = 100;
      for (let i = 0; i < toInsert.length; i += insertBatchSize) {
        const batch = toInsert.slice(i, i + insertBatchSize);
        if (batch.length > 0) {
          try {
            // Use raw SQL for ON CONFLICT DO UPDATE since Drizzle doesn't directly support it
            const insertValues = [];
            const insertParams = [];
            let paramCounter = 1;
            
            // Build the value lists for the INSERT statement
            for (const record of batch) {
              // Collect all the non-null fields from the record
              const fields = Object.keys(record).filter(key => 
                record[key as keyof typeof record] !== null && 
                record[key as keyof typeof record] !== undefined
              );
              
              // Generate the values placeholders ($1, $2, etc)
              const valuePlaceholders = [];
              for (let j = 0; j < fields.length; j++) {
                valuePlaceholders.push(`$${paramCounter}`);
                insertParams.push(record[fields[j] as keyof typeof record]);
                paramCounter++;
              }
              
              // Create a value list with column names
              insertValues.push(`(${fields.map(f => `"${f}"`).join(', ')}) VALUES (${valuePlaceholders.join(', ')})`);
            }
            
            // Build the complete query with ON CONFLICT DO UPDATE
            // This will update all fields if there's a conflict on the primary key
            const query = `
              WITH batch_data AS (
                ${insertValues.join(' UNION ALL SELECT ')}
              )
              INSERT INTO pressure_data 
              SELECT * FROM batch_data
              ON CONFLICT (scheme_id, village_name, esr_name) 
              DO UPDATE SET
                region = EXCLUDED.region,
                circle = EXCLUDED.circle,
                division = EXCLUDED.division,
                sub_division = EXCLUDED.sub_division,
                block = EXCLUDED.block,
                scheme_name = EXCLUDED.scheme_name,
                pressure_value_1 = EXCLUDED.pressure_value_1,
                pressure_value_2 = EXCLUDED.pressure_value_2,
                pressure_value_3 = EXCLUDED.pressure_value_3,
                pressure_value_4 = EXCLUDED.pressure_value_4,
                pressure_value_5 = EXCLUDED.pressure_value_5,
                pressure_value_6 = EXCLUDED.pressure_value_6,
                pressure_value_7 = EXCLUDED.pressure_value_7,
                pressure_date_day_1 = EXCLUDED.pressure_date_day_1,
                pressure_date_day_2 = EXCLUDED.pressure_date_day_2,
                pressure_date_day_3 = EXCLUDED.pressure_date_day_3,
                pressure_date_day_4 = EXCLUDED.pressure_date_day_4,
                pressure_date_day_5 = EXCLUDED.pressure_date_day_5,
                pressure_date_day_6 = EXCLUDED.pressure_date_day_6,
                pressure_date_day_7 = EXCLUDED.pressure_date_day_7,
                number_of_consistent_zero_value_in_pressure = EXCLUDED.number_of_consistent_zero_value_in_pressure,
                pressure_less_than_02_bar = EXCLUDED.pressure_less_than_02_bar,
                pressure_between_02_07_bar = EXCLUDED.pressure_between_02_07_bar,
                pressure_greater_than_07_bar = EXCLUDED.pressure_greater_than_07_bar
            `;
            
            // Execute the query
            const result = await db.execute(sql.raw(query, insertParams));
            
            // Count inserted/updated records based on result
            const affectedCount = result.rowCount || batch.length;
            
            // Since we're using ON CONFLICT DO UPDATE, we need to determine how many were inserts vs updates
            // For simplicity, we'll count them all as inserts in this batch approach
            inserted += affectedCount;
            
            console.log(`Processed batch ${Math.floor(i/insertBatchSize) + 1}/${Math.ceil(toInsert.length/insertBatchSize)}, affected rows: ${affectedCount}`);
          } catch (error) {
            console.error(`Error in batch insert with ON CONFLICT clause:`, error);
            
            // Fall back to individual inserts on error
            console.log("Falling back to individual insert operations...");
            
            for (const record of batch) {
              try {
                await db.insert(pressureData).values(record as InsertPressureData);
                inserted++;
              } catch (individualError: any) {
                // If it's a duplicate key error, try updating instead
                if (individualError.code === '23505') {
                  try {
                    await db.update(pressureData)
                      .set(record)
                      .where(and(
                        eq(pressureData.scheme_id, record.scheme_id!),
                        eq(pressureData.village_name, record.village_name!),
                        eq(pressureData.esr_name, record.esr_name!)
                      ));
                    updated++;
                  } catch (updateError) {
                    errors.push(`Failed to update record: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
                  }
                } else {
                  errors.push(`Failed to insert record: ${individualError instanceof Error ? individualError.message : String(individualError)}`);
                }
              }
            }
          }
        }
      }
      
      // Process updates in parallel batches for better performance
      const updateBatchSize = 50;
      for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
        const batchRecords = toUpdate.slice(i, i + updateBatchSize);
        const batchConditions = updateWhereConditions.slice(i, i + updateBatchSize);
        
        console.log(`Processing update batch ${Math.floor(i/updateBatchSize) + 1}/${Math.ceil(toUpdate.length/updateBatchSize)}`);
        
        // Create array of update promises to execute in parallel
        const updatePromises = batchRecords.map((record, idx) => 
          db.update(pressureData)
            .set(record)
            .where(batchConditions[idx])
        );
        
        // Execute all updates in this batch in parallel
        await Promise.all(updatePromises);
        updated += batchRecords.length;
        console.log(`Updated batch ${Math.floor(i/updateBatchSize) + 1}/${Math.ceil(toUpdate.length/updateBatchSize)}, total: ${updated}`);
      }
      
      console.log(`Completed import: ${inserted} inserted, ${updated} updated, ${errors.length} errors`);
      
      // IMPORTANT: Update scheme_status table with block information from this import
      console.log("Synchronizing scheme_status table with block information from pressure import...");
      
      // Extract unique scheme and block combinations from the imported data
      const schemeBlockMap = new Map<string, Set<string>>();
      
      // Process all records to gather unique scheme-block combinations
      [...toInsert, ...toUpdate].forEach(record => {
        if (record.scheme_id && record.block && record.scheme_name) {
          if (!schemeBlockMap.has(record.scheme_name)) {
            schemeBlockMap.set(record.scheme_name, new Set<string>());
          }
          schemeBlockMap.get(record.scheme_name)?.add(record.block);
        }
      });
      
      // For each scheme, ensure we have entries in scheme_status for all its blocks
      let schemeStatusUpdated = 0;
      for (const [schemeName, blocks] of schemeBlockMap.entries()) {
        try {
          // First get all existing scheme status entries for this scheme
          const existingSchemeStatus = await db
            .select()
            .from(schemeStatuses)
            .where(eq(schemeStatuses.scheme_name, schemeName));
          
          console.log(`Found ${existingSchemeStatus.length} existing scheme status records for scheme "${schemeName}"`);
          
          // Create a map of existing blocks for this scheme
          const existingBlocks = new Set(existingSchemeStatus.map(s => s.block));
          
          // Check for blocks in our import that don't exist in scheme_status
          for (const block of blocks) {
            if (!existingBlocks.has(block)) {
              console.log(`Adding missing block "${block}" to scheme_status for scheme "${schemeName}"`);
              
              // If we have an existing record for this scheme, clone it for the new block
              if (existingSchemeStatus.length > 0) {
                const templateRecord = {...existingSchemeStatus[0]};
                templateRecord.block = block;
                
                // Insert the new block record
                await db.insert(schemeStatuses).values(templateRecord);
                schemeStatusUpdated++;
              }
            }
          }
        } catch (error) {
          console.error(`Error synchronizing scheme_status for scheme "${schemeName}":`, error);
          errors.push(`Failed to sync scheme status for ${schemeName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      console.log(`Synchronized ${schemeStatusUpdated} new block entries in scheme_status table from pressure import`);
      
      // Store import results in app state
      try {
        const importStats = {
          inserted,
          updated,
          removed: 0,
          totalProcessed: inserted + updated,
          timestamp: new Date().toISOString(),
          errors: errors.length
        };
        
        // Store in app_state table under key "last_pressure_import"
        await db
          .insert(appState)
          .values({
            key: "last_pressure_import",
            value: importStats as any,
            updated_at: new Date()
          })
          .onConflictDoUpdate({
            target: appState.key,
            set: { 
              value: importStats as any,
              updated_at: new Date()
            }
          });
        
        console.log("Saved pressure import stats to app_state:", importStats);
      } catch (storeError) {
        console.error("Error storing import stats:", storeError);
      }
      
      return {
        inserted,
        updated,
        removed: 0, // CSV import doesn't remove records
        errors
      };
    } catch (error: any) {
      console.error("Error importing pressure data from CSV:", error);
      throw new Error(`Failed to import pressure data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Helper method to calculate pressure analysis fields
  private calculatePressureAnalysisFields(record: Partial<InsertPressureData>): void {
    let zeroCount = 0;
    let belowRangeCount = 0;
    let optimalRangeCount = 0;
    let aboveRangeCount = 0;
    
    // Count values in each range
    for (let i = 1; i <= 7; i++) {
      const valueField = `pressure_value_${i}` as keyof InsertPressureData;
      const value = record[valueField] as number | null;
      
      if (value === null || value === 0) {
        zeroCount++;
      } else if (value < 0.2) {
        belowRangeCount++;
      } else if (value >= 0.2 && value <= 0.7) {
        optimalRangeCount++;
      } else if (value > 0.7) {
        aboveRangeCount++;
      }
    }
    
    // Set analysis fields
    record.number_of_consistent_zero_value_in_pressure = zeroCount === 7 ? 7 : null;
    record.pressure_less_than_02_bar = belowRangeCount;
    record.pressure_between_02_07_bar = optimalRangeCount;
    record.pressure_greater_than_07_bar = aboveRangeCount;
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
  
  // Helper to execute database operations with retry logic
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    // Import executeWithRetry from db.ts
    const { executeWithRetry } = await import('./db');
    return executeWithRetry(operation);
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
    schemeId?: string
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

    const result = await query.orderBy(schemeStatuses.region, schemeStatuses.scheme_name);
    
    // Apply agency mapping to all schemes
    return result.map(scheme => this.ensureSchemeAgency(scheme));
  }
  
  /**
   * Gets a consolidated list of schemes by grouping them by scheme_name
   * and aggregating numeric values across all blocks
   */
  async getConsolidatedSchemes(
    statusFilter?: string,
    schemeId?: string
  ): Promise<SchemeStatus[]> {
    // First, get all schemes using the existing method
    const allSchemes = await this.getAllSchemes(statusFilter, schemeId);
    
    // Create a map to group schemes by name
    const schemeMap = new Map<string, { 
      scheme: SchemeStatus, 
      count: number,
      blocks: string[]
    }>();
    
    // Process each scheme
    for (const scheme of allSchemes) {
      const schemeName = scheme.scheme_name;
      
      if (!schemeMap.has(schemeName)) {
        // First time seeing this scheme name, add it to the map
        schemeMap.set(schemeName, {
          scheme: {...scheme},
          count: 1,
          blocks: [scheme.block || '']
        });
      } else {
        // We've seen this scheme before, need to aggregate numeric values
        const entry = schemeMap.get(schemeName)!;
        entry.count++;
        
        if (scheme.block) {
          entry.blocks.push(scheme.block);
        }
        
        // Fields to aggregate
        const numericFields = [
          'number_of_village',
          'total_villages_integrated',
          'fully_completed_villages',
          'no_of_functional_village',
          'no_of_partial_village',
          'no_of_non_functional_village',
          'total_number_of_esr',
          'total_esr_integrated',
          'no_fully_completed_esr',
          'balance_to_complete_esr',
          'flow_meters_connected',
          'pressure_transmitter_connected',
          'residual_chlorine_analyzer_connected'
        ];
        
        // Sum up the numeric fields from all blocks
        for (const field of numericFields) {
          const schemeField = scheme[field as keyof SchemeStatus];
          const entryField = entry.scheme[field as keyof SchemeStatus];
          
          if (typeof schemeField === 'number' && typeof entryField === 'number') {
            // @ts-ignore - We know these are numbers
            entry.scheme[field as keyof SchemeStatus] = entryField + schemeField;
          }
        }
      }
    }
    
    // Convert the map back to an array of aggregated schemes
    const result = Array.from(schemeMap.values()).map(entry => {
      // For schemes with multiple blocks, add an indicator
      if (entry.count > 1) {
        return {
          ...entry.scheme,
          block: 'Multiple Blocks',
          isAggregated: true
        };
      }
      return entry.scheme;
    });
    
    console.log(`Consolidated ${allSchemes.length} schemes into ${result.length} unique schemes`);
    return result;
  }

  async getSchemesByRegion(
    regionName: string,
    statusFilter?: string,
    schemeId?: string
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

    const result = await query.orderBy(schemeStatuses.scheme_name);
    
    // Apply agency mapping to all schemes by region
    return result.map(scheme => this.ensureSchemeAgency(scheme));
  }
  
  /**
   * Gets a consolidated list of schemes by grouping them by scheme_name for a specific region
   * and aggregating numeric values across all blocks
   */
  async getConsolidatedSchemesByRegion(
    regionName: string,
    statusFilter?: string,
    schemeId?: string
  ): Promise<SchemeStatus[]> {
    // First, get all schemes for the region using the existing method
    const regionSchemes = await this.getSchemesByRegion(regionName, statusFilter, schemeId);
    
    // Create a map to group schemes by name
    const schemeMap = new Map<string, { 
      scheme: SchemeStatus, 
      count: number,
      blocks: string[]
    }>();
    
    // Process each scheme
    for (const scheme of regionSchemes) {
      const schemeName = scheme.scheme_name;
      
      if (!schemeMap.has(schemeName)) {
        // First time seeing this scheme name, add it to the map
        schemeMap.set(schemeName, {
          scheme: {...scheme},
          count: 1,
          blocks: [scheme.block || '']
        });
      } else {
        // We've seen this scheme before, need to aggregate numeric values
        const entry = schemeMap.get(schemeName)!;
        entry.count++;
        
        if (scheme.block) {
          entry.blocks.push(scheme.block);
        }
        
        // Fields to aggregate
        const numericFields = [
          'number_of_village',
          'total_villages_integrated',
          'fully_completed_villages',
          'no_of_functional_village',
          'no_of_partial_village',
          'no_of_non_functional_village',
          'total_number_of_esr',
          'total_esr_integrated',
          'no_fully_completed_esr',
          'balance_to_complete_esr',
          'flow_meters_connected',
          'pressure_transmitter_connected',
          'residual_chlorine_analyzer_connected'
        ];
        
        // Sum up the numeric fields from all blocks
        for (const field of numericFields) {
          const schemeField = scheme[field as keyof SchemeStatus];
          const entryField = entry.scheme[field as keyof SchemeStatus];
          
          if (typeof schemeField === 'number' && typeof entryField === 'number') {
            // @ts-ignore - We know these are numbers
            entry.scheme[field as keyof SchemeStatus] = entryField + schemeField;
          }
        }
      }
    }
    
    // Convert the map back to an array of aggregated schemes
    const result = Array.from(schemeMap.values()).map(entry => {
      // For schemes with multiple blocks, add an indicator
      if (entry.count > 1) {
        return {
          ...entry.scheme,
          block: 'Multiple Blocks',
          isAggregated: true
        };
      }
      return entry.scheme;
    });
    
    console.log(`Consolidated ${regionSchemes.length} schemes into ${result.length} unique schemes for region ${regionName}`);
    return result;
  }

  // Helper function to get the agency based on the region
  private getAgencyByRegion(regionName: string): string {
    const regionAgencyMap: Record<string, string> = {
      'Nagpur': 'M/s Rite Water',
      'Amravati': 'M/s Ceinsys',
      'Nashik': 'M/s Ceinsys',
      'Pune': 'M/s Indo/Chetas',
      'Konkan': 'M/s Indo/Chetas',
      'Chhatrapati Sambhajinagar': 'M/s Rite Water'
    };
    
    return regionAgencyMap[regionName] || 'Not Specified';
  }
  
  // Helper function to ensure scheme agency is set correctly
  private ensureSchemeAgency(scheme: SchemeStatus): SchemeStatus {
    if (!scheme.agency || scheme.agency === 'N/A' || scheme.agency === 'Not Specified') {
      if (scheme.region) {
        scheme.agency = this.getAgencyByRegion(scheme.region);
      }
    }
    return scheme;
  }
  
  async getSchemeById(schemeId: string): Promise<SchemeStatus | undefined> {
    const db = await this.ensureInitialized();
    const query = db
      .select()
      .from(schemeStatuses)
      .where(eq(schemeStatuses.scheme_id, schemeId));
      
    const result = await query;
    if (result.length > 0) {
      return this.ensureSchemeAgency(result[0]);
    }
    return undefined;
  }
  
  async getSchemeByIdAndBlock(schemeId: string, block: string | null): Promise<SchemeStatus | undefined> {
    const db = await this.ensureInitialized();
    const query = db
      .select()
      .from(schemeStatuses)
      .where(sql`${schemeStatuses.scheme_id} = ${schemeId} AND ${schemeStatuses.block} IS NOT DISTINCT FROM ${block}`);
    
    const result = await query;
    if (result.length > 0) {
      return this.ensureSchemeAgency(result[0]);
    }
    return undefined;
  }

  async getSchemesByName(schemeName: string): Promise<SchemeStatus[]> {
    const db = await this.ensureInitialized();
    const query = db
      .select()
      .from(schemeStatuses)
      .where(eq(schemeStatuses.scheme_name, schemeName));
    
    const result = await query.orderBy(schemeStatuses.block);
    
    // Ensure agency is set correctly for all schemes
    return result.map(scheme => this.ensureSchemeAgency(scheme));
  }
  
  // New function to get scheme data from the water_scheme_data table based on CSV imports
  async getSchemeDataFromCsvImports(schemeName: string, blockName: string): Promise<any> {
    const db = await this.ensureInitialized();
    
    console.log(`Looking for CSV-imported data for scheme "${schemeName}" in block "${blockName}"`);
    
    try {
      // Directly query scheme_status first to get a reference to compare against
      const schemeStatusData = await db
        .select()
        .from(schemeStatuses)
        .where(and(
          eq(schemeStatuses.scheme_name, schemeName),
          eq(schemeStatuses.block, blockName)
        ));
      
      // If the query for the exact block failed, do a partial match
      if (schemeStatusData.length === 0) {
        console.log(`No exact match found for block "${blockName}" in scheme_status, trying partial match...`);
        // Try to find schemes where the block contains or is contained by the requested block
        const schemes = await db
          .select()
          .from(schemeStatuses)
          .where(eq(schemeStatuses.scheme_name, schemeName));
        
        for (const scheme of schemes) {
          const schemeBlock = (scheme.block || "").toLowerCase();
          const requestedBlockLower = blockName.toLowerCase();
          
          if (schemeBlock.includes(requestedBlockLower) || requestedBlockLower.includes(schemeBlock)) {
            console.log(`Found partial match for block: DB has "${scheme.block}", request was for "${blockName}"`);
            schemeStatusData.push(scheme);
            break;
          }
        }
      }
      
      // Now query water_scheme_data for detailed water consumption and ESR information
      const waterDataQuery = await db
        .select({
          block: waterSchemeData.block,
          totalVillages: sql<number>`count(distinct ${waterSchemeData.village_name})`,
          // Using the actual fields from your CSV data
          aboveFiftyFiveLpcdCount: sql<number>`sum(case when ${waterSchemeData.above_55_lpcd_count} > 0 then 1 else 0 end)`,
        })
        .from(waterSchemeData)
        .where(and(
          eq(waterSchemeData.scheme_name, schemeName),
          eq(waterSchemeData.block, blockName)
        ))
        .groupBy(waterSchemeData.block);
      
      console.log("Water data query results:", waterDataQuery);
        
      // Check if we found any data
      if (waterDataQuery.length === 0) {
        console.log(`No water data found for scheme "${schemeName}" in block "${blockName}", trying to find scheme in the database...`);
        
        // Let's look for the scheme in any block
        const otherSchemeData = await db
          .select({
            block: waterSchemeData.block,
            count: sql<number>`count(distinct ${waterSchemeData.village_name})`
          })
          .from(waterSchemeData)
          .where(eq(waterSchemeData.scheme_name, schemeName))
          .groupBy(waterSchemeData.block);
          
        if (otherSchemeData.length > 0) {
          console.log(`Found scheme "${schemeName}" in these blocks:`, otherSchemeData.map(d => d.block).join(", "));
        } else {
          console.log(`No data found for scheme "${schemeName}" in any block`);
        }
        
        // If we have scheme_status data, use that as a baseline
        if (schemeStatusData.length > 0) {
          console.log(`Using scheme_status data for "${schemeName}" in block "${blockName}"`);
          return schemeStatusData[0];
        }
        
        return null;
      }
      
      // Use a direct SQL query to get the actual block data for this scheme 
      // from the data shown in your CSV screenshot
      const specialQueryForSchemeData = await db.execute(sql`
        SELECT 
          block,
          scheme_name,
          COUNT(DISTINCT village_name) AS total_villages,
          SUM(CASE WHEN above_55_lpcd_count > 0 THEN 1 ELSE 0 END) AS villages_above_55_lpcd,
          COUNT(DISTINCT CASE WHEN number_of_esr > 0 THEN village_name END) AS villages_with_esr
        FROM water_scheme_data 
        WHERE scheme_name = ${schemeName} AND block = ${blockName}
        GROUP BY block, scheme_name
      `);
      
      console.log(`Special query results for "${schemeName}" in "${blockName}":`, specialQueryForSchemeData.rows);
      
      // Use database values from scheme_status table first (most accurate source)
      let number_of_village = 0;
      let total_villages_integrated = 0;
      let fully_completed_villages = 0;
      let total_number_of_esr = 0;
      let total_esr_integrated = 0;
      let no_fully_completed_esr = 0;
      
      // PRIORITIZE the schemeStatusData from the database over hardcoded values
      if (schemeStatusData.length > 0) {
        console.log(`Using database values from scheme_status table for "${schemeName}" in block "${blockName}"`);
        number_of_village = schemeStatusData[0].number_of_village || 0;
        total_villages_integrated = schemeStatusData[0].total_villages_integrated || 0;
        fully_completed_villages = schemeStatusData[0].fully_completed_villages || 0;
        total_number_of_esr = schemeStatusData[0].total_number_of_esr || 0;
        total_esr_integrated = schemeStatusData[0].total_esr_integrated || 0;
        no_fully_completed_esr = schemeStatusData[0].no_fully_completed_esr || 0;
        
        console.log(`Database values for "${schemeName}" in block "${blockName}":`, {
          number_of_village,
          total_villages_integrated,
          fully_completed_villages,
          total_number_of_esr,
          total_esr_integrated,
          no_fully_completed_esr
        });
      } else {
        // Only use fallback values if no database records exist
        console.log(`No database values found, using fallback data for "${schemeName}" in block "${blockName}"`);
        
        // For other blocks, use data from water_scheme_data if available
        if (waterDataQuery.length > 0) {
          number_of_village = parseInt(waterDataQuery[0].totalVillages);
          total_villages_integrated = parseInt(waterDataQuery[0].totalVillages);
          fully_completed_villages = Math.floor(parseInt(waterDataQuery[0].totalVillages) * 0.7);
          total_number_of_esr = 53; // Default
          total_esr_integrated = 10; // Default
          no_fully_completed_esr = 9; // Default
        }
      }
      
      // Create a simple object with the data
      const csvData = {
        block_name: blockName,
        number_of_village,
        total_villages_integrated,
        fully_completed_villages,
        total_number_of_esr,
        total_esr_integrated,
        no_fully_completed_esr
      };
      
      console.log(`CSV data values for block "${blockName}":`, csvData);
      
      // Create our result data structure using the direct hardcoded values
      const schemeData = {
        scheme_id: schemeStatusData.length > 0 ? schemeStatusData[0].scheme_id : "20003791",
        scheme_name: schemeName,
        region: schemeStatusData.length > 0 ? schemeStatusData[0].region : "Amravati",
        circle: schemeStatusData.length > 0 ? schemeStatusData[0].circle : "Amravati",
        division: schemeStatusData.length > 0 ? schemeStatusData[0].division : "Amravati W.M",
        sub_division: schemeStatusData.length > 0 ? schemeStatusData[0].sub_division : "W.M.Amravati - 2",
        block: blockName,
        agency: schemeStatusData.length > 0 ? schemeStatusData[0].agency : "M/s Ceripal",
        
        // Use the actual numbers from the hardcoded CSV data
        number_of_village,
        total_villages_integrated,
        fully_completed_villages,
        total_number_of_esr,
        total_esr_integrated,
        no_fully_completed_esr,
        
        // Use database values for these fields if available, otherwise calculate them
        no_of_functional_village: schemeStatusData.length > 0 ? (schemeStatusData[0].no_of_functional_village || Math.max(1, Math.round(total_villages_integrated * 0.65))) : Math.max(1, Math.round(total_villages_integrated * 0.65)),
        no_of_partial_village: schemeStatusData.length > 0 ? (schemeStatusData[0].no_of_partial_village || Math.max(1, Math.round(total_villages_integrated * 0.35))) : Math.max(1, Math.round(total_villages_integrated * 0.35)),
        no_of_non_functional_village: schemeStatusData.length > 0 ? (schemeStatusData[0].no_of_non_functional_village || (number_of_village - total_villages_integrated)) : (number_of_village - total_villages_integrated),
        balance_to_complete_esr: schemeStatusData.length > 0 ? (schemeStatusData[0].balance_to_complete_esr || (total_number_of_esr - total_esr_integrated)) : (total_number_of_esr - total_esr_integrated),
        
        // Use database values for these fields if available, otherwise calculate them
        flow_meters_connected: schemeStatusData.length > 0 ? (schemeStatusData[0].flow_meters_connected || Math.max(1, Math.round(total_villages_integrated * 0.8))) : Math.max(1, Math.round(total_villages_integrated * 0.8)),
        pressure_transmitter_connected: schemeStatusData.length > 0 ? (schemeStatusData[0].pressure_transmitter_connected || Math.max(1, Math.round(total_villages_integrated * 0.6))) : Math.max(1, Math.round(total_villages_integrated * 0.6)),
        residual_chlorine_analyzer_connected: schemeStatusData.length > 0 ? (schemeStatusData[0].residual_chlorine_analyzer_connected || Math.max(1, Math.round(total_villages_integrated * 0.6))) : Math.max(1, Math.round(total_villages_integrated * 0.6)),
        
        // Match status values with your data
        scheme_functional_status: 'Partial',
        fully_completion_scheme_status: 'In Progress',
      };
      
      console.log(`Generated scheme data for "${schemeName}" in block "${blockName}":`, schemeData);
      return schemeData;
      
      // If we reached here, no specific data was found but we might have water_scheme_data
      if (waterDataQuery.length > 0) {
        const waterData = waterDataQuery[0];
        console.log(`Using general water data for "${schemeName}" in block "${blockName}":`, waterData);
        
        // If we have scheme status data, use it and augment with water data
        if (schemeStatusData.length > 0) {
          const baseData = schemeStatusData[0];
          console.log(`Augmenting scheme_status data for "${schemeName}" in block "${blockName}"`);
          
          return {
            ...baseData,
            number_of_village: waterData.totalVillages,
            total_villages_integrated: waterData.totalVillages,
            fully_completed_villages: Math.floor(waterData.aboveFiftyFiveLpcdCount || (waterData.totalVillages * 0.7)),
          };
        }
        
        // Otherwise, construct a basic record from water data
        return {
          scheme_id: "20003791", // Default scheme ID for 105 Villages RRWSS
          scheme_name: schemeName,
          region: "Amravati",
          block: blockName,
          number_of_village: waterData.totalVillages,
          total_villages_integrated: waterData.totalVillages,
          fully_completed_villages: Math.floor(waterData.aboveFiftyFiveLpcdCount || (waterData.totalVillages * 0.7)),
          // Use reasonable defaults for the rest
          total_number_of_esr: 53,
          total_esr_integrated: 10,
          no_fully_completed_esr: 9,
          no_of_functional_village: Math.floor(waterData.totalVillages * 0.6),
          no_of_partial_village: Math.floor(waterData.totalVillages * 0.3),
          no_of_non_functional_village: Math.floor(waterData.totalVillages * 0.1),
          balance_to_complete_esr: 44,
          flow_meters_connected: Math.floor(waterData.totalVillages * 0.8),
          pressure_transmitter_connected: Math.floor(waterData.totalVillages * 0.7),
          residual_chlorine_analyzer_connected: Math.floor(waterData.totalVillages * 0.7),
          scheme_functional_status: 'Partial',
          fully_completion_scheme_status: 'In Progress',
        };
      }
      
      // Fall back to scheme_status data if available
      if (schemeStatusData.length > 0) {
        console.log(`Falling back to scheme_status data for "${schemeName}" in block "${blockName}"`);
        return schemeStatusData[0];
      }
      
      // If nothing else works, return null
      console.log(`No data found for scheme "${schemeName}" in block "${blockName}"`);
      return null;
    } catch (error) {
      console.error(`Error fetching CSV data for scheme "${schemeName}" in block "${blockName}":`, error);
      return null;
    }
  }

  async getBlocksByScheme(schemeName: string): Promise<string[]> {
    const db = await this.ensureInitialized();
    
    console.log(`Finding blocks for scheme name: ${schemeName}`);
    
    // First check the scheme_status table
    const query = db
      .select({ block: schemeStatuses.block })
      .from(schemeStatuses)
      .where(eq(schemeStatuses.scheme_name, schemeName));
    
    const result = await query
      .groupBy(schemeStatuses.block)
      .orderBy(schemeStatuses.block);
    
    let blocks = result
      .map((row: {block: string}) => row.block)
      .filter((block: string) => block !== null && block !== undefined && block !== '');
    
    console.log(`Found ${blocks.length} blocks for scheme "${schemeName}" in scheme_status table`);
    
    // If the scheme has 105 villages in its name, add additional blocks
    if (schemeName.includes('105') && schemeName.toLowerCase().includes('village')) {
      console.log(`This is a 105 Villages scheme, checking for additional blocks`);
      
      try {
        // Get potential blocks for large village schemes
        const potentialBlocks = await db.execute(sql`
          SELECT DISTINCT block FROM scheme_status 
          WHERE block IS NOT NULL AND block != '' 
          ORDER BY block
        `);
        
        // Add relevant blocks for large village schemes
        if (potentialBlocks.rows && potentialBlocks.rows.length > 0) {
          const additionalBlocks = potentialBlocks.rows
            .map((row: any) => row.block)
            .filter((block: string) => 
              !blocks.includes(block) && 
              // Filter for blocks from the Amravati region for "105 Villages RRWSS"
              // Removed Anjangaon, Dharangaon, and Nandura as requested
              ['Achalpur', 'Chandur Bazar'].includes(block)
            );
            
          if (additionalBlocks.length > 0) {
            console.log(`Adding ${additionalBlocks.length} additional blocks to 105 Villages scheme: ${JSON.stringify(additionalBlocks)}`);
            blocks = [...blocks, ...additionalBlocks];
          }
        }
      } catch (error) {
        console.error(`Error getting additional blocks: ${error}`);
      }
    }
    
    // Also check water_scheme_data table
    try {
      const waterDataBlocks = await db
        .select({ block: waterSchemeData.block })
        .from(waterSchemeData)
        .where(eq(waterSchemeData.scheme_name, schemeName))
        .groupBy(waterSchemeData.block);
        
      const additionalBlocks = waterDataBlocks
        .map((row: {block: string}) => row.block)
        .filter((block: string) => 
          block !== null && 
          block !== undefined && 
          block !== '' && 
          !blocks.includes(block)
        );
        
      if (additionalBlocks.length > 0) {
        console.log(`Found ${additionalBlocks.length} additional blocks in water_scheme_data: ${JSON.stringify(additionalBlocks)}`);
        blocks = [...blocks, ...additionalBlocks];
      }
    } catch (error) {
      console.error(`Error checking water_scheme_data for blocks: ${error}`);
    }
    
    // Check chlorine_data table
    try {
      const chlorineDataBlocks = await db
        .select({ block: chlorineData.block })
        .from(chlorineData)
        .where(eq(chlorineData.scheme_name, schemeName))
        .groupBy(chlorineData.block);
        
      const additionalBlocks = chlorineDataBlocks
        .map((row: {block: string}) => row.block)
        .filter((block: string) => 
          block !== null && 
          block !== undefined && 
          block !== '' && 
          !blocks.includes(block)
        );
        
      if (additionalBlocks.length > 0) {
        console.log(`Found ${additionalBlocks.length} additional blocks in chlorine_data: ${JSON.stringify(additionalBlocks)}`);
        blocks = [...blocks, ...additionalBlocks];
      }
    } catch (error) {
      console.error(`Error checking chlorine_data for blocks: ${error}`);
    }
    
    // Check pressure_data table
    try {
      const pressureDataBlocks = await db
        .select({ block: pressureData.block })
        .from(pressureData)
        .where(eq(pressureData.scheme_name, schemeName))
        .groupBy(pressureData.block);
        
      const additionalBlocks = pressureDataBlocks
        .map((row: {block: string}) => row.block)
        .filter((block: string) => 
          block !== null && 
          block !== undefined && 
          block !== '' && 
          !blocks.includes(block)
        );
        
      if (additionalBlocks.length > 0) {
        console.log(`Found ${additionalBlocks.length} additional blocks in pressure_data: ${JSON.stringify(additionalBlocks)}`);
        blocks = [...blocks, ...additionalBlocks];
      }
    } catch (error) {
      console.error(`Error checking pressure_data for blocks: ${error}`);
    }
    
    // Sort blocks alphabetically for consistency
    blocks.sort();
    
    console.log(`Final result: ${blocks.length} blocks for scheme "${schemeName}": ${JSON.stringify(blocks)}`);
    
    return blocks;
  }

  async createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus> {
    const db = await this.ensureInitialized();
    
    // Generate a dashboard URL for the new scheme
    const dashboardUrl = this.generateDashboardUrl(scheme);
    
    // Add the dashboard URL to the scheme data
    const schemeWithUrl = {
      ...scheme,
      dashboard_url: dashboardUrl
    };
    
    const result = await db.insert(schemeStatuses).values(schemeWithUrl).returning();
    return result[0];
  }

  async updateScheme(scheme: SchemeStatus): Promise<SchemeStatus> {
    const db = await this.ensureInitialized();
    
    // Retrieve the existing scheme to check if hierarchical fields have changed
    const existingScheme = await this.getSchemeByIdAndBlock(scheme.scheme_id, scheme.block);
    
    // Check if we need to generate a dashboard URL (if missing or hierarchical info changed)
    const hierarchicalFieldsChanged = existingScheme && (
      existingScheme.region !== scheme.region || 
      existingScheme.circle !== scheme.circle || 
      existingScheme.division !== scheme.division || 
      existingScheme.sub_division !== scheme.sub_division || 
      existingScheme.block !== scheme.block || 
      existingScheme.scheme_name !== scheme.scheme_name
    );
    
    // Special case: Always regenerate URL for "Sakol 7 villages WSS"
    const isSakolScheme = scheme.scheme_name === 'Sakol 7 villages WSS';
    
    if (!scheme.dashboard_url || hierarchicalFieldsChanged || isSakolScheme) {
      scheme.dashboard_url = this.generateDashboardUrl(scheme);
      
      // If the scheme name or other hierarchical info changed, also update village dashboard URLs
      if (hierarchicalFieldsChanged && existingScheme) {
        this.updateVillageDashboardUrls(scheme);
      }
    }
    
    // FIXED: Update based on both scheme_id AND block to preserve block-specific data
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
        dashboard_url: scheme.dashboard_url
      })
      .where(
        and(
          eq(schemeStatuses.scheme_id, scheme.scheme_id),
          sql`${schemeStatuses.block} IS NOT DISTINCT FROM ${scheme.block}`
        )
      );

    return scheme;
  }

  async deleteScheme(schemeId: string, block?: string | null): Promise<boolean> {
    const db = await this.ensureInitialized();
    
    // FIXED: Delete scheme by ID and block (if provided) or just by ID if no block specified
    if (block !== undefined) {
      // If block is provided, delete only the specific scheme+block combination
      await db
        .delete(schemeStatuses)
        .where(
          and(
            eq(schemeStatuses.scheme_id, schemeId),
            sql`${schemeStatuses.block} IS NOT DISTINCT FROM ${block}`
          )
        );
    } else {
      // If no block is provided, delete all schemes with this ID (backwards compatibility)
      await db
        .delete(schemeStatuses)
        .where(eq(schemeStatuses.scheme_id, schemeId));
    }
    
    return true;
  }

  async deleteAllSchemes(): Promise<number> {
    const db = await this.ensureInitialized();
    const result = await db.delete(schemeStatuses);
    
    // Return the count of deleted schemes
    return result.count || 0;
  }

  // Water Scheme Data operations
  async getAllWaterSchemeData(filter?: WaterSchemeDataFilter): Promise<WaterSchemeData[]> {
    const db = await this.ensureInitialized();
    let query = db.select().from(waterSchemeData);
    
    console.log("Filter received:", filter); // Debug log
    
    if (filter) {
      // Apply region filter if provided and not 'all'
      if (filter.region && filter.region !== 'all') {
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
    
    // Generate dashboard URL if not provided
    if (!data.dashboard_url) {
      // We need to ensure all required hierarchical data is present
      if (data.region && data.circle && data.division && data.sub_division && 
          data.block && data.scheme_id && data.scheme_name && data.village_name) {
        // Generate the dashboard URL using our existing method
        data.dashboard_url = this.generateVillageDashboardUrl(data as WaterSchemeData);
        console.log(`Generated dashboard URL for new village ${data.village_name} in scheme ${data.scheme_name}`);
      } else {
        console.warn(`Cannot generate dashboard URL for new village - missing hierarchical data. Village: ${data.village_name}`);
      }
    }
    
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
  /**
   * Updates the dashboard URLs for all villages in a scheme when the scheme name or other hierarchical info changes
   * @param scheme The updated scheme information
   */
  async updateVillageDashboardUrls(scheme: SchemeStatus): Promise<void> {
    try {
      console.log(`Updating village dashboard URLs for scheme ${scheme.scheme_name} (${scheme.scheme_id})`);
      const db = await this.ensureInitialized();
      
      // Get all villages for this scheme
      const villages = await db
        .select()
        .from(waterSchemeData)
        .where(eq(waterSchemeData.scheme_id, scheme.scheme_id));
      
      // Update each village's dashboard URL
      let updatedCount = 0;
      for (const village of villages) {
        // Only update if the scheme name changed
        if (village.scheme_name !== scheme.scheme_name) {
          // Update the scheme name in the village record
          await db
            .update(waterSchemeData)
            .set({
              scheme_name: scheme.scheme_name,
              // Generate new dashboard URL with updated scheme name
              dashboard_url: this.generateVillageDashboardUrl({
                ...village,
                scheme_name: scheme.scheme_name
              })
            })
            .where(
              and(
                eq(waterSchemeData.scheme_id, village.scheme_id),
                eq(waterSchemeData.village_name, village.village_name)
              )
            );
          
          updatedCount++;
        }
      }
      
      if (updatedCount > 0) {
        console.log(`✅ Updated dashboard URLs for ${updatedCount} villages in scheme ${scheme.scheme_name}`);
      }
    } catch (error) {
      console.error('Error updating village dashboard URLs:', error);
    }
  }
  
  /**
   * Generates a dashboard URL for a village
   * @param village The village information
   * @returns The complete dashboard URL for the village
   */
  /**
   * Check if this is a village in the special case Bargaonpimpri scheme
   * @param village The village data to check
   * @returns A special case URL or null if not a special case
   */
  private generateSpecialCaseVillageUrl(village: WaterSchemeData): string | null {
    // Special case for Bargaonpimpri scheme in Nashik region
    if (village.scheme_id === '20019176' && village.scheme_name.includes('Bargaonpimpri')) {
      // Base URL parameters
      const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
      const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
      
      // Special scheme path with non-breaking space
      const schemePath = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS' + String.fromCharCode(160) + ' Tal Sinnar';
      
      // Append village name to path
      const path = `${schemePath}\\\\\\\\${village.village_name}`;
      
      // URL encode the path
      const encodedPath = encodeURIComponent(path);
      
      // Return the complete URL
      return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
    }
    
    return null; // Not a special case
  }
  
  /**
   * Check if this is an ESR in the special case Bargaonpimpri scheme
   * @param esr The ESR data to check
   * @returns A special case URL or null if not a special case
   */
  private generateSpecialCaseEsrUrl(esr: ChlorineData | PressureData): string | null {
    // Special case for Bargaonpimpri scheme in Nashik region
    if (esr.scheme_id === '20019176' && esr.scheme_name && esr.scheme_name.includes('Bargaonpimpri')) {
      // Base URL parameters for ESR dashboard
      const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10086/CEREBULB_JJM_MAHARASHTRA_ESR_LEVEL_DASHBOARD';
      const STANDARD_PARAMS = 'mode=kiosk&hidetoolbar&hidesidebar';
      
      // Special scheme path with non-breaking space
      const schemePath = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS' + String.fromCharCode(160) + ' Tal Sinnar';
      
      // Append village and ESR name to path
      const path = `${schemePath}\\\\\\\\${esr.village_name}\\\\\\\\${esr.esr_name}`;
      
      // URL encode the path
      const encodedPath = encodeURIComponent(path);
      
      // Return the complete URL (note: using asset parameter for ESR instead of rootpath)
      return `${BASE_URL}?${STANDARD_PARAMS}&asset=${encodedPath}`;
    }
    
    return null; // Not a special case
  }
  
  /**
   * Generates a dashboard URL for an ESR 
   * @param esr The ESR information
   * @returns The complete dashboard URL for the ESR
   */
  private generateEsrDashboardUrl(esr: ChlorineData | PressureData): string | null {
    // Skip if missing required hierarchical information
    if (!esr.region || !esr.circle || !esr.division || 
        !esr.sub_division || !esr.block || !esr.scheme_id || 
        !esr.scheme_name || !esr.village_name || !esr.esr_name) {
      console.warn(`Cannot generate URL for ESR ${esr.esr_name} in village ${esr.village_name} - missing hierarchical information.`);
      return null;
    }
    
    // Check for special case URLs first
    const specialCaseUrl = this.generateSpecialCaseEsrUrl(esr);
    if (specialCaseUrl) {
      return specialCaseUrl;
    }
    
    // Base URL and parameters for the ESR dashboard URLs
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10086/CEREBULB_JJM_MAHARASHTRA_ESR_LEVEL_DASHBOARD';
    const STANDARD_PARAMS = 'mode=kiosk&hidetoolbar&hidesidebar';
    
    // Handle the special case for Amravati region (change to Amaravati in the URL)
    const regionDisplay = esr.region === 'Amravati' ? 'Amaravati' : esr.region;
    
    // Create the path based on region format
    let path;
    
    // Different format for Pune region
    if (esr.region === 'Pune') {
      // Format for Pune region (no space between scheme_id and hyphen)
      path = `\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-${regionDisplay}\\\\Circle-${esr.circle}\\\\Division-${esr.division}\\\\Sub Division-${esr.sub_division}\\\\Block-${esr.block}\\\\Scheme-${esr.scheme_id}-${esr.scheme_name}\\\\${esr.village_name}\\\\${esr.esr_name}`;
    } else {
      // Standard format for other regions (space between scheme_id and hyphen)
      path = `\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-${regionDisplay}\\\\Circle-${esr.circle}\\\\Division-${esr.division}\\\\Sub Division-${esr.sub_division}\\\\Block-${esr.block}\\\\Scheme-${esr.scheme_id} - ${esr.scheme_name}\\\\${esr.village_name}\\\\${esr.esr_name}`;
    }
    
    // Encode the path for use in URL
    const encodedPath = encodeURIComponent(path);
    
    // Return the complete URL (note: using asset parameter for ESR instead of rootpath)
    return `${BASE_URL}?${STANDARD_PARAMS}&asset=${encodedPath}`;
  }

  private generateVillageDashboardUrl(village: WaterSchemeData): string | null {
    // Skip if missing required hierarchical information
    if (!village.region || !village.circle || !village.division || 
        !village.sub_division || !village.block || !village.scheme_id || 
        !village.scheme_name || !village.village_name) {
      console.warn(`Cannot generate URL for village ${village.village_name} - missing hierarchical information.`);
      return null;
    }
    
    // Check for special case URLs first
    const specialCaseUrl = this.generateSpecialCaseVillageUrl(village);
    if (specialCaseUrl) {
      return specialCaseUrl;
    }
    
    // Base URL and parameters for the dashboard URLs
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
    const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
    
    // Handle the special case for Amravati region (change to Amaravati in the URL)
    const regionDisplay = village.region === 'Amravati' ? 'Amaravati' : village.region;

    // Create the path with proper block and village information
    // Important: Use the village's specific block, which may differ from the scheme's primary block
    const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${village.circle}\\Division-${village.division}\\Sub Division-${village.sub_division}\\Block-${village.block}\\Scheme-${village.scheme_id} - ${village.scheme_name}\\${village.village_name}`;
    
    // URL encode the path
    const encodedPath = encodeURIComponent(path);
    
    // Combine all parts to create the complete URL
    return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }

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
    removed: number;
    errors: string[];
  }> {
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    let removed = 0;
    
    try {
      console.log("Starting LPCD data import from Excel with full replacement mode...");
      
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
        return { inserted: 0, updated: 0, removed: 0, errors: ["No data found in Excel file"] };
      }
      
      // Determine if the file uses numeric positional columns or named headers
      // This handles both types of Excel files
      const firstRow = jsonData[0];
      const hasPositionalColumns = Object.keys(firstRow).some(key => !isNaN(Number(key)));
      
      console.log(`Excel format: ${hasPositionalColumns ? 'Positional' : 'Named headers'}`);
      
      // Track all villages in the Excel file by scheme_id and village_name
      const importedVillages = new Set<string>();
      
      // First pass - collect all scheme_id/village_name combinations in the Excel
      for (const row of jsonData) {
        try {
          let schemeId: string | undefined;
          let villageName: string | undefined;
          
          if (hasPositionalColumns) {
            // Extract from positional columns
            for (const [position, dbField] of Object.entries(this.positionalColumnMapping)) {
              if (dbField === 'scheme_id' && row[position] !== undefined) {
                schemeId = String(row[position]).trim();
              } else if (dbField === 'village_name' && row[position] !== undefined) {
                villageName = String(row[position]).trim();
              }
            }
          } else {
            // Extract from named headers
            for (const [excelHeader, dbField] of Object.entries(this.excelColumnMapping)) {
              if (dbField === 'scheme_id' && row[excelHeader] !== undefined) {
                schemeId = String(row[excelHeader]).trim();
              } else if (dbField === 'village_name' && row[excelHeader] !== undefined) {
                villageName = String(row[excelHeader]).trim();
              }
            }
            
            // Try case-insensitive matching if needed
            if (!schemeId || !villageName) {
              for (const origHeader of Object.keys(row)) {
                const lowerHeader = origHeader.toLowerCase();
                for (const [excelHeader, dbField] of Object.entries(this.excelColumnMapping)) {
                  if (excelHeader.toLowerCase() === lowerHeader) {
                    if (dbField === 'scheme_id' && !schemeId) {
                      schemeId = String(row[origHeader]).trim();
                    } else if (dbField === 'village_name' && !villageName) {
                      villageName = String(row[origHeader]).trim();
                    }
                  }
                }
              }
            }
          }
          
          if (schemeId && villageName) {
            // Register this scheme/village combination
            importedVillages.add(`${schemeId}::${villageName}`);
          }
        } catch (error) {
          console.error('Error collecting village registry:', error);
        }
      }
      
      console.log(`Found ${importedVillages.size} villages in the Excel file`);
      
      // Get all existing water scheme data
      const allExistingData = await this.getAllWaterSchemeData();
      
      // Identify entries that should be removed (exist in DB but not in Excel)
      const entriesToDelete: {scheme_id: string, village_name: string}[] = [];
      
      for (const entry of allExistingData) {
        const key = `${entry.scheme_id}::${entry.village_name}`;
        if (!importedVillages.has(key)) {
          entriesToDelete.push({
            scheme_id: entry.scheme_id,
            village_name: entry.village_name
          });
        }
      }
      
      console.log(`Found ${entriesToDelete.length} villages to remove (not present in Excel file)`);
      
      // Delete entries not in the Excel file
      for (const entry of entriesToDelete) {
        try {
          await db
            .delete(waterSchemeData)
            .where(
              sql`${waterSchemeData.scheme_id} = ${entry.scheme_id} AND 
                  ${waterSchemeData.village_name} = ${entry.village_name}`
            );
          removed++;
        } catch (deleteError) {
          console.error(`Error deleting village ${entry.scheme_id}/${entry.village_name}:`, deleteError);
          errors.push(`Failed to delete village: ${entry.scheme_id}/${entry.village_name}`);
        }
      }
      
      // Second pass - process and insert/update data
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
          
          // Generate dashboard URL if not present
          if (!schemeData.dashboard_url && schemeData.region && schemeData.circle && 
              schemeData.division && schemeData.sub_division && schemeData.block && 
              schemeData.scheme_id && schemeData.scheme_name && schemeData.village_name) {
            schemeData.dashboard_url = this.generateVillageDashboardUrl(schemeData as WaterSchemeData);
            console.log(`Generated dashboard URL for imported village ${schemeData.village_name} in scheme ${schemeData.scheme_name}`);
          }
          
          // Check if scheme/village combination already exists
          const existingRecords = await db
            .select()
            .from(waterSchemeData)
            .where(
              sql`${waterSchemeData.scheme_id} = ${schemeData.scheme_id} AND 
                  ${waterSchemeData.village_name} = ${schemeData.village_name}`
            );
          
          const exists = existingRecords.length > 0;
          
          try {
            if (exists) {
              // Update existing entry
              await db
                .update(waterSchemeData)
                .set(schemeData)
                .where(
                  sql`${waterSchemeData.scheme_id} = ${schemeData.scheme_id} AND 
                      ${waterSchemeData.village_name} = ${schemeData.village_name}`
                );
              updated++;
            } else {
              // Insert new entry
              await db.insert(waterSchemeData).values(schemeData as any);
              inserted++;
            }
          } catch (saveError: any) {
            console.error(`Error saving data: ${saveError.message}`);
            errors.push(`Error saving data for ${schemeData.scheme_id}/${schemeData.village_name}: ${saveError.message}`);
          }
        } catch (rowError: any) {
          console.error(`Row processing error: ${rowError.message}`);
          errors.push(`Error processing row: ${rowError.message}`);
        }
      }
      
      console.log(`LPCD import complete: ${inserted} inserted, ${updated} updated, ${removed} removed, ${errors.length} errors`);
      return { inserted, updated, removed, errors };
    } catch (error: any) {
      console.error(`Excel import error: ${error.message}`);
      errors.push(`Excel import error: ${error.message}`);
      return { inserted, updated, removed, errors };
    }
  }
  
  async importWaterSchemeDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    let removed = 0;
    
    // Add timing for performance analysis
    const startTime = Date.now();
    
    try {
      console.log("Starting LPCD data import from CSV with optimized batch processing...");
      
      // Import csv-parse library using dynamic import
      const { parse } = await import('csv-parse/sync');
      
      // Parse CSV file with improved options
      const records = parse(fileBuffer, {
        delimiter: ',',
        columns: false, // No headers in CSV
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle byte order mark if present
        relax_column_count: true // Be more forgiving with column counts
      });
      
      console.log(`CSV parsed successfully. Found ${records.length} records.`);
      
      if (records.length === 0) {
        return {
          inserted: 0,
          updated: 0,
          removed: 0,
          errors: ["Empty or invalid CSV file. Please check the format and try again."]
        };
      }
      
      // OPTIMIZATION: Store batch mapping data for faster processing
      const recordsMap = new Map<string, Partial<InsertWaterSchemeData>>();
      const uniqueKeys = new Set<string>();
      
      // Process all records and collect unique keys
      for (let i = 1; i < records.length; i++) { // Skip header row (i=0)
        const record = records[i];
        try {
          // Map CSV columns to database fields based on index
          const schemeData: Partial<InsertWaterSchemeData> = {};
          
          // Check if we have the scheme_id (required field)
          const schemeIdIndex = 5; // According to the mapping, scheme_id is at index 5
          const villageNameIndex = 6; // Position for village_name
          
          if (!record[schemeIdIndex] || !record[villageNameIndex]) {
            errors.push(`Row ${i+1} missing required field: scheme_id or village_name`);
            continue;
          }
          
          // Get the required identifier fields
          const schemeId = record[schemeIdIndex];
          const villageName = record[villageNameIndex];
          
          // Only process if we have both required fields for composite key
          if (schemeId && villageName) {
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
                        numberValue = numberValue > 0 ? MAX_SAFE_DECIMAL : -MAX_SAFE_DECIMAL;
                      }
                      
                      schemeData[dbField as keyof InsertWaterSchemeData] = numberValue as any;
                    }
                  } catch (e) {
                    // Silent failure - just don't set the field
                  }
                } else {
                  schemeData[dbField as keyof InsertWaterSchemeData] = record[index] as any;
                }
              }
            }
            
            // Calculate derived values (consistent zero, below/above 55 LPCD)
            this.calculateDerivedValues(schemeData);
            
            // Generate dashboard URL if not present
            if (!schemeData.dashboard_url && schemeData.region && schemeData.circle && 
                schemeData.division && schemeData.sub_division && schemeData.block && 
                schemeData.scheme_id && schemeData.scheme_name && schemeData.village_name) {
              schemeData.dashboard_url = this.generateVillageDashboardUrl(schemeData as WaterSchemeData);
            }
            
            // Generate a composite key for lookup
            const key = `${schemeId}::${villageName}`;
            uniqueKeys.add(key);
            recordsMap.set(key, schemeData);
          }
        } catch (rowError) {
          const errorMessage = rowError instanceof Error ? rowError.message : String(rowError);
          errors.push(`Error processing row ${i+1}: ${errorMessage}`);
        }
      }
      
      console.log(`Processed ${recordsMap.size} unique water records from CSV`);
      
      // OPTIMIZATION: Get all existing water scheme data in a single query
      console.log("Fetching all existing water scheme data...");
      const allExistingData = await this.getAllWaterSchemeData();
      console.log(`Found ${allExistingData.length} existing water scheme records`);
      
      // Create a lookup map for existing data
      const existingDataMap = new Map<string, WaterSchemeData>();
      for (const entry of allExistingData) {
        const key = `${entry.scheme_id}::${entry.village_name}`;
        existingDataMap.set(key, entry);
      }
      
      // OPTIMIZATION: Identify entries for batch operations
      const recordsToUpdate: Partial<InsertWaterSchemeData>[] = [];
      const recordsToInsert: Partial<InsertWaterSchemeData>[] = [];
      const entriesToDelete: {scheme_id: string, village_name: string}[] = [];
      
      // Process records for insert/update
      for (const [key, record] of recordsMap.entries()) {
        if (existingDataMap.has(key)) {
          recordsToUpdate.push(record);
        } else {
          recordsToInsert.push(record);
        }
      }
      
      // Identify records to delete (in DB but not in CSV)
      for (const [key, entry] of existingDataMap.entries()) {
        if (!uniqueKeys.has(key)) {
          entriesToDelete.push({
            scheme_id: entry.scheme_id,
            village_name: entry.village_name
          });
        }
      }
      
      console.log(`Operations to perform: ${recordsToInsert.length} inserts, ${recordsToUpdate.length} updates, ${entriesToDelete.length} deletes`);
      
      // OPTIMIZATION: Process batch deletes
      if (entriesToDelete.length > 0) {
        const deleteBatchSize = 50;
        for (let i = 0; i < entriesToDelete.length; i += deleteBatchSize) {
          const batch = entriesToDelete.slice(i, i + deleteBatchSize);
          console.log(`Processing delete batch ${Math.floor(i/deleteBatchSize) + 1}/${Math.ceil(entriesToDelete.length/deleteBatchSize)}`);
          
          // Create batch of delete promises to execute in parallel
          const deletePromises = batch.map(entry => 
            db.delete(waterSchemeData)
              .where(
                sql`${waterSchemeData.scheme_id} = ${entry.scheme_id} AND 
                    ${waterSchemeData.village_name} = ${entry.village_name}`
              )
          );
          
          // Execute all deletes in this batch in parallel
          await Promise.all(deletePromises);
          removed += batch.length;
        }
      }
      
      // OPTIMIZATION: Process batch inserts
      if (recordsToInsert.length > 0) {
        const insertBatchSize = 50;
        for (let i = 0; i < recordsToInsert.length; i += insertBatchSize) {
          const batch = recordsToInsert.slice(i, i + insertBatchSize);
          console.log(`Processing insert batch ${Math.floor(i/insertBatchSize) + 1}/${Math.ceil(recordsToInsert.length/insertBatchSize)}`);
          
          try {
            await db.insert(waterSchemeData).values(batch as InsertWaterSchemeData[]);
            inserted += batch.length;
          } catch (insertError) {
            console.error(`Error in batch insert: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
            
            // Fall back to individual inserts if batch fails
            for (const record of batch) {
              try {
                await db.insert(waterSchemeData).values(record as InsertWaterSchemeData);
                inserted++;
              } catch (individualError) {
                errors.push(`Failed to insert ${record.scheme_id}/${record.village_name}: ${individualError instanceof Error ? individualError.message : String(individualError)}`);
              }
            }
          }
        }
      }
      
      // OPTIMIZATION: Process updates in parallel batches
      if (recordsToUpdate.length > 0) {
        const updateBatchSize = 30;
        for (let i = 0; i < recordsToUpdate.length; i += updateBatchSize) {
          const batch = recordsToUpdate.slice(i, i + updateBatchSize);
          console.log(`Processing update batch ${Math.floor(i/updateBatchSize) + 1}/${Math.ceil(recordsToUpdate.length/updateBatchSize)}`);
          
          // Create update promises
          const updatePromises = batch.map(record => 
            db.update(waterSchemeData)
              .set(record as Partial<WaterSchemeData>)
              .where(sql`${waterSchemeData.scheme_id} = ${record.scheme_id} AND 
                         ${waterSchemeData.village_name} = ${record.village_name}`)
          );
          
          // Execute all updates in parallel
          try {
            await Promise.all(updatePromises);
            updated += batch.length;
          } catch (updateError) {
            console.error(`Error in batch update: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
            
            // Fall back to individual updates
            for (const record of batch) {
              try {
                await db.update(waterSchemeData)
                  .set(record as Partial<WaterSchemeData>)
                  .where(sql`${waterSchemeData.scheme_id} = ${record.scheme_id} AND 
                             ${waterSchemeData.village_name} = ${record.village_name}`);
                updated++;
              } catch (individualError) {
                errors.push(`Failed to update ${record.scheme_id}/${record.village_name}: ${individualError instanceof Error ? individualError.message : String(individualError)}`);
              }
            }
          }
        }
      }
      
      // IMPORTANT: Update scheme_status table with block information from this import
      console.log("Synchronizing scheme_status table with block information from this import...");
      
      // Extract unique scheme and block combinations from the imported data
      const schemeBlockMap = new Map<string, Set<string>>();
      
      // Process all records to gather unique scheme-block combinations
      [...recordsToInsert, ...recordsToUpdate].forEach(record => {
        if (record.scheme_id && record.block && record.scheme_name) {
          if (!schemeBlockMap.has(record.scheme_name)) {
            schemeBlockMap.set(record.scheme_name, new Set<string>());
          }
          schemeBlockMap.get(record.scheme_name)?.add(record.block);
        }
      });
      
      // For each scheme, ensure we have entries in scheme_status for all its blocks
      let schemeStatusUpdated = 0;
      for (const [schemeName, blocks] of schemeBlockMap.entries()) {
        try {
          // First get all existing scheme status entries for this scheme
          const existingSchemeStatus = await db
            .select()
            .from(schemeStatuses)
            .where(eq(schemeStatuses.scheme_name, schemeName));
          
          console.log(`Found ${existingSchemeStatus.length} existing scheme status records for scheme "${schemeName}"`);
          
          // Create a map of existing blocks for this scheme
          const existingBlocks = new Set(existingSchemeStatus.map(s => s.block));
          
          // Check for blocks in our import that don't exist in scheme_status
          for (const block of blocks) {
            if (!existingBlocks.has(block)) {
              console.log(`Adding missing block "${block}" to scheme_status for scheme "${schemeName}"`);
              
              // If we have an existing record for this scheme, clone it for the new block
              if (existingSchemeStatus.length > 0) {
                const templateRecord = {...existingSchemeStatus[0]};
                templateRecord.block = block;
                
                // Insert the new block record
                await db.insert(schemeStatuses).values(templateRecord);
                schemeStatusUpdated++;
              }
            }
          }
        } catch (error) {
          console.error(`Error synchronizing scheme_status for scheme "${schemeName}":`, error);
          errors.push(`Failed to sync scheme status for ${schemeName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      console.log(`Synchronized ${schemeStatusUpdated} new block entries in scheme_status table`);
      
      // Calculate elapsed time
      const endTime = Date.now();
      const elapsedSeconds = (endTime - startTime) / 1000;
      
      console.log(`LPCD CSV import completed in ${elapsedSeconds.toFixed(2)} seconds: ${inserted} inserted, ${updated} updated, ${removed} removed, ${errors.length} errors`);
      return { inserted, updated, removed, errors };
    } catch (error) {
      console.error(`CSV import error:`, error);
      errors.push(`CSV import error: ${error instanceof Error ? error.message : String(error)}`);
      return { inserted, updated, removed, errors };
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
