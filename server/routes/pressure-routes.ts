import express from "express";
import multer from "multer";
import { storage } from "../storage";
import { ZodError } from "zod";
import { insertPressureDataSchema, updatePressureDataSchema } from "@shared/schema";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Middleware to require admin rights
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session || !req.session.userId || !req.session.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Get all pressure data with optional filters
router.get("/", async (req, res) => {
  try {
    const { region, pressureRange, minPressure, maxPressure } = req.query;
    
    const filter: any = {};
    if (region) filter.region = region as string;
    if (pressureRange) filter.pressureRange = pressureRange as 'below_0.2' | 'between_0.2_0.7' | 'above_0.7' | 'consistent_zero' | 'consistent_below' | 'consistent_optimal' | 'consistent_above';
    if (minPressure) filter.minPressure = parseFloat(minPressure as string);
    if (maxPressure) filter.maxPressure = parseFloat(maxPressure as string);
    
    const pressureData = await storage.getAllPressureData(filter);
    res.json(pressureData);
  } catch (error) {
    console.error("Error getting pressure data:", error);
    res.status(500).json({ error: "Failed to get pressure data" });
  }
});

// Get dashboard statistics for pressure data
router.get("/dashboard-stats", async (req, res) => {
  try {
    const { region } = req.query;
    const stats = await storage.getPressureDashboardStats(region as string | undefined);
    res.json(stats);
  } catch (error) {
    console.error("Error getting pressure dashboard stats:", error);
    res.status(500).json({ error: "Failed to get pressure dashboard statistics" });
  }
});

// Get single pressure record by composite key
router.get("/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    
    // URL decode parameters since they might contain spaces or special characters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);
    
    const pressureData = await storage.getPressureDataByCompositeKey(
      schemeId,
      decodedVillageName,
      decodedEsrName
    );
    
    if (!pressureData) {
      return res.status(404).json({ error: "Pressure data not found" });
    }
    
    res.json(pressureData);
  } catch (error) {
    console.error("Error getting pressure data record:", error);
    res.status(500).json({ error: "Failed to get pressure data record" });
  }
});

// Create new pressure data record (admin only)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    
    // Validate data with Zod
    const validatedData = insertPressureDataSchema.parse(data);
    
    const result = await storage.createPressureData(validatedData);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error("Error creating pressure data:", error);
      res.status(500).json({ error: "Failed to create pressure data" });
    }
  }
});

// Update existing pressure data (admin only)
router.put("/:schemeId/:villageName/:esrName", requireAdmin, async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const data = req.body;
    
    // URL decode parameters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);
    
    // Validate data with Zod
    const validatedData = updatePressureDataSchema.parse(data);
    
    const result = await storage.updatePressureData(
      schemeId,
      decodedVillageName,
      decodedEsrName,
      validatedData
    );
    
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error("Error updating pressure data:", error);
      res.status(500).json({ error: "Failed to update pressure data" });
    }
  }
});

// Delete pressure data (admin only)
router.delete("/:schemeId/:villageName/:esrName", requireAdmin, async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    
    // URL decode parameters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);
    
    const success = await storage.deletePressureData(
      schemeId,
      decodedVillageName,
      decodedEsrName
    );
    
    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Pressure data not found" });
    }
  } catch (error) {
    console.error("Error deleting pressure data:", error);
    res.status(500).json({ error: "Failed to delete pressure data" });
  }
});

// Import pressure data from CSV file (admin only)
router.post("/import/csv", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    console.log("CSV Import - File received:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      encoding: req.file.encoding
    });
    
    // Check if file is empty
    if (req.file.size === 0) {
      return res.status(400).json({ error: "Uploaded file is empty" });
    }
    
    // Check for CSV mimetype (though not always reliable)
    if (req.file.mimetype !== 'text/csv' && 
        !req.file.originalname.toLowerCase().endsWith('.csv')) {
      return res.status(400).json({ 
        error: "Invalid file format", 
        details: "Please upload a CSV file with .csv extension"
      });
    }
    
    // Log a preview of the file content for debugging
    const filePreview = req.file.buffer.toString('utf8').substring(0, 200);
    console.log("CSV content preview:", filePreview);
    
    // Check if content is likely not CSV by looking for HTML or XML tags
    if (filePreview.includes('<!DOCTYPE') || 
        filePreview.includes('<html') || 
        filePreview.trim().startsWith('<')) {
      return res.status(400).json({ 
        error: "Invalid file content", 
        details: "The file appears to be HTML or XML, not a CSV file",
        preview: filePreview.substring(0, 100)
      });
    }
    
    // Process CSV file with improved error handling
    try {
      const result = await storage.importPressureDataFromCSV(req.file.buffer);
      console.log("CSV import completed successfully:", result);
      res.json(result);
    } catch (importError) {
      console.error("Detailed CSV import error:", importError);
      // Send detailed error to client
      res.status(500).json({ 
        error: "Failed to import pressure data from CSV", 
        details: importError.message || String(importError),
        preview: filePreview
      });
    }
  } catch (error) {
    console.error("Error in CSV upload route:", error);
    res.status(500).json({ 
      error: "Failed to process CSV file upload",
      details: error.message || String(error)
    });
  }
});

export default router;