import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db-storage';
import { reportFiles, insertReportFileSchema } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Check for VS Code environment and set appropriate upload directory
const isVSCode = process.env.VSCODE_CLI === '1' || process.env.VSCODE_PID;

// Set the upload directory path based on environment
const uploadDir = isVSCode 
  ? path.join(process.cwd(), 'uploads', 'reports')  // Use project directory for VS Code
  : '/tmp/reports';  // Use tmp for Replit

// Ensure the upload directory exists with proper permissions
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  // On non-Windows systems, set directory permissions
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(uploadDir, 0o755);
    } catch (err) {
      console.error('Failed to set upload directory permissions:', err);
    }
  }
}

console.log("Report files upload directory:", uploadDir);

// Set up multer storage configuration for Excel files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
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
  fileFilter: (req, file, cb) => {
    // Only allow Excel files
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];
    
    if (allowedMimes.includes(file.mimetype) || 
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files are allowed.'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
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
    console.log('Attempting to fetch report files from database...');
    
    // Check if table exists first using a more resilient approach
    try {
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'report_files'
        );
      `);
      
      console.log('Table check result:', tableCheck);
      
      // If table doesn't exist, return empty array instead of error
      if (tableCheck && tableCheck.rows && tableCheck.rows.length > 0) {
        if (!tableCheck.rows[0].exists) {
          console.log('report_files table does not exist, returning empty array');
          return res.json([]);
        }
      }
    } catch (tableCheckError) {
      console.error('Error checking if report_files table exists:', tableCheckError);
      // Continue execution to try the regular query
    }
    
    // Try the regular query
    const allFiles = await db.select().from(reportFiles);
    console.log('Database query successful, found files:', allFiles.length);
    
    // Filter active files in memory
    const activeFiles = allFiles.filter(file => file.is_active === true);
    console.log('Active files after filtering:', activeFiles.length);
    
    res.json(activeFiles);
  } catch (error) {
    console.error('Detailed error fetching report files:', error);
    
    // Return empty array instead of error for better UX
    console.log('Returning empty array due to database error');
    res.json([]);
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
    const latestFiles = await db.select().from(reportFiles);
    
    // Filter files in memory
    const typeFiles = latestFiles.filter(file => 
      file.report_type === reportType && 
      file.is_active === true
    );
    
    // Find the latest file by sorting in memory
    const sortedFiles = [...typeFiles].sort((a, b) => {
      const dateA = a.upload_date ? new Date(a.upload_date as Date).getTime() : 0;
      const dateB = b.upload_date ? new Date(b.upload_date as Date).getTime() : 0;
      return dateB - dateA;
    });
    
    const latestFile = sortedFiles.length > 0 ? sortedFiles[0] : null;
    
    if (!latestFile) {
      return res.status(404).json({ error: 'Report file not found' });
    }
    
    // Send the file
    const filePath = latestFile.file_path;
    console.log(`Attempting to download file from path: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      
      // Try alternative location (handle both Replit and VS Code paths)
      const fileName = path.basename(filePath);
      const altPaths = [
        path.join('/tmp/reports', fileName),
        path.join(__dirname, '..', '..', 'uploads', 'reports', fileName),
        path.join(process.cwd(), 'uploads', 'reports', fileName)
      ];
      
      console.log(`Trying alternative paths: ${altPaths.join(', ')}`);
      
      // Find first existing alternative path
      const existingPath = altPaths.find(p => fs.existsSync(p));
      
      if (existingPath) {
        console.log(`Found file at alternative path: ${existingPath}`);
        return res.download(existingPath, latestFile.original_name);
      }
      
      return res.status(404).json({ 
        error: 'File not found on server',
        path: filePath,
        tried: altPaths
      });
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
    console.log(`Attempting to download file by ID from path: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      
      // Try alternative location (handle both Replit and VS Code paths)
      const fileName = path.basename(filePath);
      const altPaths = [
        path.join('/tmp/reports', fileName),
        path.join(__dirname, '..', '..', 'uploads', 'reports', fileName),
        path.join(process.cwd(), 'uploads', 'reports', fileName)
      ];
      
      console.log(`Trying alternative paths: ${altPaths.join(', ')}`);
      
      // Find first existing alternative path
      const existingPath = altPaths.find(p => fs.existsSync(p));
      
      if (existingPath) {
        console.log(`Found file at alternative path: ${existingPath}`);
        return res.download(existingPath, file.original_name);
      }
      
      return res.status(404).json({ 
        error: 'File not found on server',
        path: filePath,
        tried: altPaths
      });
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
    const allFiles = await db.select().from(reportFiles);
    const sameTypeFiles = allFiles.filter(f => f.report_type === report_type);
    
    // If there are existing files of the same type, deactivate them
    if (sameTypeFiles.length > 0) {
      for (const file of sameTypeFiles) {
        await db
          .update(reportFiles)
          .set({ is_active: false })
          .where(eq(reportFiles.id, file.id));
      }
    }
    
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