import { describe, expect, it } from 'vitest'
import { lireGrammes, lirePoids } from './validation.ts'

describe('§7.2 validation des grammes', () => {
  it('accepte une valeur strictement positive, une décimale au plus, jusqu’à 5 000 g inclus', () => {
    expect(lireGrammes('0,1')).toEqual({ ok: true, valeur: 0.1 })
    expect(lireGrammes('152.5')).toEqual({ ok: true, valeur: 152.5 })
    expect(lireGrammes('5000')).toEqual({ ok: true, valeur: 5000 })
  })

  it('refuse 0, les négatifs, plus d’une décimale et au-delà de 5 000 g', () => {
    for (const saisie of ['0', '0,0', '-5', '12,25', '5000,1', '6000', '', 'abc']) {
      expect(lireGrammes(saisie).ok).toBe(false)
    }
  })
})

describe('§7.8 validation du poids', () => {
  it('accepte 30 à 300 kg inclus, une décimale au plus', () => {
    expect(lirePoids('30')).toEqual({ ok: true, valeur: 30 })
    expect(lirePoids('72,4')).toEqual({ ok: true, valeur: 72.4 })
    expect(lirePoids('300')).toEqual({ ok: true, valeur: 300 })
  })

  it('refuse hors bornes et au-delà d’une décimale', () => {
    for (const saisie of ['29,9', '300,1', '72,45', '', 'x']) {
      expect(lirePoids(saisie).ok).toBe(false)
    }
  })
})
