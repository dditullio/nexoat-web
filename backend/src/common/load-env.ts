import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { config as loadDotenv } from 'dotenv'

/**
 * Busca `.env` subiendo desde `startDir` hasta encontrar la raíz del
 * monorepo (marcada por `pnpm-workspace.yaml`). Evitar contar niveles fijos
 * a mano: `nest start --watch` compila a `backend/dist/src/`, `ts-node`
 * corre `backend/prisma/` directo, y `node dist/main` en producción puede
 * tener otra profundidad más — todos terminan en un lugar distinto.
 */
function findMonorepoRoot(startDir: string): string | undefined {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return undefined // llegamos a la raíz del filesystem
    dir = parent
  }
  return undefined
}

/** Carga `.env` de la raíz del monorepo en `process.env`, sin importar desde dónde se ejecute este archivo. */
export function loadEnv(startDir: string = __dirname): void {
  const root = findMonorepoRoot(startDir)
  loadDotenv(root ? { path: join(root, '.env') } : undefined)
}
