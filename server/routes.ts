import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRegionSchema, insertSchemeStatusSchema } from "@shared/schema";
import { z } from "zod";
import { updateRegionSummaries, resetRegionData } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  
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

  // Get all schemes with optional region and status filters
  app.get("/api/schemes", async (req, res) => {
    try {
      const regionName = req.query.region as string;
      const status = req.query.status as string;
      
      let schemes;
      
      if (regionName && regionName !== "all") {
        // Pass the status filter to storage method for database filtering
        schemes = await storage.getSchemesByRegion(regionName, status);
      } else {
        // Pass the status filter to storage method for database filtering
        schemes = await storage.getAllSchemes(status);
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
      const schemeId = parseInt(req.params.id);
      
      if (isNaN(schemeId)) {
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
      const schemeId = parseInt(req.params.id);
      
      if (isNaN(schemeId)) {
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
      const schemeId = parseInt(req.params.id);
      
      if (isNaN(schemeId)) {
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
  app.post("/api/admin/update-region-summaries", async (req, res) => {
    try {
      await updateRegionSummaries();
      res.status(200).json({ message: "Region summaries updated successfully" });
    } catch (error) {
      console.error("Error updating region summaries:", error);
      res.status(500).json({ message: "Failed to update region summaries" });
    }
  });
  
  // Reset region data to original values (only for admin use)
  app.post("/api/admin/reset-region-data", async (req, res) => {
    try {
      await resetRegionData();
      res.status(200).json({ message: "Region data reset successfully" });
    } catch (error) {
      console.error("Error resetting region data:", error);
      res.status(500).json({ message: "Failed to reset region data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
