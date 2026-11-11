module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/\\.kilo/',
    '/docs-local/',
    '/tests/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.kilo/'],
  testTimeout: 20000,
  setupFilesAfterEnv: ['<rootDir>/test-utils/setup.ts'],
  moduleNameMapper: {
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-svg|lucide-react-native)/)',
  ],
};
