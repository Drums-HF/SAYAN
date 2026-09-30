// Données fictives pour l'aperçu de développement. Jamais chargées en production.
import { ajouterJours, ajouterMois, aujourdhui, premierJourDuMois } from '../lib/dates.ts'
import type { Aliment, Donnees, Entree, Jalon, Pesee } from '../lib/types.ts'

function aleatoire(graine: number) {
  let s = graine
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const base = (id: string, nom: string, v: [number, number, number, number, number | null]): Aliment => ({
  id,
  nom,
  marque: null,
  code_barres: null,
  source: 'ciqual',
  source_ref: null,
  kcal_100g: v[0],
  glucides_100g: v[1],
  proteines_100g: v[2],
  lipides_100g: v[3],
  fibres_100g: v[4],
  kcal_estimee: false,
  archive: false,
  created_at: '2026-06-01T00:00:00Z',
})

export const ALIMENTS: Aliment[] = [
  base('riz', 'Riz blanc, cuit', [130, 28.2, 2.7, 0.3, 0.4]),
  base('hv', 'Haricot vert, cuit', [29, 3.6, 1.9, 0.2, 3.3]),
  base('poulet', 'Poulet, filet, sans peau, cuit', [121, 0, 26.2, 1.8, 0]),
  base('pdt', 'Pomme de terre, cuite à l’eau', [80, 16.7, 1.8, 0.1, 1.8]),
  base('brocoli', 'Brocoli, cuit', [30, 2.2, 2.8, 0.5, 2.6]),
  base('saumon', 'Saumon, cuit à la vapeur', [199, 0, 23.5, 11.6, 0]),
  base('oeuf', 'Œuf, dur', [134, 0.8, 12.5, 9.1, 0]),
  base('lentilles', 'Lentille verte, bouillie/cuite à l’eau', [108, 13.8, 9, 0.6, 7.7]),
  {
    ...base('skyr', 'Skyr nature', [63, 4, 11, 0.2, null]),
    source: 'openfoodfacts',
    marque: 'Siggi’s',
    code_barres: '3033491234567',
  },
  { ...base('huile', 'Huile d’olive', [900, 0, 0, 100, 0]), source: 'manuel' },
  {
    ...base('pain', 'Pain complet maison', [248, 41, 9, 3.4, 7]),
    source: 'manuel',
    kcal_estimee: true,
  },
  { ...base('ancien', 'Pâtes au blé complet, cuites', [124, 23, 5, 0.9, 3.9]), archive: true },
]

const MENUS: [string, number][][] = [
  [['riz', 180], ['poulet', 150], ['hv', 200], ['huile', 8]],
  [['pdt', 250], ['saumon', 140], ['brocoli', 200]],
  [['lentilles', 220], ['oeuf', 110], ['hv', 150], ['pain', 60]],
  [['riz', 160], ['saumon', 120], ['brocoli', 180], ['skyr', 150]],
]

export function creerDonneesApercu(avecProfil = true): Donnees {
  const hasard = aleatoire(42)
  const fin = aujourdhui()
  const debut = ajouterJours(fin, -95)
  const entrees: Entree[] = []
  const pesees: Pesee[] = []
  let n = 0

  for (let i = 0; i <= 95; i++) {
    const jour = ajouterJours(debut, i)
    // Quelques oublis de saisie et de pesée.
    if (hasard() > 0.12 && jour !== fin) {
      const menu = MENUS[Math.floor(hasard() * MENUS.length)]
      for (const [aliment_id, g] of menu) {
        entrees.push({ id: `e${n++}`, date: jour, aliment_id, grammes: Math.round(g * (0.85 + hasard() * 0.3)) })
      }
    }
    if (hasard() > 0.18) {
      const tendance = 86 - i * 0.045
      const kg = Math.round((tendance + (hasard() - 0.5) * 1.4) * 10) / 10
      pesees.push({ id: `p${i}`, date: jour, kg })
    }
  }

  const premierMois = premierJourDuMois(debut)
  const jalons: Jalon[] = [0, 1, 2, 3, 4, 5].map((k) => ({
    id: `j${k}`,
    mois: ajouterMois(premierMois, k),
    poids_cible_kg: 85 - k * 1.5,
  }))

  return {
    profil: avecProfil
      ? {
          prenom: 'Alex',
          sexe: 'homme',
          date_naissance: '1988-02-29',
          taille_cm: 180,
          poids_initial_kg: 86.2,
          niveau_activite: 'actif',
          objectif_calorique: 1500,
          objectif_proteines_g: 120,
          date_debut: debut,
        }
      : null,
    aliments: ALIMENTS,
    entrees,
    pesees,
    jalons: avecProfil ? jalons : [],
  }
}
