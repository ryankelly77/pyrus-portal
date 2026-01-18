module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/__mocks__/componentMock.js',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|tsx)?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/src/app/**', // Exclude Next.js app directory
    '!**/src/components/**', // Exclude components directory
    '!**/src/lib/**', // Exclude library files
    '!**/src/stores/**', // Exclude stores
    '!**/src/types/**' // Exclude types
  ],
  coverageDirectory: 'coverage',
};