import { describe, expect, it } from 'vitest'
import {
  ageRevolu,
  ajouterJours,
  ajouterMois,
  dateParDefaut,
  dernierJourDuMois,
  ecartJours,
  estDateValide,
  lundi,
  moisInitiaux,
  plageJours,
} from './dates.ts'

describe('jalons initiaux', () => {
  it('couvrent le mois en cours et les cinq suivants', () => {
    expect(moisInitiaux('2026-09-30')).toEqual([
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
      '2027-02-01',
    ])
  })
})

const a = (texte: string) => new Date(texte) // heure locale

describe('§7.2 date par défaut d’une entrée', () => {
  it('propose aujourd’hui en journée et le soir', () => {
    expect(dateParDefaut(a('2026-09-30T21:30:00'))).toBe('2026-09-30')
    expect(dateParDefaut(a('2026-09-30T04:00:00'))).toBe('2026-09-30')
    expect(dateParDefaut(a('2026-09-30T23:59:59'))).toBe('2026-09-30')
  })

  it('propose la veille entre 00h00 incluse et 04h00 exclue', () => {
    expect(dateParDefaut(a('2026-10-01T00:00:00'))).toBe('2026-09-30')
    expect(dateParDefaut(a('2026-10-01T03:59:59'))).toBe('2026-09-30')
    expect(dateParDefaut(a('2027-01-01T01:00:00'))).toBe('2026-12-31')
  })
})

describe('§7.4 âge en années révolues', () => {
  it('s’incrémente le jour de l’anniversaire', () => {
    expect(ageRevolu('1990-06-15', '2026-06-14')).toBe(35)
    expect(ageRevolu('1990-06-15', '2026-06-15')).toBe(36)
  })

  it('né un 29 février : anniversaire le 1er mars les années non bissextiles', () => {
    expect(ageRevolu('2000-02-29', '2026-02-28')).toBe(25)
    expect(ageRevolu('2000-02-29', '2026-03-01')).toBe(26)
    expect(ageRevolu('2000-02-29', '2028-02-29')).toBe(28)
  })

  it('est calculé au jour demandé, y compris dans le passé', () => {
    expect(ageRevolu('1990-06-15', '2020-01-01')).toBe(29)
  })
})

describe('arithmétique des dates', () => {
  it('ajoute des jours à travers les changements d’heure et les années', () => {
    expect(ajouterJours('2026-10-25', 1)).toBe('2026-10-26')
    expect(ajouterJours('2026-03-29', -1)).toBe('2026-03-28')
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01')
    expect(ecartJours('2026-01-01', '2026-12-31')).toBe(364)
  })

  it('calcule le dernier jour du mois', () => {
    expect(dernierJourDuMois('2026-02-10')).toBe('2026-02-28')
    expect(dernierJourDuMois('2028-02-01')).toBe('2028-02-29')
    expect(dernierJourDuMois('2026-12-05')).toBe('2026-12-31')
  })

  it('décale des mois', () => {
    expect(ajouterMois('2026-09-30', 1)).toBe('2026-10-01')
    expect(ajouterMois('2026-09-01', 4)).toBe('2027-01-01')
    expect(ajouterMois('2026-01-01', -1)).toBe('2025-12-01')
  })

  it('énumère une plage bornes incluses et trouve le lundi', () => {
    expect(plageJours('2026-09-28', '2026-10-01')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
    ])
    expect(lundi('2026-10-04')).toBe('2026-09-28') // dimanche
    expect(lundi('2026-09-28')).toBe('2026-09-28')
  })

  it('valide les dates', () => {
    expect(estDateValide('2026-02-29')).toBe(false)
    expect(estDateValide('2028-02-29')).toBe(true)
    expect(estDateValide('2026-13-01')).toBe(false)
  })
})
