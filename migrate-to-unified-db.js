/**
 * Migration Script for Unified Database Manager
 * 
 * This script helps identify files that need to be updated to use the unified database manager.
 * Run with: node migrate-to-unified-db.js
 * Run with: node migrate-to-unified-db.js --update to automatically update files
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Configuration
const rootDir = path.resolve(__dirname);
const excludeDirs = ['node_modules', '.git', 'android', 'ios', 'build', 'dist'];
const fileExtensions = ['.js', '.jsx', '.ts', '.tsx'];
const shouldUpdate = process.argv.includes('--update');

// Regular expressions for finding imports and usages
const importRegex = /import\s+\{([^}]*databaseManager[^}]*)\}\s+from\s+['"]([^'"]+)['"]/g;
const usageRegex = /databaseManager\.([\w]+)\.([\w]+)/g;

// Track files to update
const filesToUpdate = [];
const updatedFiles = [];
const errorFiles = [];

/**
 * Check if a file should be processed
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return fileExtensions.includes(ext);
}

/**
 * Process a single file
 */
async function processFile(filePath) {
  try {
    const content = await readFileAsync(filePath, 'utf8');
    
    // Check for imports of databaseManager
    const hasImport = importRegex.test(content);
    importRegex.lastIndex = 0; // Reset regex
    
    // Check for usages of databaseManager
    const hasUsage = usageRegex.test(content);
    usageRegex.lastIndex = 0; // Reset regex
    
    if (hasImport || hasUsage) {
      // Extract all usages to know which repositories are used
      const usages = [];
      let match;
      while ((match = usageRegex.exec(content)) !== null) {
        usages.push({
          repo: match[1],
          method: match[2],
          full: match[0]
        });
      }
      
      filesToUpdate.push({
        path: filePath,
        content,
        hasImport,
        hasUsage,
        usages: [...new Set(usages.map(u => u.repo))] // Get unique repositories used
      });
      
      // Update the file if requested
      if (shouldUpdate) {
        await updateFile(filePath, content);
      }
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

/**
 * Update a file to use the unified database manager
 */
async function updateFile(filePath, content) {
  try {
    // Update imports
    let updatedContent = content.replace(importRegex, (match, imports, source) => {
      // Check if unifiedDatabaseManager is already imported
      if (imports.includes('unifiedDatabaseManager')) {
        return match;
      }
      
      // Replace databaseManager with unifiedDatabaseManager
      const updatedImports = imports
        .split(',')
        .map(part => {
          const trimmed = part.trim();
          if (trimmed === 'databaseManager') {
            return 'unifiedDatabaseManager';
          } else if (trimmed.includes('databaseManager')) {
            return part.replace('databaseManager', 'unifiedDatabaseManager');
          }
          return part;
        })
        .join(',');
      
      return `import {${updatedImports}} from "${source}"`;
    });
    
    // Update usages
    updatedContent = updatedContent.replace(usageRegex, 'unifiedDatabaseManager.$1.$2');
    
    // Write the updated content
    await writeFileAsync(filePath, updatedContent, 'utf8');
    updatedFiles.push(filePath);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    errorFiles.push(filePath);
  }
}

/**
 * Walk through directory recursively
 */
async function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        await walkDir(fullPath);
      }
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      await processFile(fullPath);
    }
  }
}

/**
 * Generate migration report
 */
function generateReport() {
  console.log(`\n=== Migration Report ===`);
  console.log(`Found ${filesToUpdate.length} files to update\n`);
  
  // Group by repositories used
  const repoUsage = {};
  for (const file of filesToUpdate) {
    for (const repo of file.usages) {
      repoUsage[repo] = (repoUsage[repo] || 0) + 1;
    }
  }
  
  console.log('Repository usage:');
  Object.entries(repoUsage)
    .sort((a, b) => b[1] - a[1])
    .forEach(([repo, count]) => {
      console.log(`- ${repo}: ${count} files`);
    });
  
  console.log('\nFiles to update:');
  filesToUpdate.forEach(file => {
    const relativePath = path.relative(rootDir, file.path);
    console.log(`- ${relativePath} (uses: ${file.usages.join(', ')})`);
  });
  
  if (shouldUpdate) {
    console.log(`\n=== Update Results ===`);
    console.log(`Updated ${updatedFiles.length} files successfully`);
    if (errorFiles.length > 0) {
      console.log(`Failed to update ${errorFiles.length} files`);
      errorFiles.forEach(file => {
        console.log(`- ${path.relative(rootDir, file)}`);
      });
    }
  } else {
    console.log('\n=== Migration Instructions ===');
    console.log('1. Update imports in each file:');
    console.log('   From: import {unifiedDatabaseManager} from "../services/db";');
    console.log('   To:   import { unifiedDatabaseManager } from "../services/db";');
    console.log('\n2. Replace all usages:');
    console.log('   From: unifiedDatabaseManager.pets.getAll()');
    console.log('   To:   unifiedDatabaseManager.pets.getAll()');
    console.log('\n3. To automatically update all files, run:');
    console.log('   node migrate-to-unified-db.js --update');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting migration analysis...');
  if (shouldUpdate) {
    console.log('Update mode enabled - files will be modified');
  }
  await walkDir(rootDir);
  generateReport();
}

main().catch(console.error); 