import { describe, expect, it } from 'vitest'
import { atwater, estSuspect, kjVersKcal, normaliser } from './nutrition.ts'

describe('§7.3 conversion d’énergie', () => {
  it('convertit les kilojoules : kcal = kJ / 4,184', () => {
    expect(kjVersKcal(4184)).toBe(1000)
    expect(kjVersKcal(544)).toBeCloseTo(130.019, 3)
  })

  it('utilise les kJ quand les kcal manquent, sans marquer l’énergie comme estimée', () => {
    const r = normaliser({ kj: 544, glucides: 28, proteines: 2.7, lipides: 0.3 })
    expect(r.ok && r.valeurs.kcal).toBeCloseTo(130.019, 3)
    expect(r.ok && r.kcal_estimee).toBe(false)
  })

  it('préfère les kcal déclarées aux kJ', () => {
    const r = normaliser({ kcal: 131, kj: 544, glucides: 28, proteines: 2.7, lipides: 0.3 })
    expect(r.ok && r.valeurs.kcal).toBe(131)
  })
})

describe('§7.3 reconstitution par Atwater', () => {
  it('kcal = 4 × protéines + 4 × glucides + 9 × lipides + 2 × fibres', () => {
    expect(atwater(10, 20, 5, 3)).toBe(40 + 80 + 45 + 6)
  })

  it('compte les fibres absentes pour 0', () => {
    expect(atwater(10, 20, 5, null)).toBe(165)
    expect(atwater(10, 20, 5)).toBe(165)
  })

  it('reconstitue l’énergie absente et marque kcal_estimee', () => {
    const r = normaliser({ glucides: 20, proteines: 10, lipides: 5, fibres: 3 })
    expect(r).toMatchObject({ ok: true, kcal_estimee: true, valeurs: { kcal: 171, fibres: 3 } })
    expect(r.ok && r.suspect).toBe(false)
  })
})

describe('§7.3 contrôle de cohérence', () => {
  it('est suspect au-delà de 20 % d’écart relatif', () => {
    expect(estSuspect(100, 120)).toBe(false) // 20 % exactement
    expect(estSuspect(100, 121)).toBe(true)
    expect(estSuspect(200, 150)).toBe(true)
  })

  it('n’est jamais suspect pour un écart absolu ≤ 10 kcal', () => {
    expect(estSuspect(3, 4)).toBe(false) // 33 % mais 1 kcal
    expect(estSuspect(40, 50)).toBe(false)
    expect(estSuspect(40, 50.1)).toBe(true)
  })

  it('traite la valeur déclarée à 0', () => {
    expect(estSuspect(0, 0)).toBe(false)
    expect(estSuspect(0, 10)).toBe(false)
    expect(estSuspect(0, 10.5)).toBe(true)
  })

  it('est calculé même quand l’énergie est fournie', () => {
    const r = normaliser({ kcal: 300, glucides: 20, proteines: 10, lipides: 5 })
    expect(r).toMatchObject({ ok: true, atwater: 165, suspect: true })
  })
})

describe('§7.3 bornes de validité', () => {
  const base = { glucides: 10, proteines: 10, lipides: 10 }

  it('accepte les bornes incluses', () => {
    expect(normaliser({ kcal: 0, glucides: 0, proteines: 0, lipides: 0 }).ok).toBe(true)
    expect(normaliser({ kcal: 900, glucides: 0, proteines: 0, lipides: 100 }).ok).toBe(true)
    expect(normaliser({ kcal: 400, glucides: 100, proteines: 0, lipides: 0, fibres: 100 }).ok).toBe(true)
  })

  it('refuse l’énergie hors de 0 à 900 kcal', () => {
    expect(normaliser({ ...base, kcal: 900.1 }).ok).toBe(false)
    expect(normaliser({ ...base, kcal: -1 }).ok).toBe(false)
  })

  it('refuse un nutriment hors de 0 à 100 g', () => {
    expect(normaliser({ ...base, glucides: 100.5 }).ok).toBe(false)
    expect(normaliser({ ...base, fibres: -0.1 }).ok).toBe(false)
  })

  it('tolère une somme protéines + glucides + lipides jusqu’à 105 g', () => {
    expect(normaliser({ kcal: 500, glucides: 50, proteines: 30, lipides: 25 }).ok).toBe(true)
    expect(normaliser({ kcal: 500, glucides: 50, proteines: 30, lipides: 25.1 }).ok).toBe(false)
  })

  it('refuse une énergie reconstituée hors bornes', () => {
    expect(normaliser({ glucides: 0, proteines: 5, lipides: 100 }).ok).toBe(false) // 920 kcal
  })

  it('exige glucides, protéines et lipides', () => {
    const r = normaliser({ kcal: 100, glucides: 10, proteines: 10 })
    expect(r).toEqual({ ok: false, erreurs: ['Lipides absents.'] })
  })
})
