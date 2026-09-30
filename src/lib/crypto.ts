// Chiffrement de bout en bout (SPEC §4). Web Crypto uniquement.

export const ITERATIONS = 600_000
export const TEMOIN = 'sayan-verifier-v1'

export interface Chiffre {
  iv: string
  data: string
}

export interface Secrets {
  /** Mot de passe du compte Supabase : 256 bits en hexadécimal minuscule. */
  secretAuth: string
  /** Clé AES-GCM 256 bits, non exportable. Ne quitte jamais le navigateur. */
  cle: CryptoKey
}

const encodeur = new TextEncoder()
const decodeur = new TextDecoder()

async function sel(usage: 'auth' | 'enc'): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', encodeur.encode(`sayan-v1|${usage}`))
}

async function materiau(motDePasse: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encodeur.encode(motDePasse), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ])
}

function pbkdf2(salt: ArrayBuffer, iterations: number): Pbkdf2Params {
  return { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }
}

export function versHex(octets: Uint8Array): string {
  return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('')
}

/** Dérive les 256 bits bruts d'un usage. Exposé pour les tests d'indépendance. */
export async function deriverBits(
  motDePasse: string,
  usage: 'auth' | 'enc',
  iterations = ITERATIONS,
): Promise<Uint8Array> {
  const bits = await crypto.subtle.deriveBits(
    pbkdf2(await sel(usage), iterations),
    await materiau(motDePasse),
    256,
  )
  return new Uint8Array(bits)
}

export async function deriverSecrets(motDePasse: string, iterations = ITERATIONS): Promise<Secrets> {
  const base = await materiau(motDePasse)
  const [bitsAuth, cle] = await Promise.all([
    crypto.subtle.deriveBits(pbkdf2(await sel('auth'), iterations), base, 256),
    crypto.subtle.deriveKey(
      pbkdf2(await sel('enc'), iterations),
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    ),
  ])
  return { secretAuth: versHex(new Uint8Array(bitsAuth)), cle }
}

export function versBase64(octets: Uint8Array): string {
  let binaire = ''
  for (const o of octets) binaire += String.fromCharCode(o)
  return btoa(binaire)
}

export function depuisBase64(texte: string): Uint8Array<ArrayBuffer> {
  const binaire = atob(texte)
  const octets = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i)
  return octets
}

/** Chiffre un objet JSON complet. IV aléatoire de 12 octets à chaque appel. */
export async function chiffrer(cle: CryptoKey, valeur: unknown): Promise<Chiffre> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cle,
    encodeur.encode(JSON.stringify(valeur)),
  )
  return { iv: versBase64(iv), data: versBase64(new Uint8Array(data)) }
}

/** Déchiffre ; rejette si la clé est mauvaise ou le contenu altéré (échec GCM). */
export async function dechiffrer<T>(cle: CryptoKey, chiffre: Chiffre): Promise<T> {
  const clair = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: depuisBase64(chiffre.iv) },
    cle,
    depuisBase64(chiffre.data),
  )
  return JSON.parse(decodeur.decode(clair)) as T
}

export async function creerTemoin(cle: CryptoKey): Promise<Chiffre> {
  return chiffrer(cle, TEMOIN)
}

export async function verifierTemoin(cle: CryptoKey, temoin: Chiffre): Promise<boolean> {
  try {
    return (await dechiffrer<string>(cle, temoin)) === TEMOIN
  } catch {
    return false
  }
}
