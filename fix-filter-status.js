/**
 * Fix script for the "Fully Completed" filter not working correctly 
 * in the storage.ts file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixFilterLogic() {
  console.log('Fixing filter logic in storage.ts...');
  
  // Path to the storage.ts file
  const storageFilePath = path.join(__dirname, 'server', 'storage.ts');
  
  try {
    // Read the current file
    let content = fs.readFileSync(storageFilePath, 'utf8');
    
    // Original problematic condition
    const originalCondition = `// Handle Fully Completed status including "completed" and "Completed" values
      else if (statusFilter === "Fully Completed") {
        query = query.where(
          sql\`\${schemeStatuses.fully_completion_scheme_status} IN ('Completed', 'Fully-Completed', 'Fully Completed')\`,
        );
      }`;
    
    // Updated condition with LOWER function for case-insensitive comparison
    const updatedCondition = `// Handle Fully Completed status including "completed" and "Completed" values - with case insensitivity
      else if (statusFilter === "Fully Completed") {
        query = query.where(
          sql\`LOWER(\${schemeStatuses.fully_completion_scheme_status}) 
              IN (LOWER('Completed'), LOWER('Fully-Completed'), LOWER('Fully Completed'), LOWER('fully completed'))\`,
        );
      }`;
    
    // Replace all occurrences
    const updatedContent = content.replaceAll(originalCondition, updatedCondition);
    
    // Check if any replacements were made
    if (content === updatedContent) {
      console.log('No replacements needed or found. The file might have already been updated.');
      return;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(storageFilePath, updatedContent, 'utf8');
    
    console.log('Successfully updated filter logic in storage.ts!');
    console.log('Restart the server to apply changes.');
    
  } catch (error) {
    console.error('Error fixing filter logic:', error);
  }
}

fixFilterLogic().catch(console.error);