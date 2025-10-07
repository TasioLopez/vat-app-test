// eslint.config.mjs (flat config for ESLint v9+)
import next from 'eslint-config-next';

export default [
  // Ignore files here (replacement for .eslintignore)
  {
    ignores: [
      'src/types/supabase.ts', // the "binary" file
      'node_modules/**',
      '.next/**',
      'dist/**',
    ],
  },
  // Next's recommended rules
  ...next,
  // Your overrides
  {
    rules: {
      // TypeScript rules - gradually improve type safety
      '@typescript-eslint/no-explicit-any': 'warn', // Change from 'off' to 'warn'
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      
      // React rules
      'react-hooks/exhaustive-deps': 'error', // Change from 'warn' to 'error'
      'react/no-unescaped-entities': 'off',
      'react/prop-types': 'off', // Not needed with TypeScript
      
      // General code quality
      'prefer-const': 'error', // Change from 'warn' to 'error'
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-expressions': 'error',
      'prefer-template': 'warn',
      'object-shorthand': 'warn',
      
      // Import organization
      'import/order': ['warn', {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        'alphabetize': { 'order': 'asc', 'caseInsensitive': true }
      }],
    },
  },
];
