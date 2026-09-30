// Dates calendaires au format ISO 'AAAA-MM-JJ', sans heure ni fuseau.
// Les calculs passent par des jours UTC pour échapper aux changements d'heure.

const JOUR_MS = 86_400_000

function versJours(iso: string): number {
  const [a, m, j] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, j) / JOUR_MS
}

function depuisJours(jours: number): string {
  return new Date(jours * JOUR_MS).toISOString().slice(0, 10)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Date locale de l'appareil. */
export function dateLocale(instant: Date): string {
  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`
}

export function aujourdhui(maintenant = new Date()): string {
  return dateLocale(maintenant)
}

/**
 * Date proposée par défaut pour une saisie de journal (§7.2) : aujourd'hui, sauf entre
 * 00h00 incluse et 04h00 exclue, où c'est la veille.
 */
export function dateParDefaut(maintenant = new Date()): string {
  const jour = dateLocale(maintenant)
  return maintenant.getHours() < 4 ? ajouterJours(jour, -1) : jour
}

export function ajouterJours(iso: string, n: number): string {
  return depuisJours(versJours(iso) + n)
}

/** Nombre de jours de `a` à `b` (positif si `b` est postérieure). */
export function ecartJours(a: string, b: string): number {
  return versJours(b) - versJours(a)
}

/** Jours de `debut` à `fin`, bornes incluses. */
export function plageJours(debut: string, fin: string): string[] {
  const jours: string[] = []
  for (let j = versJours(debut); j <= versJours(fin); j++) jours.push(depuisJours(j))
  return jours
}

export function premierJourDuMois(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function dernierJourDuMois(iso: string): string {
  const [a, m] = iso.split('-').map(Number)
  return depuisJours(Date.UTC(a, m, 0) / JOUR_MS)
}

/** Premier jour du mois décalé de `n` mois. */
export function ajouterMois(iso: string, n: number): string {
  const [a, m] = iso.split('-').map(Number)
  const total = a * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`
}

export const NOMBRE_JALONS_INITIAUX = 6

/** Jalons proposés à l'initialisation : le mois en cours et les cinq suivants. */
export function moisInitiaux(debut: string): string[] {
  const premier = premierJourDuMois(debut)
  return Array.from({ length: NOMBRE_JALONS_INITIAUX }, (_, i) => ajouterMois(premier, i))
}

/** Lundi de la semaine contenant `iso`. */
export function lundi(iso: string): string {
  const j = versJours(iso)
  const jourSemaine = (new Date(j * JOUR_MS).getUTCDay() + 6) % 7 // lundi = 0
  return depuisJours(j - jourSemaine)
}

/**
 * Âge en années révolues au jour donné (§7.4). Né un 29 février : les années non bissextiles,
 * l'anniversaire est atteint le 1er mars (comparaison mois/jour).
 */
export function ageRevolu(naissance: string, jour: string): number {
  const [an, mn, jn] = naissance.split('-').map(Number)
  const [a, m, j] = jour.split('-').map(Number)
  const anniversairePasse = m > mn || (m === mn && j >= jn)
  return a - an - (anniversairePasse ? 0 : 1)
}

export function estDateValide(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return depuisJours(versJours(iso)) === iso
}

const formatJour = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const formatCourt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const formatMoisAnnee = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const formatMoisCourt = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
})

function instant(iso: string): Date {
  return new Date(versJours(iso) * JOUR_MS)
}

/** « mercredi 30 septembre » */
export function libelleJour(iso: string): string {
  return formatJour.format(instant(iso))
}

/** « 30 sept. » */
export function libelleCourt(iso: string): string {
  return formatCourt.format(instant(iso))
}

/** « septembre 2026 » */
export function libelleMois(iso: string): string {
  return formatMoisAnnee.format(instant(iso))
}

/** « sept. 26 » */
export function libelleMoisCourt(iso: string): string {
  return formatMoisCourt.format(instant(iso))
}

/** Horodatage UTC du jour, pour les axes de graphiques. */
export function horodatage(iso: string): number {
  return versJours(iso) * JOUR_MS
}

export function depuisHorodatage(ms: number): string {
  return depuisJours(Math.round(ms / JOUR_MS))
}
