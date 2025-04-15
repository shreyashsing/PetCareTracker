const fs = require('fs');
const path = require('path');

console.log('Manually fixing TurboModuleRegistry.js');

// Define paths
const sourceFile = path.resolve(__dirname, '../fixed-TurboModuleRegistry.js');
const targetDir = path.resolve(__dirname, '../node_modules/react-native/Libraries/TurboModule');
const targetFile = path.resolve(targetDir, 'TurboModuleRegistry.js');

try {
  // Check if our fixed file exists
  if (!fs.existsSync(sourceFile)) {
    console.error('Fixed file not found at:', sourceFile);
    process.exit(1);
  }

  // Check if the target directory exists
  if (!fs.existsSync(targetDir)) {
    console.error('Target directory not found at:', targetDir);
    process.exit(1);
  }

  // Read source file
  const fileContent = fs.readFileSync(sourceFile, 'utf8');
  
  // Write to target file
  fs.writeFileSync(targetFile, fileContent);
  console.log('Successfully copied fixed TurboModuleRegistry.js');
  
} catch (error) {
  console.error('Error fixing TurboModuleRegistry:', error);
  process.exit(1);
} 