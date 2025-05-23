/**
 * Fix Reports Table Script
 * 
 * This script creates the report_files table if it doesn't exist.
 * Run this script to fix the "Failed to fetch report files" error in VS Code.
 */

import { db } from './server/db-storage.js';
import { reportFiles } from './shared/schema.js';

async function createReportFilesTable() {
  try {
    console.log('Checking if report_files table exists...');
    
    // Try to query the report_files table to see if it exists
    try {
      await db.select().from(reportFiles).limit(1);
      console.log('✅ report_files table already exists');
      return;
    } catch (err) {
      console.log('⚠️ report_files table does not exist, creating it now...');
    }
    
    // Create the report_files table using Drizzle's push functionality
    // This is similar to what drizzle-kit push does
    await db.execute(`
      CREATE TABLE IF NOT EXISTS report_files (
        id SERIAL PRIMARY KEY,
        file_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        report_type TEXT NOT NULL,
        upload_date TIMESTAMP DEFAULT NOW(),
        uploaded_by INTEGER REFERENCES users(id),
        file_size INTEGER,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);
    
    console.log('✅ report_files table created successfully');
    
    // Create uploads/reports directory
    const fs = await import('fs');
    const path = await import('path');
    
    const uploadDir = path.join(process.cwd(), 'uploads', 'reports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ Created directory: ${uploadDir}`);
    } else {
      console.log(`✅ Directory already exists: ${uploadDir}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating report_files table:', error);
  }
}

// Run the function
createReportFilesTable().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});