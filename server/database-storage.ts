import {
  users,
  regions,
  schemeStatuses,
  appState,
  waterSchemeData,
  chlorineData,
  pressureData,
  reportFiles,
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
  type ReportFile,
  type InsertReportFile,
} from "@shared/schema";
import { db } from "./db-storage";
import { eq, and, like } from "drizzle-orm";
import { IStorage, WaterSchemeDataFilter, ChlorineDataFilter, PressureDataFilter } from "./storage";

// Implementation of IStorage interface using Drizzle ORM with PostgreSQL
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async validateUserCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  // Region operations
  async getAllRegions(): Promise<Region[]> {
    return await db.select().from(regions);
  }

  async getRegionByName(regionName: string): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.region_name, regionName));
    return region;
  }

  async getRegionSummary(regionName?: string): Promise<any> {
    if (regionName) {
      // Return summary for specific region
      const region = await this.getRegionByName(regionName);
      return region ? {
        regionName: region.region_name,
        totalEsrIntegrated: region.total_esr_integrated || 0,
        fullyCompletedEsr: region.fully_completed_esr || 0,
        totalVillagesIntegrated: region.total_villages_integrated || 0,
        fullyCompletedVillages: region.fully_completed_villages || 0,
        totalSchemesIntegrated: region.total_schemes_integrated || 0,
        fullyCompletedSchemes: region.fully_completed_schemes || 0,
        flowMeterIntegrated: region.flow_meter_integrated || 0,
        rcaIntegrated: region.rca_integrated || 0,
        pressureTransmitterIntegrated: region.pressure_transmitter_integrated || 0,
      } : null;
    } else {
      // Return summary for all regions combined
      const allRegions = await this.getAllRegions();
      const summary = {
        totalEsrIntegrated: 0,
        fullyCompletedEsr: 0,
        totalVillagesIntegrated: 0,
        fullyCompletedVillages: 0,
        totalSchemesIntegrated: 0,
        fullyCompletedSchemes: 0,
        flowMeterIntegrated: 0,
        rcaIntegrated: 0,
        pressureTransmitterIntegrated: 0,
      };

      allRegions.forEach(region => {
        summary.totalEsrIntegrated += region.total_esr_integrated || 0;
        summary.fullyCompletedEsr += region.fully_completed_esr || 0;
        summary.totalVillagesIntegrated += region.total_villages_integrated || 0;
        summary.fullyCompletedVillages += region.fully_completed_villages || 0;
        summary.totalSchemesIntegrated += region.total_schemes_integrated || 0;
        summary.fullyCompletedSchemes += region.fully_completed_schemes || 0;
        summary.flowMeterIntegrated += region.flow_meter_integrated || 0;
        summary.rcaIntegrated += region.rca_integrated || 0;
        summary.pressureTransmitterIntegrated += region.pressure_transmitter_integrated || 0;
      });

      return summary;
    }
  }

  async createRegion(region: InsertRegion): Promise<Region> {
    const [createdRegion] = await db.insert(regions).values(region).returning();
    return createdRegion;
  }

  async updateRegion(region: Region): Promise<Region> {
    const [updatedRegion] = await db
      .update(regions)
      .set(region)
      .where(eq(regions.region_id, region.region_id))
      .returning();
    return updatedRegion;
  }

  // Scheme operations
  async getAllSchemes(
    statusFilter?: string,
    schemeId?: string,
  ): Promise<SchemeStatus[]> {
    let query = db.select().from(schemeStatuses);
    
    if (statusFilter) {
      query = query.where(eq(schemeStatuses.fully_completion_scheme_status, statusFilter));
    }
    
    if (schemeId) {
      query = query.where(eq(schemeStatuses.scheme_id, schemeId));
    }
    
    return await query;
  }

  async getSchemesByRegion(
    regionName: string,
    statusFilter?: string,
    schemeId?: string,
  ): Promise<SchemeStatus[]> {
    let query = db.select().from(schemeStatuses).where(eq(schemeStatuses.region, regionName));
    
    if (statusFilter) {
      query = query.where(eq(schemeStatuses.fully_completion_scheme_status, statusFilter));
    }
    
    if (schemeId) {
      query = query.where(eq(schemeStatuses.scheme_id, schemeId));
    }
    
    return await query;
  }

  async getSchemeById(schemeId: string): Promise<SchemeStatus | undefined> {
    const [scheme] = await db.select().from(schemeStatuses).where(eq(schemeStatuses.scheme_id, schemeId));
    return scheme;
  }

  async getSchemeByIdAndBlock(schemeId: string, block: string | null): Promise<SchemeStatus | undefined> {
    if (block) {
      const [scheme] = await db
        .select()
        .from(schemeStatuses)
        .where(and(
          eq(schemeStatuses.scheme_id, schemeId),
          eq(schemeStatuses.block, block)
        ));
      return scheme;
    } else {
      return this.getSchemeById(schemeId);
    }
  }

  async getSchemesByName(schemeName: string): Promise<SchemeStatus[]> {
    return await db
      .select()
      .from(schemeStatuses)
      .where(like(schemeStatuses.scheme_name, `%${schemeName}%`));
  }

  async getBlocksByScheme(schemeName: string): Promise<string[]> {
    const schemes = await this.getSchemesByName(schemeName);
    const blocks = schemes
      .map(scheme => scheme.block)
      .filter((block): block is string => block !== null && block !== undefined);
    return Array.from(new Set(blocks)); // Return unique values only
  }

  async createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus> {
    const [createdScheme] = await db.insert(schemeStatuses).values(scheme).returning();
    return createdScheme;
  }

  async updateScheme(scheme: SchemeStatus): Promise<SchemeStatus> {
    // Since there's no primary key, we need to identify the record by scheme_id and block
    const [updatedScheme] = await db
      .update(schemeStatuses)
      .set(scheme)
      .where(and(
        eq(schemeStatuses.scheme_id, scheme.scheme_id),
        scheme.block ? eq(schemeStatuses.block, scheme.block) : undefined
      ))
      .returning();
    return updatedScheme;
  }

  async deleteScheme(schemeId: string): Promise<boolean> {
    const result = await db
      .delete(schemeStatuses)
      .where(eq(schemeStatuses.scheme_id, schemeId));
    return true; // In Drizzle, successful operations don't typically return data
  }

  // Updates operations
  async getTodayUpdates(): Promise<any[]> {
    // This would typically be implemented with a more complex query
    // Here's a simplified version that returns an empty array
    return [];
  }
  
  // Water Scheme Data operations
  async getAllWaterSchemeData(filter?: WaterSchemeDataFilter): Promise<WaterSchemeData[]> {
    let query = db.select().from(waterSchemeData);
    
    if (filter) {
      if (filter.region) {
        query = query.where(eq(waterSchemeData.region, filter.region));
      }
      
      // Add more complex filtering logic as needed
    }
    
    return await query;
  }

  async getWaterSchemeDataById(schemeId: string): Promise<WaterSchemeData | undefined> {
    const [data] = await db.select().from(waterSchemeData).where(eq(waterSchemeData.scheme_id, schemeId));
    return data;
  }

  async createWaterSchemeData(data: InsertWaterSchemeData): Promise<WaterSchemeData> {
    const [createdData] = await db.insert(waterSchemeData).values(data).returning();
    return createdData;
  }

  async updateWaterSchemeData(schemeId: string, data: UpdateWaterSchemeData): Promise<WaterSchemeData> {
    const [updatedData] = await db
      .update(waterSchemeData)
      .set(data)
      .where(eq(waterSchemeData.scheme_id, schemeId))
      .returning();
    return updatedData;
  }

  async deleteWaterSchemeData(schemeId: string): Promise<boolean> {
    await db.delete(waterSchemeData).where(eq(waterSchemeData.scheme_id, schemeId));
    return true;
  }

  async importWaterSchemeDataFromExcel(fileBuffer: Buffer): Promise<{ inserted: number; updated: number; removed: number; errors: string[] }> {
    // Simplified implementation - would normally parse Excel file
    return { inserted: 0, updated: 0, removed: 0, errors: [] };
  }

  async importWaterSchemeDataFromCSV(fileBuffer: Buffer): Promise<{ inserted: number; updated: number; removed: number; errors: string[] }> {
    // Simplified implementation - would normally parse CSV file
    return { inserted: 0, updated: 0, removed: 0, errors: [] };
  }
  
  // Chlorine Data operations
  async getAllChlorineData(filter?: ChlorineDataFilter): Promise<ChlorineData[]> {
    let query = db.select().from(chlorineData);
    
    if (filter) {
      if (filter.region) {
        query = query.where(eq(chlorineData.region, filter.region));
      }
      
      // Add more complex filtering logic as needed
    }
    
    return await query;
  }

  async getChlorineDataByCompositeKey(schemeId: string, villageName: string, esrName: string): Promise<ChlorineData | undefined> {
    const [data] = await db
      .select()
      .from(chlorineData)
      .where(and(
        eq(chlorineData.scheme_id, schemeId),
        eq(chlorineData.village_name, villageName),
        eq(chlorineData.esr_name, esrName)
      ));
    return data;
  }

  async createChlorineData(data: InsertChlorineData): Promise<ChlorineData> {
    const [createdData] = await db.insert(chlorineData).values(data).returning();
    return createdData;
  }

  async updateChlorineData(schemeId: string, villageName: string, esrName: string, data: UpdateChlorineData): Promise<ChlorineData> {
    const [updatedData] = await db
      .update(chlorineData)
      .set(data)
      .where(and(
        eq(chlorineData.scheme_id, schemeId),
        eq(chlorineData.village_name, villageName),
        eq(chlorineData.esr_name, esrName)
      ))
      .returning();
    return updatedData;
  }

  async deleteChlorineData(schemeId: string, villageName: string, esrName: string): Promise<boolean> {
    await db
      .delete(chlorineData)
      .where(and(
        eq(chlorineData.scheme_id, schemeId),
        eq(chlorineData.village_name, villageName),
        eq(chlorineData.esr_name, esrName)
      ));
    return true;
  }

  async importChlorineDataFromExcel(fileBuffer: Buffer): Promise<{ inserted: number; updated: number; removed: number; errors: string[] }> {
    // Simplified implementation - would normally parse Excel file
    return { inserted: 0, updated: 0, removed: 0, errors: [] };
  }

  async importChlorineDataFromCSV(fileBuffer: Buffer): Promise<{ inserted: number; updated: number; removed: number; errors: string[] }> {
    // Simplified implementation - would normally parse CSV file
    return { inserted: 0, updated: 0, removed: 0, errors: [] };
  }
  
  // Chlorine Dashboard operations
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
    // Simplified implementation - would normally perform complex queries
    return {
      totalSensors: 0,
      belowRangeSensors: 0,
      optimalRangeSensors: 0,
      aboveRangeSensors: 0,
      consistentZeroSensors: 0,
      consistentBelowRangeSensors: 0,
      consistentOptimalSensors: 0,
      consistentAboveRangeSensors: 0,
    };
  }
  
  // Pressure Data operations
  async getAllPressureData(filter?: PressureDataFilter): Promise<PressureData[]> {
    let query = db.select().from(pressureData);
    
    if (filter) {
      if (filter.region) {
        query = query.where(eq(pressureData.region, filter.region));
      }
      
      // Add more complex filtering logic as needed
    }
    
    return await query;
  }

  async getPressureDataByCompositeKey(schemeId: string, villageName: string, esrName: string): Promise<PressureData | undefined> {
    const [data] = await db
      .select()
      .from(pressureData)
      .where(and(
        eq(pressureData.scheme_id, schemeId),
        eq(pressureData.village_name, villageName),
        eq(pressureData.esr_name, esrName)
      ));
    return data;
  }

  async createPressureData(data: InsertPressureData): Promise<PressureData> {
    const [createdData] = await db.insert(pressureData).values(data).returning();
    return createdData;
  }

  async updatePressureData(schemeId: string, villageName: string, esrName: string, data: UpdatePressureData): Promise<PressureData> {
    const [updatedData] = await db
      .update(pressureData)
      .set(data)
      .where(and(
        eq(pressureData.scheme_id, schemeId),
        eq(pressureData.village_name, villageName),
        eq(pressureData.esr_name, esrName)
      ))
      .returning();
    return updatedData;
  }

  async deletePressureData(schemeId: string, villageName: string, esrName: string): Promise<boolean> {
    await db
      .delete(pressureData)
      .where(and(
        eq(pressureData.scheme_id, schemeId),
        eq(pressureData.village_name, villageName),
        eq(pressureData.esr_name, esrName)
      ));
    return true;
  }

  async importPressureDataFromCSV(fileBuffer: Buffer): Promise<{ inserted: number; updated: number; removed: number; errors: string[] }> {
    // Simplified implementation - would normally parse CSV file
    return { inserted: 0, updated: 0, removed: 0, errors: [] };
  }
  
  // Pressure Dashboard operations
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
    // Simplified implementation - would normally perform complex queries
    return {
      totalSensors: 0,
      belowRangeSensors: 0,
      optimalRangeSensors: 0,
      aboveRangeSensors: 0,
      consistentZeroSensors: 0,
      consistentBelowRangeSensors: 0,
      consistentOptimalSensors: 0,
      consistentAboveRangeSensors: 0,
    };
  }

  // Report File operations
  async getAllReportFiles(): Promise<ReportFile[]> {
    try {
      console.log("DatabaseStorage: Getting all active report files");
      const allFiles = await db.select().from(reportFiles);
      // Filter active files in memory
      return allFiles.filter(file => file.is_active === true);
    } catch (error) {
      console.error("Error getting report files:", error);
      // Return empty array on error for better fault tolerance
      return [];
    }
  }

  async getReportFileById(id: string): Promise<ReportFile | undefined> {
    try {
      const fileId = parseInt(id);
      if (isNaN(fileId)) {
        return undefined;
      }
      
      const [file] = await db.select().from(reportFiles).where(eq(reportFiles.id, fileId));
      return file;
    } catch (error) {
      console.error("Error getting report file by ID:", error);
      return undefined;
    }
  }

  async getReportFilesByType(reportType: string): Promise<ReportFile[]> {
    try {
      const files = await db.select().from(reportFiles)
        .where(and(
          eq(reportFiles.report_type, reportType),
          eq(reportFiles.is_active, true)
        ));
      return files;
    } catch (error) {
      console.error("Error getting report files by type:", error);
      return [];
    }
  }

  async createReportFile(data: InsertReportFile): Promise<ReportFile> {
    try {
      const [file] = await db.insert(reportFiles).values(data).returning();
      return file;
    } catch (error) {
      console.error("Error creating report file:", error);
      throw error;
    }
  }

  async updateReportFile(id: string, data: Partial<ReportFile>): Promise<ReportFile> {
    try {
      const fileId = parseInt(id);
      if (isNaN(fileId)) {
        throw new Error("Invalid file ID");
      }
      
      const [file] = await db
        .update(reportFiles)
        .set(data)
        .where(eq(reportFiles.id, fileId))
        .returning();
      return file;
    } catch (error) {
      console.error("Error updating report file:", error);
      throw error;
    }
  }

  async deleteReportFile(id: string): Promise<boolean> {
    try {
      const fileId = parseInt(id);
      if (isNaN(fileId)) {
        return false;
      }
      
      // Soft delete (set is_active to false)
      await db
        .update(reportFiles)
        .set({ is_active: false })
        .where(eq(reportFiles.id, fileId));
      
      return true;
    } catch (error) {
      console.error("Error deleting report file:", error);
      return false;
    }
  }

  async deactivateReportFilesByType(reportType: string): Promise<boolean> {
    try {
      // Deactivate all files of a specific type
      await db
        .update(reportFiles)
        .set({ is_active: false })
        .where(eq(reportFiles.report_type, reportType));
      
      return true;
    } catch (error) {
      console.error("Error deactivating report files by type:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();