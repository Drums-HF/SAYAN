import { createContext, useContext } from 'react'
import type { Aliment, Donnees, Entree, NouvelAliment, Profil } from './lib/types.ts'

export interface Actions {
  enregistrerProfil(profil: Profil): Promise<void>
  ajouterAliment(aliment: NouvelAliment): Promise<Aliment>
  modifierAliment(aliment: Aliment): Promise<Aliment>
  supprimerAliment(id: string): Promise<void>
  ajouterEntrees(entrees: Omit<Entree, 'id'>[]): Promise<void>
  modifierEntree(entree: Entree): Promise<void>
  supprimerEntree(id: string): Promise<void>
  enregistrerPesee(date: string, kg: number): Promise<void>
  supprimerPesee(id: string): Promise<void>
  enregistrerJalon(mois: string, kg: number): Promise<void>
  supprimerJalon(id: string): Promise<void>
  remplacerTout(donnees: Donnees & { profil: Profil }): Promise<void>
}

export const Contexte = createContext<{ donnees: Donnees; actions: Actions } | null>(null)

export function useDonnees(): Donnees {
  const valeur = useContext(Contexte)
  if (!valeur) throw new Error('useDonnees hors du fournisseur')
  return valeur.donnees
}

export function useActions(): Actions {
  const valeur = useContext(Contexte)
  if (!valeur) throw new Error('useActions hors du fournisseur')
  return valeur.actions
}

/** Profil complet : à n'utiliser qu'une fois l'initialisation terminée. */
export function useProfil(): Profil {
  const { profil } = useDonnees()
  if (!profil) throw new Error('Profil non initialisé')
  return profil
}
