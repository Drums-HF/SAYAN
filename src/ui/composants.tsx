import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconeRetour } from './icones.tsx'

export function EnTete({
  titre,
  surtitre,
  retour,
  action,
}: {
  titre: string
  surtitre?: ReactNode
  retour?: boolean
  action?: ReactNode
}) {
  const naviguer = useNavigate()
  return (
    <header className="pile" style={{ gap: 10 }}>
      {retour && (
        <button className="bouton-rond" onClick={() => naviguer(-1)} aria-label="Retour">
          <IconeRetour />
        </button>
      )}
      <div className="entete">
        <div className="etire">
          {surtitre && <div className="surtitre">{surtitre}</div>}
          <h1>{titre}</h1>
        </div>
        {action}
      </div>
    </header>
  )
}

export function Chargement({ texte }: { texte?: string }) {
  return (
    <div className="ligne" style={{ justifyContent: 'center', padding: 24 }}>
      <span className="indicateur" />
      {texte && <span className="attenue">{texte}</span>}
    </div>
  )
}

export function Segments<T extends string>({
  options,
  valeur,
  surChoix,
  accentue,
}: {
  options: { valeur: T; libelle: string }[]
  valeur: T
  surChoix: (v: T) => void
  accentue?: boolean
}) {
  return (
    <div className={accentue ? 'segments accentue' : 'segments'} role="tablist">
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="tab"
          aria-selected={o.valeur === valeur}
          className={o.valeur === valeur ? 'actif' : ''}
          onClick={() => surChoix(o.valeur)}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  )
}

export function Tuile({ libelle, valeur, unite, children }: { libelle: string; valeur: ReactNode; unite?: string; children?: ReactNode }) {
  return (
    <div className="tuile">
      <span className="libelle">{libelle}</span>
      <span className="valeur">
        {valeur}
        {unite && <small>{unite}</small>}
      </span>
      {children}
    </div>
  )
}

export function Barre({ fraction }: { fraction: number }) {
  const pourcent = Math.max(0, Math.min(1, fraction)) * 100
  return (
    <div className="barre" role="progressbar" aria-valuenow={Math.round(pourcent)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pourcent}%` }} />
    </div>
  )
}

/** Anneau de progression neutre : même couleur quel que soit le taux atteint (§9, §11). */
export function Anneau({ fraction, children }: { fraction: number; children: ReactNode }) {
  const rayon = 100
  const trait = 16
  const circonference = 2 * Math.PI * rayon
  const f = Math.max(0, Math.min(1, fraction))
  return (
    <div className="anneau" role="progressbar" aria-valuenow={Math.round(f * 100)} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox="0 0 232 232">
        <circle cx="116" cy="116" r={rayon} fill="none" stroke="var(--surface-raised)" strokeWidth={trait} />
        {f > 0 && (
          <circle
            cx="116"
            cy="116"
            r={rayon}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={trait}
            strokeLinecap="round"
            strokeDasharray={`${circonference * f} ${circonference}`}
          />
        )}
      </svg>
      <div className="centre-anneau">{children}</div>
    </div>
  )
}

export function ChampRecherche({
  valeur,
  surSaisie,
  placeholder = 'Rechercher',
  autoFocus,
}: {
  valeur: string
  surSaisie: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <input
      type="search"
      enterKeyHint="search"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      placeholder={placeholder}
      autoFocus={autoFocus}
      value={valeur}
      onChange={(e) => surSaisie(e.target.value)}
    />
  )
}
