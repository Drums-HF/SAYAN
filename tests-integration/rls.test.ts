// Test RLS contre le vrai projet (SPEC §4, §12). Lancé en local : npm run test:rls
// Un client anonyme (clé publique) ne doit lire aucune ligne ni pouvoir écrire.
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

const url = process.env.VITE_SUPABASE_URL
const cle = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !cle) throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requis (.env.local)')

const anonyme = createClient(url, cle, { auth: { persistSession: false } })
const TABLES = ['aliments', 'entrees', 'poids', 'objectifs_mensuels', 'profil'] as const

describe('RLS : client anonyme', () => {
  for (const table of TABLES) {
    it(`ne lit aucune ligne de ${table}`, async () => {
      const { data, error } = await anonyme.from(table).select('*')
      // Soit l'accès est refusé, soit la réponse est vide : jamais une ligne.
      expect(error ?? data).not.toBeNull()
      expect(data ?? []).toHaveLength(0)
    })

    it(`ne peut pas écrire dans ${table}`, async () => {
      const { error } = await anonyme
        .from(table)
        .insert({ user_id: '00000000-0000-0000-0000-000000000000', payload: {} })
      expect(error).not.toBeNull()
    })
  }

  it('peut seulement savoir si le compte existe', async () => {
    const { data, error } = await anonyme.rpc('compte_existe')
    expect(error).toBeNull()
    expect(typeof data).toBe('boolean')
  })
})
