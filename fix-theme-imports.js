/**
 * Script to fix useTheme imports in the project
 * Run with: node fix-theme-imports.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Base directory
const baseDir = path.join(__dirname, 'src');

// Find all TypeScript files
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Process a file
function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace import statements
  if (content.includes('import') && content.includes('useTheme') && content.includes('hooks/useTheme')) {
    const newContent = content.replace(
      /import\s+\{\s*([^}]*useTheme[^}]*)\s*\}\s+from\s+(['"]).*hooks\/useTheme\2/g,
      (match, importList) => {
        // If the import contains just useTheme or useTheme with other items
        if (importList.includes('useTheme')) {
          const newImportList = importList
            .split(',')
            .map(item => item.trim())
            .filter(item => item !== 'useTheme' && 
                           item !== 'ThemeProvider' && 
                           item !== 'ThemeColors' && 
                           item !== 'LightTheme' && 
                           item !== 'DarkTheme')
            .join(', ');
          
          if (newImportList.length === 0) {
            // Only had theme-related imports
            return `import { useAppColors } from $2../hooks/useAppColors$2`;
          } else {
            // Had other imports too - add useAppColors import separately
            return `import { ${newImportList} } from $2../hooks/useTheme$2\nimport { useAppColors } from $2../hooks/useAppColors$2`;
          }
        }
        return match; // No change needed
      }
    );
    
    // Replace usage of useTheme
    const usageReplaced = newContent.replace(
      /const\s+\{\s*([^}]*colors[^}]*)\s*\}\s*=\s*useTheme\(\)/g,
      (match, usageList) => {
        // Replace with useAppColors but keep the same properties
        return `const { ${usageList} } = useAppColors()`;
      }
    );
    
    // If there are specific instances of theme and setTheme, remove them
    const themeRemoved = usageReplaced.replace(
      /const\s+\{\s*theme,\s*setTheme,\s*([^}]*)\s*\}\s*=\s*useTheme\(\)/g,
      (match, remaining) => {
        return `const { ${remaining} } = useAppColors()`;
      }
    );
    
    if (content !== themeRemoved) {
      fs.writeFileSync(filePath, themeRemoved, 'utf8');
      modified = true;
    }
  }
  
  return modified;
}

// Main function
function main() {
  const files = findTsFiles(baseDir);
  let modifiedCount = 0;
  
  files.forEach(file => {
    if (processFile(file)) {
      modifiedCount++;
    }
  });
  
  console.log(`\nProcessed ${files.length} files.`);
  console.log(`Modified ${modifiedCount} files with useTheme imports.`);
  console.log('\nPlease check your files and make sure they compile correctly.');
  console.log('If you encounter issues with files that still import useTheme, update them manually by:');
  console.log('1. Importing useAppColors from "../hooks/useAppColors"');
  console.log('2. Replacing useTheme() with useAppColors()');
  console.log('3. Removing any theme/setTheme properties from destructured objects\n');
}

main(); 