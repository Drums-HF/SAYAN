// Table CIQUAL embarquée (SPEC §6) : règles d'import partagées avec scripts/build-ciqual.ts,
// et chargement paresseux côté application.

export interface AlimentCiqual {
  code: string
  nom: string
  kcal: number
  glucides: number
  proteines: number
  lipides: number
  fibres: number | null
  kcal_estimee: boolean
}

// ---------- Sélection de la variante cuite (import) ----------

/**
 * Sous-groupes CIQUAL où la variante cuite est retenue d'office : légumes, pommes de terre et
 * autres tubercules, légumineuses, pâtes/riz/céréales.
 */
export const SOUS_GROUPES_CUISSON = ['0201', '0202', '0203', '0301']

export interface LigneCiqual {
  code: string
  nom: string
  sousGroupe: string
}

type Etat = { type: 'cru' } | { type: 'cuit'; priorite: number } | { type: 'autre' }

const minuscules = (s: string) => s.toLocaleLowerCase('fr-FR')

/** Mode de cuisson exclu de la sélection : l'aliment reste un aliment distinct, visible. */
const EXCLUS = /frit|sauté|poêlé|rissolé|rôti|grillé|au four|braisé|cuisiné|appertis|purée|à cuire/

/** Segments qui qualifient l'état ou la présentation, ignorés pour apparier cru et cuit. */
function estSegmentNeutre(segment: string): boolean {
  return /^(sans sel ajouté|sans peau|chair et peau|croquante?s?|fondante?s?)$/.test(segment)
}

function segments(nom: string): string[] {
  return minuscules(nom)
    .replace(/\(aliment moyen\)/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function etatSegment(segment: string): Etat | null {
  if (/^(cru|crue|crus|crues|sec|sèche|secs|sèches)$/.test(segment)) return { type: 'cru' }
  if (/bouilli|cuite?s? à l'eau/.test(segment)) return { type: 'cuit', priorite: 1 }
  if (/vapeur/.test(segment)) return { type: 'cuit', priorite: 2 }
  if (/^cuite?s?$/.test(segment)) return { type: 'cuit', priorite: 3 }
  return null
}

export function etat(nom: string): Etat {
  if (EXCLUS.test(minuscules(nom))) return { type: 'autre' }
  let trouve: Etat = { type: 'autre' }
  for (const s of segments(nom)) {
    const e = etatSegment(s)
    if (e) trouve = e
  }
  return trouve
}

/** Nom de l'aliment sans l'état ni les qualificatifs neutres : clé d'appariement cru/cuit. */
export function famille(nom: string): string {
  return segments(nom)
    .filter((s) => !etatSegment(s) && !estSegmentNeutre(s))
    .join(', ')
}

/**
 * Dans les sous-groupes concernés, pour chaque aliment disposant d'une variante cuite (à l'eau,
 * vapeur ou « cuit »), ne conserve que la meilleure variante cuite et masque les variantes crues
 * ou concurrentes. Priorité : à l'eau, puis vapeur, puis « cuit » ; à égalité, « aliment moyen »
 * puis le plus petit code. Les autres aliments passent inchangés.
 */
export function selectionnerVariantesCuites<T extends LigneCiqual>(lignes: T[]): T[] {
  const familles = new Map<string, T[]>()
  for (const l of lignes) {
    if (!SOUS_GROUPES_CUISSON.includes(l.sousGroupe)) continue
    const e = etat(l.nom)
    if (e.type === 'autre') continue
    const cle = `${l.sousGroupe}|${famille(l.nom)}`
    familles.set(cle, [...(familles.get(cle) ?? []), l])
  }

  const masques = new Set<T>()
  for (const membres of familles.values()) {
    const cuits = membres
      .map((l) => ({ l, e: etat(l.nom) }))
      .filter((x): x is { l: T; e: { type: 'cuit'; priorite: number } } => x.e.type === 'cuit')
    if (cuits.length === 0) continue
    cuits.sort(
      (a, b) =>
        a.e.priorite - b.e.priorite ||
        Number(/aliment moyen/.test(b.l.nom)) - Number(/aliment moyen/.test(a.l.nom)) ||
        Number(a.l.code) - Number(b.l.code),
    )
    const retenu = cuits[0].l
    for (const m of membres) if (m !== retenu) masques.add(m)
  }

  // Repli pour une variante crue restée seule : son équivalent cuit peut porter un nom voisin
  // (« Riz thaï ou basmati, cru » → « Riz thaï, cuit » ; « Brocoli, surgelé, cru » → « Brocoli, cuit »).
  const avecCuit = new Set(
    [...familles].filter(([, m]) => m.some((l) => etat(l.nom).type === 'cuit')).map(([cle]) => cle),
  )
  for (const [cle, membres] of familles) {
    if (avecCuit.has(cle)) continue
    const [sousGroupe, nomFamille] = cle.split('|')
    if (famillesVoisines(nomFamille).some((v) => avecCuit.has(`${sousGroupe}|${v}`))) {
      for (const m of membres) masques.add(m)
    }
  }
  return lignes.filter((l) => !masques.has(l))
}

/** Familles voisines : sans « surgelé », et chaque terme d'une alternative « A ou B ». */
export function famillesVoisines(nomFamille: string): string[] {
  const voisines = new Set<string>()
  const sansSurgele = nomFamille
    .split(', ')
    .filter((s) => !/^surgelée?s?$/.test(s))
    .join(', ')
  for (const base of [nomFamille, sansSurgele]) {
    if (base !== nomFamille) voisines.add(base)
    const [tete, ...suite] = base.split(', ')
    const alternative = tete.match(/^(.*\s)?(\S+) ou (\S+)$/)
    if (alternative) {
      const prefixe = alternative[1] ?? ''
      for (const terme of [alternative[2], alternative[3]]) {
        voisines.add([`${prefixe}${terme}`, ...suite].join(', '))
      }
    }
  }
  return [...voisines]
}

/**
 * Lit une valeur de la table : virgule décimale, « traces » → 0, « < x » → x / 2,
 * « - » ou vide → absent.
 */
export function lireValeurCiqual(brut: string | undefined): number | null {
  const t = (brut ?? '').trim()
  if (t === '' || t === '-') return null
  if (minuscules(t) === 'traces') return 0
  const inferieur = t.match(/^<\s*([\d,.]+)$/)
  if (inferieur) return Number(inferieur[1].replace(',', '.')) / 2
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// ---------- Format compact embarqué ----------

/** [code, nom, kcal, glucides, protéines, lipides, fibres | null, kcal_estimee 0/1] */
export type LigneCompacte = [string, string, number, number, number, number, number | null, 0 | 1]

export function versCompact(a: AlimentCiqual): LigneCompacte {
  return [a.code, a.nom, a.kcal, a.glucides, a.proteines, a.lipides, a.fibres, a.kcal_estimee ? 1 : 0]
}

export function depuisCompact(l: LigneCompacte): AlimentCiqual {
  return {
    code: l[0],
    nom: l[1],
    kcal: l[2],
    glucides: l[3],
    proteines: l[4],
    lipides: l[5],
    fibres: l[6],
    kcal_estimee: l[7] === 1,
  }
}

// ---------- Chargement paresseux ----------

let chargement: Promise<AlimentCiqual[]> | null = null

/** Charge la table au premier usage de la recherche, puis la garde en mémoire. */
export function chargerCiqual(): Promise<AlimentCiqual[]> {
  chargement ??= fetch(`${import.meta.env.BASE_URL}ciqual.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`Table CIQUAL indisponible (${r.status})`)
      return r.json() as Promise<{ lignes: LigneCompacte[] }>
    })
    .then((d) => d.lignes.map(depuisCompact))
    .catch((e: Error) => {
      chargement = null
      throw e
    })
  return chargement
}
