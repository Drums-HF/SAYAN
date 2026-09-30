import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useActions, useDonnees, useProfil } from '../contexte.ts'
import { useDerives } from '../derives.ts'
import { apport, deficitDuJour, depenseJournaliere, TOTAUX_NULS } from '../lib/calculs.ts'
import { ajouterJours, aujourdhui, dateParDefaut, estDateValide, libelleCourt, libelleJour } from '../lib/dates.ts'
import { formatEstimation, formatGrammes, formatKcal, formatSaisie } from '../lib/nombres.ts'
import type { Aliment, Entree } from '../lib/types.ts'
import { lireGrammes } from '../lib/validation.ts'
import { Anneau, Barre } from '../ui/composants.tsx'
import { IconePrecedent, IconeReglages, IconeSuivant } from '../ui/icones.tsx'
import { suffixeDate } from './ajout/navigation.ts'

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function titreDate(date: string): string {
  if (date === aujourdhui()) return 'Aujourd’hui'
  if (date === ajouterJours(aujourdhui(), -1)) return 'Hier'
  return majuscule(libelleJour(date))
}

export default function Journal() {
  const { entrees, pesees } = useDonnees()
  const profil = useProfil()
  const actions = useActions()
  const { alimentsParId, totauxJours } = useDerives()
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
  const objectifProteines = profil.objectif_proteines_g

  async function reprendreHier() {
    setMessage(null)
    try {
      await actions.ajouterEntrees(entreesVeille.map((e) => ({ date, aliment_id: e.aliment_id, grammes: e.grammes })))
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  return (
    <div className="contenu">
      <header className="entete">
        <div className="etire">
          <div className="jours">
            <button onClick={() => changerDate(ajouterJours(date, -1))} aria-label="Jour précédent">
              <IconePrecedent />
            </button>
            <label className="date-choix">
              {majuscule(libelleCourt(date))}
              <input type="date" value={date} max={aujourdhui()} onChange={(e) => changerDate(e.target.value)} aria-label="Choisir la date" />
            </label>
            <button onClick={() => changerDate(ajouterJours(date, 1))} disabled={date >= aujourdhui()} aria-label="Jour suivant">
              <IconeSuivant />
            </button>
          </div>
          <h1>{titreDate(date)}</h1>
        </div>
        <Link className="bouton-rond" to="/reglages" aria-label="Réglages">
          <IconeReglages />
        </Link>
      </header>

      <Anneau fraction={totaux.kcal / profil.objectif_calorique}>
        <span className="chiffre">{formatKcal(totaux.kcal)}</span>
        <span className="petit attenue">kcal</span>
        <span className="tres-petit discret">objectif {formatKcal(profil.objectif_calorique)}</span>
      </Anneau>

      <div className="tuile" style={{ gap: 8 }}>
        <div className="entre">
          <span className="libelle">Protéines</span>
          {objectifProteines && <span className="tres-petit discret">objectif {formatGrammes(objectifProteines).replace(/,0$/, '')} g</span>}
        </div>
        <span className="valeur">
          {formatGrammes(totaux.proteines)}
          <small>g</small>
        </span>
        {objectifProteines && <Barre fraction={totaux.proteines / objectifProteines} />}
      </div>

      {message && <p className="message">{message}</p>}

      <ul className="liste">
        {duJour.map((e) => (
          <LigneEntree key={e.id} entree={e} aliment={alimentsParId.get(e.aliment_id)} />
        ))}
        <li>
          <div className="element">
            <Link className="etire accent" style={{ fontWeight: 600 }} to={`/ajout${suffixeDate(date)}`}>
              + Ajouter un aliment
            </Link>
            {duJour.length === 0 && entreesVeille.length > 0 && (
              <button className="bouton" style={{ minHeight: 36, padding: '6px 12px', fontSize: 14 }} onClick={reprendreHier}>
                Reprendre hier
              </button>
            )}
          </div>
        </li>
      </ul>

      <div className="bas-journal">
        <span>DEJ {formatEstimation(dej)} kcal</span>
        <span>Déficit {deficit === null ? '—' : `${formatEstimation(deficit)} kcal`}</span>
      </div>
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
        <form className="element pile" style={{ alignItems: 'stretch', gap: 10 }} onSubmit={enregistrer}>
          <span>{aliment?.nom ?? 'Aliment inconnu'}</span>
          <label className="champ-grammes">
            <input className="etire" inputMode="decimal" autoFocus value={grammes} onChange={(e) => setGrammes(e.target.value)} aria-label="Grammes" />
            <span className="attenue">g</span>
          </label>
          {message && <p className="message">{message}</p>}
          <div className="ligne" style={{ gap: 8 }}>
            <button type="button" className="bouton etire" onClick={supprimer}>
              Supprimer
            </button>
            <button type="button" className="bouton etire" onClick={() => setEdition(false)}>
              Annuler
            </button>
            <button className="bouton etire" style={{ background: 'var(--accent)', color: 'var(--sur-accent)' }}>
              Enregistrer
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li>
      <button className="element" onClick={() => setEdition(true)}>
        <span className="etire pile" style={{ gap: 2 }}>
          <span className="tronque">{aliment?.nom ?? 'Aliment inconnu'}</span>
          <span className="sous-titre">{formatSaisie(entree.grammes)} g</span>
        </span>
        <span style={{ flex: 'none' }}>{formatKcal(kcal)}</span>
      </button>
    </li>
  )
}
