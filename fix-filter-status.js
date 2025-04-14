/**
 * Fix script for the "Fully Completed" filter not working correctly 
 * in the storage.ts file
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory as __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the storage.ts file
const storageFilePath = path.join(__dirname, 'server', 'storage.ts');

// Function to fix the filter logic
async function fixFilterLogic() {
  try {
    console.log('Reading storage.ts file...');
    
    // Read the current content of the file
    const currentContent = fs.readFileSync(storageFilePath, 'utf8');
    
    // The problematic SQL query that needs to be fixed
    const oldFilter = `LOWER(\${schemeStatuses.fully_completion_scheme_status}) IN ('fully-completed', 'Completed', 'fully completed')`;
    
    // The updated SQL query that includes 'Fully Completed'
    const newFilter = `\${schemeStatuses.fully_completion_scheme_status} = 'Fully Completed' OR LOWER(\${schemeStatuses.fully_completion_scheme_status}) IN ('fully-completed', 'completed', 'fully completed')`;
    
    // Replace all occurrences
    const updatedContent = currentContent.replace(new RegExp(oldFilter, 'g'), newFilter);
    
    if (currentContent === updatedContent) {
      console.log('No changes were made to the file. The filter pattern might not be found.');
      return false;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(storageFilePath, updatedContent, 'utf8');
    
    console.log('Successfully updated filter logic in storage.ts');
    return true;
  } catch (error) {
    console.error('Error fixing filter logic:', error);
    return false;
  }
}

// Run the fix function
fixFilterLogic()
  .then(success => {
    if (success) {
      console.log('Filter fix completed successfully!');
      console.log('You should now be able to filter schemes with "Fully Completed" status.');
    } else {
      console.log('Filter fix did not complete. Please check the storage.ts file manually.');
    }
  })
  .catch(err => {
    console.error('Error executing fix script:', err);
  });