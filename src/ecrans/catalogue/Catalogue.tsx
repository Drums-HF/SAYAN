import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDonnees } from '../../contexte.ts'
import { formatKcal } from '../../lib/nombres.ts'
import { indexer, rechercher } from '../../lib/recherche.ts'
import { LIBELLES_SOURCE, type Aliment, type Source } from '../../lib/types.ts'
import { ChampRecherche, EnTete, Segments } from '../../ui/composants.tsx'
import { IconeCodeBarres } from '../../ui/icones.tsx'

type Filtre = 'tous' | Source | 'archives'

const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: 'tous', libelle: 'Tous' },
  { valeur: 'ciqual', libelle: 'CIQUAL' },
  { valeur: 'openfoodfacts', libelle: 'Open Food Facts' },
  { valeur: 'manuel', libelle: 'Manuel' },
  { valeur: 'archives', libelle: 'Archivés' },
]

export default function Catalogue() {
  const { aliments } = useDonnees()
  const naviguer = useNavigate()
  const [requete, setRequete] = useState('')
  const [filtre, setFiltre] = useState<Filtre>('tous')

  const filtres = useMemo(
    () =>
      aliments
        .filter((a) => (filtre === 'archives' ? a.archive : !a.archive))
        .filter((a) => filtre === 'tous' || filtre === 'archives' || a.source === filtre)
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    [aliments, filtre],
  )
  const index = useMemo(() => indexer(filtres, (a) => `${a.nom} ${a.marque ?? ''}`), [filtres])
  const resultats = requete.trim() ? rechercher(index, requete) : filtres

  return (
    <div className="contenu">
      <EnTete titre="Catalogue" surtitre={`${filtres.length} aliment${filtres.length > 1 ? 's' : ''}`} />
      <div className="tuiles">
        <Link className="bouton" to="/catalogue/scanner">
          <IconeCodeBarres />
          Scanner
        </Link>
        <Link className="bouton" to="/catalogue/ciqual">
          CIQUAL
        </Link>
        <Link className="bouton" to="/catalogue/nouveau">
          Manuel
        </Link>
      </div>
      <ChampRecherche valeur={requete} surSaisie={setRequete} />
      <Segments options={FILTRES} valeur={filtre} surChoix={setFiltre} />

      {resultats.length === 0 ? (
        <p className="attenue">Aucun aliment.</p>
      ) : (
        <ul className="liste">
          {resultats.map((a) => (
            <li key={a.id}>
              <button className="element" onClick={() => naviguer(`/catalogue/${a.id}`)}>
                <LigneAliment aliment={a} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function LigneAliment({ aliment, detail }: { aliment: Aliment; detail?: string }) {
  return (
    <>
      <span className="etire pile" style={{ gap: 2, minWidth: 0 }}>
        <span className="tronque">{aliment.nom}</span>
        <span className="sous-titre tronque">
          {detail ?? [aliment.marque, LIBELLES_SOURCE[aliment.source]].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="droite" style={{ flex: 'none' }}>
        {formatKcal(aliment.kcal_100g)}
        <span className="petit discret"> kcal{aliment.kcal_estimee ? ' est.' : ''}</span>
      </span>
    </>
  )
}
