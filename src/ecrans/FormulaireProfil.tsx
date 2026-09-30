import { useState, type FormEvent } from 'react'
import { estDateValide } from '../lib/dates.ts'
import { formatSaisie } from '../lib/nombres.ts'
import { NIVEAUX, type NiveauActivite, type Profil, type Sexe } from '../lib/types.ts'
import { lirePoids, lirePositif } from '../lib/validation.ts'

export const OBJECTIF_CALORIQUE_DEFAUT = 1500

interface Props {
  initial: Partial<Profil>
  /** Afficher la date de début (réglages) ; à l'initialisation elle vaut aujourd'hui. */
  avecDateDebut: boolean
  libelleValidation: string
  surValidation(profil: Omit<Profil, 'date_debut'> & { date_debut?: string }): Promise<void> | void
}

export default function FormulaireProfil({ initial, avecDateDebut, libelleValidation, surValidation }: Props) {
  const texte = (n: number | undefined) => (n === undefined ? '' : formatSaisie(n))
  const [sexe, setSexe] = useState<Sexe | ''>(initial.sexe ?? '')
  const [naissance, setNaissance] = useState(initial.date_naissance ?? '')
  const [taille, setTaille] = useState(texte(initial.taille_cm))
  const [poidsInitial, setPoidsInitial] = useState(texte(initial.poids_initial_kg))
  const [niveau, setNiveau] = useState<NiveauActivite | ''>(initial.niveau_activite ?? '')
  const [objectif, setObjectif] = useState(texte(initial.objectif_calorique ?? OBJECTIF_CALORIQUE_DEFAUT))
  const [proteines, setProteines] = useState(texte(initial.objectif_proteines_g))
  const [debut, setDebut] = useState(initial.date_debut ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function valider(e: FormEvent) {
    e.preventDefault()
    const erreurs: string[] = []
    if (!sexe) erreurs.push('Sexe : à choisir.')
    if (!estDateValide(naissance)) erreurs.push('Date de naissance : date attendue.')
    const t = lirePositif(taille)
    if (!t.ok) erreurs.push(`Taille : ${t.message}`)
    const p = lirePoids(poidsInitial)
    if (!p.ok) erreurs.push(`Poids initial : ${p.message}`)
    if (!niveau) erreurs.push('Niveau d’activité : à choisir.')
    const o = lirePositif(objectif, 0)
    if (!o.ok) erreurs.push('Objectif calorique : nombre entier positif attendu.')
    const pr = proteines.trim() ? lirePositif(proteines) : null
    if (pr && !pr.ok) erreurs.push(`Objectif protéines : ${pr.message}`)
    if (avecDateDebut && !estDateValide(debut)) erreurs.push('Date de début : date attendue.')

    if (erreurs.length || !t.ok || !p.ok || !o.ok || !sexe || !niveau) {
      setMessage(erreurs.join(' '))
      return
    }
    setMessage(null)
    setEnCours(true)
    try {
      await surValidation({
        sexe,
        date_naissance: naissance,
        taille_cm: t.valeur,
        poids_initial_kg: p.valeur,
        niveau_activite: niveau,
        objectif_calorique: o.valeur,
        ...(pr?.ok ? { objectif_proteines_g: pr.valeur } : {}),
        ...(avecDateDebut ? { date_debut: debut } : {}),
        ...(initial.dernier_export ? { dernier_export: initial.dernier_export } : {}),
      })
    } catch (erreur) {
      setMessage((erreur as Error).message)
    }
    setEnCours(false)
  }

  return (
    <form className="pile" style={{ gap: 16 }} onSubmit={valider}>
      <label className="champ">
        Sexe
        <select value={sexe} onChange={(e) => setSexe(e.target.value as Sexe)}>
          <option value="" disabled>
            Choisir
          </option>
          <option value="homme">Homme</option>
          <option value="femme">Femme</option>
        </select>
      </label>
      <label className="champ">
        Date de naissance
        <input type="date" value={naissance} onChange={(e) => setNaissance(e.target.value)} />
      </label>
      <div className="grille-2">
        <label className="champ">
          Taille (cm)
          <input inputMode="decimal" value={taille} onChange={(e) => setTaille(e.target.value)} />
        </label>
        <label className="champ">
          Poids initial (kg)
          <input
            inputMode="decimal"
            value={poidsInitial}
            onChange={(e) => setPoidsInitial(e.target.value)}
          />
        </label>
      </div>
      <label className="champ">
        Niveau d’activité
        <select value={niveau} onChange={(e) => setNiveau(e.target.value as NiveauActivite)}>
          <option value="" disabled>
            Choisir
          </option>
          {NIVEAUX.map((n) => (
            <option key={n.valeur} value={n.valeur}>
              {n.libelle}
            </option>
          ))}
        </select>
      </label>
      <div className="grille-2">
        <label className="champ">
          Objectif (kcal par jour)
          <input inputMode="numeric" value={objectif} onChange={(e) => setObjectif(e.target.value)} />
        </label>
        <label className="champ">
          Protéines (g, facultatif)
          <input
            inputMode="decimal"
            value={proteines}
            onChange={(e) => setProteines(e.target.value)}
          />
        </label>
      </div>
      {avecDateDebut && (
        <label className="champ">
          Date de début du suivi
          <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
        </label>
      )}
      {message && <p className="message">{message}</p>}
      <button className="bouton principal plein" disabled={enCours}>
        {libelleValidation}
      </button>
    </form>
  )
}
