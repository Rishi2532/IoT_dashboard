import {
  users,
  regions,
  schemeStatuses,
  type User,
  type InsertUser,
  type Region,
  type InsertRegion,
  type SchemeStatus,
  type InsertSchemeStatus,
} from "@shared/schema";
import { getDB, initializeDatabase } from "./db";
import { eq, sql } from "drizzle-orm";

// Declare global variables for storing updates data
declare global {
  var todayUpdates: any[];
  var lastUpdateDay: string;
  var prevTotals: {
    villages: number;
    esr: number;
    completedSchemes: number;
    flowMeters: number;
    rca: number;
    pt: number;
  };
}

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateUserCredentials(username: string, password: string): Promise<User | null>;

  // Region operations
  getAllRegions(): Promise<Region[]>;
  getRegionByName(regionName: string): Promise<Region | undefined>;
  getRegionSummary(regionName?: string): Promise<any>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(region: Region): Promise<Region>;

  // Scheme operations
  getAllSchemes(statusFilter?: string): Promise<SchemeStatus[]>;
  getSchemesByRegion(
    regionName: string,
    statusFilter?: string,
  ): Promise<SchemeStatus[]>;
  getSchemeById(schemeId: number): Promise<SchemeStatus | undefined>;
  createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus>;
  updateScheme(scheme: SchemeStatus): Promise<SchemeStatus>;
  deleteScheme(schemeId: number): Promise<boolean>;
  
  // Updates operations
  getTodayUpdates(): Promise<any[]>;
}

// PostgreSQL implementation
export class PostgresStorage implements IStorage {
  private db: any;
  private initialized: Promise<void>;

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
  
  async validateUserCredentials(username: string, password: string): Promise<User | null> {
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
        pressure_transmitter_integrated: region.pressure_transmitter_integrated || 0,
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
  async getAllSchemes(statusFilter?: string): Promise<SchemeStatus[]> {
    const db = await this.ensureInitialized();

    if (statusFilter && statusFilter !== "all") {
      return db
        .select()
        .from(schemeStatuses)
        .where(
          sql`${schemeStatuses.scheme_status} = ${statusFilter}`,
        )
        .orderBy(schemeStatuses.region_name, schemeStatuses.scheme_name);
    }

    return db
      .select()
      .from(schemeStatuses)
      .orderBy(schemeStatuses.region_name, schemeStatuses.scheme_name);
  }

  async getSchemesByRegion(
    regionName: string,
    statusFilter?: string,
  ): Promise<SchemeStatus[]> {
    const db = await this.ensureInitialized();

    if (statusFilter && statusFilter !== "all") {
      return db
        .select()
        .from(schemeStatuses)
        .where(
          sql`${schemeStatuses.region_name} = ${regionName} AND ${schemeStatuses.scheme_status} = ${statusFilter}`,
        )
        .orderBy(schemeStatuses.scheme_name);
    }

    return db
      .select()
      .from(schemeStatuses)
      .where(eq(schemeStatuses.region_name, regionName))
      .orderBy(schemeStatuses.scheme_name);
  }

  async getSchemeById(schemeId: number): Promise<SchemeStatus | undefined> {
    const db = await this.ensureInitialized();
    const result = await db
      .select()
      .from(schemeStatuses)
      .where(eq(schemeStatuses.sr_no, schemeId));
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
        region_name: scheme.region_name,
        scheme_id: scheme.scheme_id,
        agency: scheme.agency,
        total_villages: scheme.total_villages,
        functional_villages: scheme.functional_villages,
        partial_villages: scheme.partial_villages,
        non_functional_villages: scheme.non_functional_villages,
        fully_completed_villages: scheme.fully_completed_villages,
        total_esr: scheme.total_esr,
        scheme_functional_status: scheme.scheme_functional_status,
        fully_completed_esr: scheme.fully_completed_esr,
        balance_esr: scheme.balance_esr,
        flow_meters_connected: scheme.flow_meters_connected,
        pressure_transmitters_connected: scheme.pressure_transmitters_connected,
        residual_chlorine_connected: scheme.residual_chlorine_connected,
        scheme_status: scheme.scheme_status
      })
      .where(eq(schemeStatuses.sr_no, scheme.sr_no));

    return scheme;
  }

  async deleteScheme(schemeId: number): Promise<boolean> {
    const db = await this.ensureInitialized();
    const result = await db
      .delete(schemeStatuses)
      .where(eq(schemeStatuses.sr_no, schemeId));
    return true;
  }
  
  // We're now using global variables instead of static class variables
  // This makes the data accessible across different instances and module reloads
  
  async getTodayUpdates(): Promise<any[]> {
    const db = await this.ensureInitialized();
    console.log("Fetching today's updates");
    
    try {
      // Initialize global variable to store today's updates if it doesn't exist
      if (!(global as any).todayUpdates) {
        (global as any).todayUpdates = [];
      }
      
      // Check if this is the first time running or if it's a new day
      const now = new Date();
      if (!(global as any).lastUpdateDay) {
        (global as any).lastUpdateDay = now.toISOString().split('T')[0]; // Store just the date part
      } else {
        const today = now.toISOString().split('T')[0];
        if (today !== (global as any).lastUpdateDay) {
          // It's a new day, reset updates
          (global as any).todayUpdates = [];
          (global as any).lastUpdateDay = today;
        }
      }
      
      // Get current regions data
      const regionsData = await db.select().from(regions);
      const allSchemes = await this.getAllSchemes();
      
      // Get current totals
      const currentTotals = {
        villages: regionsData.reduce((sum: number, region: any) => sum + (region.total_villages_integrated || 0), 0),
        esr: regionsData.reduce((sum: number, region: any) => sum + (region.total_esr_integrated || 0), 0),
        completedSchemes: allSchemes.filter(scheme => scheme.scheme_status === 'Fully-Completed').length,
        flowMeters: regionsData.reduce((sum: number, region: any) => sum + (region.flow_meter_integrated || 0), 0),
        rca: regionsData.reduce((sum: number, region: any) => sum + (region.rca_integrated || 0), 0),
        pt: regionsData.reduce((sum: number, region: any) => sum + (region.pressure_transmitter_integrated || 0), 0)
      };
      
      // Store previous totals
      if (!(global as any).prevTotals) {
        (global as any).prevTotals = { ...currentTotals };
      }
      
      // Calculate differences since last check
      const updates: any[] = [];
      
      // Check for NEW village updates since last check
      const newVillages = currentTotals.villages - (global as any).prevTotals.villages;
      if (newVillages > 0) {
        updates.push({ 
          type: 'village', 
          count: newVillages,
          status: 'new',
          timestamp: new Date().toISOString()
        });
      }
      
      // Check for NEW ESR updates since last check
      const newESR = currentTotals.esr - (global as any).prevTotals.esr;
      if (newESR > 0) {
        updates.push({ 
          type: 'esr', 
          count: newESR,
          status: 'new',
          timestamp: new Date().toISOString()
        });
      }
      
      // Check for NEW completed schemes since last check
      const newCompletedSchemes = currentTotals.completedSchemes - (global as any).prevTotals.completedSchemes;
      if (newCompletedSchemes > 0) {
        updates.push({
          type: 'scheme',
          count: newCompletedSchemes,
          status: 'completed',
          timestamp: new Date().toISOString()
        });
      }
      
      // Check for NEW flow meters since last check
      const newFlowMeters = currentTotals.flowMeters - (global as any).prevTotals.flowMeters;
      if (newFlowMeters > 0) {
        updates.push({
          type: 'flow_meter',
          count: newFlowMeters,
          status: 'new',
          timestamp: new Date().toISOString()
        });
      }
      
      // Check for NEW RCAs since last check
      const newRCA = currentTotals.rca - (global as any).prevTotals.rca;
      if (newRCA > 0) {
        updates.push({
          type: 'rca',
          count: newRCA,
          status: 'new',
          timestamp: new Date().toISOString()
        });
      }
      
      // Check for NEW pressure transmitters since last check
      const newPT = currentTotals.pt - (global as any).prevTotals.pt;
      if (newPT > 0) {
        updates.push({
          type: 'pressure_transmitter',
          count: newPT,
          status: 'new',
          timestamp: new Date().toISOString()
        });
      }
      
      // Update previous totals
      (global as any).prevTotals = { ...currentTotals };
      
      // Add new updates to today's updates
      if (updates.length > 0) {
        // Enrich updates with region info for better display
        const enrichedUpdates = updates.map(update => {
          return {
            ...update,
            region: "All Regions" // Default to all regions for system-generated updates
          };
        });
        
        (global as any).todayUpdates = [...enrichedUpdates, ...(global as any).todayUpdates];
      }
      
      // Return updates for today
      return (global as any).todayUpdates;
    } catch (error) {
      console.error("Error fetching today's updates:", error);
      throw error;
    }
  }
}

export const storage = new PostgresStorage();
