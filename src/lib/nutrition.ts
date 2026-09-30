// Normalisation et contrôle des valeurs nutritionnelles à l'import (SPEC §6, §7.3).
// Toutes les valeurs sont pour 100 g et restent brutes (aucun arrondi).

export interface ValeursSaisies {
  kcal?: number | null
  kj?: number | null
  glucides?: number | null
  proteines?: number | null
  lipides?: number | null
  fibres?: number | null
}

export interface ValeursNormalisees {
  kcal: number
  glucides: number
  proteines: number
  lipides: number
  fibres: number | null
}

export type Normalisation =
  | {
      ok: true
      valeurs: ValeursNormalisees
      /** Énergie reconstituée par Atwater (§7.3). */
      kcal_estimee: boolean
      /** Valeur d'Atwater, calculée systématiquement. */
      atwater: number
      /** Écart déclaré / Atwater hors tolérance. Affiché seulement pour Open Food Facts. */
      suspect: boolean
    }
  | { ok: false; erreurs: string[] }

export const KJ_PAR_KCAL = 4.184
export const KCAL_MAX = 900
export const NUTRIMENT_MAX = 100
export const SOMME_MACROS_MAX = 100
export const TOLERANCE_SOMME = 5
export const ECART_RELATIF_MAX = 0.2
export const ECART_ABSOLU_TOLERE = 10

export function kjVersKcal(kj: number): number {
  return kj / KJ_PAR_KCAL
}

/** kcal = 4 × protéines + 4 × glucides + 9 × lipides + 2 × fibres ; fibres absentes = 0. */
export function atwater(proteines: number, glucides: number, lipides: number, fibres: number | null = 0): number {
  return 4 * proteines + 4 * glucides + 9 * lipides + 2 * (fibres ?? 0)
}

/**
 * Suspect si l'écart relatif à la valeur déclarée dépasse 20 %, sauf écart absolu ≤ 10 kcal
 * (ce qui couvre la valeur déclarée à 0).
 */
export function estSuspect(declaree: number, calculee: number): boolean {
  const ecart = Math.abs(calculee - declaree)
  if (ecart <= ECART_ABSOLU_TOLERE) return false
  return declaree === 0 || ecart / declaree > ECART_RELATIF_MAX
}

const present = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v)

export function normaliser(v: ValeursSaisies): Normalisation {
  const erreurs: string[] = []
  const { glucides, proteines, lipides } = v
  const fibres = present(v.fibres) ? v.fibres : null

  if (!present(glucides)) erreurs.push('Glucides absents.')
  if (!present(proteines)) erreurs.push('Protéines absentes.')
  if (!present(lipides)) erreurs.push('Lipides absents.')
  if (!present(glucides) || !present(proteines) || !present(lipides)) return { ok: false, erreurs }

  const calculee = atwater(proteines, glucides, lipides, fibres)
  let kcal: number
  let kcal_estimee = false
  if (present(v.kcal)) {
    kcal = v.kcal
  } else if (present(v.kj)) {
    kcal = kjVersKcal(v.kj)
  } else {
    kcal = calculee
    kcal_estimee = true
  }

  if (kcal < 0 || kcal > KCAL_MAX) erreurs.push('Énergie hors bornes : 0 à 900 kcal pour 100 g.')
  const nutriments: [string, number | null][] = [
    ['Glucides', glucides],
    ['Protéines', proteines],
    ['Lipides', lipides],
    ['Fibres', fibres],
  ]
  for (const [nom, valeur] of nutriments) {
    if (valeur !== null && (valeur < 0 || valeur > NUTRIMENT_MAX)) {
      erreurs.push(`${nom} hors bornes : 0 à 100 g pour 100 g.`)
    }
  }
  if (proteines + glucides + lipides > SOMME_MACROS_MAX + TOLERANCE_SOMME) {
    erreurs.push('Protéines, glucides et lipides dépassent 100 g pour 100 g.')
  }
  if (erreurs.length) return { ok: false, erreurs }

  return {
    ok: true,
    valeurs: { kcal, glucides, proteines, lipides, fibres },
    kcal_estimee,
    atwater: calculee,
    suspect: !kcal_estimee && estSuspect(kcal, calculee),
  }
}
