/**
 * This file fixes the filter conditions in storage.ts
 * to correctly handle "Fully Completed" status filters
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Current directory equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to storage.ts
const storageFilePath = path.join(__dirname, 'server', 'storage.ts');

// Function to update the storage.ts file
async function updateStorageFile() {
  try {
    console.log('Reading storage.ts file...');
    const content = fs.readFileSync(storageFilePath, 'utf8');
    
    // Fix for the getAllSchemes method
    const pattern1 = /else if \(statusFilter === "Fully Completed"\) \{\s+query = query\.where\(sql`LOWER\(\${schemeStatuses\.fully_completion_scheme_status}\) IN \('fully-completed', 'Completed', 'fully completed'\)`\);/g;
    const replacement1 = `else if (statusFilter === "Fully Completed") {
        query = query.where(sql\`\${schemeStatuses.fully_completion_scheme_status} IN ('Completed', 'Fully-Completed', 'Fully Completed')\`);`;
    
    // Fix for the getSchemesByRegion method
    const pattern2 = /else if \(statusFilter === "Fully Completed"\) \{\s+query = query\.where\(sql`LOWER\(\${schemeStatuses\.fully_completion_scheme_status}\) IN \('fully-completed', 'Completed', 'fully completed'\)`\);/g;
    const replacement2 = `else if (statusFilter === "Fully Completed") {
        query = query.where(sql\`\${schemeStatuses.fully_completion_scheme_status} IN ('Completed', 'Fully-Completed', 'Fully Completed')\`);`;
    
    // Apply replacements
    let updatedContent = content.replace(pattern1, replacement1);
    updatedContent = updatedContent.replace(pattern2, replacement2);
    
    if (content === updatedContent) {
      console.log('No changes were made. The pattern wasn\'t found.');
      return false;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(storageFilePath, updatedContent, 'utf8');
    console.log('Successfully updated the filter conditions in storage.ts');
    return true;
  } catch (error) {
    console.error('Error updating storage.ts:', error);
    return false;
  }
}

// Run the function
updateStorageFile()
  .then(success => {
    console.log(success ? 'Update completed successfully!' : 'Update failed.');
  })
  .catch(err => {
    console.error('Error executing the update:', err);
  });