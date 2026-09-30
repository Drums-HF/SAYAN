import { describe, expect, it } from 'vitest'
import {
  arrondir,
  arrondirDizaine,
  formatEstimation,
  formatGrammes,
  formatKcal,
  formatKg,
  formatKgSigne,
  lireDecimal,
} from './nombres.ts'

const NNBSP = ' ' // espace fine insécable, séparateur des milliers fr-FR

describe('§7.1 arrondis', () => {
  it('arrondit les demi-valeurs en s’éloignant de zéro, symétriquement', () => {
    expect(arrondir(2.5)).toBe(3)
    expect(arrondir(-2.5)).toBe(-3)
    expect(arrondir(72.45, 1)).toBe(72.5)
    expect(arrondir(-72.45, 1)).toBe(-72.5)
    expect(arrondirDizaine(2485)).toBe(2490)
    expect(arrondirDizaine(-2485)).toBe(-2490)
  })

  it('corrige la représentation binaire des flottants', () => {
    expect(arrondir(1.05, 1)).toBe(1.1) // 1.05 vaut 1.0499999… en binaire
    expect(arrondir(1.005, 2)).toBe(1.01)
    expect(arrondir(0.1 + 0.2, 1)).toBe(0.3)
  })

  it('arrondit à la dizaine la plus proche', () => {
    expect(arrondirDizaine(2483.7)).toBe(2480)
    expect(arrondirDizaine(2484.999)).toBe(2480)
    expect(arrondirDizaine(4)).toBe(0)
    expect(arrondirDizaine(5)).toBe(10)
  })

  it('ne produit jamais −0', () => {
    expect(Object.is(arrondir(-0.04, 1), 0)).toBe(true)
    expect(Object.is(arrondirDizaine(-4), 0)).toBe(true)
  })

  it('arrondit les très petites et très grandes valeurs', () => {
    expect(arrondir(1e-7, 1)).toBe(0)
    expect(arrondir(1e21, 0)).toBe(1e21)
  })
})

describe('§7.1 formats d’affichage', () => {
  it('kcal : entier au plus proche', () => {
    expect(formatKcal(1523.5)).toBe(`1${NNBSP}524`)
    expect(formatKcal(129.4)).toBe('129')
  })

  it('macronutriments : une décimale', () => {
    expect(formatGrammes(12.25)).toBe('12,3')
    expect(formatGrammes(12)).toBe('12,0')
  })

  it('poids : une décimale', () => {
    expect(formatKg(72.449)).toBe('72,4')
    expect(formatKg(72.45)).toBe('72,5')
  })

  it('DEJ, MB, déficit : dizaine, présentés comme estimations', () => {
    expect(formatEstimation(2483.7)).toBe(`≈ 2${NNBSP}480`)
    expect(formatEstimation(-123)).toBe('≈ −120')
  })

  it('valeur signée en kg', () => {
    expect(formatKgSigne(0.44)).toBe('+0,4')
    expect(formatKgSigne(-1.25)).toBe('−1,3')
    expect(formatKgSigne(-0.04)).toBe('0,0')
  })
})

describe('lecture des saisies', () => {
  it('accepte la virgule et le point, une décimale au plus', () => {
    expect(lireDecimal('152,5')).toBe(152.5)
    expect(lireDecimal('152.5')).toBe(152.5)
    expect(lireDecimal(' 80 ')).toBe(80)
    expect(lireDecimal('1,25')).toBeNull()
    expect(lireDecimal('-3')).toBeNull()
    expect(lireDecimal('abc')).toBeNull()
    expect(lireDecimal('')).toBeNull()
    expect(lireDecimal('1,25', 2)).toBe(1.25)
  })
})
