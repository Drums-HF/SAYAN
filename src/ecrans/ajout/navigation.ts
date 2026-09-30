import { dateParDefaut, estDateValide } from '../../lib/dates.ts'

/** Date cible d'un ajout, portée par l'adresse (?date=), sinon la date par défaut (§7.2). */
export function dateCible(parametres: URLSearchParams): string {
  const d = parametres.get('date')
  return d && estDateValide(d) ? d : dateParDefaut()
}

export function versJournal(date: string): string {
  return date === dateParDefaut() ? '/journal' : `/journal?date=${date}`
}

export function suffixeDate(date: string): string {
  return date === dateParDefaut() ? '' : `?date=${date}`
}

export type ModeAjout = 'recherche' | 'code'

export const MODES: { valeur: ModeAjout; libelle: string }[] = [
  { valeur: 'recherche', libelle: 'Recherche' },
  { valeur: 'code', libelle: 'Code-barres' },
]
