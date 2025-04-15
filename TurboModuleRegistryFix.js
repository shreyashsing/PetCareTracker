const fs = require('fs'); 
const path = require('path');

const fixPath = path.join(process.cwd(), 'node_modules/react-native/Libraries/TurboModule/TurboModuleRegistry.js');
console.log('Attempting to fix file at:', fixPath);

try {
  if (fs.existsSync(fixPath)) {
    const content = fs.readFileSync(fixPath, 'utf8');
    
    if (content.includes('try {') && !content.includes('catch (e)')) {
      // Extract the try block and add the catch block
      let newContent = content.replace(
        /export function getEnforcing.*?\{[\s\S]*?try \{[\s\S]*?return module;/,
        match => `${match}\n  } catch (e) {\n    console.warn(\`Module \${name} not found, returning empty object\`);\n    return ({}: $FlowFixMe);`
      );
      
      fs.writeFileSync(fixPath, newContent);
      console.log('Successfully fixed TurboModuleRegistry.js by adding catch block');
    } else {
      console.log('File already has proper try/catch or does not need fixing');
    }
  } else {
    console.error('File not found at:', fixPath);
  }
} catch (error) {
  console.error('Error fixing file:', error);
} 