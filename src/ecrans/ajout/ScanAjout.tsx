import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useActions, useDonnees } from '../../contexte.ts'
import { libelleJour } from '../../lib/dates.ts'
import { formatKcal } from '../../lib/nombres.ts'
import { normaliser } from '../../lib/nutrition.ts'
import { chercherProduit, type Prerempli } from '../../lib/openfoodfacts.ts'
import { LIBELLES_SOURCE, type Aliment } from '../../lib/types.ts'
import { Chargement, Segments } from '../../ui/composants.tsx'
import { IconeFermer } from '../../ui/icones.tsx'
import FormulaireAliment from '../catalogue/FormulaireAliment.tsx'
import FicheAjout from './FicheAjout.tsx'
import LecteurCode from './LecteurCode.tsx'
import { dateCible, MODES, suffixeDate, versJournal } from './navigation.ts'

type Phase =
  | { type: 'camera' }
  | { type: 'recherche'; code: string }
  | { type: 'catalogue'; aliment: Aliment }
  | { type: 'produit'; prerempli: Prerempli; suspect: boolean }
  | { type: 'manuel'; prerempli: Prerempli; raison: string }

/** Ajout au journal par code-barres : caméra, catalogue puis Open Food Facts. */
export default function ScanAjout() {
  const { aliments } = useDonnees()
  const actions = useActions()
  const naviguer = useNavigate()
  const [parametres] = useSearchParams()
  const date = dateCible(parametres)
  const [phase, setPhase] = useState<Phase>({ type: 'camera' })

  const fermer = () => naviguer(versJournal(date), { replace: true })

  async function surCode(code: string) {
    // Déjà au catalogue : aucune requête réseau (§6).
    const connu = aliments.find((a) => a.code_barres === code)
    if (connu) {
      setPhase({ type: 'catalogue', aliment: connu })
      return
    }
    setPhase({ type: 'recherche', code })
    const r = await chercherProduit(code)
    if (r.type === 'produit' && !r.prerempli.nom) {
      setPhase({ type: 'manuel', prerempli: r.prerempli, raison: 'Nom du produit absent sur Open Food Facts.' })
    } else {
      setPhase(r.type === 'produit' ? { type: 'produit', prerempli: r.prerempli, suspect: r.suspect } : { type: 'manuel', prerempli: r.prerempli, raison: r.raison })
    }
  }

  async function ajouterEntree(alimentId: string, grammes: number) {
    await actions.ajouterEntrees([{ date, aliment_id: alimentId, grammes }])
    fermer()
  }

  if (phase.type === 'camera') {
    return (
      <LecteurCode
        surCode={surCode}
        surFermer={fermer}
        onglets={
          <Segments
            accentue
            options={MODES}
            valeur="code"
            surChoix={(m) => m === 'recherche' && naviguer(`/ajout${suffixeDate(date)}`, { replace: true })}
          />
        }
      />
    )
  }

  const entete = (
    <div className="ligne">
      <button className="bouton-rond" onClick={fermer} aria-label="Fermer">
        <IconeFermer />
      </button>
      <span className="etire petit attenue" style={{ textAlign: 'center' }}>
        {libelleJour(date)}
      </span>
      <button className="bouton" style={{ minHeight: 44 }} onClick={() => setPhase({ type: 'camera' })}>
        Scanner
      </button>
    </div>
  )

  if (phase.type === 'recherche') {
    return (
      <div className="contenu">
        {entete}
        <Chargement texte={`Code ${phase.code}…`} />
      </div>
    )
  }

  if (phase.type === 'catalogue') {
    const a = phase.aliment
    return (
      <div className="contenu">
        {entete}
        <div className="carte">
          <FicheAjout
            nom={a.nom}
            detail={[a.marque, LIBELLES_SOURCE[a.source], 'déjà au catalogue'].filter(Boolean).join(' · ')}
            valeurs={{ kcal: a.kcal_100g, glucides: a.glucides_100g, proteines: a.proteines_100g, lipides: a.lipides_100g }}
            surAjout={(g) => ajouterEntree(a.id, g)}
          />
        </div>
      </div>
    )
  }

  if (phase.type === 'produit') {
    const p = phase.prerempli
    const r = normaliser(p)
    if (!r.ok) return null // interpreterReponse garantit des valeurs valides pour un « produit »
    return (
      <div className="contenu">
        {entete}
        <div className="carte">
          <FicheAjout
            nom={p.nom}
            detail={[p.marque, 'Open Food Facts'].filter(Boolean).join(' · ')}
            image={p.image}
            valeurs={r.valeurs}
            mentions={
              <>
                {r.kcal_estimee && (
                  <p className="tres-petit discret">Énergie estimée par les coefficients d’Atwater.</p>
                )}
                {phase.suspect && (
                  <p className="message">
                    Donnée suspecte : l’énergie déclarée ({formatKcal(r.valeurs.kcal)} kcal) s’écarte de plus de
                    20 % de la valeur calculée à partir des macronutriments ({formatKcal(r.atwater)} kcal).
                  </p>
                )}
              </>
            }
            surAjout={async (g) => {
              const cree = await actions.ajouterAliment({
                nom: p.nom,
                marque: p.marque,
                code_barres: p.code_barres,
                source: 'openfoodfacts',
                source_ref: p.code_barres,
                kcal_100g: r.valeurs.kcal,
                glucides_100g: r.valeurs.glucides,
                proteines_100g: r.valeurs.proteines,
                lipides_100g: r.valeurs.lipides,
                fibres_100g: r.valeurs.fibres,
                kcal_estimee: r.kcal_estimee,
              })
              await ajouterEntree(cree.id, g)
            }}
          />
        </div>
        <p className="tres-petit discret">Enregistré au catalogue à l’ajout. Données Open Food Facts, licence ODbL.</p>
      </div>
    )
  }

  return (
    <div className="contenu">
      {entete}
      <p className="message">{phase.raison}</p>
      <FormulaireAliment
        initial={phase.prerempli}
        source="manuel"
        libelleValidation="Enregistrer au catalogue"
        surValidation={async (a) => {
          const cree = await actions.ajouterAliment(a)
          setPhase({ type: 'catalogue', aliment: cree })
        }}
      />
    </div>
  )
}
