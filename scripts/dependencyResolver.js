#!/usr/bin/env node

/**
 * Dependency Resolver Script
 * 
 * This script analyzes the project's dependency tree and identifies:
 * 1. Version conflicts
 * 2. Duplicate dependencies
 * 3. Incompatible peer dependencies
 * 
 * It can be run with:
 * - node scripts/dependencyResolver.js analyze - To analyze and report issues
 * - node scripts/dependencyResolver.js fix - To attempt automatic fixes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Configuration
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const NODE_MODULES_PATH = path.join(__dirname, '..', 'node_modules');
const TROUBLESOME_PACKAGES = [
  'react-native',
  'expo-modules-core',
  '@react-native-community/datetimepicker',
  'react-native-screens',
  'react-native-safe-area-context'
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Utility to log with colors
const log = {
  info: (message) => console.log(`${colors.blue}${message}${colors.reset}`),
  warn: (message) => console.log(`${colors.yellow}${message}${colors.reset}`),
  error: (message) => console.log(`${colors.red}${message}${colors.reset}`),
  success: (message) => console.log(`${colors.green}${message}${colors.reset}`),
  highlight: (message) => console.log(`${colors.cyan}${colors.bold}${message}${colors.reset}`)
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility to ask user for confirmation
function askQuestion(query) {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Load the package.json
function loadPackageJson() {
  try {
    const packageJsonContent = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
    return JSON.parse(packageJsonContent);
  } catch (error) {
    log.error(`Failed to load package.json: ${error.message}`);
    process.exit(1);
  }
}

// Find duplicate dependencies with different versions
async function findDuplicateDependencies() {
  log.info('Scanning for duplicate dependencies...');
  
  try {
    // Run npm ls to get dependency tree
    const output = execSync('npm ls --json --depth=4', { encoding: 'utf8' });
    const dependencyTree = JSON.parse(output);
    
    // Process the dependency tree to find duplicates
    const dependencies = {};
    
    function traverseDependencies(tree, path = []) {
      if (!tree.dependencies) return;
      
      Object.entries(tree.dependencies).forEach(([name, details]) => {
        if (!details.version) return;
        
        if (!dependencies[name]) {
          dependencies[name] = [];
        }
        
        dependencies[name].push({
          version: details.version,
          path: [...path, name].join(' → '),
        });
        
        traverseDependencies(details, [...path, name]);
      });
    }
    
    traverseDependencies(dependencyTree);
    
    // Find packages with multiple versions
    const duplicates = Object.entries(dependencies)
      .filter(([_, versions]) => {
        const uniqueVersions = [...new Set(versions.map(v => v.version))];
        return uniqueVersions.length > 1;
      })
      .map(([name, instances]) => ({
        name,
        instances: instances.sort((a, b) => a.version.localeCompare(b.version))
      }));
    
    // Print duplicates
    if (duplicates.length === 0) {
      log.success('No duplicate dependencies found');
      return { duplicates: [] };
    }
    
    log.warn(`Found ${duplicates.length} packages with multiple versions:`);
    
    duplicates.forEach(({ name, instances }) => {
      const versions = [...new Set(instances.map(i => i.version))];
      
      log.highlight(`\n${name}: ${versions.length} versions found`);
      
      versions.forEach(version => {
        const versionInstances = instances.filter(i => i.version === version);
        console.log(`  ${colors.cyan}${version}${colors.reset} (${versionInstances.length} instances)`);
        
        // Show max 3 paths to avoid too much output
        versionInstances.slice(0, 3).forEach(instance => {
          console.log(`    - ${instance.path}`);
        });
        
        if (versionInstances.length > 3) {
          console.log(`    - ... and ${versionInstances.length - 3} more`);
        }
      });
    });
    
    return { duplicates };
  } catch (error) {
    log.error(`Failed to scan dependencies: ${error.message}`);
    return { duplicates: [] };
  }
}

// Fix duplicate dependencies by adding resolutions
async function fixDuplicateDependencies(duplicates) {
  if (duplicates.length === 0) {
    log.info('No duplicates to fix');
    return;
  }
  
  log.info('Preparing to fix duplicate dependencies...');
  
  // Focus on troublesome packages first
  const criticalDuplicates = duplicates.filter(dup => 
    TROUBLESOME_PACKAGES.includes(dup.name)
  );
  
  if (criticalDuplicates.length === 0) {
    log.info('No critical duplicates found. You can review other duplicates manually.');
    return;
  }
  
  log.highlight('The following critical packages have multiple versions:');
  criticalDuplicates.forEach(({ name, instances }) => {
    const versions = [...new Set(instances.map(i => i.version))];
    console.log(`  ${colors.cyan}${name}${colors.reset}: ${versions.join(', ')}`);
  });
  
  const proceed = await askQuestion('Do you want to add resolutions for these packages? (y/n) ');
  
  if (proceed !== 'y') {
    log.info('Fix operation cancelled');
    return;
  }
  
  // Load package.json
  const packageJson = loadPackageJson();
  
  // Add resolutions field if it doesn't exist
  if (!packageJson.resolutions) {
    packageJson.resolutions = {};
  }
  
  // Add resolution for each critical duplicate
  criticalDuplicates.forEach(({ name, instances }) => {
    // Find the most used version or most recent
    const versionCounts = {};
    instances.forEach(instance => {
      versionCounts[instance.version] = (versionCounts[instance.version] || 0) + 1;
    });
    
    // Get main/direct dependency version if available
    const dependencyVersion = packageJson.dependencies?.[name] || packageJson.devDependencies?.[name];
    
    // Choose the version to use (prefer direct dependency version, then most used, then sort by semver)
    let chosenVersion;
    
    if (dependencyVersion && dependencyVersion.match(/\d+\.\d+\.\d+/)) {
      chosenVersion = dependencyVersion.replace(/[\^~]/, '');
    } else {
      const versions = Object.keys(versionCounts).sort((a, b) => {
        // First by count (most used)
        if (versionCounts[b] !== versionCounts[a]) {
          return versionCounts[b] - versionCounts[a];
        }
        // Then by version number (semver)
        return b.localeCompare(a, undefined, { numeric: true });
      });
      
      chosenVersion = versions[0];
    }
    
    // Add to resolutions
    packageJson.resolutions[name] = chosenVersion;
    log.success(`Added resolution for ${name}@${chosenVersion}`);
  });
  
  // Save the updated package.json
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
  
  log.success('Resolutions added to package.json');
  log.info('Run "npm install" to apply the changes');
}

// Check for peer dependency issues
async function checkPeerDependencies() {
  log.info('Checking peer dependencies...');
  
  try {
    const output = execSync('npm ls --json', { encoding: 'utf8' });
    const packageData = JSON.parse(output);
    
    if (!packageData.problems) {
      log.success('No peer dependency issues found');
      return [];
    }
    
    // Filter for peer dependency issues
    const peerIssues = packageData.problems
      .filter(problem => problem.includes('peer dep missing'))
      .map(problem => {
        const match = problem.match(/^peer dep missing: (.*), required by (.*)/);
        if (match) {
          return {
            missing: match[1],
            requiredBy: match[2]
          };
        }
        return null;
      })
      .filter(Boolean);
    
    if (peerIssues.length === 0) {
      log.success('No peer dependency issues found');
      return [];
    }
    
    log.warn(`Found ${peerIssues.length} peer dependency issues:`);
    
    peerIssues.forEach(issue => {
      console.log(`  ${colors.yellow}${issue.missing}${colors.reset} required by ${issue.requiredBy}`);
    });
    
    return peerIssues;
  } catch (error) {
    log.error(`Failed to check peer dependencies: ${error.message}`);
    return [];
  }
}

// Main function
async function main() {
  const command = process.argv[2] || 'analyze';
  
  log.highlight(`Dependency Resolver - ${command.toUpperCase()}`);
  
  if (command === 'analyze') {
    const { duplicates } = await findDuplicateDependencies();
    await checkPeerDependencies();
    
    log.highlight('\nAnalysis complete. To fix issues, run:');
    console.log('  node scripts/dependencyResolver.js fix');
  } 
  else if (command === 'fix') {
    const { duplicates } = await findDuplicateDependencies();
    await fixDuplicateDependencies(duplicates);
    
    const peerIssues = await checkPeerDependencies();
    if (peerIssues.length > 0) {
      log.warn('\nPeer dependency issues must be fixed manually');
      log.info('Consider adding the required dependencies or upgrading packages');
    }
    
    log.highlight('\nFix operation completed');
  }
  else {
    log.error(`Unknown command: ${command}`);
    console.log('Available commands: analyze, fix');
  }
  
  rl.close();
}

// Run the script
main(); 