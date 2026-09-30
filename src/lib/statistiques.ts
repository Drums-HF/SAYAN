// Agrégats de l'écran Statistiques (SPEC §8). Toujours sur les seuls jours renseignés.
import type { Totaux } from './calculs.ts'
import { ajouterJours, ajouterMois, dernierJourDuMois, ecartJours, lundi, premierJourDuMois } from './dates.ts'

export interface Plage {
  debut: string
  fin: string
}

export interface Moyenne {
  plage: Plage
  /** Jours renseignés de la plage. */
  jours: number
  kcal: number | null
  proteines: number | null
}

/** Moyenne des totaux des jours renseignés de la plage ; null s'il n'y en a aucun. */
export function moyennePlage(totauxJours: Map<string, Totaux>, plage: Plage): Moyenne {
  let n = 0
  let kcal = 0
  let proteines = 0
  for (const [date, t] of totauxJours) {
    if (date < plage.debut || date > plage.fin) continue
    n++
    kcal += t.kcal
    proteines += t.proteines
  }
  return { plage, jours: n, kcal: n ? kcal / n : null, proteines: n ? proteines / n : null }
}

/** Les `n` dernières semaines (lundi → dimanche), la plus récente en premier. */
export function dernieresSemaines(aujourdhui: string, n: number): Plage[] {
  const debut = lundi(aujourdhui)
  return Array.from({ length: n }, (_, i) => {
    const d = ajouterJours(debut, -7 * i)
    return { debut: d, fin: ajouterJours(d, 6) }
  })
}

/** Les `n` derniers mois calendaires, le plus récent en premier. */
export function derniersMois(aujourdhui: string, n: number): Plage[] {
  return Array.from({ length: n }, (_, i) => {
    const d = ajouterMois(premierJourDuMois(aujourdhui), -i)
    return { debut: d, fin: dernierJourDuMois(d) }
  })
}

export interface Regularite {
  mois: string
  /** Jours portant au moins une entrée de journal. */
  renseignes: number
  /** Jours du mois écoulés dans la période de suivi. */
  possibles: number
}

/** Jours renseignés par mois, du mois de début du suivi au mois en cours. */
export function regularite(totauxJours: Map<string, Totaux>, debutSuivi: string, aujourdhui: string): Regularite[] {
  const resultat: Regularite[] = []
  for (let m = premierJourDuMois(debutSuivi); m <= aujourdhui; m = ajouterMois(m, 1)) {
    const debut = m < debutSuivi ? debutSuivi : m
    const finMois = dernierJourDuMois(m)
    const fin = finMois > aujourdhui ? aujourdhui : finMois
    let renseignes = 0
    for (const date of totauxJours.keys()) if (date >= debut && date <= fin) renseignes++
    resultat.push({ mois: m, renseignes, possibles: ecartJours(debut, fin) + 1 })
  }
  return resultat
}

/**
 * Évolution de la moyenne glissante (§7.6) sur la plage : dernier point lissé moins premier
 * point lissé de la plage. null s'il y en a moins de deux.
 */
export function evolutionPoids(pointsLisses: { date: string; kg: number }[], plage: Plage): number | null {
  const dans = pointsLisses.filter((p) => p.date >= plage.debut && p.date <= plage.fin)
  return dans.length >= 2 ? dans[dans.length - 1].kg - dans[0].kg : null
}

/** Nombre de jours renseignés sur la plage et nombre de jours de la plage. */
export function joursRenseignes(totauxJours: Map<string, Totaux>, plage: Plage): { renseignes: number; total: number } {
  let renseignes = 0
  for (const date of totauxJours.keys()) if (date >= plage.debut && date <= plage.fin) renseignes++
  return { renseignes, total: ecartJours(plage.debut, plage.fin) + 1 }
}
