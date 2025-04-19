module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add react-native-dotenv
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env",
        "blacklist": null,
        "whitelist": null,
        "safe": false,
        "allowUndefined": true
      }],
      'react-native-reanimated/plugin',
      // Combined module-resolver with all aliases and a unique name
      ["module-resolver", {
        root: ["./src"],
        alias: {
          // App module aliases
          "@components": "./src/components",
          "@screens": "./src/screens",
          "@utils": "./src/utils",
          "@config": "./src/config",
          "@assets": "./assets",
          "@hooks": "./src/hooks",
          "@contexts": "./src/contexts",
          "@services": "./src/services",
          "@navigation": "./src/navigation",
          "@forms": "./src/forms",
          "@pages": "./src/pages",
          
          // Error fixes and shims
          "./errors/CodedError": "./src/errors/CodedError",
          "../errors/CodedError": "./src/errors/CodedError",
          "expo-modules-core/src/errors/CodedError": "./src/errors/CodedError",
          "expo-modules-core/build/errors/CodedError": "./src/errors/CodedError",
          "expo-modules-core/src/errors": "./src/errors",
          "./SharedObject": "./src/errors/SharedObject",
          "./SharedRef": "./src/errors/SharedRef",
          "expo-modules-core/src/SharedObject": "./src/errors/SharedObject",
          "expo-modules-core/build/SharedObject": "./src/errors/SharedObject",
          "expo-modules-core/src/SharedRef": "./src/errors/SharedRef",
          "expo-modules-core/build/SharedRef": "./src/errors/SharedRef",
          "RNCMaterialDatePicker": "./src/shims/RNCMaterialDatePicker",
          
          // Replace react-native-keyboard-controller with an empty module
          "react-native-keyboard-controller": "./src/shims/EmptyKeyboardController"
        }
      }, "combined-module-resolver"]
    ]
  };
}; 