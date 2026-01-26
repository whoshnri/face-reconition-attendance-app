// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Robust redirection of native-only modules when bundling for web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web") {
    const mocks = {
      "react-native-fast-tflite": path.resolve(
        __dirname,
        "lib/webMocks/react-native-fast-tflite.ts",
      ),
      "react-native-vision-camera": path.resolve(
        __dirname,
        "lib/webMocks/react-native-vision-camera.tsx",
      ),
      "react-native-worklets": path.resolve(
        __dirname,
        "lib/webMocks/react-native-worklets.ts",
      ),
      "react-native-worklets-core": path.resolve(
        __dirname,
        "lib/webMocks/react-native-worklets.ts",
      ),
      "vision-camera-resize-plugin": path.resolve(
        __dirname,
        "lib/webMocks/vision-camera-resize-plugin.ts",
      ),
    };

    if (mocks[moduleName]) {
      return {
        filePath: mocks[moduleName],
        type: "sourceFile",
      };
    }
  }

  // Chain to the default resolver
  return context.resolveRequest(context, moduleName, platform);
};

// Add tflite and wasm to asset extensions for bundling ML models and SQLite web
config.resolver.assetExts.push("tflite", "wasm");

module.exports = withNativeWind(config, { input: "./global.css" });
