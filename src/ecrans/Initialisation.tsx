import { useState, type FormEvent } from 'react'
import { useActions } from '../contexte.ts'
import { aujourdhui, libelleMois, moisInitiaux, NOMBRE_JALONS_INITIAUX } from '../lib/dates.ts'
import type { Profil } from '../lib/types.ts'
import { lirePoids } from '../lib/validation.ts'
import FormulaireProfil from './FormulaireProfil.tsx'

export default function Initialisation() {
  const actions = useActions()
  const [profil, setProfil] = useState<Profil | null>(null)
  const [brouillon, setBrouillon] = useState<Partial<Profil>>({})
  const [valeurs, setValeurs] = useState<string[]>(Array(NOMBRE_JALONS_INITIAUX).fill(''))
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  if (!profil) {
    return (
      <div className="ecran">
        <div className="contenu">
          <h1>Profil</h1>
          <FormulaireProfil
            initial={brouillon}
            avecDateDebut={false}
            libelleValidation="Continuer"
            surValidation={(p) => {
              const complet = { ...p, date_debut: aujourdhui() }
              setBrouillon(complet)
              setProfil(complet)
            }}
          />
        </div>
      </div>
    )
  }

  const mois = moisInitiaux(profil.date_debut)

  async function terminer(e: FormEvent) {
    e.preventDefault()
    const jalons: { mois: string; kg: number }[] = []
    for (let i = 0; i < mois.length; i++) {
      if (!valeurs[i].trim()) continue
      const lecture = lirePoids(valeurs[i])
      if (!lecture.ok) {
        setMessage(`${libelleMois(mois[i])} : ${lecture.message}`)
        return
      }
      jalons.push({ mois: mois[i], kg: lecture.valeur })
    }
    setMessage(null)
    setEnCours(true)
    try {
      for (const j of jalons) await actions.enregistrerJalon(j.mois, j.kg)
      // Le profil en dernier : sa présence marque la fin de l'initialisation.
      await actions.enregistrerProfil(profil!)
    } catch (erreur) {
      setMessage((erreur as Error).message)
      setEnCours(false)
    }
  }

  return (
    <div className="ecran">
      <form className="contenu" onSubmit={terminer}>
        <h1>Objectifs de poids</h1>
        <p className="attenue">Poids visé au dernier jour de chaque mois, en kg.</p>
        <div className="pile" style={{ gap: 12 }}>
          {mois.map((m, i) => (
            <label key={m} className="ligne">
              <span className="etire">{libelleMois(m)}</span>
              <input
                style={{ width: 120 }}
                inputMode="decimal"
                value={valeurs[i]}
                onChange={(e) => setValeurs((v) => v.map((x, k) => (k === i ? e.target.value : x)))}
              />
            </label>
          ))}
        </div>
        {message && <p className="message">{message}</p>}
        <button className="bouton principal plein" disabled={enCours}>
          Terminer
        </button>
        <button type="button" className="bouton lien" onClick={() => setProfil(null)} disabled={enCours}>
          Revenir au profil
        </button>
      </form>
    </div>
  )
}
