import { users, regions, schemeStatuses, type User, type InsertUser, type Region, type InsertRegion, type SchemeStatus, type InsertSchemeStatus } from "@shared/schema";
import { getDB, initializeDatabase } from "./db";
import { eq, sql } from 'drizzle-orm';

// Interface for storage operations
export interface IStorage {
  // User operations (from original schema)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Region operations
  getAllRegions(): Promise<Region[]>;
  getRegionByName(regionName: string): Promise<Region | undefined>;
  getRegionSummary(regionName?: string): Promise<any>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(region: Region): Promise<Region>;
  
  // Scheme operations
  getAllSchemes(): Promise<SchemeStatus[]>;
  getSchemesByRegion(regionName: string): Promise<SchemeStatus[]>;
  getSchemeById(schemeId: number): Promise<SchemeStatus | undefined>;
  createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus>;
  updateScheme(scheme: SchemeStatus): Promise<SchemeStatus>;
  deleteScheme(schemeId: number): Promise<boolean>;
}

// PostgreSQL implementation
export class PostgresStorage implements IStorage {
  private db: any;
  private initialized: Promise<void>;

  constructor() {
    this.initialized = this.initializeDb().catch(error => {
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
    const result = await db.select().from(users).where(eq(users.username, username));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await this.ensureInitialized();
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Region methods
  async getAllRegions(): Promise<Region[]> {
    const db = await this.ensureInitialized();
    return db.select().from(regions).orderBy(regions.region_name);
  }

  async getRegionByName(regionName: string): Promise<Region | undefined> {
    const db = await this.ensureInitialized();
    const result = await db.select().from(regions).where(eq(regions.region_name, regionName));
    return result.length > 0 ? result[0] : undefined;
  }

  async getRegionSummary(regionName?: string): Promise<any> {
    const db = await this.ensureInitialized();
    
    if (regionName) {
      // If region is specified, get summary for that region
      const region = await this.getRegionByName(regionName);
      if (!region) return null;
      
      // Get actual count from schemes table
      const schemes = await db
        .select()
        .from(schemeStatuses)
        .where(eq(schemeStatuses.region_name, regionName));
      
      const total_schemes = schemes.length;
      const fully_completed = schemes.filter(s => s.scheme_completion_status === 'Fully-completed').length;
      
      return {
        total_schemes_integrated: total_schemes,
        fully_completed_schemes: fully_completed,
        total_villages_integrated: region.total_villages_integrated || 0,
        fully_completed_villages: region.fully_completed_villages || 0,
        total_esr_integrated: region.total_esr_integrated || 0,
        fully_completed_esr: region.fully_completed_esr || 0,
        partial_esr: region.partial_esr || 0
      };
    } else {
      // Use global_summary for total (all regions) values instead of summing up individual regions
      const globalSummary = await db.execute(sql`SELECT * FROM global_summary LIMIT 1`);
      
      if (globalSummary && globalSummary.rows && globalSummary.rows.length > 0) {
        const summary = globalSummary.rows[0];
        
        return {
          total_schemes_integrated: summary.total_schemes_integrated || 0,
          fully_completed_schemes: summary.fully_completed_schemes || 0,
          total_villages_integrated: summary.total_villages_integrated || 0,
          fully_completed_villages: summary.fully_completed_villages || 0,
          total_esr_integrated: summary.total_esr_integrated || 0,
          fully_completed_esr: summary.fully_completed_esr || 0,
          partial_esr: 0 // Not tracked in global summary
        };
      } else {
        // Fallback to summing regions if global summary doesn't exist
        const result = await db.select({
          total_schemes_integrated: sql<number>`SUM(${regions.total_schemes_integrated})`,
          fully_completed_schemes: sql<number>`SUM(${regions.fully_completed_schemes})`,
          total_villages_integrated: sql<number>`SUM(${regions.total_villages_integrated})`,
          fully_completed_villages: sql<number>`SUM(${regions.fully_completed_villages})`,
          total_esr_integrated: sql<number>`SUM(${regions.total_esr_integrated})`,
          fully_completed_esr: sql<number>`SUM(${regions.fully_completed_esr})`,
          partial_esr: sql<number>`SUM(${regions.partial_esr})`
        }).from(regions);
        
        return result[0];
      }
    }
  }

  async createRegion(region: InsertRegion): Promise<Region> {
    const db = await this.ensureInitialized();
    const result = await db.insert(regions).values(region).returning();
    return result[0];
  }

  async updateRegion(region: Region): Promise<Region> {
    const db = await this.ensureInitialized();
    await db.update(regions)
      .set({
        region_name: region.region_name,
        total_esr_integrated: region.total_esr_integrated,
        fully_completed_esr: region.fully_completed_esr,
        partial_esr: region.partial_esr,
        total_villages_integrated: region.total_villages_integrated,
        fully_completed_villages: region.fully_completed_villages,
        total_schemes_integrated: region.total_schemes_integrated,
        fully_completed_schemes: region.fully_completed_schemes
      })
      .where(eq(regions.region_id, region.region_id));
    
    return region;
  }

  // Scheme methods
  async getAllSchemes(): Promise<SchemeStatus[]> {
    const db = await this.ensureInitialized();
    return db.select().from(schemeStatuses).orderBy(schemeStatuses.region_name, schemeStatuses.scheme_name);
  }

  async getSchemesByRegion(regionName: string): Promise<SchemeStatus[]> {
    const db = await this.ensureInitialized();
    return db.select()
      .from(schemeStatuses)
      .where(eq(schemeStatuses.region_name, regionName))
      .orderBy(schemeStatuses.scheme_name);
  }

  async getSchemeById(schemeId: number): Promise<SchemeStatus | undefined> {
    const db = await this.ensureInitialized();
    const result = await db.select().from(schemeStatuses).where(eq(schemeStatuses.scheme_id, schemeId));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus> {
    const db = await this.ensureInitialized();
    const result = await db.insert(schemeStatuses).values(scheme).returning();
    return result[0];
  }
  
  async updateScheme(scheme: SchemeStatus): Promise<SchemeStatus> {
    const db = await this.ensureInitialized();
    await db.update(schemeStatuses)
      .set({
        scheme_name: scheme.scheme_name,
        region_name: scheme.region_name,
        agency: scheme.agency,
        total_villages_in_scheme: scheme.total_villages_in_scheme,
        total_esr_in_scheme: scheme.total_esr_in_scheme,
        villages_integrated_on_iot: scheme.villages_integrated_on_iot,
        fully_completed_villages: scheme.fully_completed_villages,
        esr_request_received: scheme.esr_request_received,
        esr_integrated_on_iot: scheme.esr_integrated_on_iot,
        fully_completed_esr: scheme.fully_completed_esr,
        balance_for_fully_completion: scheme.balance_for_fully_completion,
        fm_integrated: scheme.fm_integrated,
        rca_integrated: scheme.rca_integrated,
        pt_integrated: scheme.pt_integrated,
        scheme_completion_status: scheme.scheme_completion_status
      })
      .where(eq(schemeStatuses.scheme_id, scheme.scheme_id));
    
    return scheme;
  }
  
  async deleteScheme(schemeId: number): Promise<boolean> {
    const db = await this.ensureInitialized();
    const result = await db.delete(schemeStatuses).where(eq(schemeStatuses.scheme_id, schemeId));
    return true;
  }
}

export const storage = new PostgresStorage();
