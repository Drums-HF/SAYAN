// Convertit la table CIQUAL (.xlsx de l'ANSES) en JSON compact embarqué : public/ciqual.json.
// Usage : node scripts/build-ciqual.ts data/ciqual-2025.xlsx
// Source : https://ciqual.anses.fr — Licence Ouverte Etalab.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import {
  lireValeurCiqual,
  selectionnerVariantesCuites,
  versCompact,
  type AlimentCiqual,
} from '../src/lib/ciqual.ts'
import { normaliser } from '../src/lib/nutrition.ts'

const fichier = process.argv[2]
if (!fichier) throw new Error('Usage : node scripts/build-ciqual.ts <table.xlsx>')

// ---------- Lecture minimale du .xlsx (archive zip de XML), sans dépendance ----------

const lire = (chemin: string) =>
  execFileSync('unzip', ['-p', fichier, chemin], { encoding: 'utf8', maxBuffer: 1 << 28 })

const entites = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

const chaines = [...lire('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  entites([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
)

const lignes: Record<string, string>[] = []
for (const ligne of lire('xl/worksheets/sheet1.xml').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
  const cellules: Record<string, string> = {}
  for (const c of ligne[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, colonne, attributs, contenu = ''] = c
    const v = contenu.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? contenu.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1]
    if (v !== undefined) cellules[colonne] = /t="s"/.test(attributs) ? chaines[Number(v)] : entites(v)
  }
  lignes.push(cellules)
}

// ---------- Colonnes utiles, repérées par leur en-tête ----------

const entete = Object.fromEntries(
  Object.entries(lignes[0]).map(([col, titre]) => [col, titre.replace(/\s+/g, ' ').trim()]),
)
function colonne(motif: RegExp): string {
  const trouvee = Object.entries(entete).find(([, titre]) => motif.test(titre))
  if (!trouvee) throw new Error(`Colonne introuvable : ${motif}`)
  return trouvee[0]
}
const COL = {
  sousGroupe: colonne(/^alim_ssgrp_code$/),
  code: colonne(/^alim_code$/),
  nom: colonne(/^alim_nom_fr$/),
  kcal: colonne(/^Energie, Règlement UE N° 1169 2011 \(kcal 100 g\)$/),
  kj: colonne(/^Energie, Règlement UE N° 1169 2011 \(kJ 100 g\)$/),
  proteines: colonne(/^Protéines, N x facteur de Jones/),
  glucides: colonne(/^Glucides \(g 100 g\)$/),
  lipides: colonne(/^Lipides \(g 100 g\)$/),
  fibres: colonne(/^Fibres alimentaires/),
}

// ---------- Conversion ----------

const exclus: string[] = []
const aliments: (AlimentCiqual & { sousGroupe: string })[] = []

for (const l of lignes.slice(1)) {
  const nom = l[COL.nom]?.trim()
  if (!nom) continue
  const r = normaliser({
    kcal: lireValeurCiqual(l[COL.kcal]),
    kj: lireValeurCiqual(l[COL.kj]),
    glucides: lireValeurCiqual(l[COL.glucides]),
    proteines: lireValeurCiqual(l[COL.proteines]),
    lipides: lireValeurCiqual(l[COL.lipides]),
    fibres: lireValeurCiqual(l[COL.fibres]),
  })
  if (!r.ok) {
    exclus.push(`${l[COL.code]} ${nom} : ${r.erreurs.join(' ')}`)
    continue
  }
  aliments.push({
    code: l[COL.code],
    nom,
    sousGroupe: l[COL.sousGroupe] ?? '',
    kcal: r.valeurs.kcal,
    glucides: r.valeurs.glucides,
    proteines: r.valeurs.proteines,
    lipides: r.valeurs.lipides,
    fibres: r.valeurs.fibres,
    kcal_estimee: r.kcal_estimee,
  })
}

const retenus = selectionnerVariantesCuites(aliments).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

writeFileSync(
  'public/ciqual.json',
  JSON.stringify({
    source: 'ANSES, Table de composition nutritionnelle des aliments Ciqual 2025 (Licence Ouverte Etalab)',
    format: ['code', 'nom', 'kcal', 'glucides', 'proteines', 'lipides', 'fibres', 'kcal_estimee'],
    lignes: retenus.map(versCompact),
  }),
)

console.log(`${lignes.length - 1} lignes lues`)
console.log(`${exclus.length} exclues (valeurs absentes ou hors bornes)`)
console.log(`${aliments.length - retenus.length} variantes crues ou concurrentes masquées`)
console.log(`${retenus.length} aliments écrits dans public/ciqual.json`)
