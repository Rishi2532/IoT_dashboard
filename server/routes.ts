import type { Express, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertRegionSchema, 
  insertSchemeStatusSchema, 
  regions, 
  loginSchema,
  registerUserSchema
} from "@shared/schema";
import { z } from "zod";
import { updateRegionSummaries, resetRegionData, getDB } from "./db";
import { eq } from "drizzle-orm";
import 'express-session';
import multer from 'multer';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { log } from './vite';




// Extend Express Request type to include session properties
declare module 'express-session' {
  interface Session {
    userId?: number;
    isAdmin?: boolean;
  }
}

import { Request } from 'express';

// Authentication middleware - checks if user is logged in
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized. Please login." });
  }
  next();
};

// Admin authorization middleware - checks if logged in user is an admin
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId || !req.session.isAdmin) {
    return res.status(403).json({ message: "Forbidden. Admin privileges required." });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  
  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Validate request body using registerUserSchema (includes confirm password)
      const registerData = registerUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(registerData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Remove confirmPassword before creating user as it's not in our database schema
      const { confirmPassword, ...userData } = registerData;
      
      // Create the new user
      const newUser = await storage.createUser(userData);
      
      // Return success without sensitive data
      res.status(201).json({ 
        message: "User registered successfully",
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: error.errors 
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.validateUserCredentials(
        credentials.username, 
        credentials.password
      );
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set a session value to track login
      if (req.session) {
        req.session.userId = user.id;
        req.session.isAdmin = user.role === "admin";
      }
      
      res.json({ 
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        isAdmin: user.role === "admin"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid login data", 
          errors: error.errors 
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  // Check auth status
  app.get("/api/auth/status", (req, res) => {
    const isLoggedIn = req.session && req.session.userId;
    const isAdmin = req.session && req.session.isAdmin === true;
    res.json({ isLoggedIn, isAdmin });
  });
  
  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err: Error | null) => {
        if (err) {
          return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } else {
      res.json({ message: "Not logged in" });
    }
  });
  
  // Get all regions
  app.get("/api/regions", async (req, res) => {
    try {
      const regions = await storage.getAllRegions();
      res.json(regions);
    } catch (error) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ message: "Failed to fetch regions" });
    }
  });

  // Get region summary (filtered by region if provided)
  app.get("/api/regions/summary", async (req, res) => {
    try {
      const regionName = req.query.region as string;
      // Handle "all" value as no specific region
      const regionNameToUse = regionName === "all" ? undefined : regionName;
      const summary = await storage.getRegionSummary(regionNameToUse);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching region summary:", error);
      res.status(500).json({ message: "Failed to fetch region summary" });
    }
  });
  
  // Get today's updates (new and completed items)
  app.get("/api/updates/today", async (req, res) => {
    try {
      const todayUpdates = await storage.getTodayUpdates();
      res.json(todayUpdates);
    } catch (error) {
      console.error("Error fetching today's updates:", error);
      res.status(500).json({ message: "Failed to fetch today's updates" });
    }
  });

  // Get a specific region by name
  app.get("/api/regions/:name", async (req, res) => {
    try {
      const regionName = req.params.name;
      const region = await storage.getRegionByName(regionName);
      
      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }
      
      res.json(region);
    } catch (error) {
      console.error("Error fetching region:", error);
      res.status(500).json({ message: "Failed to fetch region" });
    }
  });
  
  // Create a new region
  app.post("/api/regions", async (req, res) => {
    try {
      const regionData = insertRegionSchema.parse(req.body);
      const newRegion = await storage.createRegion(regionData);
      res.status(201).json(newRegion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid region data", 
          errors: error.errors 
        });
      }
      console.error("Error creating region:", error);
      res.status(500).json({ message: "Failed to create region" });
    }
  });
  
  // Update an existing region
  app.put("/api/regions/:id", async (req, res) => {
    try {
      const regionId = parseInt(req.params.id);
      
      if (isNaN(regionId)) {
        return res.status(400).json({ message: "Invalid region ID" });
      }
      
      const regionData = req.body;
      
      // Ensure the ID in the path matches the ID in the body
      if (regionData.region_id !== regionId) {
        return res.status(400).json({ message: "Region ID mismatch" });
      }
      
      const existingRegion = await storage.getRegionByName(regionData.region_name);
      
      if (!existingRegion) {
        return res.status(404).json({ message: "Region not found" });
      }
      
      const updatedRegion = await storage.updateRegion(regionData);
      res.json(updatedRegion);
    } catch (error) {
      console.error("Error updating region:", error);
      res.status(500).json({ message: "Failed to update region" });
    }
  });

  // Get all schemes with optional region, status, and scheme_id filters
  app.get("/api/schemes", async (req, res) => {
    try {
      const regionName = req.query.region as string;
      const status = req.query.status as string;
      const schemeId = req.query.scheme_id as string;
      
      let schemes;
      
      if (regionName && regionName !== "all") {
        // Pass the filters to storage method for database filtering
        schemes = await storage.getSchemesByRegion(regionName, status, schemeId);
      } else {
        // Pass the filters to storage method for database filtering
        schemes = await storage.getAllSchemes(status, schemeId);
      }
      
      res.json(schemes);
    } catch (error) {
      console.error("Error fetching schemes:", error);
      res.status(500).json({ message: "Failed to fetch schemes" });
    }
  });

  // Get a specific scheme by ID
  app.get("/api/schemes/:id", async (req, res) => {
    try {
      const schemeId = req.params.id;
      
      if (!schemeId || schemeId.trim() === '') {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }
      
      const scheme = await storage.getSchemeById(schemeId);
      
      if (!scheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }
      
      res.json(scheme);
    } catch (error) {
      console.error("Error fetching scheme:", error);
      res.status(500).json({ message: "Failed to fetch scheme" });
    }
  });
  
  // Create a new scheme
  app.post("/api/schemes", async (req, res) => {
    try {
      const schemeData = insertSchemeStatusSchema.parse(req.body);
      const newScheme = await storage.createScheme(schemeData);
      res.status(201).json(newScheme);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid scheme data", 
          errors: error.errors 
        });
      }
      console.error("Error creating scheme:", error);
      res.status(500).json({ message: "Failed to create scheme" });
    }
  });
  
  // Update an existing scheme
  app.put("/api/schemes/:id", async (req, res) => {
    try {
      const schemeId = req.params.id;
      
      if (!schemeId || schemeId.trim() === '') {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }
      
      const schemeData = req.body;
      
      // Ensure the ID in the path matches the ID in the body
      if (schemeData.scheme_id !== schemeId) {
        return res.status(400).json({ message: "Scheme ID mismatch" });
      }
      
      const existingScheme = await storage.getSchemeById(schemeId);
      
      if (!existingScheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }
      
      const updatedScheme = await storage.updateScheme(schemeData);
      res.json(updatedScheme);
    } catch (error) {
      console.error("Error updating scheme:", error);
      res.status(500).json({ message: "Failed to update scheme" });
    }
  });
  
  // Delete a scheme
  app.delete("/api/schemes/:id", async (req, res) => {
    try {
      const schemeId = req.params.id;
      
      if (!schemeId || schemeId.trim() === '') {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }
      
      const existingScheme = await storage.getSchemeById(schemeId);
      
      if (!existingScheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }
      
      await storage.deleteScheme(schemeId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting scheme:", error);
      res.status(500).json({ message: "Failed to delete scheme" });
    }
  });

  // Update region summaries based on current scheme data
  app.post("/api/admin/update-region-summaries", requireAdmin, async (req, res) => {
    try {
      await updateRegionSummaries();
      res.status(200).json({ message: "Region summaries updated successfully" });
    } catch (error) {
      console.error("Error updating region summaries:", error);
      res.status(500).json({ message: "Failed to update region summaries" });
    }
  });
  
  // Reset region data to original values (only for admin use)
  app.post("/api/admin/reset-region-data", requireAdmin, async (req, res) => {
    try {
      await resetRegionData();
      res.status(200).json({ message: "Region data reset successfully" });
    } catch (error) {
      console.error("Error resetting region data:", error);
      res.status(500).json({ message: "Failed to reset region data" });
    }
  });
  
  // Reset individual region data (only for admin use)
  app.post("/api/admin/reset-region/:name", requireAdmin, async (req, res) => {
    try {
      const regionName = req.params.name;
      const db = await getDB();
      
      // Reset data for the specific region based on the region name
      if (regionName === "Nagpur") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 116,
            fully_completed_esr: 58,
            partial_esr: 58,
            total_villages_integrated: 91,
            fully_completed_villages: 38,
            total_schemes_integrated: 15,
            fully_completed_schemes: 9,
          })
          .where(eq(regions.region_name, "Nagpur"));
      } else if (regionName === "Chhatrapati Sambhajinagar") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 147,
            fully_completed_esr: 73,
            partial_esr: 69,
            total_villages_integrated: 140,
            fully_completed_villages: 71,
            total_schemes_integrated: 10,
            fully_completed_schemes: 2,
          })
          .where(eq(regions.region_name, "Chhatrapati Sambhajinagar"));
      } else if (regionName === "Pune") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 97,
            fully_completed_esr: 31,
            partial_esr: 66,
            total_villages_integrated: 53,
            fully_completed_villages: 16,
            total_schemes_integrated: 9,
            fully_completed_schemes: 0,
          })
          .where(eq(regions.region_name, "Pune"));
      } else if (regionName === "Konkan") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 11,
            fully_completed_esr: 1,
            partial_esr: 10,
            total_villages_integrated: 11,
            fully_completed_villages: 0,
            total_schemes_integrated: 4,
            fully_completed_schemes: 0,
          })
          .where(eq(regions.region_name, "Konkan"));
      } else if (regionName === "Amravati") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 149,
            fully_completed_esr: 59,
            partial_esr: 86,
            total_villages_integrated: 121,
            fully_completed_villages: 24,
            total_schemes_integrated: 11,
            fully_completed_schemes: 1,
          })
          .where(eq(regions.region_name, "Amravati"));
      } else if (regionName === "Nashik") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 106,
            fully_completed_esr: 23,
            partial_esr: 46,
            total_villages_integrated: 76,
            fully_completed_villages: 4,
            total_schemes_integrated: 11,
            fully_completed_schemes: 1,
          })
          .where(eq(regions.region_name, "Nashik"));
      } else {
        return res.status(400).json({ message: "Invalid region name" });
      }
      
      res.status(200).json({ message: `${regionName} region data reset successfully` });
    } catch (error) {
      console.error("Error resetting region data:", error);
      res.status(500).json({ message: "Failed to reset region data" });
    }
  });
  
  // Get component integration data for reports
  app.get("/api/reports/component-integration", async (req, res) => {
    try {
      const allSchemes = await storage.getAllSchemes();
      
      // Calculate component integration totals by region
      const regionComponentData = [];
      const regions = await storage.getAllRegions();
      
      for (const region of regions) {
        const regionSchemes = allSchemes.filter(
          scheme => scheme.region_name === region.region_name
        );
        
        // Sum up component integration values
        const regionData = {
          region_name: region.region_name,
          flow_meter_integrated: regionSchemes.reduce(
            (sum, scheme) => sum + (scheme.flow_meters_connected || 0), 0
          ),
          rca_integrated: regionSchemes.reduce(
            (sum, scheme) => sum + (scheme.residual_chlorine_connected || 0), 0
          ),
          pressure_transmitter_integrated: regionSchemes.reduce(
            (sum, scheme) => sum + (scheme.pressure_transmitters_connected || 0), 0
          )
        };
        
        regionComponentData.push(regionData);
      }
      
      res.json(regionComponentData);
    } catch (error) {
      console.error("Error fetching component integration data:", error);
      res.status(500).json({ message: "Failed to fetch component integration data" });
    }
  });
  
  // Configure file upload middleware with memory storage
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });
  
  // Import region data from Excel
  app.post("/api/admin/import/regions", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileBuffer = req.file.buffer;
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Assume the first sheet is the one we want
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with header: true to use first row as keys
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
      
      log(`Processing ${jsonData.length} rows of region data...`, 'import');
      
      let updatedCount = 0;
      const db = await getDB();
      
      // Reference data for flow meters to ensure they're not reset to 0
      const flowMeterData = [
        {
          name: "Nagpur",
          flow_meter_integrated: 113,
          rca_integrated: 113, 
          pressure_transmitter_integrated: 63
        },
        {
          name: "Chhatrapati Sambhajinagar",
          flow_meter_integrated: 132,
          rca_integrated: 138,
          pressure_transmitter_integrated: 93
        },
        {
          name: "Pune",
          flow_meter_integrated: 95,
          rca_integrated: 65,
          pressure_transmitter_integrated: 49
        },
        {
          name: "Konkan",
          flow_meter_integrated: 11,
          rca_integrated: 10,
          pressure_transmitter_integrated: 3
        },
        {
          name: "Amravati",
          flow_meter_integrated: 143,
          rca_integrated: 95,
          pressure_transmitter_integrated: 111
        },
        {
          name: "Nashik",
          flow_meter_integrated: 81,
          rca_integrated: 82,
          pressure_transmitter_integrated: 38
        }
      ];
      
      for (const row of jsonData) {
        try {
          // Filter regions to include only the specified ones
          const region = String(row['Region Name'] || '').trim();
          const validRegions = ['Amravati', 'Nashik', 'Nagpur', 'Pune', 'Konkan', 'Chhatrapati Sambhajinagar'];
          
          if (!validRegions.includes(region)) {
            log(`Skipping row - region ${region} is not in the list of valid regions`, 'import');
            continue;
          }
          
          // Get stored flow meter values for this region
          const storedValues = flowMeterData.find(r => r.name === region);
          
          // Map Excel columns to database fields
          const regionData = {
            region_name: region,
            total_esr_integrated: Number(row['Total ESR Integrated'] || 0),
            fully_completed_esr: Number(row['Fully Completed ESR'] || 0),
            partial_esr: Number(row['Partial ESR'] || 0),
            total_villages_integrated: Number(row['Total Villages Integrated'] || 0),
            fully_completed_villages: Number(row['Fully Completed Villages'] || 0),
            total_schemes_integrated: Number(row['Total Schemes Integrated'] || 0),
            fully_completed_schemes: Number(row['Fully Completed Schemes'] || 0),
            // Get flow meter values from Excel or use stored values as fallback
            flow_meter_integrated: Number(row['Flow Meter Integrated']) || (storedValues ? storedValues.flow_meter_integrated : 0),
            rca_integrated: Number(row['RCA Integrated']) || (storedValues ? storedValues.rca_integrated : 0),
            pressure_transmitter_integrated: Number(row['Pressure Transmitter Integrated']) || (storedValues ? storedValues.pressure_transmitter_integrated : 0)
          };
          
          if (!regionData.region_name) {
            log(`Skipping row - missing region name`, 'import');
            continue;
          }
          
          // Check if region exists
          const existingRegion = await storage.getRegionByName(regionData.region_name);
          
          if (existingRegion) {
            // Get existing meter values, defaulting to 0 if null
            const existingFlowMeter = existingRegion.flow_meter_integrated ?? 0;
            const existingRca = existingRegion.rca_integrated ?? 0;
            const existingPt = existingRegion.pressure_transmitter_integrated ?? 0;
            
            // Detect if there are new additions to track in today's updates
            const existingEsrCount = existingRegion.total_esr_integrated ?? 0;
            const existingVillageCount = existingRegion.total_villages_integrated ?? 0;
            const newEsrCount = regionData.total_esr_integrated - existingEsrCount;
            const newVillageCount = regionData.total_villages_integrated - existingVillageCount;
            
            // Collect all updates in an array
            const newUpdates = [];
            
            // Add to today's updates if there are new additions
            if (newEsrCount > 0) {
              console.log(`Adding ${newEsrCount} new ESRs to today's updates for ${regionData.region_name}`);
              newUpdates.push({
                type: 'esr',
                count: newEsrCount,
                status: 'new',
                region: regionData.region_name,
                timestamp: new Date().toISOString()
              });
            }
            
            if (newVillageCount > 0) {
              console.log(`Adding ${newVillageCount} new villages to today's updates for ${regionData.region_name}`);
              newUpdates.push({
                type: 'village',
                count: newVillageCount,
                status: 'new',
                region: regionData.region_name,
                timestamp: new Date().toISOString()
              });
            }
            
            // Track flow meter updates if there are any changes
            const newFlowMeters = regionData.flow_meter_integrated - existingFlowMeter;
            const newRcas = regionData.rca_integrated - existingRca;
            const newPts = regionData.pressure_transmitter_integrated - existingPt;
            
            // Add to today's updates if there are new flow meter additions
            if (newFlowMeters > 0) {
              console.log(`Adding ${newFlowMeters} new flow meters to today's updates for ${regionData.region_name}`);
              newUpdates.push({
                type: 'flow_meter',
                count: newFlowMeters,
                status: 'new',
                region: regionData.region_name,
                timestamp: new Date().toISOString()
              });
            }
            
            // Add to today's updates if there are new RCA additions
            if (newRcas > 0) {
              console.log(`Adding ${newRcas} new RCAs to today's updates for ${regionData.region_name}`);
              newUpdates.push({
                type: 'rca',
                count: newRcas,
                status: 'new',
                region: regionData.region_name,
                timestamp: new Date().toISOString()
              });
            }
            
            // Add to today's updates if there are new pressure transmitter additions
            if (newPts > 0) {
              console.log(`Adding ${newPts} new pressure transmitters to today's updates for ${regionData.region_name}`);
              newUpdates.push({
                type: 'pressure_transmitter',
                count: newPts,
                status: 'new',
                region: regionData.region_name,
                timestamp: new Date().toISOString()
              });
            }
            
            // Add all updates to the global updates array in one go
            if (newUpdates.length > 0) {
              // Initialize global.todayUpdates if it doesn't exist
              if (!(global as any).todayUpdates) {
                (global as any).todayUpdates = [];
              }
              
              // Add all new updates at the beginning of the existing updates
              (global as any).todayUpdates = [...newUpdates, ...(global as any).todayUpdates];
              
              console.log(`Added ${newUpdates.length} updates to today's updates for ${regionData.region_name}`);
            }
            
            // Update existing region, using the new flow meter values from Excel
            const updatedRegion = {
              ...existingRegion,
              total_esr_integrated: regionData.total_esr_integrated,
              fully_completed_esr: regionData.fully_completed_esr,
              partial_esr: regionData.partial_esr,
              total_villages_integrated: regionData.total_villages_integrated,
              fully_completed_villages: regionData.fully_completed_villages,
              total_schemes_integrated: regionData.total_schemes_integrated,
              fully_completed_schemes: regionData.fully_completed_schemes,
              // Use the new flow meter values from Excel
              flow_meter_integrated: regionData.flow_meter_integrated,
              rca_integrated: regionData.rca_integrated,
              pressure_transmitter_integrated: regionData.pressure_transmitter_integrated
            };
            
            await storage.updateRegion(updatedRegion);
            updatedCount++;
            log(`Updated region: ${regionData.region_name}`, 'import');
          } else {
            // Create new region
            const newRegion = {
              region_name: regionData.region_name,
              total_esr_integrated: regionData.total_esr_integrated,
              fully_completed_esr: regionData.fully_completed_esr,
              partial_esr: regionData.partial_esr,
              total_villages_integrated: regionData.total_villages_integrated,
              fully_completed_villages: regionData.fully_completed_villages,
              total_schemes_integrated: regionData.total_schemes_integrated,
              fully_completed_schemes: regionData.fully_completed_schemes,
              flow_meter_integrated: regionData.flow_meter_integrated,
              rca_integrated: regionData.rca_integrated,
              pressure_transmitter_integrated: regionData.pressure_transmitter_integrated
            };
            
            await storage.createRegion(newRegion);
            updatedCount++;
            log(`Created new region: ${regionData.region_name}`, 'import');
          }
        } catch (rowError) {
          console.error(`Error processing row:`, row, rowError);
          // Continue with next row
        }
      }
      
      // Update region summaries after import
      await updateRegionSummaries();
      
      res.json({ 
        message: `Region data imported successfully. ${updatedCount} regions updated.`,
        updatedCount 
      });
    } catch (error) {
      console.error("Error importing region data:", error);
      res.status(500).json({ message: "Failed to import region data" });
    }
  });
  
  // Import scheme data from Excel
  app.post("/api/admin/import/schemes", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileBuffer = req.file.buffer;
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Assume the first sheet is the one we want
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with header: true to use first row as keys
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
      
      log(`Processing ${jsonData.length} rows of scheme data...`, 'import');
      
      let updatedCount = 0;
      const db = await getDB();
      
      for (const row of jsonData) {
        try {
          // Skip rows that don't have the required regions
          const region = String(row['Region Name'] || '').trim();
          const validRegions = ['Amravati', 'Nashik', 'Nagpur', 'Pune', 'Konkan', 'Chhatrapati Sambhajinagar'];
          
          if (!validRegions.includes(region)) {
            log(`Skipping row - region ${region} is not in the list of valid regions`, 'import');
            continue;
          }
          
          // Map Excel columns to database fields
          const schemeData = {
            scheme_id: String(row['Scheme ID'] || '0'),
            scheme_name: String(row['Scheme Name'] || ''),
            region_name: region,
            agency: row['Agency'] ? String(row['Agency']) : null,
            total_villages_in_scheme: Number(row['Total Villages In Scheme'] || 0),
            total_esr_in_scheme: Number(row['Total ESR In Scheme'] || 0),
            villages_integrated_on_iot: Number(row['Villages Integrated on IoT'] || 0),
            fully_completed_villages: Number(row['Fully Completed Villages'] || 0),
            esr_request_received: Number(row['ESR Request Received'] || 0),
            esr_integrated_on_iot: Number(row['ESR Integrated on IoT'] || 0),
            fully_completed_esr: Number(row['Fully Completed ESR'] || 0),
            balance_for_fully_completion: Number(row['Balance For Fully Completion'] || 0),
            flow_meters_connected: Number(row['FM Integrated'] || 0),
            residual_chlorine_connected: Number(row['RCA Integrated'] || 0), // RCA is Residual Chlorine Analyzer
            pressure_transmitters_connected: Number(row['PT Integrated'] || 0),
            scheme_status: String(row['Scheme Completion Status'] || 'Not-Connected').trim()
          };
          
          // Ensure required fields are present
          if (!schemeData.scheme_name) {
            log(`Skipping row - missing scheme name`, 'import');
            continue;
          }
          
          // Handle potential string ID conversion issues
          if (!schemeData.scheme_id || schemeData.scheme_id === '0') {
            log(`Warning: Invalid scheme_id for ${schemeData.scheme_name}, generating a new ID...`, 'import');
            // For missing or invalid IDs, we'll need to query an existing one or generate a new one
            const allSchemes = await storage.getAllSchemes();
            // Find the maximum numeric ID and add 1, then convert back to string
            const maxId = allSchemes.reduce((max, scheme) => {
              const id = parseInt(scheme.scheme_id || '0');
              return isNaN(id) ? max : Math.max(max, id);
            }, 0);
            schemeData.scheme_id = String(maxId + 1);
          }
          
          // Check if scheme exists
          const existingScheme = await storage.getSchemeById(schemeData.scheme_id);
          
          if (existingScheme) {
            // Check if there are any changes in the key metrics to log in today's updates
            const existingFmCount = existingScheme.flow_meters_connected ?? 0;
            const existingRcaCount = existingScheme.residual_chlorine_connected ?? 0;
            const existingPtCount = existingScheme.pressure_transmitters_connected ?? 0;
            
            const newFmCount = Number(schemeData.flow_meters_connected) - Number(existingFmCount);
            const newRcaCount = Number(schemeData.residual_chlorine_connected) - Number(existingRcaCount);
            const newPtCount = Number(schemeData.pressure_transmitters_connected) - Number(existingPtCount);
            
            // Collect all updates in an array
            const schemeUpdates = [];
            
            // Track new flow meter additions
            if (newFmCount > 0) {
              console.log(`Adding ${newFmCount} new Flow Meters to today's updates for ${schemeData.scheme_name}`);
              schemeUpdates.push({
                type: 'flow_meter',
                count: newFmCount,
                status: 'new',
                region: schemeData.region_name,
                scheme: schemeData.scheme_name,
                timestamp: new Date().toISOString()
              });
            }
            
            // Track new RCA additions
            if (newRcaCount > 0) {
              console.log(`Adding ${newRcaCount} new RCAs to today's updates for ${schemeData.scheme_name}`);
              schemeUpdates.push({
                type: 'rca',
                count: newRcaCount,
                status: 'new',
                region: schemeData.region_name,
                scheme: schemeData.scheme_name,
                timestamp: new Date().toISOString()
              });
            }
            
            // Track new Pressure Transmitter additions
            if (newPtCount > 0) {
              console.log(`Adding ${newPtCount} new Pressure Transmitters to today's updates for ${schemeData.scheme_name}`);
              schemeUpdates.push({
                type: 'pressure_transmitter',
                count: newPtCount,
                status: 'new',
                region: schemeData.region_name,
                scheme: schemeData.scheme_name,
                timestamp: new Date().toISOString()
              });
            }
            
            // Add all updates to global storage
            if (schemeUpdates.length > 0) {
              // Initialize global todayUpdates if needed
              if (!(global as any).todayUpdates) {
                (global as any).todayUpdates = [];
              }
              
              // Add new updates at the beginning
              (global as any).todayUpdates = [...schemeUpdates, ...(global as any).todayUpdates];
              console.log(`Added ${schemeUpdates.length} updates for scheme ${schemeData.scheme_name}`);
            }
            
            // Update existing scheme
            const updatedScheme = {
              ...existingScheme,
              ...schemeData
            };
            
            await storage.updateScheme(updatedScheme);
            updatedCount++;
            log(`Updated scheme: ${schemeData.scheme_name} (ID: ${schemeData.scheme_id})`, 'import');
          } else {
            // Create new scheme and log it as a new addition
            await storage.createScheme(schemeData);
            
            // Add the new scheme to today's updates
            if (!(global as any).todayUpdates) {
              (global as any).todayUpdates = [];
            }
            
            // Add new scheme update at the beginning
            (global as any).todayUpdates.unshift({
              type: 'scheme',
              count: 1,
              status: 'new',
              region: schemeData.region_name,
              scheme: schemeData.scheme_name,
              timestamp: new Date().toISOString()
            });
            
            updatedCount++;
            log(`Created new scheme: ${schemeData.scheme_name} (ID: ${schemeData.scheme_id})`, 'import');
          }
        } catch (rowError) {
          console.error(`Error processing scheme row:`, row, rowError);
          // Continue with next row
        }
      }
      
      // Update region summaries after import
      await updateRegionSummaries();
      
      res.json({ 
        message: `Scheme data imported successfully. ${updatedCount} schemes updated.`,
        updatedCount
      });
    } catch (error) {
      console.error("Error importing scheme data:", error);
      res.status(500).json({ message: "Failed to import scheme data" });
    }
  });

  // No AI Image Generation endpoint needed for this project

  // New Excel Import for updated data format
  app.post("/api/admin/import-excel", requireAdmin, upload.single('excelFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileBuffer = req.file.buffer;
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Column mappings
      const COLUMN_MAPPINGS = {
        // Primary columns from Region sheets
        'Total Villages Integrated': 'villages_integrated',
        'Fully Completed Villages': 'fully_completed_villages',
        'Total ESR Integrated': 'esr_integrated_on_iot',
        'No. Fully Completed ESR': 'fully_completed_esr',
        ' Flow Meters Connected': 'flow_meters_connected', // Note the space in the column name
        'Residual Chlorine Analyzer Connected': 'residual_chlorine_connected',
        'Pressure Transmitter Connected': 'pressure_transmitters_connected',
        'Fully completion Scheme Status': 'scheme_status',
        
        // Alternative versions for consistency
        'Flow Meters Connected': 'flow_meters_connected',
        'No. of Functional Village': 'fully_completed_villages',
        'No. of Fully Completed ESR': 'fully_completed_esr',
        'Flow Meter Connected': 'flow_meters_connected',
        'RCA Connected': 'residual_chlorine_connected',
        'Pressure Transmitter': 'pressure_transmitters_connected',
        'Scheme Status': 'scheme_status',
        'Scheme status': 'scheme_status',
        
        // Additional alternate column names from actual Excel files
        'Total Villages': 'villages_integrated',
        'Villages Integrated': 'villages_integrated',
        'Functional Villages': 'fully_completed_villages',
        'ESR Integrated': 'esr_integrated_on_iot',
        'ESR Fully Completed': 'fully_completed_esr',
        'Residual Chlorine': 'residual_chlorine_connected',
        'Residual Chlorine Analyzers': 'residual_chlorine_connected', 
        'PT Connected': 'pressure_transmitters_connected',
        'Pressure Transmitters': 'pressure_transmitters_connected',
        'Flow Meters': 'flow_meters_connected',
        'FM Connected': 'flow_meters_connected',
        'Status': 'scheme_status',
        
        // Handle alternative column names from datalink sheets
        'villages_integrated': 'villages_integrated',
        'fully_completed_villages': 'fully_completed_villages',
        'esr_integrated': 'esr_integrated_on_iot',
        'fully_completed_esr': 'fully_completed_esr',
        'flow_meters': 'flow_meters_connected',
        'residual_chlorine': 'residual_chlorine_connected',
        'pressure_transmitters': 'pressure_transmitters_connected',
        'scheme_status': 'scheme_status',
      };
      
      // Region name mapping - exact matches for known sheet names
      const REGION_SHEET_MAPPING: Record<string, string> = {
        'Region - Amravati': 'Amravati',
        'Region - CS': 'Chhatrapati Sambhajinagar',
        'Region - Konkan': 'Konkan',
        'Region - Nagpur': 'Nagpur',
        'Region - Nashik': 'Nashik',
        'Region - Pune': 'Pune',
        'Amravati Datalink': 'Amravati',
        'CS Datalink': 'Chhatrapati Sambhajinagar',
        'Konkan Datalink': 'Konkan',
        'Nagpur Datalink': 'Nagpur',
        'Nashik Datalink': 'Nashik',
        'Pune Datalink': 'Pune',
      };
      
      // Function to determine region from sheet name for flexible matching
      const getRegionFromSheetName = (sheetName: string): string | null => {
        // First check for exact matches
        if (Object.prototype.hasOwnProperty.call(REGION_SHEET_MAPPING, sheetName)) {
          return REGION_SHEET_MAPPING[sheetName as keyof typeof REGION_SHEET_MAPPING];
        }
        
        // Otherwise, try pattern matching
        const sheetNameLower = sheetName.toLowerCase();
        
        if (sheetNameLower.includes('amravati')) return 'Amravati';
        if (sheetNameLower.includes('cs') || sheetNameLower.includes('sambhajinagar')) return 'Chhatrapati Sambhajinagar';
        if (sheetNameLower.includes('konkan')) return 'Konkan';
        if (sheetNameLower.includes('nagpur')) return 'Nagpur';
        if (sheetNameLower.includes('nashik')) return 'Nashik';
        if (sheetNameLower.includes('pune')) return 'Pune';
        
        return null;
      };
      
      let totalUpdated = 0;
      let schemasProcessed: any[] = [];
      
      // Process each sheet with region data
      for (const sheetName of workbook.SheetNames) {
        // Determine region from sheet name
        const regionName = getRegionFromSheetName(sheetName);
        
        if (!regionName) {
          log(`Skipping sheet: ${sheetName} (not a recognized region sheet)`, 'import');
          continue;
        }
        log(`Processing sheet: ${sheetName} for region: ${regionName}`, 'import');
        
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        if (!data || data.length === 0) {
          log(`No data found in sheet: ${sheetName}`, 'import');
          continue;
        }
        
        log(`Found ${data.length} rows in ${sheetName}`, 'import');
        
        // Process each row in the sheet
        for (const row of data) {
          try {
            // Cast row to the appropriate type
            const typedRow = row as Record<string, any>;
            
            // Find the scheme by scheme_id - check all possible column name variations
            const schemeId = typedRow['Scheme ID'] || typedRow['Scheme Id'] || typedRow['scheme_id'] ||
                            typedRow['SchemeId'] || typedRow['SCHEME ID'] || typedRow['Scheme_Id'] ||
                            typedRow['Scheme Code'] || typedRow['Scheme Id.'] || typedRow['Sl.No.'];
            
            if (!schemeId) {
              log('Row missing scheme ID, skipping:', 'import');
              continue;
            }
            
            // Ensure schemeId is treated as a string
            const schemeIdString = String(schemeId).trim();
            
            // Prepare the data to update
            const updateData: Record<string, any> = {
              region_name: regionName
            };
            
            // Map columns according to the mappings
            for (const [excelCol, dbCol] of Object.entries(COLUMN_MAPPINGS)) {
              if (typedRow[excelCol] !== undefined) {
                // For numeric columns, convert to number
                if (typeof typedRow[excelCol] === 'string' && !isNaN(parseFloat(typedRow[excelCol]))) {
                  updateData[dbCol] = parseInt(typedRow[excelCol], 10);
                } else {
                  updateData[dbCol] = typedRow[excelCol];
                }
              }
            }
            
            // Handle special case for scheme_status
            if (updateData.scheme_status === 'Partial') {
              updateData.scheme_status = 'In Progress';
            }
            
            // Skip if no data to update
            if (Object.keys(updateData).length <= 1) { // Only has region_name
              log(`No valid data to update for scheme ${schemeIdString}`, 'import');
              continue;
            }
            
            // Check if the scheme exists
            const existingScheme = await storage.getSchemeById(schemeIdString);
            
            if (existingScheme) {
              // Update existing scheme
              const updatedScheme = await storage.updateScheme({
                ...existingScheme,
                ...updateData
              });
              
              log(`Updated scheme: ${schemeIdString}`, 'import');
              totalUpdated++;
              schemasProcessed.push(schemeIdString);
            } else {
              log(`Scheme with ID ${schemeIdString} not found, skipping`, 'import');
            }
          } catch (rowError) {
            console.error(`Error processing row:`, row, rowError);
            // Continue with next row
          }
        }
      }
      
      // Update region summaries after import
      await updateRegionSummaries();
      
      res.json({ 
        message: `Excel data imported successfully. ${totalUpdated} schemes updated across ${schemasProcessed.length} sheets.`,
        updatedCount: totalUpdated,
        schemasProcessed
      });
    } catch (error) {
      console.error("Error importing Excel data:", error);
      res.status(500).json({ message: "Failed to import Excel data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
