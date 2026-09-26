// @ts-check
import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/', 'coverage/', 'node_modules/']),

  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
  },

  // Archivos JS sueltos (config, scripts)
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [eslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // Código TypeScript con linting tipado
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Nest: @Module({...}) export class FooModule {} es una clase "vacía" legítima
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowWithDecorator: true },
      ],

      // Clave con try/catch en servicios (ver abajo)
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      // Fuerza `private readonly` en dependencias inyectadas
      '@typescript-eslint/prefer-readonly': 'error',

      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      eqeqeq: ['error', 'smart'],
      'no-console': 'warn', // usa el Logger de Nest
    },
  },

  // Tests: más permisivo donde la estrictez solo mete ruido
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    languageOptions: { globals: globals.jest },
    rules: {
      '@typescript-eslint/unbound-method': 'off', // expect(service.metodo).toHaveBeenCalled()
      '@typescript-eslint/no-unsafe-assignment': 'off', // supertest -> res.body es any
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  prettierConfig, // siempre al final
]);
