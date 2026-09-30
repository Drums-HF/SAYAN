import { describe, expect, it } from 'vitest'
import { salutation } from './salutation.ts'

const a = (heure: string) => new Date(`2026-09-30T${heure}`)

describe('salutation', () => {
  it('Bonjour de 4 h à 17 h 59', () => {
    expect(salutation(a('04:00:00'))).toBe('Bonjour')
    expect(salutation(a('12:00:00'))).toBe('Bonjour')
    expect(salutation(a('17:59:59'))).toBe('Bonjour')
  })

  it('Bonsoir de 18 h à 3 h 59', () => {
    expect(salutation(a('18:00:00'))).toBe('Bonsoir')
    expect(salutation(a('21:30:00'))).toBe('Bonsoir')
    expect(salutation(a('03:59:59'))).toBe('Bonsoir')
  })
})
