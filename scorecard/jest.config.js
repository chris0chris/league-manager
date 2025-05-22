module.exports = {
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/jest.setup.js',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/setup/',
    '<rootDir>/src/__tests__/testdata/',
    '<rootDir>/src/__tests__/Utils.js',
  ],
  coveragePathIgnorePatterns: [
    'node_modules',
    '__tests__',
    'urls.js',
  ],
  reporters: ['default', 'jest-junit'],

  // ✅ Coverage config for Codecov
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text', 'cobertura'],
};
