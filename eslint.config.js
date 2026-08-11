import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  // Archivos ignorados
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.changeset/**', '**/coverage/**', 'tmp/**'],
  },

  // Base JS
  js.configs.recommended,

  // TypeScript
  ...tseslint.configs.recommended,

  // Vue 3
  ...pluginVue.configs['flat/recommended'],

  // Globals de Node para archivos de configuración CJS
  {
    files: ['**/*.cjs'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Globals de Node para archivos de config del backend
  {
    files: ['backend/src/**/*.ts', 'backend/prisma/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Parser + globals de browser para Vue y frontend TS
  {
    files: ['**/*.vue', 'frontend/src/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },

  // Reglas del proyecto
  {
    files: ['**/*.{ts,tsx,vue}'],
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      // Vue
      'vue/multi-word-component-names': 'off',
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'],
        },
      ],
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/no-v-html': 'warn',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Permitir console.log en el entrypoint del servidor y en el seed (scripts
  // informativos de CLI, no código de aplicación).
  {
    files: ['backend/src/main.ts', 'backend/prisma/seed.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // NestJS usa reflect-metadata (emitDecoratorMetadata) para resolver DI en
  // constructores y para que ValidationPipe reconozca los DTOs de
  // @Body()/@Query()/@Param(). `import type` elimina esa referencia del JS
  // compilado: el tipo pasa a `Object` en runtime y Nest no puede
  // resolverlo ("Nest can't resolve dependencies..."). La regla no puede
  // distinguir esos casos de un tipo genuinamente solo-de-tipo, así que va
  // apagada acá — a mano hay que preferir `import type` igual donde no
  // haga falta el valor en runtime.
  {
    files: ['backend/src/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  // Prettier al final (desactiva reglas que conflictúan con formato)
  prettierConfig
)
