import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useActions, useDonnees, useProfil } from '../contexte.ts'
import { useDerives } from '../derives.ts'
import { apport, deficitDuJour, depenseJournaliere, TOTAUX_NULS } from '../lib/calculs.ts'
import { ajouterJours, aujourdhui, dateParDefaut, estDateValide, libelleJour } from '../lib/dates.ts'
import { formatEstimation, formatGrammes, formatKcal, formatSaisie } from '../lib/nombres.ts'
import { indexer, rechercher } from '../lib/recherche.ts'
import type { Aliment, Entree } from '../lib/types.ts'
import { lireGrammes } from '../lib/validation.ts'
import { ChampRecherche } from '../ui/composants.tsx'

const NOMBRE_FREQUENTS = 8
const LIMITE_RESULTATS = 30

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function Journal() {
  const { entrees, aliments, pesees } = useDonnees()
  const profil = useProfil()
  const actions = useActions()
  const { alimentsParId, totauxJours, frequences } = useDerives()
  const [parametres, setParametres] = useSearchParams()
  const [dateDefaut] = useState(() => dateParDefaut())
  const parametre = parametres.get('date')
  const date = parametre && estDateValide(parametre) ? parametre : dateDefaut
  const [message, setMessage] = useState<string | null>(null)

  function changerDate(nouvelle: string) {
    if (!estDateValide(nouvelle) || nouvelle > aujourdhui()) return
    setMessage(null)
    setParametres(nouvelle === dateDefaut ? {} : { date: nouvelle }, { replace: true })
  }

  const duJour = useMemo(
    () =>
      entrees
        .filter((e) => e.date === date)
        .sort((a, b) =>
          (alimentsParId.get(a.aliment_id)?.nom ?? '').localeCompare(alimentsParId.get(b.aliment_id)?.nom ?? '', 'fr'),
        ),
    [entrees, date, alimentsParId],
  )
  const veille = ajouterJours(date, -1)
  const entreesVeille = useMemo(() => entrees.filter((e) => e.date === veille), [entrees, veille])

  const totaux = totauxJours.get(date) ?? TOTAUX_NULS
  const dej = depenseJournaliere(profil, pesees, date)
  const deficit = deficitDuJour(dej, totauxJours.get(date)?.kcal)
  const progression = Math.min(100, (totaux.kcal / profil.objectif_calorique) * 100)

  async function reprendreHier() {
    setMessage(null)
    try {
      await actions.ajouterEntrees(
        entreesVeille.map((e) => ({ date, aliment_id: e.aliment_id, grammes: e.grammes })),
      )
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  return (
    <>
      <div className="contenu">
        <nav className="ligne" aria-label="Date">
          <button className="bouton-carre" onClick={() => changerDate(ajouterJours(date, -1))} aria-label="Jour précédent">
            ‹
          </button>
          <label className="etire date-journal">
            <span>{majuscule(libelleJour(date))}</span>
            <input
              type="date"
              value={date}
              max={aujourdhui()}
              onChange={(e) => changerDate(e.target.value)}
              aria-label="Choisir la date"
            />
          </label>
          <button
            className="bouton-carre"
            onClick={() => changerDate(ajouterJours(date, 1))}
            disabled={date >= aujourdhui()}
            aria-label="Jour suivant"
          >
            ›
          </button>
        </nav>
        {date !== dateDefaut && (
          <button className="bouton lien" onClick={() => changerDate(dateDefaut)}>
            Revenir à la date du repas
          </button>
        )}

        <section className="carte">
          <div className="entre">
            <span>
              <span className="grand">{formatKcal(totaux.kcal)}</span>
              <span className="attenue"> / {formatKcal(profil.objectif_calorique)} kcal</span>
            </span>
          </div>
          <div className="barre" role="progressbar" aria-valuenow={Math.round(progression)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progression}%` }} />
          </div>
          <div className="entre">
            <span className="attenue">Protéines</span>
            <span>{formatGrammes(totaux.proteines)} g</span>
          </div>
        </section>

        <Ajout date={date} aliments={aliments} frequences={frequences} />

        {message && <p className="message">{message}</p>}

        {duJour.length > 0 ? (
          <ul className="liste">
            {duJour.map((e) => (
              <LigneEntree key={e.id} entree={e} aliment={alimentsParId.get(e.aliment_id)} />
            ))}
          </ul>
        ) : (
          entreesVeille.length > 0 && (
            <button className="bouton plein" onClick={reprendreHier}>
              Reprendre hier ({entreesVeille.length} aliment{entreesVeille.length > 1 ? 's' : ''})
            </button>
          )
        )}
      </div>
      <footer className="pied">
        <span>DEJ {formatEstimation(dej)} kcal</span>
        <span>Déficit {deficit === null ? '—' : `${formatEstimation(deficit)} kcal`}</span>
      </footer>
    </>
  )
}

function Ajout({
  date,
  aliments,
  frequences,
}: {
  date: string
  aliments: Aliment[]
  frequences: Map<string, number>
}) {
  const actions = useActions()
  const [requete, setRequete] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [selection, setSelection] = useState<Aliment | null>(null)
  const [grammes, setGrammes] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const actifs = useMemo(() => aliments.filter((a) => !a.archive), [aliments])
  const index = useMemo(() => indexer(actifs, (a) => `${a.nom} ${a.marque ?? ''}`), [actifs])
  const frequence = (a: Aliment) => frequences.get(a.id) ?? 0
  const liste = requete.trim()
    ? rechercher(index, requete, { limite: LIMITE_RESULTATS, departage: frequence })
    : actifs
        .filter((a) => frequence(a) > 0)
        .sort((a, b) => frequence(b) - frequence(a) || a.nom.localeCompare(b.nom, 'fr'))
        .slice(0, NOMBRE_FREQUENTS)

  function fermer() {
    setOuvert(false)
    setRequete('')
    setSelection(null)
    setGrammes('')
    setMessage(null)
  }

  async function valider(e: FormEvent) {
    e.preventDefault()
    const lecture = lireGrammes(grammes)
    if (!lecture.ok) {
      setMessage(lecture.message)
      return
    }
    setEnCours(true)
    try {
      await actions.ajouterEntrees([{ date, aliment_id: selection!.id, grammes: lecture.valeur }])
      fermer()
    } catch (err) {
      setMessage((err as Error).message)
    }
    setEnCours(false)
  }

  if (selection) {
    const lecture = lireGrammes(grammes)
    return (
      <form className="carte" onSubmit={valider}>
        <div className="entre">
          <span className="etire">{selection.nom}</span>
          <span className="petit discret">{formatKcal(selection.kcal_100g)} kcal / 100 g</span>
        </div>
        <div className="ligne">
          <input
            className="etire"
            inputMode="decimal"
            autoFocus
            placeholder="Grammes"
            value={grammes}
            onChange={(e) => {
              setGrammes(e.target.value)
              setMessage(null)
            }}
          />
          <span className="attenue" style={{ minWidth: 80, textAlign: 'right' }}>
            {lecture.ok ? `${formatKcal(apport(selection.kcal_100g, lecture.valeur))} kcal` : '— kcal'}
          </span>
        </div>
        {message && <p className="message">{message}</p>}
        <div className="grille-2">
          <button type="button" className="bouton" onClick={fermer} disabled={enCours}>
            Annuler
          </button>
          <button className="bouton principal" disabled={enCours}>
            Ajouter
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="pile">
      <div className="ligne">
        <div className="etire" onFocus={() => setOuvert(true)}>
          <ChampRecherche valeur={requete} surSaisie={setRequete} placeholder="Ajouter un aliment" />
        </div>
        {ouvert && (
          <button className="bouton lien" onClick={fermer}>
            Fermer
          </button>
        )}
      </div>
      {ouvert &&
        (liste.length > 0 ? (
          <ul className="liste">
            {liste.map((a) => (
              <li key={a.id}>
                <button className="element" onClick={() => setSelection(a)}>
                  <span className="etire tronque">{a.nom}</span>
                  <span className="petit discret" style={{ flex: 'none' }}>
                    {formatKcal(a.kcal_100g)} kcal / 100 g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="petit attenue">
            {requete.trim() ? 'Aucun aliment dans le catalogue. ' : ''}
            <Link to="/catalogue">Ajouter au catalogue</Link>
          </p>
        ))}
    </div>
  )
}

function LigneEntree({ entree, aliment }: { entree: Entree; aliment: Aliment | undefined }) {
  const actions = useActions()
  const [edition, setEdition] = useState(false)
  const [grammes, setGrammes] = useState(formatSaisie(entree.grammes))
  const [message, setMessage] = useState<string | null>(null)
  const kcal = aliment ? apport(aliment.kcal_100g, entree.grammes) : 0

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    const lecture = lireGrammes(grammes)
    if (!lecture.ok) {
      setMessage(lecture.message)
      return
    }
    try {
      await actions.modifierEntree({ ...entree, grammes: lecture.valeur })
      setEdition(false)
      setMessage(null)
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  async function supprimer() {
    try {
      await actions.supprimerEntree(entree.id)
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  if (edition) {
    return (
      <li>
        <form className="element pile" style={{ alignItems: 'stretch' }} onSubmit={enregistrer}>
          <span>{aliment?.nom ?? 'Aliment inconnu'}</span>
          <div className="ligne">
            <input className="etire" inputMode="decimal" autoFocus value={grammes} onChange={(e) => setGrammes(e.target.value)} />
            <span className="attenue">g</span>
          </div>
          {message && <p className="message">{message}</p>}
          <div className="ligne">
            <button type="button" className="bouton etire" onClick={supprimer}>
              Supprimer
            </button>
            <button type="button" className="bouton etire" onClick={() => setEdition(false)}>
              Annuler
            </button>
            <button className="bouton principal etire">Enregistrer</button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li>
      <button className="element" onClick={() => setEdition(true)}>
        <span className="etire tronque">{aliment?.nom ?? 'Aliment inconnu'}</span>
        <span className="attenue" style={{ flex: 'none' }}>
          {formatSaisie(entree.grammes)} g
        </span>
        <span className="droite" style={{ flex: 'none', minWidth: 72 }}>
          {formatKcal(kcal)} kcal
        </span>
      </button>
    </li>
  )
}
