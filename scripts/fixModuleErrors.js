#!/usr/bin/env node

/**
 * Module Error Finder and Fixer
 * 
 * This script helps identify and fix common module errors in React Native projects:
 * 1. Scans the project for module not found errors
 * 2. Analyzes and identifies missing dependencies
 * 3. Provides suggestions to fix the errors
 * 4. Can apply fixes automatically in some cases
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Colors for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Error patterns to search for
const ERROR_PATTERNS = [
  {
    pattern: /Unable to resolve module [`']([^'`]+)[`']/,
    type: 'MISSING_MODULE',
    severity: 'HIGH',
    fix: 'npm install --save {MODULE}'
  },
  {
    pattern: /No bundle URL present.*Run your app from the packager/,
    type: 'PACKAGER_NOT_RUNNING',
    severity: 'MEDIUM',
    fix: 'Start the Metro bundler with npm start'
  },
  {
    pattern: /undefined is not an object \(evaluating [`']([^'`]+)[`']\.([^)]+)\)/,
    type: 'UNDEFINED_PROPERTY',
    severity: 'HIGH',
    fix: 'Check import of {MODULE} or verify property {PROPERTY} exists'
  },
  {
    pattern: /Module [`']([^'`]+)[`'] does not exist in the Haste module map/,
    type: 'HASTE_MAP_ERROR',
    severity: 'MEDIUM',
    fix: 'Clear cache with npm start -- --reset-cache'
  },
  {
    pattern: /ViewPropTypes will be removed from React Native/,
    type: 'DEPRECATED_API_USAGE',
    severity: 'LOW',
    fix: 'Replace ViewPropTypes with appropriate alternative'
  },
  {
    pattern: /Error while updating property [`']([^'`]+)[`'] of a view managed by/,
    type: 'PROPERTY_UPDATE_ERROR',
    severity: 'MEDIUM',
    fix: 'Check property {PROPERTY} type and value'
  },
  {
    pattern: /Requiring module [`']([^'`]+)[`'], which threw an exception/,
    type: 'MODULE_EXCEPTION',
    severity: 'HIGH',
    fix: 'Check module {MODULE} for errors'
  }
];

// Known module replacements
const MODULE_REPLACEMENTS = {
  'react-native-maps': '@react-native-community/maps',
  'react-native-linear-gradient': 'expo-linear-gradient',
  'react-native-gesture-handler': '@expo/react-native-gesture-handler',
  'react-native-reanimated': 'react-native-reanimated',
  'react-native-screens': '@react-navigation/native',
  'react-native-vector-icons': '@expo/vector-icons'
};

// Common modules that need specific versions
const MODULE_VERSION_FIXES = {
  'react-native': '0.76.9',
  'expo-modules-core': '2.2.3',
  '@react-native-community/datetimepicker': '7.2.0',
  'react-native-screens': '4.4.0',
  'react-native-safe-area-context': '4.12.0'
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to ask questions
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, answer => resolve(answer)));
}

// Log helpers
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Scan for error logs in the project's React Native logs
async function scanForErrors() {
  log('Scanning for module errors...', colors.blue);
  
  try {
    // Get logs from Metro output
    const metroDirPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Logs') : '/tmp'), 'metro');
    const logFiles = [];
    
    // Try different potential log locations
    const potentialLogLocations = [
      metroDirPath,
      path.join(__dirname, '..', 'node_modules', '.cache', 'metro'),
      path.join(__dirname, '..', '.expo', 'logs')
    ];
    
    for (const logLocation of potentialLogLocations) {
      if (fs.existsSync(logLocation)) {
        try {
          const files = fs.readdirSync(logLocation)
            .filter(file => file.endsWith('.log'))
            .map(file => path.join(logLocation, file));
          logFiles.push(...files);
        } catch (e) {
          // Skip if we can't read this directory
        }
      }
    }
    
    if (logFiles.length === 0) {
      log('No log files found. Will scan source code directly.', colors.yellow);
      return scanSourceCodeForPotentialErrors();
    }
    
    // Process log files to find errors
    const errors = [];
    
    for (const logFile of logFiles) {
      try {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          for (const errorPattern of ERROR_PATTERNS) {
            const match = line.match(errorPattern.pattern);
            if (match) {
              errors.push({
                type: errorPattern.type,
                module: match[1],
                property: match[2], // May be undefined
                severity: errorPattern.severity,
                fix: errorPattern.fix
                  .replace('{MODULE}', match[1])
                  .replace('{PROPERTY}', match[2] || ''),
                line: line.trim()
              });
              break; // Once we've matched this line, move to the next
            }
          }
        }
      } catch (e) {
        // Skip if we can't read this file
      }
    }
    
    // Add results from source code scan
    const sourceErrors = await scanSourceCodeForPotentialErrors();
    errors.push(...sourceErrors);
    
    // Remove duplicates
    const uniqueErrors = [];
    const seen = new Set();
    
    for (const error of errors) {
      const key = `${error.type}-${error.module}-${error.property || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueErrors.push(error);
      }
    }
    
    return uniqueErrors;
  } catch (error) {
    log(`Error scanning for errors: ${error.message}`, colors.red);
    return [];
  }
}

// Scan source code for potential errors
async function scanSourceCodeForPotentialErrors() {
  const errors = [];
  const srcDir = path.join(__dirname, '..', 'src');
  
  // Ensure src directory exists
  if (!fs.existsSync(srcDir)) {
    return errors;
  }
  
  try {
    // Get all source files
    const srcFiles = [];
    
    function processDir(dir) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          processDir(fullPath);
        } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
          srcFiles.push(fullPath);
        }
      }
    }
    
    processDir(srcDir);
    
    // Get all imports from source files
    const imports = new Set();
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    const allDependencies = [...dependencies, ...devDependencies];
    
    // Look for imports that might not be installed
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Match import statements
      const importMatches = content.matchAll(/import\s+(?:.+\s+from\s+)?['"]([@\w\-/.]+)['"]/g);
      for (const match of importMatches) {
        const importPath = match[1];
        
        // Skip relative imports
        if (importPath.startsWith('.')) continue;
        
        // Get the package name (before any /)
        const packageName = importPath.split('/')[0].startsWith('@') 
          ? importPath.split('/').slice(0, 2).join('/')
          : importPath.split('/')[0];
        
        // Check if package is installed
        if (!allDependencies.includes(packageName)) {
          imports.add(packageName);
        }
      }
      
      // Match require statements
      const requireMatches = content.matchAll(/require\s*\(['"]([@\w\-/.]+)['"]\)/g);
      for (const match of requireMatches) {
        const importPath = match[1];
        
        // Skip relative imports
        if (importPath.startsWith('.')) continue;
        
        // Get the package name (before any /)
        const packageName = importPath.split('/')[0].startsWith('@') 
          ? importPath.split('/').slice(0, 2).join('/')
          : importPath.split('/')[0];
        
        // Check if package is installed
        if (!allDependencies.includes(packageName)) {
          imports.add(packageName);
        }
      }
    }
    
    // Create error entries for potentially missing modules
    for (const missingImport of imports) {
      errors.push({
        type: 'POTENTIAL_MISSING_MODULE',
        module: missingImport,
        severity: 'MEDIUM',
        fix: `npm install --save ${missingImport}`,
        line: `Potential missing module: ${missingImport}`
      });
    }
    
    return errors;
  } catch (error) {
    log(`Error scanning source code: ${error.message}`, colors.red);
    return [];
  }
}

// Suggest fixes for the found errors
async function suggestFixes(errors) {
  if (errors.length === 0) {
    log('No errors found!', colors.green);
    return;
  }
  
  log(`\nFound ${errors.length} potential issues:`, colors.yellow);
  
  // Group errors by severity
  const errorsBySeverity = {
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };
  
  for (const error of errors) {
    errorsBySeverity[error.severity].push(error);
  }
  
  // Display high severity errors first
  for (const severity of ['HIGH', 'MEDIUM', 'LOW']) {
    if (errorsBySeverity[severity].length > 0) {
      log(`\n${severity} severity issues:`, severity === 'HIGH' ? colors.red : severity === 'MEDIUM' ? colors.yellow : colors.blue);
      
      for (const [index, error] of errorsBySeverity[severity].entries()) {
        log(`${index + 1}. ${error.type}: ${error.line}`, colors.cyan);
        log(`   Suggested fix: ${error.fix}`, colors.green);
        
        // Check if we have a replacement suggestion
        if (error.module && MODULE_REPLACEMENTS[error.module]) {
          log(`   Alternative: Try using ${MODULE_REPLACEMENTS[error.module]} instead`, colors.yellow);
        }
        
        // Check if module needs a specific version
        if (error.module && MODULE_VERSION_FIXES[error.module]) {
          log(`   Version fix: Use version ${MODULE_VERSION_FIXES[error.module]} for ${error.module}`, colors.yellow);
        }
      }
    }
  }
  
  // Ask if user wants to apply any fixes
  log('\nWould you like to apply any fixes? (y/n)', colors.bold);
  const shouldFix = await askQuestion('> ');
  
  if (shouldFix.toLowerCase() === 'y') {
    await applyFixes(errors);
  }
}

// Apply fixes to the errors
async function applyFixes(errors) {
  // Sort errors so we apply high severity fixes first
  const sortedErrors = [...errors].sort((a, b) => {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  for (const [index, error] of sortedErrors.entries()) {
    log(`\nFix ${index + 1}/${sortedErrors.length}: ${error.type}`, colors.cyan);
    log(`  ${error.line}`, colors.yellow);
    
    // Get appropriate fix command
    let fixCommand = '';
    
    if (error.type === 'MISSING_MODULE' || error.type === 'POTENTIAL_MISSING_MODULE') {
      // Check if we have a replacement suggestion
      if (error.module && MODULE_REPLACEMENTS[error.module]) {
        log(`  The module ${error.module} has a recommended replacement: ${MODULE_REPLACEMENTS[error.module]}`, colors.yellow);
        log(`  Which one would you like to install?`, colors.bold);
        log(`  1. Original: ${error.module}`);
        log(`  2. Replacement: ${MODULE_REPLACEMENTS[error.module]}`);
        
        const choice = await askQuestion('  Choose (1/2): ');
        
        if (choice === '2') {
          fixCommand = `npm install --save ${MODULE_REPLACEMENTS[error.module]}`;
        } else {
          fixCommand = `npm install --save ${error.module}`;
        }
        
        // Check if module needs a specific version
        const moduleToInstall = choice === '2' ? MODULE_REPLACEMENTS[error.module] : error.module;
        if (MODULE_VERSION_FIXES[moduleToInstall]) {
          fixCommand = `npm install --save ${moduleToInstall}@${MODULE_VERSION_FIXES[moduleToInstall]}`;
          log(`  Installing specific version: ${MODULE_VERSION_FIXES[moduleToInstall]}`, colors.yellow);
        }
      } else {
        fixCommand = `npm install --save ${error.module}`;
        
        // Check if module needs a specific version
        if (MODULE_VERSION_FIXES[error.module]) {
          fixCommand = `npm install --save ${error.module}@${MODULE_VERSION_FIXES[error.module]}`;
          log(`  Installing specific version: ${MODULE_VERSION_FIXES[error.module]}`, colors.yellow);
        }
      }
    } else if (error.type === 'PACKAGER_NOT_RUNNING') {
      fixCommand = 'npm start -- --reset-cache';
    } else if (error.type === 'HASTE_MAP_ERROR') {
      fixCommand = 'npm start -- --reset-cache';
    } else {
      log(`  This error requires manual fixing. Suggested fix: ${error.fix}`, colors.yellow);
      const shouldContinue = await askQuestion('  Continue to next issue? (y/n): ');
      if (shouldContinue.toLowerCase() !== 'y') {
        break;
      }
      continue;
    }
    
    // Confirm before running command
    log(`  Will run: ${fixCommand}`, colors.green);
    const shouldRun = await askQuestion('  Run this command? (y/n): ');
    
    if (shouldRun.toLowerCase() === 'y') {
      try {
        log(`  Running command...`, colors.blue);
        execSync(fixCommand, { stdio: 'inherit' });
        log(`  Command completed successfully!`, colors.green);
      } catch (error) {
        log(`  Error running command: ${error.message}`, colors.red);
      }
    }
  }
  
  log('\nFix process completed!', colors.green);
  log('Remember to restart your Metro bundler with `npm start -- --reset-cache` to apply all changes.', colors.yellow);
}

// Main function
async function main() {
  log(`${colors.bold}===== Module Error Finder and Fixer =====`, colors.cyan);
  log('This tool helps identify and fix common module errors in your React Native project.\n', colors.reset);
  
  const errors = await scanForErrors();
  await suggestFixes(errors);
  
  rl.close();
}

// Run main
main(); 