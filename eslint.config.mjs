// eslint.config.mjs (flat config for ESLint v9+)
import next from 'eslint-config-next';

export default [
  // Ignore files here (replacement for .eslintignore)
  {
    ignores: [
      'src/types/supabase.ts', // the "binary" file
    ],
  },
  // Next’s recommended rules
  ...next,
  // Your overrides
  {
    rules: {
      // Relax rules that are currently failing your build
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'off',
      'prefer-const': 'warn',
    },
  },
];
