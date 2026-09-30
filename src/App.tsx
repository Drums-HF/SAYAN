import { useEffect, useState } from 'react'
import { HashRouter } from 'react-router-dom'
import CreationCompte from './ecrans/CreationCompte.tsx'
import Deverrouillage from './ecrans/Deverrouillage.tsx'
import { compteExiste } from './lib/auth.ts'
import { demarrerVeille } from './lib/session.ts'
import { configurationPresente } from './lib/supabase.ts'

type Phase =
  | { nom: 'demarrage' }
  | { nom: 'erreur'; message: string }
  | { nom: 'creation' }
  | { nom: 'deverrouillage' }
  | { nom: 'ouverte' }

export default function App() {
  const [phase, setPhase] = useState<Phase>(
    configurationPresente
      ? { nom: 'demarrage' }
      : { nom: 'erreur', message: 'Configuration Supabase absente du build.' },
  )

  useEffect(() => {
    if (!configurationPresente) return
    compteExiste()
      .then((existe) => setPhase({ nom: existe ? 'deverrouillage' : 'creation' }))
      .catch((e: Error) => setPhase({ nom: 'erreur', message: e.message }))
  }, [])

  useEffect(() => {
    if (phase.nom === 'ouverte') return demarrerVeille()
  }, [phase.nom])

  const ouvrir = () => setPhase({ nom: 'ouverte' })

  switch (phase.nom) {
    case 'demarrage':
      return (
        <div className="ecran">
          <div className="contenu centre ligne" style={{ justifyContent: 'center' }}>
            <span className="indicateur" />
          </div>
        </div>
      )
    case 'erreur':
      return (
        <div className="ecran">
          <div className="contenu centre">
            <h1>SAYAN</h1>
            <p className="message">{phase.message}</p>
            <button className="bouton plein" onClick={() => window.location.reload()}>
              Réessayer
            </button>
          </div>
        </div>
      )
    case 'creation':
      return <CreationCompte surSucces={ouvrir} />
    case 'deverrouillage':
      return <Deverrouillage surSucces={ouvrir} />
    case 'ouverte':
      return (
        <HashRouter>
          <div className="ecran">
            <div className="contenu centre">
              <h1>SAYAN</h1>
              <p className="attenue">Déverrouillé.</p>
            </div>
          </div>
        </HashRouter>
      )
  }
}
