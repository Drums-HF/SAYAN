import { useState, type FormEvent, type ReactNode } from 'react'
import { apport } from '../../lib/calculs.ts'
import { formatGrammes, formatKcal } from '../../lib/nombres.ts'
import { lireGrammes } from '../../lib/validation.ts'
import { Tuile } from '../../ui/composants.tsx'

export interface ValeursPour100g {
  kcal: number
  glucides: number
  proteines: number
  lipides: number
}

/** Fiche d'un aliment choisi : valeurs pour 100 g, grammes pesés, ajout au journal. */
export default function FicheAjout({
  nom,
  detail,
  image,
  valeurs,
  mentions,
  surAjout,
}: {
  nom: string
  detail?: string
  image?: string | null
  valeurs: ValeursPour100g
  mentions?: ReactNode
  surAjout: (grammes: number) => Promise<void>
}) {
  const [grammes, setGrammes] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const lecture = lireGrammes(grammes)

  async function valider(e: FormEvent) {
    e.preventDefault()
    if (!lecture.ok) {
      setMessage(lecture.message)
      return
    }
    setEnCours(true)
    try {
      await surAjout(lecture.valeur)
    } catch (err) {
      setMessage((err as Error).message)
      setEnCours(false)
    }
  }

  return (
    <form className="pile" style={{ gap: 14 }} onSubmit={valider}>
      <div className="produit">
        {image && <img src={image} alt="" referrerPolicy="no-referrer" />}
        <div className="etire">
          <h2>{nom}</h2>
          {detail && <p className="petit discret">{detail}</p>}
        </div>
      </div>

      <div className="tuiles">
        <Tuile libelle="kcal" valeur={formatKcal(valeurs.kcal)} />
        <Tuile libelle="protéines" valeur={formatGrammes(valeurs.proteines)} unite="g" />
        <Tuile libelle="glucides" valeur={formatGrammes(valeurs.glucides)} unite="g" />
        <Tuile libelle="lipides" valeur={formatGrammes(valeurs.lipides)} unite="g" />
      </div>
      <p className="tres-petit discret" style={{ marginTop: -6 }}>
        Pour 100 g
      </p>
      {mentions}

      <label className="champ-grammes">
        <input
          className="etire"
          inputMode="decimal"
          autoFocus
          placeholder="0"
          aria-label="Grammes"
          value={grammes}
          onChange={(e) => {
            setGrammes(e.target.value)
            setMessage(null)
          }}
        />
        <span className="attenue">g</span>
      </label>
      {message && <p className="message">{message}</p>}

      <button className="bouton principal plein" disabled={enCours || !grammes}>
        {lecture.ok ? `Ajouter · ${formatKcal(apport(valeurs.kcal, lecture.valeur))} kcal` : 'Ajouter'}
      </button>
    </form>
  )
}
