// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'android/**',
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      'scripts/**',
    ],
  },
]);
