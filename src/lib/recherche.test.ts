import { describe, expect, it } from 'vitest'
import { distance, indexer, normaliserTexte, rechercher } from './recherche.ts'

const NOMS = [
  'Riz blanc, cuit, sans sel ajouté',
  'Riz complet, cuit, sans sel ajouté',
  'Haricot vert, bouilli/cuit à l’eau',
  'Pomme de terre, bouillie/cuite à l’eau',
  'Pomme, crue',
  'Œuf, dur',
  'Épinard, bouilli/cuit à l’eau',
  'Pâtes sèches, standard, cuites, sans sel ajouté',
  'Banane, pulpe, crue',
  'Tomate ronde, crue',
]
const index = indexer(NOMS, (n) => n)
const chercher = (q: string) => rechercher(index, q)

describe('normalisation', () => {
  it('ignore la casse, les accents et les ligatures', () => {
    expect(normaliserTexte('Épinard À l’EAU')).toBe('epinard a l eau')
    expect(normaliserTexte('Œuf')).toBe('oeuf')
  })
})

describe('distance d’édition', () => {
  it('compte substitutions, insertions, suppressions et transpositions', () => {
    expect(distance('banane', 'banane')).toBe(0)
    expect(distance('banane', 'bananne')).toBe(1)
    expect(distance('tomate', 'tomtae')).toBe(1)
    expect(distance('haricot', 'aricot')).toBe(1)
    expect(distance('riz', 'pomme')).toBeGreaterThan(2)
  })
})

describe('recherche', () => {
  it('est insensible à la casse et aux accents', () => {
    expect(chercher('EPINARD')[0]).toBe('Épinard, bouilli/cuit à l’eau')
    expect(chercher('pates')[0]).toBe('Pâtes sèches, standard, cuites, sans sel ajouté')
    expect(chercher('oeuf')[0]).toBe('Œuf, dur')
  })

  it('tolère les fautes légères', () => {
    expect(chercher('bananne')[0]).toBe('Banane, pulpe, crue')
    expect(chercher('tomtae')[0]).toBe('Tomate ronde, crue')
    expect(chercher('aricot vert')[0]).toBe('Haricot vert, bouilli/cuit à l’eau')
  })

  it('exige que chaque mot tapé corresponde', () => {
    expect(chercher('riz complet')).toEqual(['Riz complet, cuit, sans sel ajouté'])
    expect(chercher('riz banane')).toEqual([])
  })

  it('trouve pendant la frappe (préfixe)', () => {
    expect(chercher('pom')).toEqual(['Pomme, crue', 'Pomme de terre, bouillie/cuite à l’eau'])
  })

  it('classe le nom commençant par le mot tapé avant les autres', () => {
    const r = rechercher(indexer(['Sauce tomate', 'Tomate ronde, crue'], (n) => n), 'tomate')
    expect(r[0]).toBe('Tomate ronde, crue')
  })

  it('départage les ex æquo (fréquence d’usage)', () => {
    const r = rechercher(index, 'riz', { departage: (n) => (n.includes('complet') ? 10 : 0) })
    expect(r[0]).toBe('Riz complet, cuit, sans sel ajouté')
  })

  it('ne rejette pas les mots courts exacts, sans tolérance', () => {
    expect(chercher('riz')).toHaveLength(2)
    expect(chercher('rix')).toEqual([])
  })
})
