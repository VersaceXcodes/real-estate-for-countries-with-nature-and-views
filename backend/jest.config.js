module.exports = {
  "testEnvironment": "node",
  "preset": "ts-jest",
  "testMatch": [
    "**/__tests__/**/*.test.{js,ts}",
    "**/?(*.)+(spec|test).{js,ts}"
  ],
  "collectCoverageFrom": [
    "src/**/*.{js,ts}",
    "!src/**/*.d.ts",
    "!src/types/**/*",
    "!src/**/*.config.{js,ts}"
  ],
  "coverageDirectory": "coverage",
  "coverageReporters": [
    "text",
    "lcov",
    "html"
  ],
  "setupFilesAfterEnv": [
    "<rootDir>/jest.setup.js"
  ],
  "testTimeout": 30000,
  "maxWorkers": 1,
  "forceExit": true,
  "detectOpenHandles": true,
  "verbose": true,
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  "globals": {
    "ts-jest": {
      "isolatedModules": true,
      "useESM": true
    }
  },
  "extensionsToTreatAsEsm": [
    ".ts"
  ]
};