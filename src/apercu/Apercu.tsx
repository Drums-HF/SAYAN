// Aperçu de développement : l'application complète sur un dépôt en mémoire.
// #/apercu/<chemin> : données fictives ; #/apercu-init : premier lancement (profil vide).
// Routeur en mémoire : l'adresse reste sur #/apercu… et survit au rechargement.
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import Application from '../Application.tsx'
import { FournisseurDonnees } from '../donnees.tsx'
import { creerDepotMemoire } from '../lib/depot.ts'
import { creerDonneesApercu } from './fixtures.ts'

export default function Apercu() {
  const hash = window.location.hash
  const [depot] = useState(() => creerDepotMemoire(creerDonneesApercu(!hash.startsWith('#/apercu-init'))))
  const chemin = hash.replace(/^#\/apercu(-init)?/, '') || '/'
  return (
    <MemoryRouter initialEntries={[chemin]}>
      <FournisseurDonnees depot={depot}>
        <Application />
      </FournisseurDonnees>
    </MemoryRouter>
  )
}
