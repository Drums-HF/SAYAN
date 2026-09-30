// Modèle de données en clair côté client (SPEC §5).

export type Sexe = 'homme' | 'femme'
export type NiveauActivite = 'sedentaire' | 'leger' | 'modere' | 'actif' | 'tres_actif'
export type Source = 'openfoodfacts' | 'ciqual' | 'manuel'

/** Contenu de `profil.payload`, chiffré. */
export interface Profil {
  sexe: Sexe
  date_naissance: string
  taille_cm: number
  poids_initial_kg: number
  niveau_activite: NiveauActivite
  objectif_calorique: number
  objectif_proteines_g?: number
  date_debut: string
  dernier_export?: string
}

/** Catalogue, en clair. */
export interface Aliment {
  id: string
  nom: string
  marque: string | null
  code_barres: string | null
  source: Source
  source_ref: string | null
  kcal_100g: number
  glucides_100g: number
  proteines_100g: number
  lipides_100g: number
  fibres_100g: number | null
  kcal_estimee: boolean
  archive: boolean
  created_at: string
}

export type NouvelAliment = Omit<Aliment, 'id' | 'created_at' | 'archive'>

/** Journal : date en clair, { aliment_id, grammes } chiffré. */
export interface Entree {
  id: string
  date: string
  aliment_id: string
  grammes: number
}

/** Pesée : date en clair, { kg } chiffré. */
export interface Pesee {
  id: string
  date: string
  kg: number
}

/** Jalon mensuel : premier jour du mois en clair, { poids_cible_kg } chiffré. */
export interface Jalon {
  id: string
  mois: string
  poids_cible_kg: number
}

export interface Donnees {
  /** null tant que l'initialisation (étape profil) n'est pas terminée. */
  profil: Profil | null
  aliments: Aliment[]
  entrees: Entree[]
  pesees: Pesee[]
  jalons: Jalon[]
}

export const NIVEAUX: { valeur: NiveauActivite; libelle: string }[] = [
  { valeur: 'sedentaire', libelle: 'Sédentaire' },
  { valeur: 'leger', libelle: 'Léger (1 à 3 séances par semaine)' },
  { valeur: 'modere', libelle: 'Modéré (3 à 5 séances par semaine)' },
  { valeur: 'actif', libelle: 'Actif (6 à 7 séances par semaine)' },
  { valeur: 'tres_actif', libelle: 'Très actif (travail physique et sport)' },
]
