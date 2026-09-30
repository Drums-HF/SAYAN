import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActions, useDonnees } from '../../contexte.ts'
import { chercherProduit, type ResultatOff } from '../../lib/openfoodfacts.ts'
import { Chargement, EnTete } from '../../ui/composants.tsx'
import LecteurCode from '../ajout/LecteurCode.tsx'
import FormulaireAliment from './FormulaireAliment.tsx'

/** Ajout au catalogue par code-barres : caméra, puis validation des valeurs (§6, §7.3). */
export default function AjoutCodeBarres() {
  const { aliments } = useDonnees()
  const actions = useActions()
  const naviguer = useNavigate()
  const [code, setCode] = useState<string | null>(null)
  const [resultat, setResultat] = useState<ResultatOff | null>(null)

  async function surCode(lu: string) {
    // Déjà au catalogue : aucune requête réseau.
    const connu = aliments.find((a) => a.code_barres === lu)
    if (connu) {
      naviguer(`/catalogue/${connu.id}`, { replace: true })
      return
    }
    setCode(lu)
    setResultat(await chercherProduit(lu))
  }

  if (!code) return <LecteurCode surCode={surCode} surFermer={() => naviguer(-1)} />

  if (!resultat) {
    return (
      <div className="contenu">
        <EnTete titre="Code-barres" retour />
        <Chargement texte={`Code ${code}…`} />
      </div>
    )
  }

  const produit = resultat.type === 'produit'
  return (
    <div className="contenu">
      <EnTete titre={produit ? 'Open Food Facts' : 'Saisie manuelle'} retour />
      {!produit && <p className="message">{resultat.raison}</p>}
      {produit && resultat.prerempli.image && (
        <div className="produit">
          <img src={resultat.prerempli.image} alt="" referrerPolicy="no-referrer" />
        </div>
      )}
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
      <p className="tres-petit discret">Données Open Food Facts, licence ODbL.</p>
    </div>
  )
}
