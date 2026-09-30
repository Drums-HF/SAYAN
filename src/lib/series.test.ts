import { describe, expect, it } from 'vitest'
import { fenetrePoids, serieJournaliere, seriePoids } from './series.ts'
import type { Jalon, Pesee, Profil } from './types.ts'

const PROFIL: Profil = {
  sexe: 'femme',
  date_naissance: '1990-01-01',
  taille_cm: 165,
  poids_initial_kg: 70,
  niveau_activite: 'leger',
  objectif_calorique: 1500,
  date_debut: '2026-09-01',
}
const JALONS: Jalon[] = [{ id: 'a', mois: '2026-10-01', poids_cible_kg: 68 }]
const p = (date: string, kg: number): Pesee => ({ id: date, date, kg })

describe('séries du graphique de poids', () => {
  it('superpose brut, moyenne glissante, trajectoire et jalons', () => {
    const pesees = [p('2026-09-01', 70), p('2026-09-02', 69.8), p('2026-09-03', 69.9)]
    const s = seriePoids(pesees, PROFIL, JALONS, '2026-09-01', '2026-10-31')
    expect(s.find((l) => l.date === '2026-09-03')).toMatchObject({ brut: 69.9, lisse: 69.9 })
    expect(s.find((l) => l.date === '2026-09-02')).not.toHaveProperty('lisse') // moins de 3 pesées
    expect(s.find((l) => l.date === '2026-09-01')).toMatchObject({ theorique: 70 })
    expect(s.find((l) => l.date === '2026-10-31')).toMatchObject({ theorique: 68, jalon: 68 })
  })

  it('coupe la trajectoire aux bornes de la fenêtre', () => {
    const s = seriePoids([], PROFIL, JALONS, '2026-10-01', '2026-10-31')
    expect(s[0].date).toBe('2026-10-01')
    expect(s[0].theorique).toBeCloseTo(70 - 2 * (30 / 60), 12)
  })

  it('fenêtre : jusqu’au dernier jalon, période bornée par le début de l’historique', () => {
    expect(fenetrePoids([], PROFIL, JALONS, '2026-09-10', 'tout')).toEqual({ debut: '2026-09-01', fin: '2026-10-31' })
    expect(fenetrePoids([], PROFIL, JALONS, '2026-09-10', '1m')).toEqual({ debut: '2026-09-01', fin: '2026-10-31' })
    expect(fenetrePoids([], PROFIL, JALONS, '2026-12-15', '1m')).toEqual({ debut: '2026-11-15', fin: '2026-12-15' })
  })
})

describe('séries journalières', () => {
  it('laisse un trou pour un jour non renseigné, jamais 0', () => {
    const s = serieJournaliere('2026-09-01', '2026-09-03', (j) => (j === '2026-09-02' ? null : 10))
    expect(s.map((x) => x.valeur)).toEqual([10, undefined, 10])
    expect(s[1]).not.toHaveProperty('valeur')
  })
})
