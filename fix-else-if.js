/**
 * Quick fix to correct the if/else if issue in our previous edits
 */

import fs from 'fs';
import path from 'path';

// Function to fix the if/else if issue
async function fixElseIf() {
  try {
    const storagePath = path.join(process.cwd(), 'server', 'storage.ts');
    console.log(`Reading file: ${storagePath}`);
    
    // Read the storage.ts file
    let content = fs.readFileSync(storagePath, 'utf8');
    
    // Find and replace the incorrect "if" with "else if" at both locations
    const incorrectIf = `      }
      // Handle both "Partial" and "In Progress" as the same filter
      if (statusFilter === "In Progress") {`;
      
    const correctElseIf = `      }
      // Handle both "Partial" and "In Progress" as the same filter
      else if (statusFilter === "In Progress") {`;
    
    // Replace all occurrences
    const updatedContent = content.replace(new RegExp(incorrectIf, 'g'), correctElseIf);
    
    // Write the updated content back to the file
    fs.writeFileSync(storagePath, updatedContent, 'utf8');
    
    console.log('Fixed if/else if issue successfully!');
  } catch (error) {
    console.error('Error fixing if/else if issue:', error);
  }
}

// Run the function
fixElseIf();