module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add module resolver for CodedError
      [
        'module-resolver',
        {
          alias: {
            './errors/CodedError': './src/errors/CodedError',
            '../errors/CodedError': './src/errors/CodedError',
            'expo-modules-core/src/errors/CodedError': './src/errors/CodedError',
            'expo-modules-core/build/errors/CodedError': './src/errors/CodedError',
            // For UnavailabilityError which may import CodedError
            'expo-modules-core/src/errors': './src/errors',
            // For SharedObject/SharedRef
            './SharedObject': './src/errors/SharedObject',
            './SharedRef': './src/errors/SharedRef',
            'expo-modules-core/src/SharedObject': './src/errors/SharedObject',
            'expo-modules-core/build/SharedObject': './src/errors/SharedObject',
            'expo-modules-core/src/SharedRef': './src/errors/SharedRef',
            'expo-modules-core/build/SharedRef': './src/errors/SharedRef',
            // For DatePicker
            'RNCMaterialDatePicker': './src/shims/RNCMaterialDatePicker'
          }
        }
      ],
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env",
        "blacklist": null,
        "whitelist": ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
        "safe": false,
        "allowUndefined": true
      }]
    ]
  };
}; 