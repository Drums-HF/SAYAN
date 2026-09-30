import { useMemo } from 'react'
import { useDonnees } from './contexte.ts'
import { totauxParDate } from './lib/calculs.ts'
import { frequences } from './lib/frequences.ts'

/** Données dérivées, recalculées seulement quand les données changent. */
export function useDerives() {
  const { aliments, entrees } = useDonnees()
  return useMemo(() => {
    const alimentsParId = new Map(aliments.map((a) => [a.id, a]))
    return {
      alimentsParId,
      totauxJours: totauxParDate(entrees, alimentsParId),
      frequences: frequences(entrees),
    }
  }, [aliments, entrees])
}
