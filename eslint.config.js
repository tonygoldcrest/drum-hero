const tsPlugin = require('@typescript-eslint/eslint-plugin');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const unusedImports = require('eslint-plugin-unused-imports');
const globals = require('globals');
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat['recommended-latest'],
  prettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-shadow': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/display-name': 'off',
      curly: ['error', 'all'],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: '*' },
        {
          blankLine: 'never',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
        { blankLine: 'any', prev: 'expression', next: 'expression' },
        { blankLine: 'never', prev: 'import', next: 'import' },
      ],
    },
    settings: {
      react: {
        version: '19',
      },
    },
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      '**/.userdata',
      '**/logs',
      '**/*.log',
      '**/pids',
      '**/*.pid',
      '**/*.seed',
      '**/coverage',
      '**/.eslintcache',
      '**/node_modules',
      '**/.DS_Store',
      '**/out',
      '**/storybook-static',
      'release/app/dist',
      'release/build',
      '.erb/dll',
      '**/.idea',
      '**/npm-debug.log.*',
      '**/*.css.d.ts',
      '**/*.sass.d.ts',
      '**/*.scss.d.ts',
    ],
  },
];
