import { describe, expect, it } from 'vitest'
import {
  chiffrer,
  creerTemoin,
  dechiffrer,
  depuisBase64,
  deriverBits,
  deriverSecrets,
  ITERATIONS,
  verifierTemoin,
  versHex,
} from './crypto.ts'

describe('dérivation des clés', () => {
  it('utilise 600 000 itérations', () => {
    expect(ITERATIONS).toBe(600_000)
  })

  it('est déterministe et produit un secret_auth hexadécimal de 64 caractères', async () => {
    const a = await deriverSecrets('mot de passe correct', 1000)
    const b = await deriverSecrets('mot de passe correct', 1000)
    expect(a.secretAuth).toMatch(/^[0-9a-f]{64}$/)
    expect(a.secretAuth).toBe(b.secretAuth)
  })

  it('produit une clé de chiffrement non exportable', async () => {
    const { cle } = await deriverSecrets('mot de passe correct', 1000)
    expect(cle.extractable).toBe(false)
    expect(cle.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 })
  })

  it('dérive deux secrets indépendants (sels distincts)', async () => {
    const auth = await deriverBits('mot de passe correct', 'auth', 1000)
    const enc = await deriverBits('mot de passe correct', 'enc', 1000)
    expect(versHex(auth)).not.toBe(versHex(enc))
    const { secretAuth } = await deriverSecrets('mot de passe correct', 1000)
    expect(secretAuth).toBe(versHex(auth))
  })

  it('secret_auth ne permet pas de déchiffrer', async () => {
    const { cle } = await deriverSecrets('mot de passe correct', 1000)
    const chiffre = await chiffrer(cle, { kg: 72.4 })
    const auth = await deriverBits('mot de passe correct', 'auth', 1000)
    const cleDepuisAuth = await crypto.subtle.importKey('raw', auth.slice(), 'AES-GCM', false, [
      'decrypt',
    ])
    await expect(dechiffrer(cleDepuisAuth, chiffre)).rejects.toThrow()
  })

  it('dérive en 600 000 itérations la même clé que deriverBits', async () => {
    const { secretAuth } = await deriverSecrets('abc', ITERATIONS)
    expect(secretAuth).toBe(versHex(await deriverBits('abc', 'auth')))
  }, 30_000)
})

describe('chiffrement des enregistrements', () => {
  it('fait l’aller-retour d’un objet JSON complet', async () => {
    const { cle } = await deriverSecrets('mdp', 1000)
    const objet = { aliment_id: 'b3c1', grammes: 152.5, liste: [1, 'a', null] }
    const chiffre = await chiffrer(cle, objet)
    expect(Object.keys(chiffre).sort()).toEqual(['data', 'iv'])
    expect(depuisBase64(chiffre.iv)).toHaveLength(12)
    expect(chiffre.data).not.toContain('152')
    expect(await dechiffrer(cle, chiffre)).toEqual(objet)
  })

  it('rejette un mauvais mot de passe', async () => {
    const bon = await deriverSecrets('le bon mot de passe', 1000)
    const mauvais = await deriverSecrets('le mauvais mot de passe', 1000)
    const temoin = await creerTemoin(bon.cle)
    expect(await verifierTemoin(bon.cle, temoin)).toBe(true)
    expect(await verifierTemoin(mauvais.cle, temoin)).toBe(false)
    await expect(dechiffrer(mauvais.cle, await chiffrer(bon.cle, { kg: 80 }))).rejects.toThrow()
  })

  it('rejette un chiffré altéré', async () => {
    const { cle } = await deriverSecrets('mdp', 1000)
    const chiffre = await chiffrer(cle, { kg: 80 })
    const octets = depuisBase64(chiffre.data)
    octets[0] ^= 1
    const altere = { ...chiffre, data: btoa(String.fromCharCode(...octets)) }
    await expect(dechiffrer(cle, altere)).rejects.toThrow()
  })

  it('ne réutilise jamais un IV sur un grand volume', async () => {
    const { cle } = await deriverSecrets('mdp', 1000)
    const ivs = new Set<string>()
    const n = 20_000
    for (let i = 0; i < n; i++) ivs.add((await chiffrer(cle, i)).iv)
    expect(ivs.size).toBe(n)
  }, 60_000)
})
