import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'borrador', '.claude'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // Regla de arquitectura (ADR 0004): el núcleo no depende del motor, la UI ni el navegador.
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['three', 'three/*'], message: 'core/ no puede importar three.js.' },
            { group: ['preact', 'preact/*'], message: 'core/ no puede importar la UI.' },
            { group: ['idb', 'idb/*'], message: 'core/ no puede depender del almacenamiento.' },
            {
              group: ['**/juego/**', '**/world/**', '**/ui/**', '**/save/**'],
              message: 'core/ no puede importar capas superiores.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Usa el RNG determinista del núcleo (core/rng.ts).',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message: 'El núcleo no lee la hora real; el tiempo es un dato del estado.',
        },
        'window',
        'document',
        'localStorage',
        'indexedDB',
      ],
    },
  },
  {
    // La escena y la UI solo leen el estado y envían comandos con `despachar`: nunca lo aplican ni
    // lo crean (ADR 0004). El almacén se crea en `juego/` / `main.ts` y se les pasa como lector.
    files: ['src/world/**/*.ts', 'src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '../core',
              importNames: ['aplicarComando', 'aplicarComandos'],
              message: 'La escena y la UI envían comandos con despachar(); no los aplican.',
            },
            {
              name: '../juego/almacen',
              importNames: ['Almacen', 'crearAlmacen'],
              message: 'La escena y la UI no crean el almacén; reciben un LectorEstado.',
            },
          ],
          patterns: [
            {
              group: ['**/core/comandos'],
              importNames: ['aplicarComando', 'aplicarComandos'],
              message: 'La escena y la UI envían comandos con despachar(); no los aplican.',
            },
          ],
        },
      ],
    },
  },
  prettier,
)
