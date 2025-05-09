/**
 * Fix script to update the status filter in storage.ts
 * This adds the "Connected" filter that shows both "Fully Completed" and "In Progress" schemes
 */

const fs = require('fs');
const path = require('path');

async function fixStatusFilter() {
  console.log('Starting status filter fix...');
  
  // Path to storage.ts file
  const filePath = path.join(process.cwd(), 'server', 'storage.ts');
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the status filter blocks and replace them
  const statusFilterRegex = /\/\/ Apply status filter if provided\s+if \(statusFilter && statusFilter !== "all"\) \{\s+\/\/ Handle both "Partial" and "In Progress" as the same filter\s+if \(statusFilter === "In Progress"\) \{\s+query = query\.where\(\s+sql`\$\{schemeStatuses\.fully_completion_scheme_status\} IN \('Partial', 'In Progress'\)`,[^}]+\);\s+\}\s+\/\/ Handle Fully Completed status[^}]+\}\s+\}/g;
  
  // Create replacement that adds "Connected" filter
  const replacement = `// Apply status filter if provided
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
  
  // Replace the status filter blocks
  const newContent = content.replace(statusFilterRegex, replacement);
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  console.log('Status filter fix applied successfully');
}

// Execute the function
fixStatusFilter().catch(error => {
  console.error('Error applying status filter fix:', error);
  process.exit(1);
});