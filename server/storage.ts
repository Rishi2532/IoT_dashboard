import { users, type User, type InsertUser, type Region, type SchemeStatus } from "@shared/schema";
import { open, initializeDatabase } from "./db";

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
  
  // Scheme operations
  getAllSchemes(): Promise<SchemeStatus[]>;
  getSchemesByRegion(regionName: string): Promise<SchemeStatus[]>;
  getSchemeById(schemeId: number): Promise<SchemeStatus | undefined>;
}

// In-memory implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private regions: Map<number, Region>;
  private schemes: Map<number, SchemeStatus>;
  private currentUserId: number;
  private db: any;
  private initialized: Promise<void>;

  constructor() {
    this.users = new Map();
    this.regions = new Map();
    this.schemes = new Map();
    this.currentUserId = 1;
    
    // Store the initialization promise so we can await it in other methods
    this.initialized = this.initializeDb().catch(error => {
      console.error("Failed to initialize database in constructor:", error);
      throw error;
    });
  }
  
  // Method to ensure DB is initialized before proceeding with operations
  private async ensureInitialized() {
    await this.initialized;
  }

  private async initializeDb() {
    try {
      // Use the initialized database
      this.db = await initializeDatabase();
      
      // Load regions from SQLite
      const regions = await this.db.all("SELECT * FROM region");
      regions.forEach((region: any) => {
        this.regions.set(region.region_id, {
          region_id: region.region_id,
          region_name: region.region_name,
          total_esr_integrated: region.total_esr_integrated,
          fully_completed_esr: region.fully_completed_esr,
          partial_esr: region.partial_esr,
          total_villages_integrated: region.total_villages_integrated,
          fully_completed_villages: region.fully_completed_villages,
          total_schemes_integrated: region.total_schemes_integrated,
          fully_completed_schemes: region.fully_completed_schemes
        });
      });
      
      // Load schemes from SQLite
      const schemes = await this.db.all("SELECT * FROM scheme_status");
      schemes.forEach((scheme: any) => {
        this.schemes.set(scheme.scheme_id, {
          scheme_id: scheme.scheme_id,
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
        });
      });
    } catch (error) {
      console.error("Error initializing database in storage:", error);
      throw error;
    }
  }

  // User methods (from original schema)
  async getUser(id: number): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Region methods
  async getAllRegions(): Promise<Region[]> {
    await this.ensureInitialized();
    return Array.from(this.regions.values());
  }

  async getRegionByName(regionName: string): Promise<Region | undefined> {
    await this.ensureInitialized();
    return Array.from(this.regions.values()).find(
      (region) => region.region_name === regionName
    );
  }

  async getRegionSummary(regionName?: string): Promise<any> {
    await this.ensureInitialized();
    if (regionName) {
      // If region is specified, get summary for that region
      const region = await this.getRegionByName(regionName);
      if (!region) return null;
      
      return {
        total_schemes_integrated: region.total_schemes_integrated,
        fully_completed_schemes: region.fully_completed_schemes,
        total_villages_integrated: region.total_villages_integrated,
        fully_completed_villages: region.fully_completed_villages,
        total_esr_integrated: region.total_esr_integrated,
        fully_completed_esr: region.fully_completed_esr
      };
    } else {
      // Otherwise, get total summary across all regions
      const regions = await this.getAllRegions();
      
      return {
        total_schemes_integrated: regions.reduce((sum, region) => sum + (region.total_schemes_integrated || 0), 0),
        fully_completed_schemes: regions.reduce((sum, region) => sum + (region.fully_completed_schemes || 0), 0),
        total_villages_integrated: regions.reduce((sum, region) => sum + (region.total_villages_integrated || 0), 0),
        fully_completed_villages: regions.reduce((sum, region) => sum + (region.fully_completed_villages || 0), 0),
        total_esr_integrated: regions.reduce((sum, region) => sum + (region.total_esr_integrated || 0), 0),
        fully_completed_esr: regions.reduce((sum, region) => sum + (region.fully_completed_esr || 0), 0)
      };
    }
  }

  // Scheme methods
  async getAllSchemes(): Promise<SchemeStatus[]> {
    await this.ensureInitialized();
    return Array.from(this.schemes.values());
  }

  async getSchemesByRegion(regionName: string): Promise<SchemeStatus[]> {
    await this.ensureInitialized();
    return Array.from(this.schemes.values()).filter(
      (scheme) => scheme.region_name === regionName
    );
  }

  async getSchemeById(schemeId: number): Promise<SchemeStatus | undefined> {
    await this.ensureInitialized();
    return this.schemes.get(schemeId);
  }
}

export const storage = new MemStorage();
