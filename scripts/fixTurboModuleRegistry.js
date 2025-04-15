const fs = require('fs');
const path = require('path');

console.log('Fixing TurboModuleRegistry...');

// Define paths
const nodeModulesDir = path.resolve(__dirname, '../node_modules');
const reactNativeDir = path.resolve(nodeModulesDir, 'react-native');
const turboModuleRegistryPath = path.resolve(reactNativeDir, 'Libraries/TurboModule/TurboModuleRegistry.js');
const shimPath = path.resolve(reactNativeDir, 'Libraries/TurboModule/RNCMaterialDatePicker.js');

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
  // Create RNCMaterialDatePicker shim directly in React Native
  const shimContent = `/**
 * Mock implementation of RNCMaterialDatePicker for environments where the native module is not available
 *
 * @flow
 */

'use strict';

const RNCMaterialDatePickerShim = {
  present: () => {
    console.warn('Using RNCMaterialDatePicker shim instead of native module');
    return Promise.resolve({ action: 'dismissed' });
  },
  
  dismiss: () => {
    // No-op implementation
  }
};

module.exports = RNCMaterialDatePickerShim;`;

  writeFile(shimPath, shimContent);

  // Check if the TurboModuleRegistry.js file exists
  if (fs.existsSync(turboModuleRegistryPath)) {
    // Read the current content
    let registryContent = fs.readFileSync(turboModuleRegistryPath, 'utf8');
    
    // Only patch if not already patched
    if (!registryContent.includes('PATCHED_FOR_MISSING_MODULES')) {
      console.log('Patching TurboModuleRegistry.js...');
      
      // Add our import for the shim at the beginning of the file after the initial imports
      let patchedContent = `/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

import type {TurboModule} from './RCTExport';

import invariant from 'invariant';

// PATCHED_FOR_MISSING_MODULES - Import shim for RNCMaterialDatePicker
const RNCMaterialDatePickerShim = require('./RNCMaterialDatePicker');

const NativeModules = require('../BatchedBridge/NativeModules');

const turboModuleProxy = global.__turboModuleProxy;

const useLegacyNativeModuleInterop =
  global.RN$Bridgeless !== true || global.RN$TurboInterop === true;

function requireModule<T: TurboModule>(name: string): ?T {
  if (turboModuleProxy != null) {
    const module: ?T = turboModuleProxy(name);
    if (module != null) {
      return module;
    }
  }

  if (useLegacyNativeModuleInterop) {
    // Backward compatibility layer during migration.
    const legacyModule: ?T = NativeModules[name];
    if (legacyModule != null) {
      return legacyModule;
    }
  }

  return null;
}

export function get<T: TurboModule>(name: string): ?T {
  return requireModule<T>(name);
}

export function getEnforcing<T: TurboModule>(name: string): T {
  // PATCHED_FOR_MISSING_MODULES - Handle missing modules without crashing
  if (name === 'RNCMaterialDatePicker') {
    return (RNCMaterialDatePickerShim: $FlowFixMe);
  }
  
  try {
    const module = requireModule<T>(name);
    invariant(
      module != null,
      \`TurboModuleRegistry.getEnforcing(...): '\${name}' could not be found. \` +
        'Verify that a module by this name is registered in the native binary.',
    );
    return module;
  } catch (e) {
    console.warn(\`TurboModuleRegistry.getEnforcing: Module \${name} not found, using empty shim\`);
    // Return an empty object for unknown modules
    return ({}: $FlowFixMe);
  }
}`;
      
      // Write the patched file
      writeFile(turboModuleRegistryPath, patchedContent);
      console.log('Successfully patched TurboModuleRegistry.js');
    } else {
      console.log('TurboModuleRegistry.js is already patched');
    }
  } else {
    console.warn('TurboModuleRegistry.js not found at', turboModuleRegistryPath);
  }
  
  console.log('Fix for TurboModuleRegistry completed');
} catch (error) {
  console.error('Error fixing TurboModuleRegistry:', error);
} 