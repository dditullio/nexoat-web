/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipos permitidos (Conventional Commits estándar)
    'type-enum': [
      2,
      'always',
      [
        'feat', // Nueva funcionalidad
        'fix', // Corrección de bug
        'docs', // Solo documentación
        'style', // Formato, sin cambio de lógica
        'refactor', // Refactorización sin feat/fix
        'perf', // Mejora de rendimiento
        'test', // Agrega o corrige tests
        'chore', // Tareas de mantenimiento, deps, config
        'ci', // Cambios en CI/CD
        'build', // Sistema de build o dependencias externas
        'revert', // Revierte un commit anterior
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 120],
  },
}
