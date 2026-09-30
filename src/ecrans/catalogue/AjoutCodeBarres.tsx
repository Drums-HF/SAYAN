import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActions, useDonnees } from '../../contexte.ts'
import { chercherProduit, codeBarresValide, type ResultatOff } from '../../lib/openfoodfacts.ts'
import { Chargement, EnTete } from '../../ui/composants.tsx'
import FormulaireAliment from './FormulaireAliment.tsx'

export default function AjoutCodeBarres() {
  const { aliments } = useDonnees()
  const actions = useActions()
  const naviguer = useNavigate()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [resultat, setResultat] = useState<ResultatOff | null>(null)

  const existant = codeBarresValide(code) ? aliments.find((a) => a.code_barres === code) : undefined

  async function chercher(e: FormEvent) {
    e.preventDefault()
    if (!codeBarresValide(code)) {
      setMessage('Code-barres : 8, 12 ou 13 chiffres.')
      return
    }
    // Déjà enregistré : aucune requête réseau.
    if (existant) return
    setMessage(null)
    setEnCours(true)
    setResultat(await chercherProduit(code))
    setEnCours(false)
  }

  if (resultat) {
    const produit = resultat.type === 'produit'
    return (
      <div className="contenu">
        <EnTete titre={produit ? 'Open Food Facts' : 'Saisie manuelle'} retour />
        {!produit && <p className="message">{resultat.raison}</p>}
        <FormulaireAliment
          initial={resultat.prerempli}
          source={produit ? 'openfoodfacts' : 'manuel'}
          sourceRef={produit ? resultat.prerempli.code_barres : null}
          controleCoherence={produit}
          libelleValidation="Enregistrer dans le catalogue"
          surValidation={async (a) => {
            await actions.ajouterAliment(a)
            naviguer(-1)
          }}
        />
      </div>
    )
  }

  return (
    <form className="contenu" onSubmit={chercher}>
      <EnTete titre="Code-barres" retour />
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoFocus
        placeholder="8, 12 ou 13 chiffres"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        disabled={enCours}
      />
      {existant && (
        <p className="message">
          Déjà dans le catalogue : <Link to={`/catalogue/${existant.id}`}>{existant.nom}</Link>
        </p>
      )}
      {message && <p className="message">{message}</p>}
      {enCours ? (
        <Chargement texte="Interrogation d’Open Food Facts…" />
      ) : (
        <button className="bouton principal plein" disabled={!code || Boolean(existant)}>
          Rechercher
        </button>
      )}
      <p className="petit discret">Données Open Food Facts, licence ODbL.</p>
    </form>
  )
}
