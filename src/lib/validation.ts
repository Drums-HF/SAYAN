// Validation des saisies (SPEC §7.2, §7.8). Messages factuels, sans commentaire.
import { lireDecimal } from './nombres.ts'

export type Lecture = { ok: true; valeur: number } | { ok: false; message: string }

export const GRAMMES_MAX = 5000
export const POIDS_MIN = 30
export const POIDS_MAX = 300

/** Grammes : strictement positifs, au plus une décimale, plafond 5 000 g inclus. */
export function lireGrammes(texte: string): Lecture {
  const valeur = lireDecimal(texte, 1)
  if (valeur === null) return { ok: false, message: 'Nombre attendu, une décimale au plus.' }
  if (valeur <= 0) return { ok: false, message: 'La quantité doit être supérieure à 0 g.' }
  if (valeur > GRAMMES_MAX) return { ok: false, message: `La quantité est plafonnée à 5 000 g.` }
  return { ok: true, valeur }
}

/** Poids corporel : 30 à 300 kg inclus, au plus une décimale. */
export function lirePoids(texte: string): Lecture {
  const valeur = lireDecimal(texte, 1)
  if (valeur === null) return { ok: false, message: 'Nombre attendu, une décimale au plus.' }
  if (valeur < POIDS_MIN || valeur > POIDS_MAX) {
    return { ok: false, message: 'Le poids doit être compris entre 30 et 300 kg.' }
  }
  return { ok: true, valeur }
}

/** Nombre strictement positif, décimales libres (champs du profil : format uniquement). */
export function lirePositif(texte: string, decimalesMax = 1): Lecture {
  const valeur = lireDecimal(texte, decimalesMax)
  if (valeur === null || valeur <= 0) return { ok: false, message: 'Nombre positif attendu.' }
  return { ok: true, valeur }
}
