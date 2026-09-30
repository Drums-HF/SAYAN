// Recherche locale insensible à la casse et aux accents, tolérante aux fautes légères (SPEC §6).
// Implémentation maison, sans dépendance.

/** Minuscules, sans accents ni ligatures, ponctuation remplacée par des espaces. */
export function normaliserTexte(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function mots(texte: string): string[] {
  const t = normaliserTexte(texte)
  return t ? t.split(' ') : []
}

/**
 * Distance de Damerau-Levenshtein restreinte (transposition de deux lettres voisines comptée
 * comme une seule faute). Arrêt anticipé au-delà de `max`.
 */
export function distance(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const n = b.length
  let avant = new Array<number>(n + 1).fill(0)
  let precedente = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const courante = [i]
    let minimum = i
    for (let j = 1; j <= n; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(precedente[j] + 1, courante[j - 1] + 1, precedente[j - 1] + cout)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, avant[j - 2] + 1)
      }
      courante.push(v)
      minimum = Math.min(minimum, v)
    }
    if (minimum > max) return max + 1
    avant = precedente
    precedente = courante
  }
  return precedente[n]
}

/** Fautes tolérées selon la longueur du mot tapé. */
export function fautesToleree(longueur: number): number {
  if (longueur >= 8) return 2
  if (longueur >= 4) return 1
  return 0
}

/** Score d'un mot de la requête face à un mot du nom, ou 0 s'il ne correspond pas. */
function scoreMot(requete: string, mot: string): number {
  if (mot === requete) return 4
  if (mot.startsWith(requete)) return 3
  if (requete.length >= 3 && mot.includes(requete)) return 2
  const tolerance = fautesToleree(requete.length)
  if (tolerance === 0) return 0
  // Faute dans le mot complet ou dans le début du mot (saisie en cours).
  if (distance(requete, mot, tolerance) <= tolerance) return 1.5
  if (mot.length > requete.length && distance(requete, mot.slice(0, requete.length), tolerance) <= tolerance) {
    return 1
  }
  return 0
}

/**
 * Score d'un nom pour une requête : chaque mot tapé doit trouver une correspondance, sinon null.
 * Bonus quand le premier mot correspond au début du nom ; léger avantage aux noms courts.
 */
export function score(requete: string[], nom: string[]): number | null {
  if (requete.length === 0) return 0
  let total = 0
  for (const r of requete) {
    let meilleur = 0
    for (const m of nom) meilleur = Math.max(meilleur, scoreMot(r, m))
    if (meilleur === 0) return null
    total += meilleur
  }
  if (nom[0] && scoreMot(requete[0], nom[0]) >= 3) total += 2
  return total - nom.length * 0.01
}

export interface Index<T> {
  element: T
  mots: string[]
}

export function indexer<T>(elements: T[], texte: (e: T) => string): Index<T>[] {
  return elements.map((element) => ({ element, mots: mots(texte(element)) }))
}

/**
 * Filtre et trie par pertinence. `departage` classe les ex æquo (par exemple la fréquence
 * d'usage), puis l'ordre alphabétique de l'index est conservé.
 */
export function rechercher<T>(
  index: Index<T>[],
  requete: string,
  options: { limite?: number; departage?: (e: T) => number } = {},
): T[] {
  const r = mots(requete)
  const trouves: { e: T; s: number; d: number }[] = []
  for (const { element, mots: m } of index) {
    const s = score(r, m)
    if (s !== null) trouves.push({ e: element, s, d: options.departage?.(element) ?? 0 })
  }
  trouves.sort((a, b) => b.s - a.s || b.d - a.d)
  return trouves.slice(0, options.limite ?? trouves.length).map((t) => t.e)
}
