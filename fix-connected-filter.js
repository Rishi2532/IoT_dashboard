/**
 * Direct fix for the Connected status filter
 * This script makes a very targeted edit to add the Connected filter to the storage.ts file
 */

import fs from 'fs';
import path from 'path';

// Function to add the Connected filter
async function addConnectedFilter() {
  try {
    const storagePath = path.join(process.cwd(), 'server', 'storage.ts');
    console.log(`Reading file: ${storagePath}`);
    
    // Read the storage.ts file
    let content = fs.readFileSync(storagePath, 'utf8');
    
    // Target the specific line before "if (statusFilter === "In Progress")"
    const targetInProgressLines = `// Handle both "Partial" and "In Progress" as the same filter
      if (statusFilter === "In Progress") {`;
      
    // Create the new code to insert for the Connected filter
    const connectedFilterCode = `// Handle "Connected" status which includes both Fully Completed and In Progress but not Not-Connected
      if (statusFilter === "Connected") {
        query = query.where(
          sql\`\${schemeStatuses.fully_completion_scheme_status} != 'Not-Connected'\`,
        );
      }
      // Handle both "Partial" and "In Progress" as the same filter
      if (statusFilter === "In Progress") {`;
    
    // Replace the target line with our new code (includes the Connected filter)
    const updatedContent = content.replace(targetInProgressLines, connectedFilterCode);
    
    // Write the updated content back to the file
    fs.writeFileSync(storagePath, updatedContent, 'utf8');
    
    console.log('Connected filter added successfully!');
  } catch (error) {
    console.error('Error adding Connected filter:', error);
  }
}

// Run the function
addConnectedFilter();