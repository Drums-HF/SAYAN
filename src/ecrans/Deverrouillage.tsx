import { useState, type FormEvent } from 'react'
import { deverrouiller } from '../lib/auth.ts'

export default function Deverrouillage({ surSucces }: { surSucces: () => void }) {
  const [motDePasse, setMotDePasse] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function valider(e: FormEvent) {
    e.preventDefault()
    if (!motDePasse || enCours) return
    setEnCours(true)
    setMessage(null)
    try {
      const resultat = await deverrouiller(motDePasse)
      if (resultat === 'ok') {
        surSucces()
        return
      }
      setMessage('Mot de passe incorrect.')
    } catch (erreur) {
      setMessage((erreur as Error).message)
    }
    setEnCours(false)
  }

  return (
    <div className="ecran">
      <form className="contenu centre" onSubmit={valider}>
        <h1>SAYAN</h1>
        <label className="champ">
          Mot de passe
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            disabled={enCours}
          />
        </label>
        {message && <p className="message">{message}</p>}
        <button className="bouton principal plein" disabled={!motDePasse || enCours}>
          {enCours ? (
            <>
              <span className="indicateur" /> Dérivation de la clé…
            </>
          ) : (
            'Déverrouiller'
          )}
        </button>
      </form>
    </div>
  )
}
