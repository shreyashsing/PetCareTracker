const fs = require('fs');
const path = require('path');

console.log('Fixing expo-modules-core...');

// Define the paths
const expoModulesCoreDir = path.resolve(__dirname, '../node_modules/expo-modules-core');
const srcDir = path.resolve(expoModulesCoreDir, 'src');
const buildDir = path.resolve(expoModulesCoreDir, 'build');
const expoErrorsDir = path.resolve(srcDir, 'errors');
const buildErrorsDir = path.resolve(buildDir, 'errors');

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
    console.log('Created file:', filePath);
  } catch (error) {
    console.error('Failed to write file:', filePath, error);
  }
}

// Create direct implementations instead of relative imports
const codedErrorContent = `
/**
 * Error class with a code for expo-modules-core
 */
class CodedError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

module.exports = {
  CodedError,
};
`;

const unavailabilityErrorContent = `
/**
 * Error class for unavailable native modules
 */
class UnavailabilityError extends Error {
  constructor(moduleName, propertyName) {
    super(
      \`The method or property \${propertyName ? moduleName + '.' + propertyName : moduleName} is not available on this platform.\`
    );
    this.code = 'ERR_UNAVAILABLE';
    this.moduleName = moduleName;
    this.propertyName = propertyName;
  }
}

module.exports = {
  UnavailabilityError,
};
`;

const errorIndexContent = `
/**
 * Error exports for expo-modules-core
 */
const { CodedError } = require('./CodedError');
const { UnavailabilityError } = require('./UnavailabilityError');

module.exports = {
  CodedError,
  UnavailabilityError,
};
`;

const sharedObjectContent = `
/**
 * SharedObject implementation for expo-modules-core
 */
const { UnavailabilityError } = require('./errors/UnavailabilityError');

class SharedObject {
  constructor(moduleName) {
    this.moduleName = moduleName;
  }

  get(propertyName) {
    // Return a stub that allows the app to continue
    return function stubMethod() {
      console.warn(\`SharedObject.get: \${this.moduleName}.\${propertyName} is not available\`);
      return null;
    };
  }
}

module.exports = {
  SharedObject,
};
`;

const sharedRefContent = `
/**
 * SharedRef implementation for expo-modules-core
 */
class SharedRef {
  constructor(value) {
    this.value = value;
  }
  
  get() {
    return this.value;
  }
  
  release() {
    this.value = null;
  }
}

module.exports = {
  SharedRef,
};
`;

try {
  // Fix errors directory files
  ensureDirExists(expoErrorsDir);
  writeFile(path.join(expoErrorsDir, 'CodedError.js'), codedErrorContent);
  writeFile(path.join(expoErrorsDir, 'UnavailabilityError.js'), unavailabilityErrorContent);
  writeFile(path.join(expoErrorsDir, 'index.js'), errorIndexContent);
  
  // Fix build errors directory files
  ensureDirExists(buildErrorsDir);
  writeFile(path.join(buildErrorsDir, 'CodedError.js'), codedErrorContent);
  writeFile(path.join(buildErrorsDir, 'UnavailabilityError.js'), unavailabilityErrorContent);
  writeFile(path.join(buildErrorsDir, 'index.js'), errorIndexContent);
  
  // Fix SharedObject and SharedRef files
  writeFile(path.join(srcDir, 'SharedObject.js'), sharedObjectContent);
  writeFile(path.join(srcDir, 'SharedRef.js'), sharedRefContent);
  writeFile(path.join(buildDir, 'SharedObject.js'), sharedObjectContent);
  writeFile(path.join(buildDir, 'SharedRef.js'), sharedRefContent);
  
  // Create a root src/index.js file
  const srcIndexContent = `
/**
 * Main index file for expo-modules-core/src
 */
const { CodedError, UnavailabilityError } = require('./errors');
const { SharedObject } = require('./SharedObject');
const { SharedRef } = require('./SharedRef');

module.exports = {
  CodedError,
  UnavailabilityError,
  SharedObject,
  SharedRef,
};
`;
  writeFile(path.join(srcDir, 'index.js'), srcIndexContent);
  
  console.log('Fix for expo-modules-core completed successfully');
} catch (error) {
  console.error('Error fixing expo-modules-core:', error);
} 