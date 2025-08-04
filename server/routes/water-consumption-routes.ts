import express from "express";
import multer from "multer";
import { storage } from "../storage";
import { ZodError } from "zod";
import { insertWaterConsumptionSchema, updateWaterConsumptionSchema } from "@shared/schema";

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

// Get all water consumption data
router.get("/", async (req, res) => {
  try {
    const waterConsumptionData = await storage.getAllWaterConsumption();
    res.json(waterConsumptionData);
  } catch (error) {
    console.error("Error fetching water consumption data:", error);
    res.status(500).json({ error: "Failed to fetch water consumption data" });
  }
});

// Get water consumption data by scheme
router.get("/scheme/:schemeId", async (req, res) => {
  try {
    const { schemeId } = req.params;
    const { block } = req.query;
    
    const waterConsumptionData = await storage.getWaterConsumptionByScheme(
      schemeId, 
      block as string | undefined
    );
    res.json(waterConsumptionData);
  } catch (error) {
    console.error(`Error fetching water consumption data for scheme ${req.params.schemeId}:`, error);
    res.status(500).json({ error: "Failed to fetch water consumption data" });
  }
});

// Get specific water consumption data by composite key
router.get("/scheme/:schemeId/village/:villageName/esr/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    
    const waterConsumptionData = await storage.getWaterConsumptionByCompositeKey(
      schemeId,
      villageName,
      esrName
    );
    
    if (!waterConsumptionData) {
      return res.status(404).json({ error: "Water consumption data not found" });
    }
    
    res.json(waterConsumptionData);
  } catch (error) {
    console.error(`Error fetching water consumption data:`, error);
    res.status(500).json({ error: "Failed to fetch water consumption data" });
  }
});

// Create new water consumption data
router.post("/", requireAdmin, async (req, res) => {
  try {
    const validatedData = insertWaterConsumptionSchema.parse(req.body);
    const newWaterConsumption = await storage.createWaterConsumption(validatedData);
    res.status(201).json(newWaterConsumption);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating water consumption data:", error);
    res.status(500).json({ error: "Failed to create water consumption data" });
  }
});

// Update water consumption data
router.put("/scheme/:schemeId/village/:villageName/esr/:esrName", requireAdmin, async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const validatedData = updateWaterConsumptionSchema.parse(req.body);
    
    const updatedWaterConsumption = await storage.updateWaterConsumption(
      schemeId,
      villageName,
      esrName,
      validatedData
    );
    res.json(updatedWaterConsumption);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error updating water consumption data:", error);
    res.status(500).json({ error: "Failed to update water consumption data" });
  }
});

// Delete water consumption data
router.delete("/scheme/:schemeId/village/:villageName/esr/:esrName", requireAdmin, async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    
    const deleted = await storage.deleteWaterConsumption(schemeId, villageName, esrName);
    
    if (!deleted) {
      return res.status(404).json({ error: "Water consumption data not found" });
    }
    
    res.json({ message: "Water consumption data deleted successfully" });
  } catch (error) {
    console.error("Error deleting water consumption data:", error);
    res.status(500).json({ error: "Failed to delete water consumption data" });
  }
});

// Import water consumption data from CSV
router.post("/import/csv", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = req.file.buffer;
    console.log(`Processing water consumption CSV file: ${req.file.originalname} (${fileBuffer.length} bytes)`);

    // Import data using storage method
    const result = await storage.importWaterConsumptionFromCSV(fileBuffer);

    console.log("Water consumption import result:", result);

    res.json({
      message: "Water consumption data imported successfully",
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors,
      totalProcessed: result.inserted + result.updated,
    });
  } catch (error: any) {
    console.error("Error importing water consumption CSV:", error);
    
    // Return detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    res.status(500).json({ 
      error: "Failed to import water consumption data",
      details: errorMessage,
      // Include any partial results if available
      inserted: 0,
      updated: 0,
      errors: [errorMessage]
    });
  }
});

export default router;