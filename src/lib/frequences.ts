import type { Entree } from './types.ts'

/** Nombre d'entrées de journal par aliment : les plus utilisés remontent en tête (§2, §8). */
export function frequences(entrees: Entree[]): Map<string, number> {
  const f = new Map<string, number>()
  for (const e of entrees) f.set(e.aliment_id, (f.get(e.aliment_id) ?? 0) + 1)
  return f
}

export function estReference(entrees: Entree[], alimentId: string): boolean {
  return entrees.some((e) => e.aliment_id === alimentId)
}
