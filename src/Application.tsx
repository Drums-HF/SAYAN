import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useDonnees } from './contexte.ts'
import AjoutCiqual from './ecrans/catalogue/AjoutCiqual.tsx'
import Catalogue from './ecrans/catalogue/Catalogue.tsx'
import EditionAliment, { NouvelAlimentManuel } from './ecrans/catalogue/EditionAliment.tsx'
import Initialisation from './ecrans/Initialisation.tsx'

const ONGLETS = [{ chemin: '/catalogue', libelle: 'Catalogue' }]

export default function Application() {
  const { profil } = useDonnees()
  if (!profil) return <Initialisation />
  return (
    <div className="ecran">
      <Routes>
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/catalogue/ciqual" element={<AjoutCiqual />} />
        <Route path="/catalogue/nouveau" element={<NouvelAlimentManuel />} />
        <Route path="/catalogue/:id" element={<EditionAliment />} />
        <Route path="*" element={<Navigate to="/catalogue" replace />} />
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
