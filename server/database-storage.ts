import {
  users,
  regions,
  schemeStatuses,
  appState,
  waterSchemeData,
  chlorineData,
  pressureData,
  userLoginLogs,
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
  type UserLoginLog,
  type InsertUserLoginLog,
} from "@shared/schema";
import { db } from "./db-storage";
import { eq, and, like, desc } from "drizzle-orm";
import { IStorage, WaterSchemeDataFilter, ChlorineDataFilter, PressureDataFilter } from "./storage";

// Implementation of IStorage interface using Drizzle ORM with PostgreSQL
export class DatabaseStorage implements IStorage {
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

  // User login logging methods
  async logUserLogin(
    user: User,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<UserLoginLog> {
    const loginLog: InsertUserLoginLog = {
      user_id: user.id,
      username: user.username,
      user_name: user.name,
      login_time: new Date(), // Use Date object for proper timezone handling
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      session_id: sessionId || null,
    };

    const [log] = await db.insert(userLoginLogs).values(loginLog).returning();
    return log;
  }

  async logUserLogout(sessionId: string): Promise<void> {
    const logoutTime = new Date();
    
    // Find the most recent active login for this session
    const [activeLog] = await db
      .select()
      .from(userLoginLogs)
      .where(
        and(
          eq(userLoginLogs.session_id, sessionId),
          eq(userLoginLogs.is_active, true)
        )
      )
      .orderBy(desc(userLoginLogs.login_time))
      .limit(1);

    if (activeLog) {
      // Ensure both timestamps are treated as UTC for accurate duration calculation
      const loginTime = new Date(activeLog.login_time);
      const sessionDuration = Math.floor((logoutTime.getTime() - loginTime.getTime()) / 1000); // Duration in seconds

      await db
        .update(userLoginLogs)
        .set({
          logout_time: logoutTime, // Use Date object instead of string
          session_duration: sessionDuration,
          is_active: false,
        })
        .where(eq(userLoginLogs.id, activeLog.id));
    }
  }

  async getUserLoginLogs(limit: number = 50): Promise<UserLoginLog[]> {
    return await db
      .select()
      .from(userLoginLogs)
      .orderBy(userLoginLogs.login_time)
      .limit(limit);
  }

  async getUserLoginLogsByUserId(userId: number, limit: number = 20): Promise<UserLoginLog[]> {
    return await db
      .select()
      .from(userLoginLogs)
      .where(eq(userLoginLogs.user_id, userId))
      .orderBy(userLoginLogs.login_time)
      .limit(limit);
  }

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
    return [...new Set(blocks)]; // Return unique values only
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
}

// Export a singleton instance
export const storage = new DatabaseStorage();