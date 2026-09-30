// Icônes fonctionnelles (navigation et commandes), tracé simple à la couleur du texte.
import type { ReactNode } from 'react'

function Icone({ taille = 22, children }: { taille?: number; children: ReactNode }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconeJournal = () => (
  <Icone>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
  </Icone>
)

export const IconePesee = () => (
  <Icone>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M8 9.5a5 5 0 0 1 8 0" />
    <path d="m12 11 1.5-2.5" />
  </Icone>
)

export const IconeStats = () => (
  <Icone>
    <path d="M5 20V12M10 20V5M15 20v-9M20 20V8" />
  </Icone>
)

export const IconeCatalogue = () => (
  <Icone>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </Icone>
)

export const IconePlus = ({ taille = 24 }: { taille?: number }) => (
  <Icone taille={taille}>
    <path d="M12 5v14M5 12h14" strokeWidth={2.2} />
  </Icone>
)

export const IconeReglages = () => (
  <Icone>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Icone>
)

export const IconeFermer = () => (
  <Icone>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icone>
)

export const IconeRetour = () => (
  <Icone>
    <path d="m15 5-7 7 7 7" />
  </Icone>
)

export const IconeSuivant = () => (
  <Icone taille={18}>
    <path d="m9 5 7 7-7 7" />
  </Icone>
)

export const IconePrecedent = () => (
  <Icone taille={18}>
    <path d="m15 5-7 7 7 7" />
  </Icone>
)

export const IconeCodeBarres = () => (
  <Icone>
    <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" />
    <path d="M8 8v8M11 8v8M14 8v8M17 8v8" />
  </Icone>
)
