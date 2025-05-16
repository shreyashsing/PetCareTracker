/**
 * Script to add warning comments to index.js
 * This helps developers know that index.js should be kept in sync with index.ts
 */

const fs = require('fs');
const path = require('path');

// Paths to the index files
const indexJsPath = path.join(process.cwd(), 'index.js');

/**
 * Add a warning comment to the JavaScript file
 */
function addWarningComment() {
  try {
    console.log('Adding warning comment to index.js...');
    
    // Check if index.js exists
    if (!fs.existsSync(indexJsPath)) {
      console.error('Error: index.js does not exist');
      process.exit(1);
    }
    
    // Read the current content
    const currentContent = fs.readFileSync(indexJsPath, 'utf8');
    
    // Check if the warning comment already exists
    if (currentContent.includes('WARNING: This file should be kept in sync with index.ts')) {
      console.log('Warning comment already exists in index.js');
      return;
    }
    
    // Create the warning comment
    const warning = `/**
 * WARNING: This file should be kept in sync with index.ts
 * When making changes to the application entry point:
 * 1. First modify index.ts with proper TypeScript types
 * 2. Then manually update this file to match the functionality
 * 
 * This dual-file approach is necessary for compatibility with bundlers
 * that expect a JavaScript entry point while maintaining TypeScript support.
 */

`;
    
    // Add the warning to the beginning of the file
    const updatedContent = warning + currentContent;
    
    // Write back to index.js
    fs.writeFileSync(indexJsPath, updatedContent);
    
    console.log('Successfully added warning comment to index.js');
  } catch (error) {
    console.error('Error updating index.js:', error);
    process.exit(1);
  }
}

// Run the script
addWarningComment(); 