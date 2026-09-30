import { useState, type FormEvent } from 'react'
import { formatKcal, formatSaisie, lireDecimal } from '../../lib/nombres.ts'
import { normaliser, type ValeursSaisies } from '../../lib/nutrition.ts'
import type { NouvelAliment, Source } from '../../lib/types.ts'

export interface ValeursFormulaire {
  nom?: string
  marque?: string | null
  code_barres?: string | null
  kcal?: number | null
  glucides?: number | null
  proteines?: number | null
  lipides?: number | null
  fibres?: number | null
}

interface Props {
  initial: ValeursFormulaire
  source: Source
  sourceRef?: string | null
  /** Contrôle de cohérence affiché (imports Open Food Facts uniquement, §7.3). */
  controleCoherence?: boolean
  libelleValidation: string
  surValidation(aliment: NouvelAliment): Promise<void>
}

const CHAMPS = [
  ['kcal', 'Énergie (kcal)'],
  ['glucides', 'Glucides (g)'],
  ['proteines', 'Protéines (g)'],
  ['lipides', 'Lipides (g)'],
  ['fibres', 'Fibres (g)'],
] as const

type CleValeur = (typeof CHAMPS)[number][0]

export default function FormulaireAliment({
  initial,
  source,
  sourceRef = null,
  controleCoherence = false,
  libelleValidation,
  surValidation,
}: Props) {
  const texte = (v: number | null | undefined) => (v === null || v === undefined ? '' : formatSaisie(v))
  const [nom, setNom] = useState(initial.nom ?? '')
  const [marque, setMarque] = useState(initial.marque ?? '')
  const [valeurs, setValeurs] = useState<Record<CleValeur, string>>({
    kcal: texte(initial.kcal),
    glucides: texte(initial.glucides),
    proteines: texte(initial.proteines),
    lipides: texte(initial.lipides),
    fibres: texte(initial.fibres),
  })
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const formatsInvalides = CHAMPS.filter(([cle]) => valeurs[cle].trim() && lireDecimal(valeurs[cle], 3) === null)
  const lues: ValeursSaisies = Object.fromEntries(
    CHAMPS.map(([cle]) => [cle, valeurs[cle].trim() ? lireDecimal(valeurs[cle], 3) : null]),
  )
  const resultat = normaliser(lues)

  async function valider(e: FormEvent) {
    e.preventDefault()
    const erreurs: string[] = []
    if (!nom.trim()) erreurs.push('Nom absent.')
    for (const [, libelle] of formatsInvalides) erreurs.push(`${libelle} : nombre attendu.`)
    if (!resultat.ok) erreurs.push(...resultat.erreurs)
    if (erreurs.length || !resultat.ok) {
      setMessage(erreurs.join(' '))
      return
    }
    setMessage(null)
    setEnCours(true)
    try {
      await surValidation({
        nom: nom.trim(),
        marque: marque.trim() || null,
        code_barres: initial.code_barres ?? null,
        source,
        source_ref: sourceRef,
        kcal_100g: resultat.valeurs.kcal,
        glucides_100g: resultat.valeurs.glucides,
        proteines_100g: resultat.valeurs.proteines,
        lipides_100g: resultat.valeurs.lipides,
        fibres_100g: resultat.valeurs.fibres,
        kcal_estimee: resultat.kcal_estimee,
      })
    } catch (erreur) {
      setMessage((erreur as Error).message)
      setEnCours(false)
    }
  }

  return (
    <form className="pile" style={{ gap: 16 }} onSubmit={valider}>
      <label className="champ">
        Nom
        <input value={nom} onChange={(e) => setNom(e.target.value)} autoCapitalize="sentences" />
      </label>
      <label className="champ">
        Marque (facultatif)
        <input value={marque} onChange={(e) => setMarque(e.target.value)} />
      </label>
      {initial.code_barres && (
        <p className="petit attenue">Code-barres {initial.code_barres}</p>
      )}

      <h3>Pour 100 g</h3>
      <div className="grille-2">
        {CHAMPS.map(([cle, libelle]) => (
          <label className="champ" key={cle}>
            {libelle}
            <input
              inputMode="decimal"
              value={valeurs[cle]}
              placeholder={cle === 'kcal' || cle === 'fibres' ? 'facultatif' : ''}
              onChange={(e) => setValeurs((v) => ({ ...v, [cle]: e.target.value }))}
            />
          </label>
        ))}
      </div>

      {resultat.ok && resultat.kcal_estimee && (
        <p className="petit attenue">
          Énergie estimée par les coefficients d’Atwater : {formatKcal(resultat.valeurs.kcal)} kcal.
        </p>
      )}
      {controleCoherence && resultat.ok && resultat.suspect && (
        <p className="message">
          Donnée suspecte : l’énergie déclarée ({formatKcal(resultat.valeurs.kcal)} kcal) s’écarte de
          plus de 20 % de la valeur calculée à partir des macronutriments (
          {formatKcal(resultat.atwater)} kcal).
        </p>
      )}
      {message && <p className="message">{message}</p>}

      <button className="bouton principal plein" disabled={enCours}>
        {libelleValidation}
      </button>
    </form>
  )
}
