import { lazy, Suspense, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useDonnees } from './contexte.ts'
import Ajout from './ecrans/ajout/Ajout.tsx'
import AjoutCiqual from './ecrans/catalogue/AjoutCiqual.tsx'
import Catalogue from './ecrans/catalogue/Catalogue.tsx'
import EditionAliment, { NouvelAlimentManuel } from './ecrans/catalogue/EditionAliment.tsx'
import Initialisation from './ecrans/Initialisation.tsx'
import Journal from './ecrans/Journal.tsx'
import Reglages from './ecrans/Reglages.tsx'
import { Chargement } from './ui/composants.tsx'
import { IconeCatalogue, IconeJournal, IconePesee, IconePlus, IconeStats } from './ui/icones.tsx'

// Chargés à la demande : Recharts (graphiques) et ZXing (caméra) restent hors du chargement initial.
const Pesee = lazy(() => import('./ecrans/Pesee.tsx'))
const Statistiques = lazy(() => import('./ecrans/Statistiques.tsx'))
const ScanAjout = lazy(() => import('./ecrans/ajout/ScanAjout.tsx'))
const AjoutCodeBarres = lazy(() => import('./ecrans/catalogue/AjoutCodeBarres.tsx'))

const differe = (element: ReactNode) => <Suspense fallback={<Chargement />}>{element}</Suspense>

export default function Application() {
  const { profil } = useDonnees()
  const { pathname } = useLocation()
  if (!profil) return <Initialisation />
  const sansBarre = pathname.startsWith('/ajout') || pathname === '/catalogue/scanner'

  return (
    <div className="ecran">
      <Routes>
        <Route path="/journal" element={<Journal />} />
        <Route path="/ajout" element={<Ajout />} />
        <Route path="/ajout/scanner" element={differe(<ScanAjout />)} />
        <Route path="/pesee" element={differe(<Pesee />)} />
        <Route path="/statistiques" element={differe(<Statistiques />)} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/catalogue/ciqual" element={<AjoutCiqual />} />
        <Route path="/catalogue/scanner" element={differe(<AjoutCodeBarres />)} />
        <Route path="/catalogue/nouveau" element={<NouvelAlimentManuel />} />
        <Route path="/catalogue/:id" element={<EditionAliment />} />
        <Route path="/reglages" element={<Reglages />} />
        <Route path="*" element={<Navigate to="/journal" replace />} />
      </Routes>
      {!sansBarre && <BarreOnglets />}
    </div>
  )
}

function BarreOnglets() {
  const naviguer = useNavigate()
  const { pathname, search } = useLocation()
  // Le « + » ajoute à la date affichée dans le journal, sinon à la date par défaut.
  const ajout = () => naviguer(`/ajout${pathname === '/journal' ? search : ''}`)
  return (
    <nav className="barre-onglets">
      <div className="pilule">
        <Onglet chemin="/journal" libelle="Journal" icone={<IconeJournal />} />
        <Onglet chemin="/pesee" libelle="Pesée" icone={<IconePesee />} />
        <button className="bouton-plus" onClick={ajout} aria-label="Ajouter un aliment">
          <IconePlus />
        </button>
        <Onglet chemin="/statistiques" libelle="Stats" icone={<IconeStats />} />
        <Onglet chemin="/catalogue" libelle="Catalogue" icone={<IconeCatalogue />} />
      </div>
    </nav>
  )
}

function Onglet({ chemin, libelle, icone }: { chemin: string; libelle: string; icone: ReactNode }) {
  return (
    <NavLink to={chemin} className="onglet">
      {icone}
      {libelle}
    </NavLink>
  )
}
