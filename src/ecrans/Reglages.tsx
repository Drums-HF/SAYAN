import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useActions, useDonnees, useProfil } from '../contexte.ts'
import { ajouterMois, aujourdhui, ecartJours, libelleJour, libelleMois, premierJourDuMois } from '../lib/dates.ts'
import { creerExport, lireExport, telecharger, zipCsv } from '../lib/export.ts'
import { formatKg, formatSaisie } from '../lib/nombres.ts'
import type { Jalon } from '../lib/types.ts'
import { lirePoids } from '../lib/validation.ts'
import { EnTete } from '../ui/composants.tsx'
import FormulaireProfil from './FormulaireProfil.tsx'

const DELAI_RAPPEL_EXPORT = 30

export default function Reglages() {
  return (
    <div className="contenu">
      <EnTete titre="Réglages" retour />
      <SectionExport />
      <SectionProfil />
      <SectionJalons />
      <section className="carte">
        <h2>Session</h2>
        <button className="bouton plein" onClick={() => window.location.reload()}>
          Verrouiller
        </button>
      </section>
    </div>
  )
}

function SectionProfil() {
  const profil = useProfil()
  const actions = useActions()
  const [enregistre, setEnregistre] = useState(false)
  return (
    <section className="carte">
      <h2>Profil et objectifs</h2>
      <FormulaireProfil
        initial={profil}
        avecDateDebut
        libelleValidation={enregistre ? 'Enregistré' : 'Enregistrer'}
        surValidation={async (p) => {
          // Pas de fusion avec l'ancien profil : un objectif protéines vidé doit disparaître.
          await actions.enregistrerProfil({
            ...p,
            date_debut: p.date_debut ?? profil.date_debut,
            ...(profil.dernier_export ? { dernier_export: profil.dernier_export } : {}),
          })
          setEnregistre(true)
          setTimeout(() => setEnregistre(false), 1500)
        }}
      />
    </section>
  )
}

function SectionJalons() {
  const { jalons } = useDonnees()
  const actions = useActions()
  const [mois, setMois] = useState(() => premierJourDuMois(aujourdhui()).slice(0, 7))
  const [kg, setKg] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function ajouter(e: FormEvent) {
    e.preventDefault()
    if (!/^\d{4}-\d{2}$/.test(mois)) {
      setMessage('Mois attendu.')
      return
    }
    const lecture = lirePoids(kg)
    if (!lecture.ok) {
      setMessage(lecture.message)
      return
    }
    const cible = `${mois}-01`
    const existant = jalons.find((j) => j.mois === cible)
    if (existant && !window.confirm(`Remplacer le jalon de ${libelleMois(cible)} (${formatKg(existant.poids_cible_kg)} kg) ?`)) {
      return
    }
    setMessage(null)
    try {
      await actions.enregistrerJalon(cible, lecture.valeur)
      setKg('')
      setMois(ajouterMois(cible, 1).slice(0, 7))
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  return (
    <section className="carte">
      <h2>Jalons mensuels</h2>
      <p className="petit discret">Poids visé au dernier jour du mois.</p>
      {jalons.length > 0 && (
        <ul className="liste">
          {jalons.map((j) => (
            <LigneJalon key={j.id} jalon={j} />
          ))}
        </ul>
      )}
      <form className="pile" style={{ gap: 12 }} onSubmit={ajouter}>
        <div className="grille-2">
          <label className="champ">
            Mois
            <input type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
          </label>
          <label className="champ">
            Poids visé (kg)
            <input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} />
          </label>
        </div>
        {message && <p className="message">{message}</p>}
        <button className="bouton plein" disabled={!kg}>
          Ajouter le jalon
        </button>
      </form>
    </section>
  )
}

function LigneJalon({ jalon }: { jalon: Jalon }) {
  const actions = useActions()
  const [edition, setEdition] = useState(false)
  const [kg, setKg] = useState(formatSaisie(jalon.poids_cible_kg))
  const [message, setMessage] = useState<string | null>(null)

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    const lecture = lirePoids(kg)
    if (!lecture.ok) {
      setMessage(lecture.message)
      return
    }
    try {
      await actions.enregistrerJalon(jalon.mois, lecture.valeur)
      setEdition(false)
      setMessage(null)
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer le jalon de ${libelleMois(jalon.mois)} ?`)) return
    try {
      await actions.supprimerJalon(jalon.id)
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  if (edition) {
    return (
      <li>
        <form className="element pile" style={{ alignItems: 'stretch' }} onSubmit={enregistrer}>
          <span>{libelleMois(jalon.mois)}</span>
          <input inputMode="decimal" autoFocus value={kg} onChange={(e) => setKg(e.target.value)} />
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
        <span className="etire">{libelleMois(jalon.mois)}</span>
        <span>{formatKg(jalon.poids_cible_kg)} kg</span>
      </button>
    </li>
  )
}

function SectionExport() {
  const donnees = useDonnees()
  const profil = useProfil()
  const actions = useActions()
  const fichier = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const jour = aujourdhui()
  const dernier = profil.dernier_export
  const rappel = !dernier || ecartJours(dernier, jour) >= DELAI_RAPPEL_EXPORT

  async function exporter(format: 'json' | 'csv') {
    setMessage(null)
    const e = creerExport({ ...donnees, profil }, jour)
    if (format === 'json') {
      telecharger(`sayan-${jour}.json`, JSON.stringify(e, null, 2), 'application/json')
    } else {
      telecharger(`sayan-${jour}-csv.zip`, zipCsv(e), 'application/zip')
    }
    try {
      await actions.enregistrerProfil({ ...profil, dernier_export: jour })
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  async function importer(evenement: ChangeEvent<HTMLInputElement>) {
    const f = evenement.target.files?.[0]
    evenement.target.value = ''
    if (!f) return
    setMessage(null)
    const lecture = lireExport(await f.text())
    if (!lecture.ok) {
      setMessage(lecture.message)
      return
    }
    const e = lecture.export
    const resume = `${e.aliments.length} aliments, ${e.entrees.length} entrées, ${e.pesees.length} pesées, ${e.jalons.length} jalons`
    if (
      !window.confirm(
        `Remplacer toutes les données actuelles par celles de l’export du ${libelleJour(e.date_export)} (${resume}) ?`,
      )
    ) {
      return
    }
    setEnCours(true)
    try {
      await actions.remplacerTout({
        profil: e.profil,
        aliments: e.aliments,
        entrees: e.entrees,
        pesees: e.pesees,
        jalons: e.jalons,
      })
      setMessage(`Données restaurées : ${resume}.`)
    } catch (err) {
      setMessage(`Restauration interrompue : ${(err as Error).message}`)
    }
    setEnCours(false)
  }

  return (
    <section className="carte">
      <h2>Export et sauvegarde</h2>
      <p className={rappel ? 'petit attenue' : 'petit discret'}>
        {dernier ? `Dernier export : ${libelleJour(dernier)}.` : 'Aucun export.'}
        {rappel && dernier ? ` Aucun export depuis ${DELAI_RAPPEL_EXPORT} jours.` : ''}
      </p>
      <div className="grille-2">
        <button className="bouton" onClick={() => exporter('json')} disabled={enCours}>
          Export JSON
        </button>
        <button className="bouton" onClick={() => exporter('csv')} disabled={enCours}>
          Export CSV
        </button>
      </div>
      <button className="bouton plein" onClick={() => fichier.current?.click()} disabled={enCours}>
        {enCours ? 'Restauration…' : 'Importer un export JSON'}
      </button>
      <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={importer} />
      <p className="petit discret">
        L’export contient toutes les données en clair. C’est la seule sauvegarde en cas de perte du mot de passe.
      </p>
      {message && <p className="message">{message}</p>}
    </section>
  )
}
