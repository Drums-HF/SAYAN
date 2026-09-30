// Calculs normatifs (SPEC §7). Valeurs brutes, aucun arrondi : l'arrondi n'intervient qu'à
// l'affichage (nombres.ts).
import { ageRevolu, ajouterJours, dernierJourDuMois, ecartJours } from './dates.ts'
import type { Aliment, Entree, Jalon, NiveauActivite, Pesee, Profil, Sexe } from './types.ts'

// ---------- §7.2 Apport alimentaire ----------

export interface Totaux {
  kcal: number
  glucides: number
  proteines: number
  lipides: number
  fibres: number
}

export const TOTAUX_NULS: Totaux = { kcal: 0, glucides: 0, proteines: 0, lipides: 0, fibres: 0 }

/** apport = valeur pour 100 g × grammes / 100 */
export function apport(valeurPour100g: number, grammes: number): number {
  return (valeurPour100g * grammes) / 100
}

export function apportEntree(aliment: Aliment, grammes: number): Totaux {
  return {
    kcal: apport(aliment.kcal_100g, grammes),
    glucides: apport(aliment.glucides_100g, grammes),
    proteines: apport(aliment.proteines_100g, grammes),
    lipides: apport(aliment.lipides_100g, grammes),
    fibres: apport(aliment.fibres_100g ?? 0, grammes),
  }
}

/** Somme brute des apports des entrées fournies (aucune pondération). */
export function totaux(entrees: Entree[], aliments: Map<string, Aliment>): Totaux {
  const t = { ...TOTAUX_NULS }
  for (const e of entrees) {
    const a = aliments.get(e.aliment_id)
    if (!a) continue
    const x = apportEntree(a, e.grammes)
    t.kcal += x.kcal
    t.glucides += x.glucides
    t.proteines += x.proteines
    t.lipides += x.lipides
    t.fibres += x.fibres
  }
  return t
}

/** Totaux par date, pour les seules dates portant au moins une entrée (jours renseignés). */
export function totauxParDate(entrees: Entree[], aliments: Map<string, Aliment>): Map<string, Totaux> {
  const parDate = new Map<string, Entree[]>()
  for (const e of entrees) parDate.set(e.date, [...(parDate.get(e.date) ?? []), e])
  const resultat = new Map<string, Totaux>()
  for (const [date, liste] of parDate) resultat.set(date, totaux(liste, aliments))
  return resultat
}

// ---------- §7.4 Métabolisme de base ----------

/** Mifflin-St Jeor. */
export function metabolismeBase(sexe: Sexe, poidsKg: number, tailleCm: number, age: number): number {
  const base = 10 * poidsKg + 6.25 * tailleCm - 5 * age
  return sexe === 'homme' ? base + 5 : base - 161
}

/** Plus récente pesée de date ≤ jour, jamais postérieure ; à défaut, le poids initial. */
export function poidsAuJour(pesees: Pesee[], jour: string, poidsInitialKg: number): number {
  let retenue: Pesee | null = null
  for (const p of pesees) {
    if (p.date <= jour && (!retenue || p.date > retenue.date)) retenue = p
  }
  return retenue ? retenue.kg : poidsInitialKg
}

export function metabolismeBaseAuJour(profil: Profil, pesees: Pesee[], jour: string): number {
  return metabolismeBase(
    profil.sexe,
    poidsAuJour(pesees, jour, profil.poids_initial_kg),
    profil.taille_cm,
    ageRevolu(profil.date_naissance, jour),
  )
}

// ---------- §7.5 Dépense énergétique et déficit ----------

export const COEFFICIENTS_ACTIVITE: Record<NiveauActivite, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
}

/** DEJ = MB × coefficient d'activité */
export function depenseJournaliere(profil: Profil, pesees: Pesee[], jour: string): number {
  return metabolismeBaseAuJour(profil, pesees, jour) * COEFFICIENTS_ACTIVITE[profil.niveau_activite]
}

/** Déficit = DEJ − total kcal ; null pour un jour sans aucune entrée (jamais 0 kcal). */
export function deficitDuJour(dej: number, totalKcal: number | null | undefined): number | null {
  return totalKcal === null || totalKcal === undefined ? null : dej - totalKcal
}

/** Somme des déficits des seuls jours renseignés de la liste, et leur nombre. */
export function deficitCumule(
  jours: string[],
  profil: Profil,
  pesees: Pesee[],
  totauxJours: Map<string, Totaux>,
): { somme: number; jours: number } {
  let somme = 0
  let n = 0
  for (const jour of jours) {
    const t = totauxJours.get(jour)
    if (!t) continue
    somme += depenseJournaliere(profil, pesees, jour) - t.kcal
    n++
  }
  return { somme, jours: n }
}

// ---------- §7.6 Moyenne glissante du poids ----------

export const FENETRE_MOYENNE = 7
export const PESEES_MIN_MOYENNE = 3

/**
 * Moyenne des pesées existantes sur [jour − 6 ; jour], bornes incluses, sans interpolation.
 * null si la fenêtre compte moins de 3 pesées.
 */
export function moyenne7(pesees: Pesee[], jour: string): number | null {
  const debut = ajouterJours(jour, -(FENETRE_MOYENNE - 1))
  let somme = 0
  let n = 0
  for (const p of pesees) {
    if (p.date >= debut && p.date <= jour) {
      somme += p.kg
      n++
    }
  }
  return n >= PESEES_MIN_MOYENNE ? somme / n : null
}

/** Courbe lissée : un point par jour disposant d'une pesée, quand la moyenne existe. */
export function courbeLissee(pesees: Pesee[]): { date: string; kg: number }[] {
  const points: { date: string; kg: number }[] = []
  for (const p of pesees) {
    const m = moyenne7(pesees, p.date)
    if (m !== null) points.push({ date: p.date, kg: m })
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

// ---------- §7.7 Trajectoire et jalons mensuels ----------

export interface PointTrajectoire {
  date: string
  kg: number
}

/**
 * Ligne brisée : (date_debut, poids initial), puis (dernier jour du mois M, poids cible M) dans
 * l'ordre. Un jalon dont le dernier jour est ≤ date_debut est ignoré ; un mois manquant est
 * simplement sauté.
 */
export function trajectoire(profil: Profil, jalons: Jalon[]): PointTrajectoire[] {
  const points = jalons
    .map((j) => ({ date: dernierJourDuMois(j.mois), kg: j.poids_cible_kg }))
    .filter((p) => p.date > profil.date_debut)
    .sort((a, b) => a.date.localeCompare(b.date))
  return [{ date: profil.date_debut, kg: profil.poids_initial_kg }, ...points]
}

/** Interpolation linéaire jour par jour ; null avant le début ou après le dernier jalon. */
export function valeurTheorique(points: PointTrajectoire[], jour: string): number | null {
  if (points.length === 0 || jour < points[0].date || jour > points[points.length - 1].date) return null
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (jour >= a.date && jour <= b.date) {
      const t = ecartJours(a.date, jour) / ecartJours(a.date, b.date)
      return a.kg + (b.kg - a.kg) * t
    }
  }
  return points[points.length - 1].kg // jour = unique point
}

/**
 * Écart à la trajectoire = moyenne7(jour) − valeur théorique(jour). La moyenne est calculée sur
 * la fenêtre même si le jour n'a pas encore de pesée ; jamais de repli sur la pesée brute.
 */
export function ecartTrajectoire(
  pesees: Pesee[],
  profil: Profil,
  jalons: Jalon[],
  jour: string,
): number | null {
  const moyenne = moyenne7(pesees, jour)
  const theorique = valeurTheorique(trajectoire(profil, jalons), jour)
  return moyenne === null || theorique === null ? null : moyenne - theorique
}
