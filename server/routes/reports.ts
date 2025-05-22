import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db-storage';
import { reportFiles, insertReportFileSchema } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Set up multer storage configuration for Excel files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'reports', 'admin');
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueId = uuidv4();
    // Preserve original extension
    const ext = path.extname(file.originalname);
    cb(null, uniqueId + ext);
  }
});

// Configure multer upload middleware
const upload = multer({
  storage,
  // Allow any file type to be uploaded
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Get list of available report files
router.get('/', async (req, res) => {
  try {
    const files = await db
      .select()
      .from(reportFiles)
      .where(eq(reportFiles.is_active, true));
    res.json(files);
  } catch (error) {
    console.error('Error fetching report files:', error);
    res.status(500).json({ error: 'Failed to fetch report files' });
  }
});

// Get report file by type (latest version)
router.get('/type/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    
    // Validate report type
    const validReportTypes = [
      'esr_level', 
      'water_consumption', 
      'lpcd_village', 
      'chlorine', 
      'pressure', 
      'village_level', 
      'scheme_level'
    ];
    
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }
    
    // Get the latest active file of this type
    const [latestFile] = await db
      .select()
      .from(reportFiles)
      .where(eq(reportFiles.report_type, reportType))
      .where(eq(reportFiles.is_active, true))
      .orderBy(reportFiles.upload_date, 'desc')
      .limit(1);
    
    if (!latestFile) {
      return res.status(404).json({ error: 'Report file not found' });
    }
    
    // Send the file
    const filePath = latestFile.file_path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    res.download(filePath, latestFile.original_name);
  } catch (error) {
    console.error('Error retrieving report file:', error);
    res.status(500).json({ error: 'Failed to retrieve report file' });
  }
});

// Download report file by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fileId = parseInt(id);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }
    
    // Get the file record
    const [file] = await db.select().from(reportFiles).where(eq(reportFiles.id, fileId));
    
    if (!file || !file.is_active) {
      return res.status(404).json({ error: 'Report file not found' });
    }
    
    // Send the file
    const filePath = file.file_path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    res.download(filePath, file.original_name);
  } catch (error) {
    console.error('Error downloading report file:', error);
    res.status(500).json({ error: 'Failed to download report file' });
  }
});

// Upload a new report file (admin only)
router.post('/upload', requireAdmin, upload.single('file'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const { report_type } = req.body;
    
    // Accept any report type that matches our predefined buttons
    // This allows flexible uploading of any file to any button
    const validReportTypes = [
      'esr_level', 
      'water_consumption', 
      'lpcd_village', 
      'chlorine', 
      'pressure', 
      'village_level', 
      'scheme_level'
    ];
    
    if (!validReportTypes.includes(report_type)) {
      console.log(`Received report_type: "${report_type}"`);
      // Remove uploaded file if report type is invalid
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid report type' });
    }
    
    // Get file stats for size
    const stats = fs.statSync(req.file.path);
    
    const fileData = {
      file_name: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      report_type: report_type,
      uploaded_by: req.session.userId,
      file_size: stats.size,
      is_active: true
    };
    
    // Validate data with zod schema
    const parsedData = insertReportFileSchema.parse(fileData);
    
    // First, deactivate any previous files of this type
    await db
      .update(reportFiles)
      .set({ is_active: false })
      .where(eq(reportFiles.report_type, report_type));
    
    // Insert the new file record
    const [insertedFile] = await db.insert(reportFiles).values(parsedData).returning();
    
    res.status(201).json({
      message: 'Report file uploaded successfully',
      file: insertedFile
    });
  } catch (error) {
    console.error('Error uploading report file:', error);
    
    // Clean up the uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error removing file after failed upload:', unlinkError);
      }
    }
    
    res.status(500).json({
      error: 'Failed to upload report file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete a report file (admin only)
router.delete('/:id', requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const fileId = parseInt(id);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }
    
    // Get the file record first to get the file path
    const [file] = await db.select().from(reportFiles).where(eq(reportFiles.id, fileId));
    
    if (!file) {
      return res.status(404).json({ error: 'Report file not found' });
    }
    
    // Deactivate the file (soft delete)
    await db
      .update(reportFiles)
      .set({ is_active: false })
      .where(eq(reportFiles.id, fileId));
    
    res.json({ message: 'Report file deleted successfully' });
  } catch (error) {
    console.error('Error deleting report file:', error);
    res.status(500).json({ error: 'Failed to delete report file' });
  }
});

export default router;