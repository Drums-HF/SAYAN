// Export en clair et restauration (SPEC §10). L'export est l'unique sauvegarde en cas de perte
// du mot de passe : il contient toutes les données, déchiffrées.
import { estDateValide } from './dates.ts'
import type { Aliment, Donnees, Entree, Jalon, Pesee, Profil } from './types.ts'
import { creerZip } from './zip.ts'

export const FORMAT_EXPORT = 'sayan-export'
export const VERSION_EXPORT = 1

export interface Export {
  format: typeof FORMAT_EXPORT
  version: number
  date_export: string
  profil: Profil
  aliments: Aliment[]
  entrees: Entree[]
  pesees: Pesee[]
  jalons: Jalon[]
}

export function creerExport(donnees: Donnees & { profil: Profil }, dateExport: string): Export {
  return {
    format: FORMAT_EXPORT,
    version: VERSION_EXPORT,
    date_export: dateExport,
    profil: donnees.profil,
    aliments: donnees.aliments,
    entrees: donnees.entrees,
    pesees: donnees.pesees,
    jalons: donnees.jalons,
  }
}

// ---------- CSV ----------

/** Nombres au format français, séparateur « ; » : lisible tel quel dans un tableur français. */
function cellule(v: unknown): string {
  if (v === null || v === undefined) return ''
  const texte = typeof v === 'number' ? String(v).replace('.', ',') : String(v)
  return /[;"\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte
}

export function versCsv(colonnes: string[], lignes: unknown[][]): string {
  return '﻿' + [colonnes, ...lignes].map((l) => l.map(cellule).join(';')).join('\r\n') + '\r\n'
}

export function fichiersCsv(e: Export): { nom: string; contenu: string }[] {
  const noms = new Map(e.aliments.map((a) => [a.id, a.nom]))
  const colonnesAliment: (keyof Aliment)[] = [
    'id',
    'nom',
    'marque',
    'code_barres',
    'source',
    'source_ref',
    'kcal_100g',
    'glucides_100g',
    'proteines_100g',
    'lipides_100g',
    'fibres_100g',
    'kcal_estimee',
    'archive',
    'created_at',
  ]
  return [
    { nom: 'aliments.csv', contenu: versCsv(colonnesAliment, e.aliments.map((a) => colonnesAliment.map((c) => a[c]))) },
    {
      nom: 'entrees.csv',
      contenu: versCsv(
        ['id', 'date', 'aliment_id', 'aliment', 'grammes'],
        e.entrees.map((x) => [x.id, x.date, x.aliment_id, noms.get(x.aliment_id) ?? '', x.grammes]),
      ),
    },
    { nom: 'pesees.csv', contenu: versCsv(['id', 'date', 'kg'], e.pesees.map((p) => [p.id, p.date, p.kg])) },
    {
      nom: 'objectifs_mensuels.csv',
      contenu: versCsv(['id', 'mois', 'poids_cible_kg'], e.jalons.map((j) => [j.id, j.mois, j.poids_cible_kg])),
    },
    {
      nom: 'profil.csv',
      contenu: versCsv(['cle', 'valeur'], Object.entries(e.profil).map(([cle, valeur]) => [cle, valeur])),
    },
  ]
}

export function zipCsv(e: Export): Uint8Array<ArrayBuffer> {
  return creerZip(fichiersCsv(e))
}

// ---------- Import ----------

export type LectureExport = { ok: true; export: Export } | { ok: false; message: string }

const estNombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const estTexte = (v: unknown): v is string => typeof v === 'string'

function verifierProfil(p: unknown): p is Profil {
  if (!p || typeof p !== 'object') return false
  const x = p as Record<string, unknown>
  return (
    (x.sexe === 'homme' || x.sexe === 'femme') &&
    estTexte(x.date_naissance) &&
    estDateValide(x.date_naissance) &&
    estNombre(x.taille_cm) &&
    estNombre(x.poids_initial_kg) &&
    ['sedentaire', 'leger', 'modere', 'actif', 'tres_actif'].includes(x.niveau_activite as string) &&
    estNombre(x.objectif_calorique) &&
    (x.objectif_proteines_g === undefined || estNombre(x.objectif_proteines_g)) &&
    estTexte(x.date_debut) &&
    estDateValide(x.date_debut)
  )
}

/** Vérifie la structure complète d'un fichier d'export avant toute restauration. */
export function lireExport(texte: string): LectureExport {
  let brut: unknown
  try {
    brut = JSON.parse(texte)
  } catch {
    return { ok: false, message: 'Fichier illisible : JSON attendu.' }
  }
  const e = brut as Partial<Export>
  if (!e || e.format !== FORMAT_EXPORT) return { ok: false, message: 'Fichier non reconnu : export SAYAN attendu.' }
  if (e.version !== VERSION_EXPORT) return { ok: false, message: `Version d’export non prise en charge : ${e.version}.` }
  if (!verifierProfil(e.profil)) return { ok: false, message: 'Profil absent ou incomplet.' }
  if (![e.aliments, e.entrees, e.pesees, e.jalons].every(Array.isArray)) {
    return { ok: false, message: 'Tables absentes du fichier.' }
  }

  const ids = new Set<string>()
  for (const a of e.aliments!) {
    if (
      !estTexte(a.id) ||
      !estTexte(a.nom) ||
      !['openfoodfacts', 'ciqual', 'manuel'].includes(a.source) ||
      ![a.kcal_100g, a.glucides_100g, a.proteines_100g, a.lipides_100g].every(estNombre) ||
      !(a.fibres_100g === null || estNombre(a.fibres_100g))
    ) {
      return { ok: false, message: `Aliment invalide : ${a?.nom ?? a?.id ?? '?'}.` }
    }
    ids.add(a.id)
  }
  for (const x of e.entrees!) {
    if (!estTexte(x.id) || !estDateValide(x.date) || !estNombre(x.grammes) || !ids.has(x.aliment_id)) {
      return { ok: false, message: `Entrée invalide du ${x?.date ?? '?'}.` }
    }
  }
  const datesPesees = new Set<string>()
  for (const p of e.pesees!) {
    if (!estTexte(p.id) || !estDateValide(p.date) || !estNombre(p.kg) || datesPesees.has(p.date)) {
      return { ok: false, message: `Pesée invalide du ${p?.date ?? '?'}.` }
    }
    datesPesees.add(p.date)
  }
  for (const j of e.jalons!) {
    if (!estTexte(j.id) || !estDateValide(j.mois) || !j.mois.endsWith('-01') || !estNombre(j.poids_cible_kg)) {
      return { ok: false, message: `Jalon invalide : ${j?.mois ?? '?'}.` }
    }
  }
  return { ok: true, export: e as Export }
}

// ---------- Téléchargement ----------

export function telecharger(nom: string, contenu: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }))
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
