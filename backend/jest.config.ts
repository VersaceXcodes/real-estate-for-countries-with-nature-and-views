module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    '**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.config.{js,ts}'
  ],
  coverageDirectory: 'coverage',
  testTimeout: 30000,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true
};