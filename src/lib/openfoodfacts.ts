// Open Food Facts : produits emballés par code-barres saisi à la main (SPEC §6).
// Pas d'en-tête User-Agent (un navigateur ne permet pas de le définir) : l'application
// s'identifie par les paramètres app_name et app_version prévus par l'API.
import { normaliser, type ValeursSaisies } from './nutrition.ts'

export const APP_NAME = 'SAYAN'
export const APP_VERSION = '1.0'

export interface Prerempli {
  nom: string
  marque: string | null
  code_barres: string
  /** Photo du produit (affichage seulement, jamais stockée). */
  image: string | null
  kcal: number | null
  glucides: number | null
  proteines: number | null
  lipides: number | null
  fibres: number | null
}

export type ResultatOff =
  /** Produit exploitable : validation par l'utilisateur, contrôle de cohérence affiché. */
  | { type: 'produit'; prerempli: Prerempli; suspect: boolean }
  /** Produit introuvable, valeurs absentes ou aberrantes : formulaire manuel pré-rempli. */
  | { type: 'manuel'; prerempli: Prerempli; raison: string }

/** 8, 12 ou 13 chiffres (EAN-8, UPC-A, EAN-13). */
export function codeBarresValide(code: string): boolean {
  return /^(\d{8}|\d{12}|\d{13})$/.test(code)
}

export function urlProduit(code: string): string {
  const params = new URLSearchParams({
    fields: 'product_name,product_name_fr,brands,nutriments,image_front_small_url',
    app_name: APP_NAME,
    app_version: APP_VERSION,
  })
  return `https://world.openfoodfacts.org/api/v2/product/${code}.json?${params}`
}

function nombre(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function texte(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

interface ReponseOff {
  status?: number
  product?: {
    product_name?: unknown
    product_name_fr?: unknown
    brands?: unknown
    image_front_small_url?: unknown
    nutriments?: Record<string, unknown>
  }
}

/** Interprète la réponse de l'API (testé sur fixtures, sans réseau). */
export function interpreterReponse(code: string, reponse: ReponseOff | null): ResultatOff {
  const vide: Prerempli = {
    nom: '',
    marque: null,
    code_barres: code,
    image: null,
    kcal: null,
    glucides: null,
    proteines: null,
    lipides: null,
    fibres: null,
  }
  const produit = reponse?.product
  if (!reponse || reponse.status !== 1 || !produit) {
    return { type: 'manuel', prerempli: vide, raison: 'Produit introuvable sur Open Food Facts.' }
  }

  const n = produit.nutriments ?? {}
  const brutes: ValeursSaisies = {
    kcal: nombre(n['energy-kcal_100g']),
    // energy_100g est exprimée en kJ par Open Food Facts.
    kj: nombre(n['energy-kj_100g']) ?? nombre(n['energy_100g']),
    glucides: nombre(n['carbohydrates_100g']),
    proteines: nombre(n['proteins_100g']),
    lipides: nombre(n['fat_100g']),
    fibres: nombre(n['fiber_100g']),
  }
  const marque = texte(produit.brands)?.split(',')[0].trim() ?? null
  const nom = texte(produit.product_name_fr) ?? texte(produit.product_name) ?? ''
  const image = texte(produit.image_front_small_url)?.startsWith('https://') ? texte(produit.image_front_small_url) : null
  const r = normaliser(brutes)

  if (r.ok) {
    return {
      type: 'produit',
      prerempli: {
        nom,
        marque,
        code_barres: code,
        image,
        // Énergie reconstituée : laissée vide dans le formulaire, qui la recalcule par Atwater.
        kcal: r.kcal_estimee ? null : r.valeurs.kcal,
        glucides: r.valeurs.glucides,
        proteines: r.valeurs.proteines,
        lipides: r.valeurs.lipides,
        fibres: r.valeurs.fibres,
      },
      suspect: r.suspect,
    }
  }

  // Valeurs absentes ou aberrantes : on ne pré-remplit que ce qui est plausible.
  const plausible = (v: number | null | undefined, max: number) =>
    v !== null && v !== undefined && v >= 0 && v <= max ? v : null
  const kcal = brutes.kcal ?? (brutes.kj !== null && brutes.kj !== undefined ? brutes.kj / 4.184 : null)
  return {
    type: 'manuel',
    prerempli: {
      nom,
      marque,
      code_barres: code,
      image,
      kcal: plausible(kcal, 900),
      glucides: plausible(brutes.glucides, 100),
      proteines: plausible(brutes.proteines, 100),
      lipides: plausible(brutes.lipides, 100),
      fibres: plausible(brutes.fibres, 100),
    },
    raison: `Valeurs nutritionnelles incomplètes ou hors bornes sur Open Food Facts. ${r.erreurs.join(' ')}`,
  }
}

export async function chercherProduit(code: string, requeter: typeof fetch = fetch): Promise<ResultatOff> {
  let reponse: ReponseOff | null
  try {
    const r = await requeter(urlProduit(code))
    reponse = r.status === 404 ? null : ((await r.json()) as ReponseOff)
    if (!r.ok && r.status !== 404) throw new Error(String(r.status))
  } catch {
    return {
      type: 'manuel',
      prerempli: interpreterReponse(code, null).prerempli,
      raison: 'Open Food Facts injoignable.',
    }
  }
  return interpreterReponse(code, reponse)
}
