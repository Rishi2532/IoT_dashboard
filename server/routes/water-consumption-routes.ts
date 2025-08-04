import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PostgresStorage } from "../storage";

const router = Router();
const storage = new PostgresStorage();

// Configure multer for CSV uploads
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || path.extname(file.originalname) === ".csv") {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// Get all water consumption data
router.get("/", async (req, res) => {
  try {
    const waterConsumptionData = await storage.getAllWaterConsumption();
    res.json(waterConsumptionData);
  } catch (error) {
    console.error("Error fetching water consumption data:", error);
    res.status(500).json({
      error: "Failed to fetch water consumption data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Get water consumption data by composite key
router.get("/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const waterConsumptionData = await storage.getWaterConsumptionByCompositeKey(
      schemeId,
      villageName,
      esrName,
    );
    
    if (!waterConsumptionData) {
      return res.status(404).json({ error: "Water consumption data not found" });
    }
    
    res.json(waterConsumptionData);
  } catch (error) {
    console.error("Error fetching water consumption data:", error);
    res.status(500).json({
      error: "Failed to fetch water consumption data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Create new water consumption data
router.post("/", async (req, res) => {
  try {
    const waterConsumptionData = await storage.createWaterConsumption(req.body);
    res.status(201).json(waterConsumptionData);
  } catch (error) {
    console.error("Error creating water consumption data:", error);
    res.status(500).json({
      error: "Failed to create water consumption data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Update water consumption data
router.put("/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const waterConsumptionData = await storage.updateWaterConsumption(
      schemeId,
      villageName,
      esrName,
      req.body,
    );
    res.json(waterConsumptionData);
  } catch (error) {
    console.error("Error updating water consumption data:", error);
    res.status(500).json({
      error: "Failed to update water consumption data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Delete water consumption data
router.delete("/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    await storage.deleteWaterConsumption(schemeId, villageName, esrName);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting water consumption data:", error);
    res.status(500).json({
      error: "Failed to delete water consumption data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Import water consumption data from CSV
router.post("/import-csv", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No CSV file uploaded" });
  }

  const csvFilePath = req.file.path;

  try {
    console.log(`Processing CSV file: ${req.file.originalname}`);
    
    // Read CSV file as Buffer
    const csvBuffer = fs.readFileSync(csvFilePath);
    
    // Parse and import the CSV data
    const result = await storage.importWaterConsumptionFromCSV(csvBuffer);
    
    // Clean up uploaded file
    fs.unlinkSync(csvFilePath);
    
    res.json({
      message: "CSV data imported successfully",
      result,
    });
  } catch (error) {
    console.error("Error importing CSV:", error);
    
    // Clean up uploaded file in case of error
    if (fs.existsSync(csvFilePath)) {
      fs.unlinkSync(csvFilePath);
    }
    
    res.status(500).json({
      error: "Failed to import CSV data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Get water consumption statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await storage.getWaterConsumptionStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching water consumption stats:", error);
    res.status(500).json({
      error: "Failed to fetch water consumption statistics",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;