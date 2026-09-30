import { useEffect, useMemo, useState } from 'react'
import { useActions, useDonnees } from '../../contexte.ts'
import { chargerCiqual, type AlimentCiqual } from '../../lib/ciqual.ts'
import { formatKcal } from '../../lib/nombres.ts'
import { indexer, rechercher } from '../../lib/recherche.ts'
import { Chargement, ChampRecherche, EnTete } from '../../ui/composants.tsx'

const LIMITE = 60

export default function AjoutCiqual() {
  const { aliments } = useDonnees()
  const actions = useActions()
  const [table, setTable] = useState<AlimentCiqual[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [requete, setRequete] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)

  // Chargement paresseux : au premier usage de la recherche CIQUAL, pas au démarrage.
  useEffect(() => {
    chargerCiqual().then(setTable, (e: Error) => setErreur(e.message))
  }, [])

  const index = useMemo(() => (table ? indexer(table, (a) => a.nom) : []), [table])
  const dansCatalogue = useMemo(
    () => new Set(aliments.filter((a) => a.source === 'ciqual').map((a) => a.source_ref)),
    [aliments],
  )
  const resultats = requete.trim() ? rechercher(index, requete, { limite: LIMITE }) : []

  async function ajouter(a: AlimentCiqual) {
    setEnCours(a.code)
    try {
      await actions.ajouterAliment({
        nom: a.nom,
        marque: null,
        code_barres: null,
        source: 'ciqual',
        source_ref: a.code,
        kcal_100g: a.kcal,
        glucides_100g: a.glucides,
        proteines_100g: a.proteines,
        lipides_100g: a.lipides,
        fibres_100g: a.fibres,
        kcal_estimee: a.kcal_estimee,
      })
    } catch (e) {
      setErreur((e as Error).message)
    }
    setEnCours(null)
  }

  return (
    <div className="contenu">
      <EnTete titre="CIQUAL" retour />
      <ChampRecherche valeur={requete} surSaisie={setRequete} autoFocus placeholder="Aliment générique" />
      {erreur && <p className="message">{erreur}</p>}
      {!table && !erreur && <Chargement texte="Chargement de la table…" />}
      {table && requete.trim() && resultats.length === 0 && <p className="attenue">Aucun aliment.</p>}
      {resultats.length > 0 && (
        <ul className="liste">
          {resultats.map((a) => {
            const present = dansCatalogue.has(a.code)
            return (
              <li key={a.code}>
                <button
                  className="element"
                  disabled={present || enCours !== null}
                  onClick={() => ajouter(a)}
                >
                  <span className="etire pile" style={{ gap: 2, minWidth: 0 }}>
                    <span>{a.nom}</span>
                    <span className="petit discret">
                      {present ? 'Dans le catalogue' : enCours === a.code ? 'Ajout…' : 'Ajouter'}
                    </span>
                  </span>
                  <span className="droite" style={{ flex: 'none' }}>
                    {formatKcal(a.kcal)}
                    <span className="petit discret"> kcal{a.kcal_estimee ? ' est.' : ''}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="petit discret">
        Valeurs pour 100 g. Source : ANSES, table Ciqual 2025 (Licence Ouverte Etalab).
      </p>
    </div>
  )
}
