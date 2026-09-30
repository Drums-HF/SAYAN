import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useActions, useDonnees } from '../../contexte.ts'
import { useDerives } from '../../derives.ts'
import { chargerCiqual, type AlimentCiqual } from '../../lib/ciqual.ts'
import { libelleJour } from '../../lib/dates.ts'
import { formatKcal } from '../../lib/nombres.ts'
import { indexer, rechercher } from '../../lib/recherche.ts'
import { LIBELLES_SOURCE, type Aliment } from '../../lib/types.ts'
import { ChampRecherche, Chargement, Segments } from '../../ui/composants.tsx'
import { IconeFermer } from '../../ui/icones.tsx'
import FicheAjout from './FicheAjout.tsx'
import { dateCible, MODES, suffixeDate, versJournal } from './navigation.ts'

const NOMBRE_FREQUENTS = 10
const LIMITE = 20

type Selection = { type: 'catalogue'; aliment: Aliment } | { type: 'ciqual'; aliment: AlimentCiqual }

export default function Ajout() {
  const { aliments } = useDonnees()
  const actions = useActions()
  const { frequences } = useDerives()
  const naviguer = useNavigate()
  const [parametres] = useSearchParams()
  const date = dateCible(parametres)
  const [requete, setRequete] = useState('')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [ciqual, setCiqual] = useState<AlimentCiqual[] | null>(null)
  const [erreurCiqual, setErreurCiqual] = useState<string | null>(null)

  const actifs = useMemo(() => aliments.filter((a) => !a.archive), [aliments])
  const index = useMemo(() => indexer(actifs, (a) => `${a.nom} ${a.marque ?? ''}`), [actifs])
  const frequence = (a: Aliment) => frequences.get(a.id) ?? 0
  const recherche = requete.trim()

  // Table CIQUAL chargée au premier usage de la recherche (§6).
  const chargerTable = recherche.length >= 2 && !ciqual && !erreurCiqual
  useEffect(() => {
    if (chargerTable) chargerCiqual().then(setCiqual, (e: Error) => setErreurCiqual(e.message))
  }, [chargerTable])
  const indexCiqual = useMemo(() => (ciqual ? indexer(ciqual, (a) => a.nom) : []), [ciqual])
  const dansCatalogue = useMemo(
    () => new Map(aliments.filter((a) => a.source === 'ciqual').map((a) => [a.source_ref, a])),
    [aliments],
  )

  const resultats = recherche
    ? rechercher(index, recherche, { limite: LIMITE, departage: frequence })
    : actifs
        .filter((a) => frequence(a) > 0)
        .sort((a, b) => frequence(b) - frequence(a) || a.nom.localeCompare(b.nom, 'fr'))
        .slice(0, NOMBRE_FREQUENTS)
  const resultatsCiqual =
    recherche.length >= 2
      ? rechercher(indexCiqual, recherche, { limite: LIMITE }).filter((a) => !dansCatalogue.has(a.code))
      : []

  const fermer = () => naviguer(versJournal(date), { replace: true })

  async function ajouter(grammes: number) {
    if (!selection) return
    let alimentId: string
    if (selection.type === 'catalogue') {
      alimentId = selection.aliment.id
    } else {
      const a = selection.aliment
      const existant = dansCatalogue.get(a.code)
      alimentId =
        existant?.id ??
        (
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
        ).id
    }
    await actions.ajouterEntrees([{ date, aliment_id: alimentId, grammes }])
    fermer()
  }

  return (
    <div className="contenu">
      <div className="ligne">
        <button
          className="bouton-rond"
          onClick={() => (selection ? setSelection(null) : fermer())}
          aria-label={selection ? 'Retour à la recherche' : 'Fermer'}
        >
          <IconeFermer />
        </button>
        <div className="etire" style={{ display: 'flex', justifyContent: 'center' }}>
          <Segments
            accentue
            options={MODES}
            valeur="recherche"
            surChoix={(m) => m === 'code' && naviguer(`/ajout/scanner${suffixeDate(date)}`, { replace: true })}
          />
        </div>
        <span style={{ width: 44 }} />
      </div>
      <p className="petit attenue" style={{ textAlign: 'center', marginTop: -4 }}>
        {libelleJour(date)}
      </p>

      {selection ? (
        <div className="carte">
          <FicheAjout
            key={selection.type === 'catalogue' ? selection.aliment.id : selection.aliment.code}
            nom={selection.aliment.nom}
            detail={
              selection.type === 'catalogue'
                ? [selection.aliment.marque, LIBELLES_SOURCE[selection.aliment.source]].filter(Boolean).join(' · ')
                : 'CIQUAL'
            }
            valeurs={
              selection.type === 'catalogue'
                ? {
                    kcal: selection.aliment.kcal_100g,
                    glucides: selection.aliment.glucides_100g,
                    proteines: selection.aliment.proteines_100g,
                    lipides: selection.aliment.lipides_100g,
                  }
                : selection.aliment
            }
            mentions={
              (selection.type === 'catalogue' ? selection.aliment.kcal_estimee : selection.aliment.kcal_estimee) && (
                <p className="tres-petit discret">Énergie estimée par les coefficients d’Atwater.</p>
              )
            }
            surAjout={ajouter}
          />
        </div>
      ) : (
        <>
          <ChampRecherche valeur={requete} surSaisie={setRequete} autoFocus placeholder="Rechercher un aliment" />

          {(resultats.length > 0 || !recherche) && (
            <section className="pile">
              <h3>{recherche ? 'Catalogue' : 'Fréquents'}</h3>
              {resultats.length > 0 ? (
                <ul className="liste">
                  {resultats.map((a) => (
                    <li key={a.id}>
                      <button className="element" onClick={() => setSelection({ type: 'catalogue', aliment: a })}>
                        <span className="etire pile" style={{ gap: 2 }}>
                          <span className="tronque">{a.nom}</span>
                          {a.marque && <span className="sous-titre tronque">{a.marque}</span>}
                        </span>
                        <span className="petit discret" style={{ flex: 'none' }}>
                          {formatKcal(a.kcal_100g)} kcal
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="petit discret">Les aliments les plus utilisés apparaîtront ici.</p>
              )}
            </section>
          )}

          {recherche.length >= 2 && (
            <section className="pile">
              <h3>CIQUAL</h3>
              {erreurCiqual && <p className="message">{erreurCiqual}</p>}
              {!ciqual && !erreurCiqual && <Chargement />}
              {ciqual && resultatsCiqual.length === 0 && <p className="petit discret">Aucun aliment.</p>}
              {resultatsCiqual.length > 0 && (
                <ul className="liste">
                  {resultatsCiqual.map((a) => (
                    <li key={a.code}>
                      <button className="element" onClick={() => setSelection({ type: 'ciqual', aliment: a })}>
                        <span className="etire">{a.nom}</span>
                        <span className="petit discret" style={{ flex: 'none' }}>
                          {formatKcal(a.kcal)} kcal
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="tres-petit discret">Valeurs pour 100 g. ANSES, Ciqual 2025 (Licence Ouverte Etalab).</p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
