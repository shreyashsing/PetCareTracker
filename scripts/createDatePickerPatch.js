const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to the patch directory
const patchesDir = path.resolve(__dirname, '../patches');
const nodeModulesDir = path.resolve(__dirname, '../node_modules');
const datePickerDir = path.resolve(nodeModulesDir, '@react-native-community/datetimepicker');

// Ensure the patches directory exists
if (!fs.existsSync(patchesDir)) {
  fs.mkdirSync(patchesDir, { recursive: true });
}

// Path to the DateTimePicker files
const materialDatePickerPath = path.resolve(datePickerDir, 'android/src/main/java/com/reactcommunity/rndatetimepicker/RNMaterialDatePickerModule.java');
const materialDatePickerSpecPath = path.resolve(datePickerDir, 'src/specs/NativeMaterialDatePickerModule.js');

console.log('Creating DateTimePicker patch...');

try {
  // Create a backup of the file
  if (fs.existsSync(materialDatePickerSpecPath)) {
    fs.copyFileSync(materialDatePickerSpecPath, materialDatePickerSpecPath + '.backup');
    
    // Modify the file to use our shim
    let content = fs.readFileSync(materialDatePickerSpecPath, 'utf8');
    if (!content.includes('// PATCHED')) {
      // Replace the content with our patched version
      const newContent = `/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

// PATCHED: Added fallback import for RNCMaterialDatePicker
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  +present: (options: Object) => Promise<Object>;
  +dismiss: () => void;
}

// Get the module - will use our shim from TurboModuleRegistry if native is not available
const NativeMaterialDatePickerModule: ?Spec = TurboModuleRegistry.get<Spec>(
  'RNCMaterialDatePicker',
);

export default NativeMaterialDatePickerModule;
`;
      
      fs.writeFileSync(materialDatePickerSpecPath, newContent);
      console.log('Modified', materialDatePickerSpecPath);
    }
  } else {
    console.log('File not found:', materialDatePickerSpecPath);
  }
  
  // Now run patch-package to create the patch file
  try {
    console.log('Generating patch with patch-package...');
    execSync('npx patch-package @react-native-community/datetimepicker', { 
      cwd: path.resolve(__dirname, '..'), 
      stdio: 'inherit' 
    });
    console.log('Patch created successfully');
  } catch (e) {
    console.error('Error creating patch:', e.message);
  }
  
  // Restore the backup if it exists
  if (fs.existsSync(materialDatePickerSpecPath + '.backup')) {
    fs.copyFileSync(materialDatePickerSpecPath + '.backup', materialDatePickerSpecPath);
    fs.unlinkSync(materialDatePickerSpecPath + '.backup');
    console.log('Restored original file');
  }
} catch (err) {
  console.error('Error creating DateTimePicker patch:', err);
} 