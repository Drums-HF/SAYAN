// Aperçu de développement : l'application complète sur un dépôt en mémoire.
// #/apercu : données fictives ; #/apercu-init : premier lancement (profil vide).
import { useState } from 'react'
import { HashRouter } from 'react-router-dom'
import Application from '../Application.tsx'
import { FournisseurDonnees } from '../donnees.tsx'
import { creerDepotMemoire } from '../lib/depot.ts'
import { creerDonneesApercu } from './fixtures.ts'

export default function Apercu() {
  const [depot] = useState(() =>
    creerDepotMemoire(creerDonneesApercu(!window.location.hash.startsWith('#/apercu-init'))),
  )
  return (
    <HashRouter>
      <FournisseurDonnees depot={depot}>
        <Application />
      </FournisseurDonnees>
    </HashRouter>
  )
}
