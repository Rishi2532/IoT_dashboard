import express from "express";
import multer from "multer";
import { storage } from "../storage";
import { ZodError } from "zod";
import { insertPressureDataSchema, updatePressureDataSchema, appState } from "@shared/schema";
import { getDB } from "../db";
import { eq } from "drizzle-orm";
import * as XLSX from 'xlsx';

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

// Get historical pressure data with date range filters
router.get("/historical", async (req, res) => {
  try {
    const { startDate, endDate, region, scheme_id, village_name, esr_name } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    
    const filter = {
      startDate: startDate as string,
      endDate: endDate as string,
      region: region as string | undefined,
      scheme_id: scheme_id as string | undefined,
      village_name: village_name as string | undefined,
      esr_name: esr_name as string | undefined,
    };
    
    console.log("Historical pressure data request:", filter);
    
    const historicalData = await storage.getHistoricalPressureData(filter);
    
    console.log(`Returning ${historicalData.length} historical pressure records`);
    res.json(historicalData);
  } catch (error) {
    console.error("Error getting historical pressure data:", error);
    res.status(500).json({ error: "Failed to get historical pressure data" });
  }
});

// Get all pressure data with optional filters
router.get("/", async (req, res) => {
  try {
    const { region, pressureRange, minPressure, maxPressure } = req.query;
    
    console.log("Pressure API Request Filters:", {
      region,
      pressureRange,
      minPressure,
      maxPressure
    });
    
    const filter: any = {};
    if (region) filter.region = region as string;
    if (pressureRange) filter.pressureRange = pressureRange as 'below_0.2' | 'between_0.2_0.7' | 'above_0.7' | 'consistent_zero' | 'consistent_below' | 'consistent_optimal' | 'consistent_above';
    if (minPressure) filter.minPressure = parseFloat(minPressure as string);
    if (maxPressure) filter.maxPressure = parseFloat(maxPressure as string);
    
    console.log("Applied pressure filter object:", filter);
    
    const pressureData = await storage.getAllPressureData(filter);
    console.log(`Returning ${pressureData.length} pressure records after filtering`);
    
    // For debugging - log a sample of the first few data points
    if (pressureData.length > 0) {
      const sampleData = pressureData.slice(0, Math.min(3, pressureData.length)).map(item => ({
        scheme_id: item.scheme_id,
        region: item.region,
        village_name: item.village_name,
        esr_name: item.esr_name,
        pressure_value_7: item.pressure_value_7
      }));
      console.log("Sample pressure data:", sampleData);
    }
    
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
    
    // Get last import statistics from app_state
    try {
      const db = await getDB();
      const lastImportResult = await db
        .select()
        .from(appState)
        .where(eq(appState.key, "last_pressure_import"));
      
      if (lastImportResult.length > 0) {
        const lastImport = lastImportResult[0].value as any;
        // Add last import statistics to the response
        res.json({
          ...stats,
          lastImport: {
            inserted: lastImport.inserted || 0,
            updated: lastImport.updated || 0,
            totalProcessed: lastImport.totalProcessed || 0,
            timestamp: lastImport.timestamp,
            errors: lastImport.errors || 0
          }
        });
      } else {
        // No import statistics found, return just the dashboard stats
        res.json(stats);
      }
    } catch (appStateError) {
      console.error("Error fetching last import stats:", appStateError);
      // Still return the main stats even if we couldn't get the import stats
      res.json(stats);
    }
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
    
    // Check if the user wants to clear existing data before import
    const clearExisting = req.body.clearExisting === 'true';
    
    // Process CSV file with improved error handling
    try {
      // Pass the clearExisting option to the import function
      const result = await storage.importPressureDataFromCSV(req.file.buffer, { clearExisting });
      console.log(`CSV import completed successfully (clearExisting=${clearExisting}):`, result);
      res.json(result);
    } catch (importError: any) {
      console.error("Detailed CSV import error:", importError);
      // Send detailed error to client
      res.status(500).json({ 
        error: "Failed to import pressure data from CSV", 
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

// Export historical pressure data to Excel
router.get("/export/historical", async (req, res) => {
  try {
    const { startDate, endDate, region } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    
    const filter = {
      startDate: startDate as string,
      endDate: endDate as string,
      region: region as string | undefined,
    };
    
    console.log("Historical pressure export request:", filter);
    
    const historicalData = await storage.getHistoricalPressureData(filter);
    
    if (historicalData.length === 0) {
      return res.status(404).json({ 
        error: "No historical data found for the specified date range" 
      });
    }
    
    // Transform data for Excel export
    const excelData = historicalData.map(row => ({
      'Region': row.region,
      'Circle': row.circle,
      'Division': row.division,
      'Sub Division': row.sub_division,
      'Block': row.block,
      'Scheme ID': row.scheme_id,
      'Scheme Name': row.scheme_name,
      'Village Name': row.village_name,
      'ESR Name': row.esr_name,
      'Measurement Date': row.measurement_date,
      'Pressure Value (bar)': row.pressure_value,
      'Dashboard URL': row.dashboard_url || 'N/A',
    }));
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Region
      { wch: 15 }, // Circle
      { wch: 15 }, // Division
      { wch: 15 }, // Sub Division
      { wch: 15 }, // Block
      { wch: 12 }, // Scheme ID
      { wch: 30 }, // Scheme Name
      { wch: 20 }, // Village Name
      { wch: 25 }, // ESR Name
      { wch: 15 }, // Measurement Date
      { wch: 18 }, // Pressure Value
      { wch: 40 }, // Dashboard URL
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historical Pressure Data');
    
    // Generate filename
    const regionFilter = region && region !== 'all' ? `_${region}` : '_all_regions';
    const filename = `Pressure_Historical_Data${regionFilter}_${startDate}_to_${endDate}.xlsx`;
    
    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Length', buffer.length);
    
    console.log(`Exporting ${historicalData.length} historical pressure records to ${filename}`);
    
    // Send the buffer
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting historical pressure data:", error);
    res.status(500).json({ error: "Failed to export historical pressure data" });
  }
});

export default router;