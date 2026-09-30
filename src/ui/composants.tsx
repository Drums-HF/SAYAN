import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export function EnTete({ titre, retour, action }: { titre: string; retour?: boolean; action?: ReactNode }) {
  const naviguer = useNavigate()
  return (
    <header className="pile" style={{ gap: 4 }}>
      {retour && (
        <div>
          <button className="bouton lien" style={{ paddingLeft: 0 }} onClick={() => naviguer(-1)}>
            ‹ Retour
          </button>
        </div>
      )}
      <div className="entre" style={{ alignItems: 'center' }}>
        <h1>{titre}</h1>
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
}: {
  options: { valeur: T; libelle: string }[]
  valeur: T
  surChoix: (v: T) => void
}) {
  return (
    <div className="segments" role="tablist">
      {options.map((o) => (
        <button
          key={o.valeur}
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
