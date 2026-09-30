// Séries des graphiques, construites à partir des calculs §7 (aucun calcul nouveau ici).
import { courbeLissee, trajectoire, valeurTheorique, type Totaux } from './calculs.ts'
import { ajouterJours, horodatage, plageJours } from './dates.ts'
import type { Jalon, Pesee, Profil } from './types.ts'

export interface PointPoids {
  t: number
  date: string
  brut?: number
  lisse?: number
  theorique?: number
  jalon?: number
}

export type Periode = '1m' | '3m' | '6m' | 'tout'

export const PERIODES: { valeur: Periode; libelle: string }[] = [
  { valeur: '1m', libelle: '1 mois' },
  { valeur: '3m', libelle: '3 mois' },
  { valeur: '6m', libelle: '6 mois' },
  { valeur: 'tout', libelle: 'Tout' },
]

const JOURS: Record<Exclude<Periode, 'tout'>, number> = { '1m': 30, '3m': 91, '6m': 182 }

/**
 * Fenêtre du graphique de poids : du début de l'historique (ou de la période choisie) jusqu'au
 * dernier point connu, jalons futurs compris.
 */
export function fenetrePoids(
  pesees: Pesee[],
  profil: Profil,
  jalons: Jalon[],
  aujourdhui: string,
  periode: Periode,
): { debut: string; fin: string } {
  const points = trajectoire(profil, jalons)
  const dates = [...pesees.map((p) => p.date), ...points.map((p) => p.date), aujourdhui].sort()
  const premier = dates[0]
  const fin = dates[dates.length - 1]
  if (periode === 'tout') return { debut: premier, fin }
  const limite = ajouterJours(aujourdhui, -JOURS[periode])
  return { debut: limite > premier ? limite : premier, fin }
}

export function seriePoids(
  pesees: Pesee[],
  profil: Profil,
  jalons: Jalon[],
  debut: string,
  fin: string,
): PointPoids[] {
  const lignes = new Map<string, PointPoids>()
  const ligne = (date: string) => {
    let l = lignes.get(date)
    if (!l) {
      l = { t: horodatage(date), date }
      lignes.set(date, l)
    }
    return l
  }
  const dansFenetre = (d: string) => d >= debut && d <= fin

  for (const p of pesees) if (dansFenetre(p.date)) ligne(p.date).brut = p.kg
  for (const p of courbeLissee(pesees)) if (dansFenetre(p.date)) ligne(p.date).lisse = p.kg

  // La trajectoire est une ligne brisée : ses sommets suffisent, le tracé relie les points.
  // Aux bornes de la fenêtre, la valeur théorique coupe proprement le segment en cours.
  const points = trajectoire(profil, jalons)
  points.forEach((p, i) => {
    if (!dansFenetre(p.date)) return
    const l = ligne(p.date)
    l.theorique = p.kg
    if (i > 0) l.jalon = p.kg
  })
  for (const borne of [debut, fin]) {
    const v = valeurTheorique(points, borne)
    if (v !== null) ligne(borne).theorique = v
  }
  return [...lignes.values()].sort((a, b) => a.t - b.t)
}

export interface PointJour {
  t: number
  date: string
  valeur?: number
}

/** Une valeur par jour de la plage ; jour non renseigné : pas de valeur (trou, jamais 0). */
export function serieJournaliere(
  debut: string,
  fin: string,
  valeur: (jour: string) => number | null | undefined,
): PointJour[] {
  return plageJours(debut, fin).map((date) => {
    const v = valeur(date)
    return v === null || v === undefined ? { t: horodatage(date), date } : { t: horodatage(date), date, valeur: v }
  })
}

export type Nutriment = keyof Totaux
