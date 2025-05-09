/**
 * Direct fix for the Connected status filter in the getSchemesByRegion function
 * This script makes a targeted edit to add the Connected filter to the second instance in the storage.ts file
 */

import fs from 'fs';
import path from 'path';

// Function to add the Connected filter to getSchemesByRegion
async function addConnectedFilterToRegion() {
  try {
    const storagePath = path.join(process.cwd(), 'server', 'storage.ts');
    console.log(`Reading file: ${storagePath}`);
    
    // Read the storage.ts file
    let content = fs.readFileSync(storagePath, 'utf8');
    
    // Find the getSchemesByRegion function and its status filter
    const regionStart = content.indexOf('async getSchemesByRegion');
    if (regionStart === -1) {
      console.error('Could not find getSchemesByRegion function in storage.ts');
      return;
    }
    
    // Find the second occurrence of the status filter code after the regionStart position
    const targetSection = content.substring(regionStart);
    
    // Target the specific line in the getSchemesByRegion function
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
    
    // Replace the target line with our new code in the second part of the file
    const updatedSection = targetSection.replace(targetInProgressLines, connectedFilterCode);
    
    // Reconstruct the full file content
    const updatedContent = content.substring(0, regionStart) + updatedSection;
    
    // Write the updated content back to the file
    fs.writeFileSync(storagePath, updatedContent, 'utf8');
    
    console.log('Connected filter added to getSchemesByRegion function!');
  } catch (error) {
    console.error('Error adding Connected filter to region function:', error);
  }
}

// Run the function
addConnectedFilterToRegion();