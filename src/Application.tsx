import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useDonnees } from './contexte.ts'
import AjoutCiqual from './ecrans/catalogue/AjoutCiqual.tsx'
import AjoutCodeBarres from './ecrans/catalogue/AjoutCodeBarres.tsx'
import Catalogue from './ecrans/catalogue/Catalogue.tsx'
import EditionAliment, { NouvelAlimentManuel } from './ecrans/catalogue/EditionAliment.tsx'
import Initialisation from './ecrans/Initialisation.tsx'
import Journal from './ecrans/Journal.tsx'
import Pesee from './ecrans/Pesee.tsx'

const ONGLETS = [
  { chemin: '/journal', libelle: 'Journal' },
  { chemin: '/pesee', libelle: 'Pesée' },
  { chemin: '/catalogue', libelle: 'Catalogue' },
]

export default function Application() {
  const { profil } = useDonnees()
  if (!profil) return <Initialisation />
  return (
    <div className="ecran">
      <Routes>
        <Route path="/journal" element={<Journal />} />
        <Route path="/pesee" element={<Pesee />} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/catalogue/ciqual" element={<AjoutCiqual />} />
        <Route path="/catalogue/code-barres" element={<AjoutCodeBarres />} />
        <Route path="/catalogue/nouveau" element={<NouvelAlimentManuel />} />
        <Route path="/catalogue/:id" element={<EditionAliment />} />
        <Route path="*" element={<Navigate to="/journal" replace />} />
      </Routes>
      <nav className="onglets" style={{ gridTemplateColumns: `repeat(${ONGLETS.length}, 1fr)` }}>
        {ONGLETS.map((o) => (
          <NavLink key={o.chemin} to={o.chemin}>
            {o.libelle}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
