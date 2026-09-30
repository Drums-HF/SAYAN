import { useState, type FormEvent } from 'react'
import { creerCompte, LONGUEUR_MIN_MOT_DE_PASSE } from '../lib/auth.ts'

export default function CreationCompte({ surSucces }: { surSucces: () => void }) {
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [compris, setCompris] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const assezLong = motDePasse.length >= LONGUEUR_MIN_MOT_DE_PASSE
  const identiques = motDePasse === confirmation
  const valide = assezLong && identiques && compris

  async function valider(e: FormEvent) {
    e.preventDefault()
    if (!valide || enCours) return
    setEnCours(true)
    setMessage(null)
    try {
      await creerCompte(motDePasse)
      surSucces()
    } catch (erreur) {
      setMessage((erreur as Error).message)
      setEnCours(false)
    }
  }

  return (
    <div className="ecran">
      <form className="contenu" onSubmit={valider}>
        <h1>Création du compte</h1>

        <div className="carte">
          <h2>Mot de passe définitif</h2>
          <p>
            Ce mot de passe chiffre toutes les données de santé dans le navigateur. Il ne peut être
            ni changé ni récupéré.
          </p>
          <p>
            Le perdre rend les données définitivement illisibles, y compris pour le serveur.
            L’export des réglages est la seule sauvegarde possible.
          </p>
        </div>

        <label className="champ">
          Mot de passe ({LONGUEUR_MIN_MOT_DE_PASSE} caractères au minimum)
          <input
            type="password"
            autoComplete="new-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            disabled={enCours}
          />
        </label>
        {motDePasse && !assezLong && (
          <p className="petit attenue">
            {motDePasse.length} caractère{motDePasse.length > 1 ? 's' : ''} sur{' '}
            {LONGUEUR_MIN_MOT_DE_PASSE}.
          </p>
        )}

        <label className="champ">
          Confirmation
          <input
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            disabled={enCours}
          />
        </label>
        {confirmation && !identiques && (
          <p className="petit attenue">Les deux saisies diffèrent.</p>
        )}

        <label className="ligne">
          <input
            type="checkbox"
            checked={compris}
            onChange={(e) => setCompris(e.target.checked)}
            disabled={enCours}
          />
          <span className="etire">
            J’ai compris que ce mot de passe est définitif et irrécupérable.
          </span>
        </label>

        {message && <p className="message">{message}</p>}

        <button className="bouton principal plein" disabled={!valide || enCours}>
          {enCours ? (
            <>
              <span className="indicateur" /> Création…
            </>
          ) : (
            'Créer le compte'
          )}
        </button>
      </form>
    </div>
  )
}
