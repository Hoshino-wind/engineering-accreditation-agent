import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/app/**',
                '**/entities/**',
                '**/features/**',
                '**/views/**',
                '**/widgets/**',
              ],
              message: 'shared 层不能依赖上层业务切片。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/entities/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/app/**',
                '**/features/**',
                '**/views/**',
                '**/widgets/**',
              ],
              message: 'entity 只能依赖 shared 或自身切片。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/app/**', '**/views/**', '**/widgets/**'],
              message: 'feature 不能依赖页面、组件区块或应用壳。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/app/**', '**/views/**'],
              message: 'widget 不能反向依赖页面或应用壳。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/views/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/app/**'],
              message: 'view 不能反向依赖应用壳。',
            },
          ],
        },
      ],
    },
  },
);
