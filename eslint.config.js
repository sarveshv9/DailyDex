// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // Reanimated shared values (.value) are designed to be mutated in event handlers
      'react-hooks/immutability': 'off',
    },
  },
  {
    ignores: [
      'android/**',
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      // Node.js CI/build tooling scripts run in Node environment, separate from React/Expo client runtime
      'scripts/**',
      '.agents/**',
    ],
  },
]);
