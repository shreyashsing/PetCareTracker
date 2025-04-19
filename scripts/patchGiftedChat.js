const fs = require('fs');
const path = require('path');

/**
 * This script patches react-native-gifted-chat to avoid using react-native-keyboard-controller
 * which causes issues with Expo projects
 */
function patchGiftedChat() {
  console.log('🔧 Patching react-native-gifted-chat...');
  
  const giftedChatDir = path.resolve(__dirname, '../node_modules/react-native-gifted-chat');
  
  if (!fs.existsSync(giftedChatDir)) {
    console.log('❌ Could not find react-native-gifted-chat directory. Skipping patch.');
    return;
  }
  
  console.log(`Found gifted-chat at ${giftedChatDir}`);
  
  // Get all potential files that might import keyboard controller
  const libDir = path.join(giftedChatDir, 'lib');
  let filesToPatch = [];
  
  try {
    const files = fs.readdirSync(libDir);
    console.log(`Found ${files.length} files in lib directory`);
    
    filesToPatch = files.filter(file => 
      (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.d.ts'))
    ).map(file => path.join(libDir, file));
    
    console.log(`Selected ${filesToPatch.length} files to examine for patching`);
  } catch (error) {
    console.error('Error reading lib directory:', error);
    return;
  }
  
  // Patterns to replace in files
  const patterns = [
    {
      // Import statements
      regex: /import\s+.*\s+from\s+['"](react-native-keyboard-controller)['"]/g,
      replacement: '// PATCHED: Disabled import from react-native-keyboard-controller'
    },
    {
      // References to KeyboardControllerView
      regex: /KeyboardControllerView/g,
      replacement: 'View /* PATCHED: KeyboardControllerView */'
    },
    {
      // References to keyboard controller hooks
      regex: /useKeyboardHandler\(/g,
      replacement: '/* PATCHED */ (('
    },
    {
      // References to keyboard controller hooks
      regex: /useKeyboardController\(/g,
      replacement: '/* PATCHED */ (('
    }
  ];
  
  // Add View import where needed
  const viewImportPattern = {
    regex: /import\s+{([^}]*)}/g,
    replacer: (match, imports) => {
      if (!imports.includes('View')) {
        return match.replace('{', '{ View, ');
      }
      return match;
    }
  };
  
  // Process each file
  let patchedCount = 0;
  filesToPatch.forEach(file => {
    try {
      console.log(`Examining ${path.basename(file)}...`);
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      // Apply all patterns
      patterns.forEach(pattern => {
        if (pattern.regex.test(content)) {
          content = content.replace(pattern.regex, pattern.replacement);
          modified = true;
          console.log(`  - Found match for pattern: ${pattern.regex}`);
        }
      });
      
      // Add View import if needed
      if (modified && content.includes('/* PATCHED: KeyboardControllerView */')) {
        content = content.replace(viewImportPattern.regex, viewImportPattern.replacer);
      }
      
      // Save changes if modified
      if (modified) {
        fs.writeFileSync(file, content);
        console.log(`✅ Patched ${path.basename(file)}`);
        patchedCount++;
      } else {
        console.log(`  - No matches found in ${path.basename(file)}`);
      }
    } catch (error) {
      console.error(`Error patching ${file}:`, error);
    }
  });
  
  if (patchedCount > 0) {
    console.log(`✅ Successfully patched ${patchedCount} files in react-native-gifted-chat`);
  } else {
    console.log('ℹ️ No files needed patching');
  }
  
  // Forcibly create a mock file for the keyboard controller
  try {
    const mockDir = path.resolve(__dirname, '../node_modules/react-native-keyboard-controller');
    if (!fs.existsSync(mockDir)) {
      fs.mkdirSync(mockDir, { recursive: true });
    }
    
    const mockIndexPath = path.join(mockDir, 'index.js');
    const mockContent = `
// Mock implementation for react-native-keyboard-controller
import { View } from 'react-native';

export const KeyboardControllerView = View;
export const useKeyboardController = () => ({
  height: 0,
  state: 'CLOSED',
  toggle: () => {},
  dismiss: () => {},
});
export const useKeyboardHandler = () => ({});
export const KeyboardState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
};

export default {
  KeyboardControllerView,
  useKeyboardController,
  useKeyboardHandler,
  KeyboardState,
};
`;
    
    fs.writeFileSync(mockIndexPath, mockContent);
    console.log('✅ Created mock keyboard controller module');
  } catch (error) {
    console.error('Error creating mock module:', error);
  }
}

// Run the patch function
patchGiftedChat(); 