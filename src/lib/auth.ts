// Authentification par mot de passe seul (SPEC §4) : l'identifiant Supabase est une adresse
// technique fixe, jamais affichée, qui ne reçoit aucun courrier (confirmation d'e-mail désactivée).
import {
  creerTemoin,
  chiffrer,
  deriverSecrets,
  verifierTemoin,
  type Chiffre,
  type Secrets,
} from './crypto.ts'
import { definirCle } from './session.ts'
import { supabase } from './supabase.ts'

export const EMAIL_TECHNIQUE = 'sayan@noreply.github.com'
export const LONGUEUR_MIN_MOT_DE_PASSE = 12

export async function compteExiste(): Promise<boolean> {
  const { data, error } = await supabase.rpc('compte_existe')
  if (error) throw new Error(`Supabase injoignable : ${error.message}`)
  return data === true
}

async function creerProfilVide(secrets: Secrets): Promise<void> {
  const { error } = await supabase.from('profil').insert({
    verifier: await creerTemoin(secrets.cle),
    payload: await chiffrer(secrets.cle, {}),
  })
  if (error) throw new Error(`Création du profil impossible : ${error.message}`)
}

export async function creerCompte(motDePasse: string, email = EMAIL_TECHNIQUE): Promise<void> {
  const secrets = await deriverSecrets(motDePasse)
  const { data, error } = await supabase.auth.signUp({
    email,
    password: secrets.secretAuth,
  })
  if (error) throw new Error(`Création du compte impossible : ${error.message}`)
  if (!data.session) {
    throw new Error('Création du compte impossible : la confirmation d’e-mail est activée dans Supabase.')
  }
  await creerProfilVide(secrets)
  definirCle(secrets.cle)
}

export type ResultatDeverrouillage = 'ok' | 'mot_de_passe_incorrect'

/** `email` n'est paramétrable que pour les tests d'intégration. */
export async function deverrouiller(
  motDePasse: string,
  email = EMAIL_TECHNIQUE,
): Promise<ResultatDeverrouillage> {
  const secrets = await deriverSecrets(motDePasse)
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: secrets.secretAuth,
  })
  if (error) {
    if (error.code === 'invalid_credentials') return 'mot_de_passe_incorrect'
    throw new Error(`Connexion impossible : ${error.message}`)
  }

  const { data, error: erreurProfil } = await supabase
    .from('profil')
    .select('verifier')
    .maybeSingle()
  if (erreurProfil) throw new Error(`Lecture du profil impossible : ${erreurProfil.message}`)

  if (!data) {
    // Initialisation interrompue après la création du compte : le mot de passe vient d'être
    // prouvé par la connexion, on crée le témoin maintenant.
    await creerProfilVide(secrets)
  } else if (!(await verifierTemoin(secrets.cle, data.verifier as Chiffre))) {
    await supabase.auth.signOut()
    return 'mot_de_passe_incorrect'
  }
  definirCle(secrets.cle)
  return 'ok'
}
