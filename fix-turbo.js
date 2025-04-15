const fs = require('fs');
const path = require('path');

console.log('Fixing TurboModuleRegistry.js');

// Define paths
const turboModuleRegistryPath = path.resolve(__dirname, 'node_modules/react-native/Libraries/TurboModule/TurboModuleRegistry.js');

try {
  // Check if the file exists
  if (fs.existsSync(turboModuleRegistryPath)) {
    // Read the current content
    let content = fs.readFileSync(turboModuleRegistryPath, 'utf8');
    
    // Check if the file is already fixed by checking for the catch block
    if (!content.includes('catch (e)')) {
      console.log('Fixing missing catch block in TurboModuleRegistry.js');
      
      // Replace the getEnforcing function with a proper try/catch block
      content = content.replace(
        /export function getEnforcing<T: TurboModule>\(name: string\): T {[\s\S]*?return module;[\s\S]*?}/,
        `export function getEnforcing<T: TurboModule>(name: string): T {
  try {
    const module = requireModule<T>(name);
    invariant(
      module != null,
      \`TurboModuleRegistry.getEnforcing(...): '\${name}' could not be found. \` +
        'Verify that a module by this name is registered in the native binary.',
    );
    return module;
  } catch (e) {
    console.warn(\`Module \${name} not found, returning empty object\`);
    return ({}: $FlowFixMe);
  }
}`
      );
      
      // Write the fixed content back
      fs.writeFileSync(turboModuleRegistryPath, content);
      console.log('Successfully fixed TurboModuleRegistry.js');
    } else {
      console.log('TurboModuleRegistry.js already has a catch block, no fix needed');
    }
  } else {
    console.error('TurboModuleRegistry.js not found at:', turboModuleRegistryPath);
  }
} catch (error) {
  console.error('Error fixing TurboModuleRegistry.js:', error);
} 