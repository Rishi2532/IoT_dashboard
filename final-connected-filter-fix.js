/**
 * Comprehensive fix for Connected status filter
 * This script directly modifies the targeted sections of the file to ensure both
 * functions have correctly implemented the Connected filter with proper if/else if structure
 */

import fs from 'fs';
import path from 'path';

// Function to fix all instances with correct if/else if structure
async function applyComprehensiveFix() {
  try {
    const storagePath = path.join(process.cwd(), 'server', 'storage.ts');
    console.log(`Reading file: ${storagePath}`);
    
    // Read the storage.ts file
    let content = fs.readFileSync(storagePath, 'utf8');
    
    // Find the getAllSchemes function and update it correctly
    const getAllSchemesSection = content.match(/async getAllSchemes[\s\S]+?if \(statusFilter && statusFilter !== "all"\) \{[\s\S]+?query = query\.where\([^}]+\);[\s\S]+?\}/m);
    
    if (getAllSchemesSection) {
      const correctFilterLogic = `    // Apply status filter if provided
    if (statusFilter && statusFilter !== "all") {
      // Handle "Connected" status which includes both Fully Completed and In Progress but not Not-Connected
      if (statusFilter === "Connected") {
        query = query.where(
          sql\`\${schemeStatuses.fully_completion_scheme_status} != 'Not-Connected'\`,
        );
      }
      // Handle both "Partial" and "In Progress" as the same filter
      else if (statusFilter === "In Progress") {
        query = query.where(
          sql\`\${schemeStatuses.fully_completion_scheme_status} IN ('Partial', 'In Progress')\`,
        );
      }
      // Handle Fully Completed status including "completed" and "Completed" values - with case insensitivity
      else if (statusFilter === "Fully Completed") {
        query = query.where(
          sql\`LOWER(\${schemeStatuses.fully_completion_scheme_status}) 
              IN (LOWER('Completed'), LOWER('Fully-Completed'), LOWER('Fully Completed'), LOWER('fully completed'))\`,
        );
      } else {
        query = query.where(
          eq(schemeStatuses.fully_completion_scheme_status, statusFilter),
        );
      }`;
      
      content = content.replace(/\/\/ Apply status filter if provided[\s\S]+?if \(statusFilter && statusFilter !== "all"\) \{[\s\S]+?query = query\.where\([^}]+\);[\s\S]+?\}/m, correctFilterLogic);
    }
    
    // Find the getSchemesByRegion function and update it correctly
    const getSchemesByRegionSection = content.match(/async getSchemesByRegion[\s\S]+?if \(statusFilter && statusFilter !== "all"\) \{[\s\S]+?query = query\.where\([^}]+\);[\s\S]+?\}/m);
    
    if (getSchemesByRegionSection) {
      const regionStart = content.indexOf('async getSchemesByRegion');
      const correctRegionFilterLogic = `    // Apply status filter if provided
    if (statusFilter && statusFilter !== "all") {
      // Handle "Connected" status which includes both Fully Completed and In Progress but not Not-Connected
      if (statusFilter === "Connected") {
        query = query.where(
          sql\`\${schemeStatuses.fully_completion_scheme_status} != 'Not-Connected'\`,
        );
      }
      // Handle both "Partial" and "In Progress" as the same filter
      else if (statusFilter === "In Progress") {
        query = query.where(
          sql\`\${schemeStatuses.fully_completion_scheme_status} IN ('Partial', 'In Progress')\`,
        );
      }
      // Handle Fully Completed status including "completed" and "Completed" values - with case insensitivity
      else if (statusFilter === "Fully Completed") {
        query = query.where(
          sql\`LOWER(\${schemeStatuses.fully_completion_scheme_status}) 
              IN (LOWER('Completed'), LOWER('Fully-Completed'), LOWER('Fully Completed'), LOWER('fully completed'))\`,
        );
      } else {
        query = query.where(
          eq(schemeStatuses.fully_completion_scheme_status, statusFilter),
        );
      }`;
      
      const regionSection = content.substring(regionStart);
      const updatedRegionSection = regionSection.replace(/\/\/ Apply status filter if provided[\s\S]+?if \(statusFilter && statusFilter !== "all"\) \{[\s\S]+?query = query\.where\([^}]+\);[\s\S]+?\}/m, correctRegionFilterLogic);
      
      content = content.substring(0, regionStart) + updatedRegionSection;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(storagePath, content, 'utf8');
    
    console.log('Comprehensive fix applied successfully!');
  } catch (error) {
    console.error('Error applying comprehensive fix:', error);
  }
}

// Run the function
applyComprehensiveFix();