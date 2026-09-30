// Arrondis et formats d'affichage (SPEC §7.1). Les valeurs sont stockées et calculées brutes :
// ces fonctions n'interviennent qu'au moment de l'affichage.

/**
 * Arrondit à `decimales` chiffres (négatif : -1 pour la dizaine). Demi-valeurs arrondies en
 * s'éloignant de zéro, symétriquement pour les négatifs. Le passage par la notation décimale
 * corrige la représentation binaire (1,05 → 1,1 ; 1,005 → 1,01).
 */
export function arrondir(x: number, decimales = 0): number {
  if (!Number.isFinite(x)) return x
  const signe = x < 0 ? -1 : 1
  const abs = Math.abs(x)
  const texte = String(abs)
  const decale = texte.includes('e') ? abs * 10 ** decimales : Number(`${texte}e${decimales}`)
  const entier = Math.round(decale)
  const resultat = signe * (decimales === 0 ? entier : Number(`${entier}e${-decimales}`))
  return resultat === 0 ? 0 : resultat // pas de −0
}

export function arrondirDizaine(x: number): number {
  return arrondir(x, -1)
}

const formats = new Map<number, Intl.NumberFormat>()

function formatFr(x: number, decimales: number): string {
  let f = formats.get(decimales)
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })
    formats.set(decimales, f)
  }
  // Signe moins typographique.
  return f.format(x).replace('-', '−')
}

/** kcal : entier au plus proche. « 1 523 » */
export function formatKcal(x: number): string {
  return formatFr(arrondir(x, 0), 0)
}

/** Macronutriments : une décimale, en grammes. « 12,5 » */
export function formatGrammes(x: number): string {
  return formatFr(arrondir(x, 1), 1)
}

/** Poids corporel : une décimale, en kg. « 72,4 » */
export function formatKg(x: number): string {
  return formatFr(arrondir(x, 1), 1)
}

/** MB, DEJ, déficit : à la dizaine, présentés comme estimations. « ≈ 2 480 » */
export function formatEstimation(x: number): string {
  return `≈ ${formatFr(arrondirDizaine(x), 0)}`
}

/** Valeur signée en kg, une décimale. « +0,4 », « −1,2 », « 0,0 » */
export function formatKgSigne(x: number): string {
  const r = arrondir(x, 1)
  return r > 0 ? `+${formatFr(r, 1)}` : formatFr(r, 1)
}

/** Nombre saisi tel quel : entier ou décimale, sans zéro inutile. « 152,5 », « 80 » */
export function formatSaisie(x: number): string {
  return String(x).replace('.', ',')
}

/**
 * Lit une saisie numérique : chiffres, au plus une décimale, virgule ou point.
 * Renvoie null si le format n'est pas respecté.
 */
export function lireDecimal(texte: string, decimalesMax = 1): number | null {
  const t = texte.trim().replace(',', '.')
  const motif = decimalesMax === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${decimalesMax}})?$`)
  return motif.test(t) ? Number(t) : null
}
