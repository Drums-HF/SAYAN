import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configurationPresente = Boolean(url && cle)

// Session non persistée (SPEC §4) : chaque déverrouillage refait la connexion.
export const supabase = createClient(url || 'http://configuration-absente', cle || 'absente', {
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
})
