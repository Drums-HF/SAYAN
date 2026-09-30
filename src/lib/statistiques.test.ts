import { describe, expect, it } from 'vitest'
import { TOTAUX_NULS, type Totaux } from './calculs.ts'
import { dernieresSemaines, derniersMois, evolutionPoids, joursRenseignes, moyennePlage, regularite } from './statistiques.ts'

const t = (kcal: number, proteines = 0): Totaux => ({ ...TOTAUX_NULS, kcal, proteines })

describe('moyennes', () => {
  const jours = new Map([
    ['2026-09-28', t(1400, 100)],
    ['2026-09-29', t(1600, 120)],
    ['2026-10-05', t(2000, 90)],
  ])

  it('moyenne les seuls jours renseignés (jamais un jour vide compté à 0)', () => {
    const m = moyennePlage(jours, { debut: '2026-09-28', fin: '2026-10-04' })
    expect(m).toMatchObject({ jours: 2, kcal: 1500, proteines: 110 })
  })

  it('indisponible sans jour renseigné', () => {
    expect(moyennePlage(jours, { debut: '2026-09-01', fin: '2026-09-07' })).toMatchObject({
      jours: 0,
      kcal: null,
      proteines: null,
    })
  })

  it('semaines du lundi au dimanche, mois calendaires', () => {
    expect(dernieresSemaines('2026-09-30', 2)).toEqual([
      { debut: '2026-09-28', fin: '2026-10-04' },
      { debut: '2026-09-21', fin: '2026-09-27' },
    ])
    expect(derniersMois('2026-09-30', 2)).toEqual([
      { debut: '2026-09-01', fin: '2026-09-30' },
      { debut: '2026-08-01', fin: '2026-08-31' },
    ])
  })
})

describe('régularité de la saisie', () => {
  it('compte les jours renseignés par mois, bornés au suivi et à aujourd’hui', () => {
    const jours = new Map([
      ['2026-08-20', t(1)],
      ['2026-08-21', t(1)],
      ['2026-09-01', t(1)],
      ['2026-10-02', t(1)],
    ])
    expect(regularite(jours, '2026-08-15', '2026-10-03')).toEqual([
      { mois: '2026-08-01', renseignes: 2, possibles: 17 },
      { mois: '2026-09-01', renseignes: 1, possibles: 30 },
      { mois: '2026-10-01', renseignes: 1, possibles: 3 },
    ])
  })
})

describe('synthèse de période', () => {
  it('évolution de la moyenne glissante entre le premier et le dernier point de la plage', () => {
    const points = [
      { date: '2026-09-20', kg: 82 },
      { date: '2026-09-24', kg: 81.8 },
      { date: '2026-09-30', kg: 81.4 },
    ]
    expect(evolutionPoids(points, { debut: '2026-09-24', fin: '2026-09-30' })).toBeCloseTo(-0.4, 12)
    expect(evolutionPoids(points, { debut: '2026-09-25', fin: '2026-09-30' })).toBeNull()
  })

  it('jours renseignés sur la plage', () => {
    const jours = new Map([
      ['2026-09-29', t(1)],
      ['2026-09-30', t(1)],
      ['2026-09-01', t(1)],
    ])
    expect(joursRenseignes(jours, { debut: '2026-09-24', fin: '2026-09-30' })).toEqual({ renseignes: 2, total: 7 })
  })
})
