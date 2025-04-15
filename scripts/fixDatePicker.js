const fs = require('fs');
const path = require('path');

console.log('Fixing RNCMaterialDatePicker...');

// Define paths
const nodeModulesDir = path.resolve(__dirname, '../node_modules');
const ourShimsDir = path.resolve(__dirname, '../src/shims');

// Path to DateTimePicker's index.js
const datePickerIndexPath = path.resolve(nodeModulesDir, '@react-native-community/datetimepicker/src/index.js');
const datePickerPath = path.resolve(nodeModulesDir, '@react-native-community/datetimepicker');

// Helper function to ensure directory exists
function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log('Created directory:', dir);
    } catch (error) {
      console.error('Failed to create directory:', dir, error);
    }
  }
}

// Helper function to write a file
function writeFile(filePath, content) {
  try {
    ensureDirExists(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
    console.log('Created/Modified file:', filePath);
  } catch (error) {
    console.error('Failed to write file:', filePath, error);
  }
}

try {
  // Check if the DateTimePicker package exists
  if (!fs.existsSync(datePickerPath)) {
    console.warn('DateTimePicker package not found, make sure to install @react-native-community/datetimepicker');
    process.exit(0);
  }

  // Create a patch for the datetimepicker package
  const patchDir = path.resolve(nodeModulesDir, '@react-native-community/datetimepicker/src/RNCMaterialDatePickerShim');
  ensureDirExists(patchDir);

  // Create shim files directly in the package
  const shimIndexContent = `
// This is a shim for RNCMaterialDatePicker
const RNCMaterialDatePickerShim = require('${path.relative(patchDir, path.resolve(ourShimsDir, 'RNCMaterialDatePicker'))}');
module.exports = RNCMaterialDatePickerShim;
`;
  writeFile(path.join(patchDir, 'index.js'), shimIndexContent);

  // Check if the index file exists
  if (fs.existsSync(datePickerIndexPath)) {
    // Read the current content
    let indexContent = fs.readFileSync(datePickerIndexPath, 'utf8');
    
    // Modify the imports to use our shim
    if (!indexContent.includes('RNCMaterialDatePickerShim')) {
      // Add the import for our shim and modify TurboModuleRegistry
      indexContent = indexContent.replace(
        "import {TurboModuleRegistry} from 'react-native';",
        `import {TurboModuleRegistry} from 'react-native';
// Using a shim for RNCMaterialDatePicker when not available
let RNCMaterialDatePicker;
try {
  RNCMaterialDatePicker = TurboModuleRegistry.get('RNCMaterialDatePicker');
} catch (e) {
  console.warn('RNCMaterialDatePicker not available in TurboModuleRegistry, using shim');
  RNCMaterialDatePicker = require('./RNCMaterialDatePickerShim');
}`
      );

      // Replace direct TurboModuleRegistry calls
      indexContent = indexContent.replace(
        "TurboModuleRegistry.get('RNCMaterialDatePicker')",
        "RNCMaterialDatePicker"
      );

      // Write the modified file
      writeFile(datePickerIndexPath, indexContent);
    } else {
      console.log('DateTimePicker index.js already patched');
    }
  } else {
    console.warn('DateTimePicker index.js not found at', datePickerIndexPath);
  }

  console.log('Fix for RNCMaterialDatePicker completed successfully');
} catch (error) {
  console.error('Error fixing RNCMaterialDatePicker:', error);
} 