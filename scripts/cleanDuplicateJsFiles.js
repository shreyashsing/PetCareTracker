/**
 * Script to clean up compiled JavaScript files that have TypeScript equivalents
 * This helps prevent confusion and code duplication issues
 */

const fs = require('fs');
const path = require('path');

// Directories to check for duplicate JS/TS files
const directoriesToCheck = [
  'src/services/db',
  'src/utils',
  'src/types',
  'src/services',
  'src/hooks',
  'src/components'
];

// Files to exclude from deletion even if they have TypeScript equivalents
const excludedFiles = [
  'index.js' // Root index.js is needed for bundling
];

// Function to check if a file has a TypeScript equivalent
function hasTypeScriptEquivalent(filePath) {
  const tsPath = filePath.replace(/\.js$/, '.ts');
  const tsxPath = filePath.replace(/\.js$/, '.tsx');
  
  return fs.existsSync(tsPath) || fs.existsSync(tsxPath);
}

// Function to check if a file should be excluded from deletion
function shouldExcludeFile(filePath) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Exclude files in the root directory that are in the excludedFiles list
  if (path.dirname(relativePath) === '.' && excludedFiles.includes(fileName)) {
    return true;
  }
  
  return false;
}

// Function to delete JavaScript files that have TypeScript equivalents
function cleanDirectory(directory) {
  console.log(`Checking directory: ${directory}`);
  
  try {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // Recursively check subdirectories
        cleanDirectory(filePath);
      } else if (file.endsWith('.js') && hasTypeScriptEquivalent(filePath)) {
        // Check if the file should be excluded
        if (shouldExcludeFile(filePath)) {
          console.log(`Skipping excluded file: ${filePath}`);
          continue;
        }
        
        console.log(`Deleting duplicate JS file: ${filePath}`);
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directory}:`, error);
  }
}

// Main function
function main() {
  console.log('Starting cleanup of duplicate JavaScript files...');
  
  // Also check the root directory for duplicates
  cleanDirectory(process.cwd());
  
  for (const dir of directoriesToCheck) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      cleanDirectory(fullPath);
    } else {
      console.log(`Directory not found: ${fullPath}`);
    }
  }
  
  console.log('Cleanup complete!');
}

// Run the script
main(); 