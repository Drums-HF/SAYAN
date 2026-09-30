// Clé de chiffrement en mémoire uniquement (SPEC §4) et verrouillage après inactivité.
// Jamais de localStorage, sessionStorage, IndexedDB, cookie ni état sérialisable.

export const DELAI_INACTIVITE_MS = 30 * 60 * 1000

let cle: CryptoKey | null = null

export function definirCle(nouvelle: CryptoKey): void {
  cle = nouvelle
}

export function cleCourante(): CryptoKey {
  if (!cle) throw new Error('Application verrouillée')
  return cle
}

export interface Veille {
  /** À appeler à chaque interaction : réarme le minuteur. */
  activite(): void
  /** À appeler au retour sur l'onglet : expire si le délai est dépassé. */
  controler(): void
  arreter(): void
}

export function creerVeille(options: {
  delaiMs: number
  maintenant: () => number
  surExpiration: () => void
}): Veille {
  const { delaiMs, maintenant, surExpiration } = options
  let derniere = maintenant()
  let minuteur: ReturnType<typeof setTimeout> | undefined
  let expiree = false

  const expirer = () => {
    if (expiree) return
    expiree = true
    clearTimeout(minuteur)
    surExpiration()
  }
  const armer = () => {
    clearTimeout(minuteur)
    minuteur = setTimeout(expirer, delaiMs)
  }
  armer()

  return {
    activite() {
      if (expiree) return
      derniere = maintenant()
      armer()
    },
    controler() {
      if (maintenant() - derniere >= delaiMs) expirer()
    },
    arreter() {
      expiree = true
      clearTimeout(minuteur)
    },
  }
}

const EVENEMENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const

/** Branche la veille sur le document : rechargement complet à l'expiration. */
export function demarrerVeille(): () => void {
  const veille = creerVeille({
    delaiMs: DELAI_INACTIVITE_MS,
    maintenant: () => Date.now(),
    surExpiration: () => {
      cle = null
      window.location.reload()
    },
  })
  const surActivite = () => veille.activite()
  const surVisibilite = () => {
    if (document.visibilityState === 'visible') veille.controler()
  }
  for (const e of EVENEMENTS) window.addEventListener(e, surActivite, { passive: true, capture: true })
  document.addEventListener('visibilitychange', surVisibilite)
  return () => {
    veille.arreter()
    for (const e of EVENEMENTS) window.removeEventListener(e, surActivite, { capture: true })
    document.removeEventListener('visibilitychange', surVisibilite)
  }
}
