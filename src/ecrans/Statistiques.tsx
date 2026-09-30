import type { ReactNode } from 'react'
import { useDonnees, useProfil } from '../contexte.ts'
import { useDerives } from '../derives.ts'
import { deficitCumule, depenseJournaliere, type Totaux } from '../lib/calculs.ts'
import { ajouterJours, aujourdhui, horodatage, libelleCourt, libelleMois, libelleMoisCourt, plageJours } from '../lib/dates.ts'
import { formatEstimation, formatGrammes, formatKcal } from '../lib/nombres.ts'
import { fenetrePoids, serieJournaliere, seriePoids } from '../lib/series.ts'
import { dernieresSemaines, derniersMois, moyennePlage, regularite, type Moyenne } from '../lib/statistiques.ts'
import { EnTete } from '../ui/composants.tsx'
import { GraphiqueBarres, GraphiqueCategories, GraphiquePoids } from '../ui/graphiques.tsx'
import { Legende } from './Pesee.tsx'

const JOURS_GRAPHIQUES = 30
const SEMAINES = 8
const MOIS = 6

const entier = (v: number) => formatKcal(v)
const grammes = (v: number) => formatGrammes(v).replace(/,0$/, '')

export default function Statistiques() {
  const { pesees, jalons } = useDonnees()
  const profil = useProfil()
  const { totauxJours } = useDerives()
  const jour = aujourdhui()
  const debut = ajouterJours(jour, -(JOURS_GRAPHIQUES - 1))
  const t0 = horodatage(debut)
  const t1 = horodatage(jour)

  const serie = (cle: keyof Totaux) => serieJournaliere(debut, jour, (j) => totauxJours.get(j)?.[cle])

  const deficits = serieJournaliere(debut, jour, (j) => {
    const t = totauxJours.get(j)
    return t ? depenseJournaliere(profil, pesees, j) - t.kcal : null
  })
  const cumul30 = deficitCumule(plageJours(debut, jour), profil, pesees, totauxJours)
  const cumulTotal = deficitCumule(
    profil.date_debut <= jour ? plageJours(profil.date_debut, jour) : [],
    profil,
    pesees,
    totauxJours,
  )

  const { debut: debutPoids, fin: finPoids } = fenetrePoids(pesees, profil, jalons, jour, 'tout')
  const pointsPoids = seriePoids(pesees, profil, jalons, debutPoids, finPoids)

  const semaines = dernieresSemaines(jour, SEMAINES).map((p) => moyennePlage(totauxJours, p))
  const mois = derniersMois(jour, MOIS).map((p) => moyennePlage(totauxJours, p))
  const assiduite = regularite(totauxJours, profil.date_debut, jour).map((r) => ({
    libelle: libelleMoisCourt(r.mois),
    valeur: r.renseignes,
    detail: `${libelleMois(r.mois)} : ${r.renseignes} / ${r.possibles} jours`,
  }))

  return (
    <div className="contenu">
      <EnTete titre="Statistiques" />

      <Bloc titre="Calories par jour" sousTitre={`30 jours · objectif ${formatKcal(profil.objectif_calorique)} kcal`}>
        <GraphiqueBarres
          points={serie('kcal')}
          couleur="var(--serie-kcal)"
          unite="kcal"
          format={entier}
          reference={profil.objectif_calorique}
          debut={t0}
          fin={t1}
        />
      </Bloc>

      <Bloc titre="Moyennes" sousTitre="Jours renseignés uniquement">
        <TableMoyennes titre="Semaine du" lignes={semaines} libelle={(m) => `${libelleCourt(m.plage.debut)}`} />
        <TableMoyennes titre="Mois" lignes={mois} libelle={(m) => libelleMois(m.plage.debut)} />
      </Bloc>

      <Bloc
        titre="Protéines par jour"
        sousTitre={profil.objectif_proteines_g ? `objectif ${grammes(profil.objectif_proteines_g)} g` : '30 jours'}
      >
        <GraphiqueBarres
          points={serie('proteines')}
          couleur="var(--serie-proteines)"
          unite="g"
          format={grammes}
          reference={profil.objectif_proteines_g}
          debut={t0}
          fin={t1}
        />
      </Bloc>

      <Bloc titre="Glucides par jour" sousTitre="30 jours">
        <GraphiqueBarres points={serie('glucides')} couleur="var(--serie-glucides)" unite="g" format={grammes} debut={t0} fin={t1} />
      </Bloc>
      <Bloc titre="Lipides par jour" sousTitre="30 jours">
        <GraphiqueBarres points={serie('lipides')} couleur="var(--serie-lipides)" unite="g" format={grammes} debut={t0} fin={t1} />
      </Bloc>
      <Bloc titre="Fibres par jour" sousTitre="30 jours">
        <GraphiqueBarres points={serie('fibres')} couleur="var(--serie-fibres)" unite="g" format={grammes} debut={t0} fin={t1} />
      </Bloc>

      <Bloc titre="Déficit estimé par jour" sousTitre="30 jours · estimation, coefficient d’activité forfaitaire">
        <GraphiqueBarres
          points={deficits}
          couleur="var(--serie-kcal)"
          unite="kcal"
          format={(v) => formatEstimation(v).replace('≈ ', '')}
          debut={t0}
          fin={t1}
        />
        <div className="carte">
          <LigneCumul libelle="Cumul sur 30 jours" cumul={cumul30} />
          <LigneCumul libelle="Cumul depuis le début" cumul={cumulTotal} />
        </div>
      </Bloc>

      <Bloc titre="Poids et trajectoire" sousTitre="Depuis le début du suivi">
        <GraphiquePoids points={pointsPoids} debut={horodatage(debutPoids)} fin={horodatage(finPoids)} />
        <Legende />
      </Bloc>

      <Bloc titre="Régularité de la saisie" sousTitre="Jours renseignés par mois">
        <GraphiqueCategories
          points={assiduite}
          couleur="var(--serie-kcal)"
          format={(v) => String(v)}
          infobulle={(p) => p.detail}
        />
      </Bloc>
    </div>
  )
}

function Bloc({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: ReactNode }) {
  return (
    <section className="pile" style={{ gap: 10, marginTop: 8 }}>
      <div>
        <h2>{titre}</h2>
        {sousTitre && <p className="petit discret">{sousTitre}</p>}
      </div>
      {children}
    </section>
  )
}

function LigneCumul({ libelle, cumul }: { libelle: string; cumul: { somme: number; jours: number } }) {
  return (
    <div className="entre">
      <span className="attenue">{libelle}</span>
      <span className="droite">
        {cumul.jours ? `${formatEstimation(cumul.somme)} kcal` : '—'}
        <span className="petit discret">
          {' '}
          · {cumul.jours} jour{cumul.jours > 1 ? 's' : ''}
        </span>
      </span>
    </div>
  )
}

function TableMoyennes({
  titre,
  lignes,
  libelle,
}: {
  titre: string
  lignes: Moyenne[]
  libelle: (m: Moyenne) => string
}) {
  return (
    <table className="tableau">
      <thead>
        <tr>
          <th>{titre}</th>
          <th>kcal</th>
          <th>Protéines</th>
          <th>Jours</th>
        </tr>
      </thead>
      <tbody>
        {lignes.map((m) => (
          <tr key={m.plage.debut}>
            <td>{libelle(m)}</td>
            <td>{m.kcal === null ? '—' : formatKcal(m.kcal)}</td>
            <td>{m.proteines === null ? '—' : `${formatGrammes(m.proteines)} g`}</td>
            <td>{m.jours}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
