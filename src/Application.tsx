import { useDonnees } from './contexte.ts'
import Initialisation from './ecrans/Initialisation.tsx'

export default function Application() {
  const { profil } = useDonnees()
  if (!profil) return <Initialisation />
  return (
    <div className="ecran">
      <div className="contenu centre">
        <h1>SAYAN</h1>
        <p className="attenue">Profil enregistré.</p>
      </div>
    </div>
  )
}
