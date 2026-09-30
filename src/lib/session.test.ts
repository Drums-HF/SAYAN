import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleCourante, creerVeille, DELAI_INACTIVITE_MS } from './session.ts'

describe('veille d’inactivité', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const minutes = (n: number) => n * 60 * 1000

  function veille() {
    const surExpiration = vi.fn()
    const v = creerVeille({ delaiMs: DELAI_INACTIVITE_MS, maintenant: () => Date.now(), surExpiration })
    return { v, surExpiration }
  }

  it('fixe le délai à 30 minutes', () => {
    expect(DELAI_INACTIVITE_MS).toBe(minutes(30))
  })

  it('expire après 30 minutes sans interaction', () => {
    const { surExpiration } = veille()
    vi.advanceTimersByTime(minutes(30) - 1)
    expect(surExpiration).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(surExpiration).toHaveBeenCalledOnce()
  })

  it('réarme le minuteur à chaque interaction', () => {
    const { v, surExpiration } = veille()
    vi.advanceTimersByTime(minutes(20))
    v.activite()
    vi.advanceTimersByTime(minutes(20))
    expect(surExpiration).not.toHaveBeenCalled()
    vi.advanceTimersByTime(minutes(10))
    expect(surExpiration).toHaveBeenCalledOnce()
  })

  it('expire au retour sur l’onglet si le délai est dépassé, même minuteur suspendu', () => {
    let horloge = 0
    const surExpiration = vi.fn()
    const v = creerVeille({ delaiMs: minutes(30), maintenant: () => horloge, surExpiration })
    horloge = minutes(29)
    v.controler()
    expect(surExpiration).not.toHaveBeenCalled()
    horloge = minutes(31)
    v.controler()
    expect(surExpiration).toHaveBeenCalledOnce()
  })

  it('n’expire qu’une fois', () => {
    const { v, surExpiration } = veille()
    vi.advanceTimersByTime(minutes(31))
    v.controler()
    v.activite()
    vi.advanceTimersByTime(minutes(31))
    expect(surExpiration).toHaveBeenCalledOnce()
  })
})

describe('clé en mémoire', () => {
  it('refuse l’accès tant qu’aucune clé n’est définie', () => {
    expect(() => cleCourante()).toThrow()
  })
})
