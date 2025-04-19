// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add additional file extensions that Metro should resolve
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];

// Handle symlinks properly
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Ensure node_modules are included in the watchFolders
config.watchFolders = [path.resolve(__dirname, 'node_modules')];

// Directly map problematic modules to our custom implementation
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  './errors/CodedError': path.resolve(__dirname, './src/errors/CodedError'),
  '../errors/CodedError': path.resolve(__dirname, './src/errors/CodedError'),
  'expo-modules-core/src/errors/CodedError': path.resolve(__dirname, './src/errors/CodedError'),
  'expo-modules-core/build/errors/CodedError': path.resolve(__dirname, './src/errors/CodedError'),
  // Add RNCMaterialDatePicker shim
  'RNCMaterialDatePicker': path.resolve(__dirname, './src/shims/RNCMaterialDatePicker'),
  'react-native-keyboard-controller': path.resolve(__dirname, './src/shims/EmptyKeyboardController.js'),
};

// Add the src directory to the watchFolders to ensure Metro watches our custom implementation
config.watchFolders = [
  ...config.watchFolders || [],
  path.resolve(__dirname, 'src')
];

// Safely configure reporter with fallback
if (!config.reporter) {
  config.reporter = {};
}

// Use a safer way to log dependencies loading
config.reporter.onProgress = (progress) => {
  if (progress.type === 'dep_graph_loading' && progress.hasOwnProperty('status') && progress.status === 'in_progress') {
    console.log('Metro: Loading dependency graph');
  }
};

module.exports = config; 