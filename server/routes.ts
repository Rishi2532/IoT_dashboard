import type { Express, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertRegionSchema, 
  insertSchemeStatusSchema, 
  regions, 
  loginSchema,
  registerUserSchema,
  InsertSchemeStatus
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
import { fileURLToPath } from 'url';
import * as cp from 'child_process';
import { promisify } from 'util';

const exec = promisify(cp.exec);

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



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
  
  // Import scheme data from SQL file
  app.post("/api/admin/import/sql", requireAdmin, async (req, res) => {
    try {
      log('Starting SQL import process...', 'import');
      
      // Run the import-sql-data.js script
      const scriptPath = path.join(__dirname, '..', 'import-sql-data.js');
      
      // Execute the script as a child process
      log(`Executing script: ${scriptPath}`, 'import');
      const { stdout, stderr } = await exec(`node ${scriptPath}`);
      
      // Log the output
      if (stdout) {
        log(`Import SQL output: ${stdout}`, 'import');
      }
      
      if (stderr) {
        log(`Import SQL error: ${stderr}`, 'import');
        return res.status(500).json({ 
          message: 'Error importing SQL data',
          error: stderr
        });
      }
      
      // Try to parse the result from stdout to get scheme count and detailed info
      let schemeCount = 0;
      let errorMessages = [];
      
      try {
        // Extract scheme count using a regex pattern
        const schemeCountMatch = stdout.match(/Found (\d+) unique scheme IDs to process/);
        if (schemeCountMatch && schemeCountMatch[1]) {
          schemeCount = parseInt(schemeCountMatch[1], 10);
        }
        
        // Extract error messages
        const errorPattern = /Error with statement: (.+?)(?=\n|$)/g;
        let match;
        while ((match = errorPattern.exec(stdout)) !== null) {
          errorMessages.push(match[1]);
        }
      } catch (parseError) {
        console.error('Error parsing import output:', parseError);
      }
      
      // Send a success response with detailed information
      res.json({ 
        message: 'SQL data imported successfully',
        details: stdout,
        schemeCount: schemeCount,
        errors: errorMessages
      });
    } catch (error) {
      const err = error as Error;
      console.error('Error running SQL import:', err);
      res.status(500).json({ 
        message: 'Failed to import SQL data',
        error: err.message
      });
    }
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
      
      log(`File upload received: ${req.file.originalname}, size: ${req.file.size} bytes`, 'import');
      const fileBuffer = req.file.buffer;
      
      // Try reading with options for better compatibility
      let workbook;
      try {
        // First try to get the column data directly from the raw Excel
        // This helps bypass some of the library's higher-level parsing
        const raw = new Uint8Array(fileBuffer);
        
        // Read with all options for maximum compatibility
        workbook = XLSX.read(raw, { 
          type: 'array',          // Use array mode for better binary handling
          cellFormula: false,     // Don't parse formulas
          cellHTML: false,        // Don't parse HTML
          cellText: true,         // Force text mode for cells
          cellDates: true,        // Parse dates
          cellNF: false,          // Don't parse number formats
          WTF: true,              // Show detailed warnings
          cellStyles: false,      // Don't parse styles
          bookVBA: false,         // Don't parse VBA code
          dateNF: 'yyyy-mm-dd',   // Date format
          raw: true               // Raw parsing
        });
        
        // Examine workbook to see important info about the file
        log(`Workbook file info:`, 'import');
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          
          // Try to access column G explicitly (user mentioned Scheme ID is in column G)
          // This uses A1 notation for columns where G is column 7
          const gCells = [];
          if (sheet['!ref']) {
            const range = XLSX.utils.decode_range(sheet['!ref']);
            // Check the first 10 rows for column G
            for (let r = 0; r <= Math.min(10, range.e.r); r++) {
              const cellRef = 'G' + (r+1); // G1, G2, G3, etc.
              if (sheet[cellRef]) {
                gCells.push(`G${r+1}: ${sheet[cellRef].v}`);
              } else {
                gCells.push(`G${r+1}: <empty>`);
              }
            }
          }
          
          log(`Sheet: ${sheetName}, Column G (first 10 rows): ${gCells.join(' | ')}`, 'import');
        }
        
        log(`Excel file successfully loaded. Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`, 'import');
      } catch (error) {
        const xlsxError = error as Error;
        console.error('Error reading Excel file:', xlsxError);
        return res.status(400).json({ message: `Unable to read Excel file: ${xlsxError.message}` });
      }
      
      // Define column patterns to search for in headers - exactly matching template headers
      const COLUMN_PATTERNS = {
        // Basic fields
        sr_no: [
          'Sr No.', 'SR No', 'sr_no', 'Serial Number'
        ],
        scheme_id: [
          'Scheme ID', 'Scheme Id', 'scheme_id', 'SchemeId', 'SCHEME ID',
          'Scheme_Id', 'Scheme Code', 'SchemeID'
        ],
        scheme_name: [
          'Scheme Name', 'SchemeName', 'scheme_name', 'SCHEME NAME'
        ],
        
        // Location hierarchy
        region_name: [
          'Region', 'RegionName', 'Region Name', 'region_name'
        ],
        circle: [
          'Circle', 'circle'
        ],
        division: [
          'Division', 'division'
        ],
        sub_division: [
          'Sub Division', 'sub_division', 'SubDivision'
        ],
        block: [
          'Block', 'block', 'Block Name'
        ],
        
        // Villages related fields - exact matches from template
        total_villages: [
          'Number of Village', 'No. of Village', 'Total Villages', 
          'Number of Villages', 'Villages', 'total_villages'
        ],
        villages_integrated: [
          'Total Villages Integrated', 'Villages Integrated',
          'villages_integrated', 'total_villages_integrated'
        ],
        functional_villages: [
          'No. of Functional Village', 'Functional Villages',
          'functional_villages'
        ],
        partial_villages: [
          'No. of Partial Village', 'Partial Villages', 'Partial Village',
          'partial_villages'
        ],
        non_functional_villages: [
          'No. of Non- Functional Village', 'No. of Non-Functional Village',
          'Non-Functional Villages', 'Non Functional Villages',
          'non_functional_villages'
        ],
        fully_completed_villages: [
          'Fully Completed Villages', 'Fully completed Villages', 
          'fully_completed_villages'
        ],
        
        // ESR related fields
        total_esr: [
          'Total Number of ESR', 'Total ESR', 'ESR Total',
          'total_esr'
        ],
        esr_integrated_on_iot: [
          'Total ESR Integrated', 'ESR Integrated', 'Total Number of ESR Integrated',
          'esr_integrated_on_iot', 'total_esr_integrated'
        ],
        fully_completed_esr: [
          'No. Fully Completed ESR', 'Fully Completed ESR', 'No. of Fully Completed ESR',
          'ESR Fully Completed', 'fully_completed_esr', 'no_fully_completed_esr'
        ],
        balance_esr: [
          'Balance to Complete ESR', 'Balance ESR',
          'balance_esr'
        ],
        
        // Component related fields
        flow_meters_connected: [
          'Flow Meters Connected', 'Flow Meter Connected', 'Flow Meters', 'FM Connected',
          'flow_meters_connected'
        ],
        pressure_transmitters_connected: [
          'Pressure Transmitter Connected', 'Pressure Transmitters Connected',
          'PT Connected', 'Pressure Transmitters',
          'pressure_transmitter_connected', 'pressure_transmitters_connected'
        ],
        residual_chlorine_connected: [
          'Residual Chlorine Analyzer Connected', 'Residual Chlorine Connected',
          'RCA Connected', 'Residual Chlorine', 'Residual Chlorine Analyzers',
          'residual_chlorine_connected', 'residual_chlorine_analyzer_connected'
        ],
        
        // Status fields
        scheme_status: [
          'Fully completion Scheme Status', 'Scheme Status', 'Status',
          'Scheme status', 'scheme_status', 'fully_completion_scheme_status'
        ],
        scheme_functional_status: [
          'Scheme Functional Status', 'Functional Status',
          'scheme_functional_status'
        ]
      };
      
      // Region name patterns for detection
      const REGION_PATTERNS = [
        { pattern: /\bamravati\b/i, name: 'Amravati' },
        { pattern: /\bnashik\b/i, name: 'Nashik' },
        { pattern: /\bnagpur\b/i, name: 'Nagpur' },
        { pattern: /\bpune\b/i, name: 'Pune' },
        { pattern: /\bkonkan\b/i, name: 'Konkan' },
        { pattern: /\bcs\b/i, name: 'Chhatrapati Sambhajinagar' },
        { pattern: /\bsambhajinagar\b/i, name: 'Chhatrapati Sambhajinagar' },
        { pattern: /\bchhatrapati\b/i, name: 'Chhatrapati Sambhajinagar' }
      ];
      
      // Helper functions - extracted to avoid TypeScript strict mode errors
      // Detect region from sheet name
      const detectRegionFromSheetName = (sheetName: string): string | null => {
        for (const { pattern, name } of REGION_PATTERNS) {
          if (pattern.test(sheetName)) {
            return name;
          }
        }
        return null;
      };
      
      // Get the corresponding field name for a column header
      const getFieldForColumn = (header: string): string | null => {
        for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
          for (const pattern of patterns) {
            if (header === pattern || 
                header.toLowerCase() === pattern.toLowerCase() ||
                header.toLowerCase().includes(pattern.toLowerCase())) {
              return field;
            }
          }
        }
        return null;
      };
      
      // Create a mapping of column headers to database fields
      const createColumnMapping = (headers: Record<string, any>): Record<string, string> => {
        const mapping: Record<string, string> = {};
        
        // Map for common indices to field names (based on the standard template structure)
        const commonIndexMapping: Record<number, string> = {
          0: 'sr_no',                         // Sr No. is in column 1 (index 0)
          1: 'region_name',                   // Region is in column 2 (index 1)
          2: 'circle',                        // Circle is in column 3 (index 2)
          3: 'division',                      // Division is in column 4 (index 3)
          4: 'sub_division',                  // Sub Division is in column 5 (index 4)
          5: 'block',                         // Block is in column 6 (index 5)
          6: 'scheme_id',                     // Scheme ID is in column 7 (index 6)
          7: 'scheme_name',                   // Scheme Name is in column 8 (index 7)
          8: 'total_villages',                // Number of Village is in column 9 (index 8)
          9: 'villages_integrated',           // Total Villages Integrated is in column 10 (index 9)
          10: 'functional_villages',          // No. of Functional Village is in column 11 (index 10)
          11: 'partial_villages',             // No. of Partial Village is in column 12 (index 11)
          12: 'non_functional_villages',      // No. of Non- Functional Village is in column 13 (index 12)
          13: 'fully_completed_villages',     // Fully Completed Villages is in column 14 (index 13)
          14: 'total_esr',                    // Total Number of ESR is in column 15 (index 14)
          15: 'scheme_functional_status',     // Scheme Functional Status is in column 16 (index 15)
          16: 'esr_integrated_on_iot',        // Total ESR Integrated is in column 17 (index 16)
          17: 'fully_completed_esr',          // No. Fully Completed ESR is in column 18 (index 17)
          18: 'balance_esr',                  // Balance to Complete ESR is in column 19 (index 18)
          19: 'flow_meters_connected',        // Flow Meters Connected is in column 20 (index 19)
          20: 'pressure_transmitters_connected', // Pressure Transmitter Connected is in column 21 (index 20)
          21: 'residual_chlorine_connected',  // Residual Chlorine Analyzer Connected is in column 22 (index 21)
          22: 'scheme_status'                 // Fully completion Scheme Status is in column 23 (index 22)
        };
        
        // First map by column header matching
        for (const header of Object.keys(headers)) {
          const field = getFieldForColumn(header);
          if (field) {
            mapping[header] = field;
          }
        }
        
        // Then try to map by column position for common columns
        const keys = Object.keys(headers);
        for (const [indexStr, fieldName] of Object.entries(commonIndexMapping)) {
          const index = parseInt(indexStr);
          if (index < keys.length && !mapping[keys[index]]) {
            // Only set if not already mapped and column exists
            mapping[keys[index]] = fieldName;
          }
        }
        
        // For debugging
        log(`Column mapping created: ${JSON.stringify(mapping)}`, 'import');
        
        return mapping;
      };
      
      // Process the value according to the field type
      const processValue = (field: string, value: any): any => {
        if (value === null || value === undefined) {
          return null;
        }
        
        // Log raw values for debugging
        if (field === 'fully_completed_villages' || 
            field === 'villages_integrated' || 
            field === 'scheme_status' ||
            field === 'esr_integrated_on_iot' ||
            field === 'residual_chlorine_connected' ||
            field === 'pressure_transmitters_connected' ||
            field === 'flow_meters_connected' ||
            field === 'fully_completed_esr') {
          log(`Raw value for ${field}: ${value} (type: ${typeof value})`, 'import');
        }
        
        // Numeric fields - convert to numbers
        const numericFields = [
          'total_villages', 'fully_completed_villages', 'villages_integrated',
          'partial_villages', 'non_functional_villages', 'functional_villages',
          'total_esr', 'esr_integrated_on_iot', 'fully_completed_esr', 'balance_esr',
          'flow_meters_connected', 'pressure_transmitters_connected', 
          'residual_chlorine_connected', 'sr_no'
        ];
        
        if (numericFields.includes(field)) {
          // Make sure we handle string numbers correctly
          let numValue = value;
          if (typeof value === 'string') {
            // Remove any non-numeric characters except decimal point
            numValue = value.replace(/[^\d.-]/g, '');
          }
          const num = Number(numValue);
          const result = isNaN(num) ? 0 : num;
          
          // Log numeric conversions for debugging
          if (field === 'fully_completed_villages' || 
              field === 'villages_integrated' || 
              field === 'esr_integrated_on_iot' ||
              field === 'residual_chlorine_connected' ||
              field === 'pressure_transmitters_connected' ||
              field === 'flow_meters_connected' ||
              field === 'fully_completed_esr') {
            log(`Converted ${field} value: ${value} → ${result}`, 'import');
          }
          
          return result;
        }
        
        // Status field - standardize values
        if (field === 'scheme_status') {
          log(`Processing scheme_status value: "${value}"`, 'import');
          const status = String(value).trim().toLowerCase();
          
          // Direct mapping to "Fully-Completed"
          if (status === 'completed' || 
              status === 'complete' || 
              status === 'fully completed' || 
              status === 'fully-completed') {
            log(`Mapped status "${value}" to "Fully-Completed"`, 'import');
            return 'Fully-Completed';
          } 
          // Direct mapping to "In Progress"
          else if (status === 'in progress' || 
                  status === 'in-progress' || 
                  status === 'partial' || 
                  status === 'progress') {
            log(`Mapped status "${value}" to "In Progress"`, 'import');
            return 'In Progress';
          } 
          // Direct mapping to "Not-Connected"
          else if (status === 'not connected' || 
                  status === 'not-connected' || 
                  status === 'notconnected') {
            log(`Mapped status "${value}" to "Not-Connected"`, 'import');
            return 'Not-Connected';
          }
          
          // Try pattern matching for better accuracy
          if (status.includes('complet')) {
            log(`Pattern matched status "${value}" to "Fully-Completed"`, 'import');
            return 'Fully-Completed';
          } else if (status.includes('progress') || status.includes('partial')) {
            log(`Pattern matched status "${value}" to "In Progress"`, 'import');
            return 'In Progress';
          }
          
          // Return capitalized version if no match
          const words = status.split(' ');
          const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
          const result = capitalizedWords.join(' ');
          log(`No match for status "${value}", returning as "${result}"`, 'import');
          return result;
        }
        
        // Map functional status values
        if (field === 'scheme_functional_status') {
          const status = String(value).trim().toLowerCase();
          if (status === 'functional') {
            return 'Functional';
          } else if (status === 'partial') {
            return 'Partial';
          } else if (status === 'non-functional') {
            return 'Non-Functional';
          }
          return value;
        }
        
        // Text fields - ensure they're properly formatted
        if (field === 'scheme_id') {
          return String(value).trim();
        }
        
        return value;
      };
      
      // We've removed the agency mapping as it's no longer needed
      
      let totalUpdated = 0;
      let totalCreated = 0;
      const processedSchemes: string[] = [];
      
      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        // Detect region from sheet name
        const regionName = detectRegionFromSheetName(sheetName);
        
        if (!regionName) {
          log(`Skipping sheet: ${sheetName} - not a recognized region`, 'import');
          continue;
        }
        
        log(`Processing sheet: ${sheetName} for region: ${regionName}`, 'import');
        
        // Convert sheet to JSON
        const sheet = workbook.Sheets[sheetName];
        
        // Log raw sheet info to help debugging
        log(`Sheet ${sheetName} raw data:`, 'import');
        // Get the range of the sheet
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        log(`Sheet range: ${sheet['!ref']}`, 'import');
        
        // Get column G values (Scheme ID) and store them directly for later use
        // We'll use this to bypass the regular JSON conversion which might be causing issues
        const directColumnGValues = new Map<number, string>();
        
        // Loop through all rows and extract column G values directly
        for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 100); r++) {  // Limit to first 100 rows for performance
          const cellAddress = XLSX.utils.encode_cell({r: r, c: 6}); // column G (index 6)
          const cell = sheet[cellAddress];
          if (cell && cell.v) {
            const value = String(cell.v).trim();
            directColumnGValues.set(r, value);
            // Log first 10 row values for debugging
            if (r < range.s.r + 10) {
              log(`Row ${r+1} (cell ${cellAddress}): Column G (Scheme ID) = "${value}"`, 'import');
            }
          }
        }
        
        // Store scheme ID values directly in the sheet object for later use
        sheet['__directSchemeIDs'] = directColumnGValues;
        
        // Convert to JSON in a way that preserves position information better
        const data = XLSX.utils.sheet_to_json(sheet, { 
          defval: null,
          raw: true,
          rawNumbers: true,
          header: 'A'  // Use A,B,C as header names to ensure we get position-based mapping
        });
        
        if (!data || data.length === 0) {
          log(`No data found in sheet: ${sheetName}`, 'import');
          continue;
        }
        
        // Log the number of rows found
        log(`Found ${data.length} rows in sheet ${sheetName}`, 'import');
        
        // Convert header-letter-based data to regular column-header-based 
        // This ensures we get data with proper column positions
        const headerRow = data[0] as Record<string, any>;
        const columnPositions: Record<string, number> = {};
        
        // Log the header row
        log(`First row (headers): ${JSON.stringify(headerRow)}`, 'import');
        
        // Look for data rows (skip header rows)
        let hasFoundDataRows = false;
        
        for (const row of data) {
          try {
            // Create column mapping based on the first row that has scheme ID
            const columnMapping = createColumnMapping(row as Record<string, any>);
            const typedRow = row as Record<string, any>;
            
            // Find scheme ID with various possible column names or positions
            let schemeIdCell = '';
            let schemeId = '';
            
            // First check using our mapping
            for (const [header, field] of Object.entries(columnMapping)) {
              if (field === 'scheme_id' && typedRow[header]) {
                schemeIdCell = header;
                schemeId = String(typedRow[schemeIdCell]).trim();
                break;
              }
            }
            
            // If not found, try direct pattern approaches
            if (!schemeIdCell) {
              for (const pattern of COLUMN_PATTERNS.scheme_id) {
                if (typedRow[pattern]) {
                  schemeIdCell = pattern;
                  schemeId = String(typedRow[schemeIdCell]).trim();
                  break;
                }
              }
            }
            
            // If still not found, try common column index positions (common position for Scheme ID in the user's Excel)
            if (!schemeIdCell) {
              // Specifically focus on column G (index 6) first - the user confirmed this is where Scheme ID is in their Excel
              const headers = Object.keys(typedRow);
              
              // First prioritize index 6 (column G) where Scheme ID should be
              if (headers.length > 6 && typedRow[headers[6]]) {
                schemeIdCell = headers[6];
                schemeId = String(typedRow[schemeIdCell]).trim();
                log(`Attempting to get Scheme ID from column G (index 6): "${schemeId}"`, 'import');
                
                // Extra verification that this looks like a Scheme ID
                if (/^[a-z0-9_\-/]+$/i.test(schemeId)) {
                  log(`Found Scheme ID at column G (index 6): ${schemeId}`, 'import');
                }
              }
              
              // If still not found, try other nearby positions
              if (!schemeId) {
                const possibleIndices = [5, 7]; // Try columns F and H
                
                for (const index of possibleIndices) {
                  if (index < headers.length && typedRow[headers[index]]) {
                    schemeIdCell = headers[index];
                    schemeId = String(typedRow[schemeIdCell]).trim();
                    
                    // If this looks like a Scheme ID (has alphanumeric characters), use it
                    if (/^[a-z0-9_\-/]+$/i.test(schemeId)) {
                      log(`Found Scheme ID at position ${index}: ${schemeId}`, 'import');
                      break;
                    }
                  }
                }
              }
            }
            
            // Use our direct column G values if available
            if (!schemeIdCell && sheet['__directSchemeIDs']) {
              const directSchemeIDs = sheet['__directSchemeIDs'] as Map<number, string>;
              
              // Try to find the row index for this data row
              let rowIndex = -1;
              
              // First find which row number this is in the data array
              const dataIndex = data.indexOf(row);
              if (dataIndex >= 0) {
                // Add the sheet's starting row to get the actual row in the spreadsheet
                rowIndex = range.s.r + dataIndex;
                log(`Looking up scheme ID for data row ${dataIndex} (Excel row ${rowIndex + 1})`, 'import');
                
                // Get scheme ID from our direct mapping
                if (directSchemeIDs.has(rowIndex)) {
                  schemeId = directSchemeIDs.get(rowIndex) || '';
                  schemeIdCell = 'G';  // Mark that we found it in column G
                  log(`Using direct scheme ID from column G, row ${rowIndex + 1}: "${schemeId}"`, 'import');
                }
              }
            }
            
            // Last resort: look through all columns for something that looks like a scheme ID
            if (!schemeIdCell) {
              for (const [header, value] of Object.entries(typedRow)) {
                if (value && (typeof value === 'string' || typeof value === 'number')) {
                  const strValue = String(value).trim();
                  // Check if it looks like a scheme ID pattern
                  if (/^[a-z0-9_\-/]+$/i.test(strValue) && strValue.length > 3 && strValue.length < 30) {
                    schemeIdCell = header;
                    schemeId = strValue;
                    log(`Found potential Scheme ID by pattern matching: ${schemeId} in column ${header}`, 'import');
                    break;
                  }
                }
              }
            }
            
            if (!schemeId) {
              // This row doesn't have a scheme ID
              continue;
            }
            
            // Now we've found a valid data row
            hasFoundDataRows = true;
            
            // Create record with region
            const record: Record<string, any> = {
              region_name: regionName,
              scheme_id: schemeId
            };
            
            // Process each column based on the mapping
            for (const [header, field] of Object.entries(columnMapping)) {
              if (typedRow[header] !== null && typedRow[header] !== undefined) {
                record[field] = processValue(field, typedRow[header]);
              }
            }
            
            // Look up scheme name if it's not in the current row but we have a valid scheme ID
            if (!record.scheme_name) {
              // Try to find a scheme name from column headers/patterns
              for (const [header, content] of Object.entries(typedRow)) {
                if (COLUMN_PATTERNS.scheme_name.some(pattern => 
                    header === pattern || 
                    header.toLowerCase() === pattern.toLowerCase() || 
                    header.toLowerCase().includes(pattern.toLowerCase())
                )) {
                  if (content) {
                    record.scheme_name = String(content).trim();
                    break;
                  }
                }
              }
            }
            
            // Check if scheme exists
            const existingScheme = await storage.getSchemeById(schemeId);
            
            if (existingScheme) {
              // Update existing scheme with new data
              try {
                // Apply special status mapping (Partial → In Progress)
                if (record.scheme_status === 'Partial') {
                  record.scheme_status = 'In Progress';
                }
                
                // Set villages_integrated field if not explicitly provided
                if (record.fully_completed_villages !== undefined && record.partial_villages !== undefined) {
                  const completed = typeof record.fully_completed_villages === 'number' ? record.fully_completed_villages : 0;
                  const partial = typeof record.partial_villages === 'number' ? record.partial_villages : 0;
                  
                  // Calculate villages_integrated as sum of fully_completed_villages and partial_villages
                  if (!record.villages_integrated) {
                    record.villages_integrated = completed + partial;
                  }
                }
                
                const updatedScheme = await storage.updateScheme({
                  ...existingScheme,
                  ...record
                });
                
                log(`Updated scheme: ${schemeId}`, 'import');
                totalUpdated++;
                processedSchemes.push(schemeId);
              } catch (updateError) {
                console.error(`Error updating scheme ${schemeId}:`, updateError);
              }
            } else if (record.scheme_name) {
              // Create a new scheme if we have a name
              try {
                // Apply special status mapping (Partial → In Progress)
                if (record.scheme_status === 'Partial') {
                  record.scheme_status = 'In Progress';
                }
                
                // Create a properly typed object with scheme_name as a required field
                // Set villages_integrated field if not explicitly provided
                if (record.fully_completed_villages !== undefined && record.partial_villages !== undefined) {
                  const completed = typeof record.fully_completed_villages === 'number' ? record.fully_completed_villages : 0;
                  const partial = typeof record.partial_villages === 'number' ? record.partial_villages : 0;
                  
                  // Calculate villages_integrated as sum of fully_completed_villages and partial_villages
                  if (!record.villages_integrated) {
                    record.villages_integrated = completed + partial;
                  }
                }
                
                const schemeData: InsertSchemeStatus = {
                  scheme_name: record.scheme_name || `Scheme ${schemeId}`, // Default name if missing
                  scheme_id: record.scheme_id,
                  region_name: record.region_name,
                  total_villages: record.total_villages as number | undefined,
                  villages_integrated: record.villages_integrated as number | undefined,
                  fully_completed_villages: record.fully_completed_villages as number | undefined,
                  partial_villages: record.partial_villages as number | undefined,
                  non_functional_villages: record.non_functional_villages as number | undefined,
                  total_esr: record.total_esr as number | undefined,
                  esr_integrated_on_iot: record.esr_integrated_on_iot as number | undefined,
                  fully_completed_esr: record.fully_completed_esr as number | undefined,
                  balance_esr: record.balance_esr as number | undefined,
                  flow_meters_connected: record.flow_meters_connected as number | undefined,
                  pressure_transmitters_connected: record.pressure_transmitters_connected as number | undefined,
                  residual_chlorine_connected: record.residual_chlorine_connected as number | undefined,
                  scheme_status: record.scheme_status as string | undefined,
                  scheme_functional_status: record.scheme_functional_status as string | undefined,
                  functional_villages: record.functional_villages as number | undefined
                };
                
                const newScheme = await storage.createScheme(schemeData);
                log(`Created new scheme: ${schemeId}`, 'import');
                totalCreated++;
                processedSchemes.push(schemeId);
              } catch (createError) {
                console.error(`Error creating scheme ${schemeId}:`, createError);
              }
            } else {
              log(`Scheme with ID ${schemeId} not found and missing scheme_name, skipping`, 'import');
            }
          } catch (rowError) {
            console.error(`Error processing row in ${sheetName}:`, rowError);
          }
        }
        
        if (!hasFoundDataRows) {
          log(`No scheme data rows found in sheet: ${sheetName}`, 'import');
        }
      }
      
      // Update region summaries after import
      await updateRegionSummaries();
      
      res.json({ 
        message: `Excel data imported successfully. ${totalUpdated} schemes updated and ${totalCreated} new schemes created.`,
        updatedCount: totalUpdated,
        createdCount: totalCreated,
        processedSchemes
      });
    } catch (error) {
      console.error("Error importing Excel data:", error);
      res.status(500).json({ message: "Failed to import Excel data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
