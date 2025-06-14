import express from "express";
import multer from "multer";
import { storage } from "../storage";
import { ZodError } from "zod";
import { insertChlorineDataSchema, updateChlorineDataSchema } from "@shared/schema";
import { executeWithRetry } from "../db-retry";

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

// Get all chlorine data with optional filters
router.get("/", async (req, res) => {
  try {
    const { region, chlorineRange, minChlorine, maxChlorine } = req.query;
    
    console.log("Chlorine API Request Filters:", {
      region,
      chlorineRange,
      minChlorine,
      maxChlorine
    });
    
    const filter: any = {};
    if (region) filter.region = region as string;
    if (chlorineRange) filter.chlorineRange = chlorineRange as 'below_0.2' | 'between_0.2_0.5' | 'above_0.5' | 'consistent_zero' | 'consistent_below' | 'consistent_optimal' | 'consistent_above';
    if (minChlorine) filter.minChlorine = parseFloat(minChlorine as string);
    if (maxChlorine) filter.maxChlorine = parseFloat(maxChlorine as string);
    
    console.log("Applied filter object:", filter);
    
    const chlorineData = await storage.getAllChlorineData(filter);
    console.log(`Returning ${chlorineData.length} chlorine records after filtering`);
    
    // For debugging - log a sample of the first few data points to see what's returned
    if (chlorineData.length > 0) {
      const sampleData = chlorineData.slice(0, Math.min(3, chlorineData.length)).map(item => ({
        scheme_id: item.scheme_id,
        region: item.region,
        village_name: item.village_name,
        esr_name: item.esr_name,
        chlorine_value_7: item.chlorine_value_7
      }));
      console.log("Sample data:", sampleData);
    }
    
    res.json(chlorineData);
  } catch (error) {
    console.error("Error getting chlorine data:", error);
    res.status(500).json({ error: "Failed to get chlorine data" });
  }
});

// Get historical chlorine data by date range with deduplication
router.get("/historical", async (req, res) => {
  try {
    const { startDate, endDate, region, scheme_id, village_name, esr_name } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: "Both startDate and endDate are required. Format: YYYY-MM-DD or DD-MM-YYYY" 
      });
    }
    
    console.log("Historical Chlorine Data Request:", {
      startDate,
      endDate,
      region,
      scheme_id,
      village_name,
      esr_name
    });
    
    // Use the new chlorine_history table-based method
    const historicalData = await storage.getChlorineHistoricalDataByDateRange(
      startDate as string,
      endDate as string,
      region as string,
      scheme_id as string,
      village_name as string
    );
    
    // Filter by ESR name if specified
    let filteredData = historicalData;
    if (esr_name) {
      filteredData = historicalData.filter(record => 
        record.esr_name === esr_name
      );
    }
    
    console.log(`Returning ${filteredData.length} historical chlorine records`);
    
    res.json({
      success: true,
      count: filteredData.length,
      data: filteredData,
      query: {
        dateRange: `${startDate} to ${endDate}`,
        filters: {
          region,
          scheme_id,
          village_name,
          esr_name
        }
      }
    });
  } catch (error) {
    console.error("Error getting historical chlorine data:", error);
    res.status(500).json({ 
      error: "Failed to get historical chlorine data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get dashboard statistics for chlorine data
router.get("/dashboard-stats", async (req, res) => {
  try {
    const { region } = req.query;
    const stats = await storage.getChlorineDashboardStats(region as string | undefined);
    res.json(stats);
  } catch (error) {
    console.error("Error getting chlorine dashboard stats:", error);
    res.status(500).json({ error: "Failed to get chlorine dashboard statistics" });
  }
});

// Get single chlorine record by composite key
router.get("/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    
    // URL decode parameters since they might contain spaces or special characters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);
    
    const chlorineData = await storage.getChlorineDataByCompositeKey(
      schemeId,
      decodedVillageName,
      decodedEsrName
    );
    
    if (!chlorineData) {
      return res.status(404).json({ error: "Chlorine data not found" });
    }
    
    res.json(chlorineData);
  } catch (error) {
    console.error("Error getting chlorine data record:", error);
    res.status(500).json({ error: "Failed to get chlorine data record" });
  }
});

// Create new chlorine data record (admin only)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    
    // Validate data with Zod
    const validatedData = insertChlorineDataSchema.parse(data);
    
    const result = await storage.createChlorineData(validatedData);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error("Error creating chlorine data:", error);
      res.status(500).json({ error: "Failed to create chlorine data" });
    }
  }
});

// Update existing chlorine data (admin only)
router.put("/:schemeId/:villageName/:esrName", requireAdmin, async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const data = req.body;
    
    // URL decode parameters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);
    
    // Validate data with Zod
    const validatedData = updateChlorineDataSchema.parse(data);
    
    const result = await storage.updateChlorineData(
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
      console.error("Error updating chlorine data:", error);
      res.status(500).json({ error: "Failed to update chlorine data" });
    }
  }
});

// Delete chlorine data (admin only)
router.delete("/:schemeId/:villageName/:esrName", requireAdmin, async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    
    // URL decode parameters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);
    
    const success = await storage.deleteChlorineData(
      schemeId,
      decodedVillageName,
      decodedEsrName
    );
    
    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Chlorine data not found" });
    }
  } catch (error) {
    console.error("Error deleting chlorine data:", error);
    res.status(500).json({ error: "Failed to delete chlorine data" });
  }
});

// Import chlorine data from Excel file (admin only)
router.post("/import/excel", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const result = await storage.importChlorineDataFromExcel(req.file.buffer);
    res.json(result);
  } catch (error) {
    console.error("Error importing chlorine data from Excel:", error);
    res.status(500).json({ error: "Failed to import chlorine data from Excel" });
  }
});

// Import chlorine data from CSV file (admin only)
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
    
    // Log a preview of the file content for debugging
    const filePreview = req.file.buffer.toString('utf8').substring(0, 200);
    console.log("CSV content preview:", filePreview);
    
    // Process CSV file with improved error handling and retry functionality
    try {
      // Use retry functionality for the import operation
      const result = await executeWithRetry(async () => {
        return storage.importChlorineDataFromCSV(req.file!.buffer);
      }, 5, 2000); // 5 retries with 2 second initial delay (with exponential backoff)
      
      console.log("CSV import completed successfully with retry support:", result);
      res.json(result);
    } catch (importError: any) {
      console.error("Detailed CSV import error (after retries):", importError);
      // Send detailed error to client
      res.status(500).json({ 
        error: "Failed to import chlorine data from CSV after multiple retry attempts", 
        details: importError.message || String(importError),
        preview: filePreview
      });
    }
  } catch (error: any) {
    console.error("Error in CSV upload route:", error);
    res.status(500).json({ 
      error: "Failed to process CSV file upload",
      details: error.message || String(error)
    });
  }
});

// Get chlorine historical data by date range
router.get("/history", async (req, res) => {
  try {
    const { startDate, endDate, region, scheme, village } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: "Both startDate and endDate are required" 
      });
    }
    
    console.log(`Fetching chlorine historical data from ${startDate} to ${endDate}`);
    
    const historicalData = await storage.getChlorineHistoricalDataByDateRange(
      startDate as string,
      endDate as string,
      region as string,
      scheme as string,
      village as string
    );
    
    console.log(`Returning ${historicalData.length} historical chlorine records`);
    res.json(historicalData);
  } catch (error: any) {
    console.error("Error fetching chlorine historical data:", error);
    res.status(500).json({ 
      error: "Failed to fetch historical chlorine data",
      details: error.message 
    });
  }
});

// Get chlorine historical summary by date range
router.get("/history/summary", async (req, res) => {
  try {
    const { startDate, endDate, region } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: "Both startDate and endDate are required" 
      });
    }
    
    console.log(`Generating chlorine historical summary from ${startDate} to ${endDate}`);
    
    const summary = await storage.getChlorineHistoricalSummaryByDateRange(
      startDate as string,
      endDate as string,
      region as string
    );
    
    console.log("Historical summary generated:", summary);
    res.json(summary);
  } catch (error: any) {
    console.error("Error generating chlorine historical summary:", error);
    res.status(500).json({ 
      error: "Failed to generate historical summary",
      details: error.message 
    });
  }
});

// Get chlorine historical data for specific ESR
router.get("/history/esr/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: "Both startDate and endDate are required" 
      });
    }
    
    console.log(`Fetching ESR historical data for ${esrName} from ${startDate} to ${endDate}`);
    
    const esrHistory = await storage.getChlorineHistoricalDataForESR(
      schemeId,
      villageName,
      esrName,
      startDate as string,
      endDate as string
    );
    
    console.log(`Returning ${esrHistory.length} daily records for ESR ${esrName}`);
    res.json(esrHistory);
  } catch (error: any) {
    console.error("Error fetching ESR historical data:", error);
    res.status(500).json({ 
      error: "Failed to fetch ESR historical data",
      details: error.message 
    });
  }
});

export default router;