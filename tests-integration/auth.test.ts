// Parcours d'authentification et de chiffrement contre le vrai projet. Lancé en local : npm run test:rls
// Un compte temporaire est créé en SQL (les inscriptions publiques sont fermées), puis supprimé
// avec toutes ses lignes à la fin.
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deverrouiller } from '../src/lib/auth.ts'
import { chiffrer, dechiffrer, deriverSecrets, versHex, type Chiffre } from '../src/lib/crypto.ts'
import { depotSupabase } from '../src/lib/depot.ts'
import { cleCourante } from '../src/lib/session.ts'
import { supabase } from '../src/lib/supabase.ts'
import type { Profil } from '../src/lib/types.ts'

const env = process.env
const id = crypto.randomUUID()
const email = `sayan-test-${id.slice(0, 8)}@noreply.github.com`
const motDePasse = versHex(crypto.getRandomValues(new Uint8Array(16)))

function sql(requete: string): string {
  return execFileSync(
    'psql',
    [
      `host=db.${env.SUPABASE_PROJECT_REF}.supabase.co port=5432 dbname=postgres user=postgres sslmode=require`,
      '-v', 'ON_ERROR_STOP=1', '-Atc', requete,
    ],
    { env: { ...env, PGPASSWORD: env.SUPABASE_DB_PASSWORD }, encoding: 'utf8' },
  ).trim()
}

beforeAll(async () => {
  const { secretAuth } = await deriverSecrets(motDePasse)
  sql(`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', '${id}', 'authenticated', 'authenticated', '${email}',
      extensions.crypt('${secretAuth}', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), '${id}', '${id}',
      jsonb_build_object('sub', '${id}', 'email', '${email}', 'email_verified', true),
      'email', now(), now(), now());
  `)
}, 30_000)

afterAll(async () => {
  await supabase.auth.signOut()
  sql(`delete from auth.users where id = '${id}'`)
  expect(sql(`select count(*) from public.profil where user_id = '${id}'`)).toBe('0')
})

describe('déverrouillage', () => {
  it('crée le témoin au premier déverrouillage si l’initialisation a été interrompue', async () => {
    expect(await deverrouiller(motDePasse, email)).toBe('ok')
    const verifier = sql(`select verifier from public.profil where user_id = '${id}'`)
    expect(Object.keys(JSON.parse(verifier)).sort()).toEqual(['data', 'iv'])
  }, 30_000)

  it('refuse un mauvais mot de passe', async () => {
    expect(await deverrouiller(`${motDePasse}x`, email)).toBe('mot_de_passe_incorrect')
  }, 30_000)

  it('accepte le bon mot de passe et vérifie le témoin', async () => {
    expect(await deverrouiller(motDePasse, email)).toBe('ok')
  }, 30_000)
})

describe('stockage chiffré', () => {
  it('le serveur ne stocke que du chiffré, relu et déchiffré par le client', async () => {
    const { error } = await supabase
      .from('poids')
      .insert({ date: '2026-09-30', payload: await chiffrer(cleCourante(), { kg: 72.4 }) })
    expect(error).toBeNull()

    const brut = sql(`select payload::text from public.poids where user_id = '${id}'`)
    expect(brut).not.toContain('72.4')
    expect(Object.keys(JSON.parse(brut)).sort()).toEqual(['data', 'iv'])

    const { data } = await supabase.from('poids').select('payload').single()
    expect(await dechiffrer(cleCourante(), data!.payload as Chiffre)).toEqual({ kg: 72.4 })
  })

  it('la couche de données chiffre, remplace et relit correctement', async () => {
    const vide = await depotSupabase.charger()
    expect(vide.profil).toBeNull() // payload {} : initialisation non terminée

    const profil: Profil = {
      sexe: 'femme',
      date_naissance: '1990-06-15',
      taille_cm: 168,
      poids_initial_kg: 70,
      niveau_activite: 'modere',
      objectif_calorique: 1500,
      date_debut: '2026-09-30',
    }
    await depotSupabase.enregistrerProfil(profil)
    await depotSupabase.enregistrerJalon('2026-10-01', 69)
    await depotSupabase.enregistrerJalon('2026-10-01', 68.5) // même mois : remplace
    await depotSupabase.enregistrerPesee('2026-09-30', 72.5) // même jour : remplace
    const aliment = await depotSupabase.ajouterAliment({
      nom: 'Riz blanc, cuit',
      marque: null,
      code_barres: null,
      source: 'ciqual',
      source_ref: '9102',
      kcal_100g: 130,
      glucides_100g: 28.2,
      proteines_100g: 2.7,
      lipides_100g: 0.3,
      fibres_100g: null,
      kcal_estimee: false,
    })
    await depotSupabase.ajouterEntrees([
      { date: '2026-09-30', aliment_id: aliment.id, grammes: 152.5 },
      { date: '2026-09-30', aliment_id: aliment.id, grammes: 20 },
    ])

    const d = await depotSupabase.charger()
    expect(d.profil).toEqual(profil)
    expect(d.jalons.map((j) => [j.mois, j.poids_cible_kg])).toEqual([['2026-10-01', 68.5]])
    expect(d.pesees.map((p) => [p.date, p.kg])).toEqual([['2026-09-30', 72.5]])
    expect(d.aliments[0]).toMatchObject({ nom: 'Riz blanc, cuit', kcal_100g: 130, fibres_100g: null })
    expect(d.entrees.map((e) => e.grammes).sort()).toEqual([152.5, 20].sort())

    const brut = sql(`select string_agg(payload::text, ' ') from public.entrees where user_id = '${id}'`)
    expect(brut).not.toContain(aliment.id)
    expect(brut).not.toContain('152.5')
  })

  it('un client anonyme ne lit aucune ligne alors que des lignes existent', async () => {
    expect(Number(sql(`select count(*) from public.poids where user_id = '${id}'`))).toBeGreaterThan(0)
    const anonyme = createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })
    for (const table of ['poids', 'profil']) {
      const { data } = await anonyme.from(table).select('*')
      expect(data ?? []).toHaveLength(0)
    }
  })
})
