module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['scripts/*.cjs'],
      env: { node: true, es2022: true },
      parserOptions: { ecmaVersion: 2022 },
    },
  ],
  ignorePatterns: [
    '.kilo/',
    'node_modules/',
    'android/',
    'ios/',
    'docs-local/',
    'tests/',
  ],
};
