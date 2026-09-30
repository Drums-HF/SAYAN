import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useActions, useDonnees } from '../../contexte.ts'
import { estReference } from '../../lib/frequences.ts'
import { LIBELLES_SOURCE } from '../../lib/types.ts'
import { EnTete } from '../../ui/composants.tsx'
import FormulaireAliment from './FormulaireAliment.tsx'

export function NouvelAlimentManuel() {
  const actions = useActions()
  const naviguer = useNavigate()
  return (
    <div className="contenu">
      <EnTete titre="Nouvel aliment" retour />
      <FormulaireAliment
        initial={{}}
        source="manuel"
        libelleValidation="Enregistrer"
        surValidation={async (a) => {
          await actions.ajouterAliment(a)
          naviguer(-1)
        }}
      />
    </div>
  )
}

export default function EditionAliment() {
  const { id } = useParams()
  const { aliments, entrees } = useDonnees()
  const actions = useActions()
  const naviguer = useNavigate()
  const [message, setMessage] = useState<string | null>(null)
  const aliment = aliments.find((a) => a.id === id)

  if (!aliment) {
    return (
      <div className="contenu">
        <EnTete titre="Aliment" retour />
        <p className="attenue">Aliment introuvable.</p>
      </div>
    )
  }

  const reference = estReference(entrees, aliment.id)

  async function basculerArchive() {
    try {
      await actions.modifierAliment({ ...aliment!, archive: !aliment!.archive })
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer définitivement « ${aliment!.nom} » ?`)) return
    try {
      await actions.supprimerAliment(aliment!.id)
      naviguer(-1)
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  return (
    <div className="contenu">
      <EnTete titre="Aliment" retour />
      <p className="petit discret">
        {LIBELLES_SOURCE[aliment.source]}
        {aliment.source_ref ? ` · ${aliment.source_ref}` : ''}
        {aliment.archive ? ' · archivé' : ''}
      </p>
      <FormulaireAliment
        key={aliment.id}
        initial={{
          nom: aliment.nom,
          marque: aliment.marque,
          code_barres: aliment.code_barres,
          kcal: aliment.kcal_estimee ? null : aliment.kcal_100g,
          glucides: aliment.glucides_100g,
          proteines: aliment.proteines_100g,
          lipides: aliment.lipides_100g,
          fibres: aliment.fibres_100g,
        }}
        source={aliment.source}
        sourceRef={aliment.source_ref}
        libelleValidation="Enregistrer"
        surValidation={async (a) => {
          await actions.modifierAliment({ ...aliment, ...a })
          naviguer(-1)
        }}
      />
      {message && <p className="message">{message}</p>}
      <button className="bouton plein" onClick={basculerArchive}>
        {aliment.archive ? 'Désarchiver' : 'Archiver'}
      </button>
      {reference ? (
        <p className="petit discret">
          Aliment utilisé dans le journal : archivage seulement, pas de suppression.
        </p>
      ) : (
        <button className="bouton plein" onClick={supprimer}>
          Supprimer
        </button>
      )}
    </div>
  )
}
