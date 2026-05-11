export default {
  displayName: 'auth-service',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  moduleNameMapper: {
    '^@teste-manuel/domain$': '<rootDir>/../../libs/domain/src',
    '^@teste-manuel/shared-utils$': '<rootDir>/../../libs/shared/utils/src',
    '^@teste-manuel/shared-types$': '<rootDir>/../../libs/shared/types/src',
    '^@teste-manuel/graphql$': '<rootDir>/../../libs/graphql/src',
    '^@teste-manuel/shared-testing$': '<rootDir>/../../libs/shared/testing/src',
  },
  modulePaths: ['<rootDir>/../../'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts',
  ],
};
