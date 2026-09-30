// Lecture de code-barres par la caméra arrière (ZXing, chargé à la demande), avec saisie
// manuelle en secours (caméra refusée ou code illisible).
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { codeBarresValide } from '../../lib/openfoodfacts.ts'
import { IconeFermer } from '../../ui/icones.tsx'

export default function LecteurCode({
  surCode,
  surFermer,
  onglets,
}: {
  surCode: (code: string) => void
  surFermer: () => void
  /** Contrôle affiché en haut, à côté du bouton de fermeture. */
  onglets?: ReactNode
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [saisie, setSaisie] = useState(false)
  const [code, setCode] = useState('')
  const rappel = useRef(surCode)

  useEffect(() => {
    rappel.current = surCode
  }, [surCode])

  useEffect(() => {
    if (saisie) return
    let arrete = false
    let controles: { stop(): void } | null = null

    async function demarrer() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErreur('Caméra indisponible dans ce navigateur.')
        setSaisie(true)
        return
      }
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ])
      if (arrete || !video.current) return
      const indices = new Map([
        [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]],
      ])
      const lecteur = new BrowserMultiFormatReader(indices, { delayBetweenScanAttempts: 120 })
      try {
        controles = await lecteur.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video.current,
          (resultat, _erreur, c) => {
            if (!resultat) return
            const lu = resultat.getText()
            if (!codeBarresValide(lu)) return
            c.stop()
            navigator.vibrate?.(30)
            rappel.current(lu)
          },
        )
        if (arrete) controles.stop()
      } catch (e) {
        const nom = (e as Error).name
        setErreur(
          nom === 'NotAllowedError'
            ? 'Accès à la caméra refusé. Il s’autorise dans Réglages > Safari > Caméra.'
            : 'Caméra indisponible.',
        )
        setSaisie(true)
      }
    }

    demarrer()
    return () => {
      arrete = true
      controles?.stop()
    }
  }, [saisie])

  function valider(e: FormEvent) {
    e.preventDefault()
    if (codeBarresValide(code)) surCode(code)
  }

  return (
    <div className="scanner">
      {!saisie && <video ref={video} playsInline muted autoPlay />}
      <div className="haut">
        <button className="bouton-rond" onClick={surFermer} aria-label="Fermer">
          <IconeFermer />
        </button>
        <div className="etire" style={{ display: 'flex', justifyContent: 'center' }}>
          {onglets}
        </div>
        <span style={{ width: 44 }} />
      </div>

      {saisie ? (
        <form className="contenu" style={{ paddingTop: 16 }} onSubmit={valider}>
          {erreur && <p className="message">{erreur}</p>}
          <label className="champ">
            Code-barres
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              autoFocus
              placeholder="8, 12 ou 13 chiffres"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <button className="bouton principal plein" disabled={!codeBarresValide(code)}>
            Rechercher
          </button>
          {!erreur && (
            <button type="button" className="bouton lien" onClick={() => setSaisie(false)}>
              Revenir à la caméra
            </button>
          )}
        </form>
      ) : (
        <>
          <div className="viseur">
            <div className="cadre" />
          </div>
          <div className="bas">
            <p className="consigne">Placez le code-barres dans le cadre.</p>
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
              <button className="bouton" onClick={() => setSaisie(true)}>
                Saisir le code
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
