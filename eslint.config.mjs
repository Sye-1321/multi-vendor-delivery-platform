// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // The modules below predate the modernization work and still expose
    // untyped persistence and request boundaries. Keep basic correctness rules
    // active while those boundaries are replaced module by module.
    files: [
      'src/application/**/*.ts',
      'src/audit/**/*.ts',
      'src/cart/**/*.ts',
      'src/cart-item/**/*.ts',
      'src/company/**/*.ts',
      'src/delivery-person/**/*.ts',
      'src/domain/**/*.ts',
      'src/infrastructure/**/*.ts',
      'src/menu/**/*.ts',
      'src/menu-item/**/*.ts',
      'src/order/**/*.ts',
      'src/restaurant/**/*.ts',
      'src/restaurant-review/**/*.ts',
      'src/shared/**/*.ts',
      'src/system-review/**/*.ts',
      'src/user/**/*.ts',
      'src/utils/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
);
