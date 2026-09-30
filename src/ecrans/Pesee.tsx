import { useMemo, useState, type FormEvent } from 'react'
import { useActions, useDonnees, useProfil } from '../contexte.ts'
import { ecartTrajectoire, moyenne7 } from '../lib/calculs.ts'
import { aujourdhui, estDateValide, horodatage, libelleCourt, libelleJour } from '../lib/dates.ts'
import { formatKg, formatKgSigne } from '../lib/nombres.ts'
import { fenetrePoids, PERIODES, seriePoids, type Periode } from '../lib/series.ts'
import { lirePoids } from '../lib/validation.ts'
import { EnTete, Segments, Tuile } from '../ui/composants.tsx'
import { GraphiquePoids } from '../ui/graphiques.tsx'

const HISTORIQUE_INITIAL = 14

export default function Pesee() {
  const { pesees, jalons } = useDonnees()
  const profil = useProfil()
  const actions = useActions()
  const jour = aujourdhui()
  const [date, setDate] = useState(jour)
  const [kg, setKg] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [periode, setPeriode] = useState<Periode>('3m')
  const [toutAfficher, setToutAfficher] = useState(false)

  const moyenne = moyenne7(pesees, jour)
  const ecart = ecartTrajectoire(pesees, profil, jalons, jour)
  const historique = [...pesees].sort((a, b) => b.date.localeCompare(a.date))
  const derniere = historique[0]

  const { debut, fin } = fenetrePoids(pesees, profil, jalons, jour, periode)
  const points = useMemo(() => seriePoids(pesees, profil, jalons, debut, fin), [pesees, profil, jalons, debut, fin])

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!estDateValide(date) || date > jour) {
      setMessage('Date : aujourd’hui ou une date passée.')
      return
    }
    const lecture = lirePoids(kg)
    if (!lecture.ok) {
      setMessage(lecture.message)
      return
    }
    const existante = pesees.find((p) => p.date === date)
    if (
      existante &&
      !window.confirm(
        `Remplacer la pesée du ${libelleCourt(date)} (${formatKg(existante.kg)} kg) par ${formatKg(lecture.valeur)} kg ?`,
      )
    ) {
      return
    }
    setMessage(null)
    setEnCours(true)
    try {
      await actions.enregistrerPesee(date, lecture.valeur)
      setKg('')
      setDate(jour)
    } catch (err) {
      setMessage((err as Error).message)
    }
    setEnCours(false)
  }

  async function supprimer(id: string, dateP: string) {
    if (!window.confirm(`Supprimer la pesée du ${libelleCourt(dateP)} ?`)) return
    try {
      await actions.supprimerPesee(id)
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  return (
    <div className="contenu">
      <EnTete titre="Pesée" />

      <div className="tuile" style={{ padding: '16px 18px' }}>
        <span className="libelle">Moyenne 7 jours</span>
        <span className="valeur" style={{ fontSize: 40 }}>
          {moyenne === null ? '—' : formatKg(moyenne)}
          {moyenne !== null && <small>kg</small>}
        </span>
      </div>
      <div className="tuiles">
        <Tuile
          libelle={derniere ? `Pesée du ${libelleCourt(derniere.date)}` : 'Dernière pesée'}
          valeur={derniere ? formatKg(derniere.kg) : '—'}
          unite={derniere ? 'kg' : undefined}
        />
        <Tuile
          libelle="Écart à la trajectoire"
          valeur={ecart === null ? '—' : formatKgSigne(ecart)}
          unite={ecart === null ? undefined : 'kg'}
        />
      </div>

      <form className="carte" onSubmit={enregistrer}>
        <div className="grille-2">
          <label className="champ">
            Date
            <input type="date" value={date} max={jour} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="champ">
            Poids (kg)
            <input inputMode="decimal" placeholder="0,0" value={kg} onChange={(e) => setKg(e.target.value)} />
          </label>
        </div>
        {message && <p className="message">{message}</p>}
        <button className="bouton principal plein" disabled={enCours || !kg}>
          Enregistrer
        </button>
      </form>

      <section className="carte">
        <div className="carte-titre">
          <h2>Courbe</h2>
          <Segments options={PERIODES} valeur={periode} surChoix={setPeriode} />
        </div>
        <GraphiquePoids points={points} debut={horodatage(debut)} fin={horodatage(fin)} />
        <Legende />
      </section>

      {historique.length > 0 && (
        <section className="pile">
          <h3>Historique · toucher une pesée pour la supprimer</h3>
          <ul className="liste">
            {(toutAfficher ? historique : historique.slice(0, HISTORIQUE_INITIAL)).map((p) => (
              <li key={p.id}>
                <button className="element" onClick={() => supprimer(p.id, p.date)}>
                  <span className="etire">{libelleJour(p.date)}</span>
                  <span>{formatKg(p.kg)} kg</span>
                </button>
              </li>
            ))}
          </ul>
          {!toutAfficher && historique.length > HISTORIQUE_INITIAL && (
            <button className="bouton lien" onClick={() => setToutAfficher(true)}>
              Afficher les {historique.length} pesées
            </button>
          )}
        </section>
      )}
    </div>
  )
}

export function Legende() {
  const items: [string, string, string][] = [
    ['Moyenne 7 jours', 'var(--serie-poids)', 'solid'],
    ['Pesée', 'var(--text-faint)', 'solid'],
    ['Trajectoire', 'var(--serie-objectif)', 'dashed'],
  ]
  return (
    <div className="legende">
      {items.map(([libelle, couleur, style]) => (
        <span key={libelle}>
          <i style={{ borderTop: `2px ${style} ${couleur}` }} />
          {libelle}
        </span>
      ))}
    </div>
  )
}
