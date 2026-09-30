import { useState, type ReactNode } from 'react'
import { useDonnees, useProfil } from '../contexte.ts'
import { useDerives } from '../derives.ts'
import { courbeLissee, deficitCumule, depenseJournaliere, moyenne7, type Totaux } from '../lib/calculs.ts'
import {
  ajouterJours,
  aujourdhui,
  horodatage,
  libelleCourt,
  libelleMois,
  libelleMoisCourt,
  plageJours,
  premierJourDuMois,
} from '../lib/dates.ts'
import { formatEstimation, formatGrammes, formatKcal, formatKg, formatKgSigne } from '../lib/nombres.ts'
import { serieJournaliere, seriePoids } from '../lib/series.ts'
import {
  dernieresSemaines,
  derniersMois,
  evolutionPoids,
  joursRenseignes,
  moyennePlage,
  regularite,
  type Moyenne,
} from '../lib/statistiques.ts'
import { EnTete, Segments, Tuile } from '../ui/composants.tsx'
import { GraphiqueBarres, GraphiqueCategories, GraphiquePoids } from '../ui/graphiques.tsx'
import { Legende } from './Pesee.tsx'

type Periode = '7' | '30' | '90'
const PERIODES: { valeur: Periode; libelle: string }[] = [
  { valeur: '7', libelle: '7 j' },
  { valeur: '30', libelle: '30 j' },
  { valeur: '90', libelle: '90 j' },
]
const SEMAINES = 8
const MOIS = 6

const grammes = (v: number) => formatGrammes(v).replace(/,0$/, '')

export default function Statistiques() {
  const { pesees, jalons } = useDonnees()
  const profil = useProfil()
  const { totauxJours } = useDerives()
  const [periode, setPeriode] = useState<Periode>('30')
  const jour = aujourdhui()
  const debut = ajouterJours(jour, -(Number(periode) - 1))
  const plage = { debut, fin: jour }
  const t0 = horodatage(debut)
  const t1 = horodatage(jour)

  const serie = (cle: keyof Totaux) => serieJournaliere(debut, jour, (j) => totauxJours.get(j)?.[cle])
  const deficits = serieJournaliere(debut, jour, (j) => {
    const t = totauxJours.get(j)
    return t ? depenseJournaliere(profil, pesees, j) - t.kcal : null
  })
  const cumulPeriode = deficitCumule(plageJours(debut, jour), profil, pesees, totauxJours)
  const cumulTotal = deficitCumule(
    profil.date_debut <= jour ? plageJours(profil.date_debut, jour) : [],
    profil,
    pesees,
    totauxJours,
  )

  const moyenne = moyennePlage(totauxJours, plage)
  const evolution = evolutionPoids(courbeLissee(pesees), plage)
  const regulier = joursRenseignes(totauxJours, plage)
  const moyenneJour = moyenne7(pesees, jour)
  const jalonDuMois = jalons.find((j) => j.mois === premierJourDuMois(jour))

  const semaines = dernieresSemaines(jour, SEMAINES).map((p) => moyennePlage(totauxJours, p))
  const mois = derniersMois(jour, MOIS).map((p) => moyennePlage(totauxJours, p))
  const assiduite = regularite(totauxJours, profil.date_debut, jour).map((r) => ({
    libelle: libelleMoisCourt(r.mois),
    valeur: r.renseignes,
    detail: `${libelleMois(r.mois)} : ${r.renseignes} / ${r.possibles} jours`,
  }))

  return (
    <div className="contenu">
      <EnTete titre="Statistiques" action={<Segments options={PERIODES} valeur={periode} surChoix={setPeriode} />} />

      <div className="tuiles">
        <Tuile libelle="kcal / jour" valeur={moyenne.kcal === null ? '—' : formatKcal(moyenne.kcal)} />
        <Tuile
          libelle="poids, période"
          valeur={evolution === null ? '—' : formatKgSigne(evolution)}
          unite={evolution === null ? undefined : 'kg'}
        />
        <Tuile libelle="jours renseignés" valeur={regulier.renseignes} unite={`/ ${regulier.total}`} />
      </div>

      <Carte titre="Calories" detail={`objectif ${formatKcal(profil.objectif_calorique)}`}>
        <GraphiqueBarres
          points={serie('kcal')}
          couleur="var(--serie-kcal)"
          unite="kcal"
          format={formatKcal}
          reference={profil.objectif_calorique}
          debut={t0}
          fin={t1}
        />
      </Carte>

      <Carte
        titre="Poids"
        detail={[
          moyenneJour === null ? null : `${formatKg(moyenneJour)} kg`,
          jalonDuMois ? `jalon ${formatKg(jalonDuMois.poids_cible_kg)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        <GraphiquePoids points={seriePoids(pesees, profil, jalons, debut, jour)} debut={t0} fin={t1} />
        <Legende />
      </Carte>

      <Carte
        titre="Protéines"
        detail={profil.objectif_proteines_g ? `objectif ${grammes(profil.objectif_proteines_g)} g` : undefined}
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
      </Carte>

      <Carte titre="Glucides">
        <GraphiqueBarres points={serie('glucides')} couleur="var(--serie-glucides)" unite="g" format={grammes} debut={t0} fin={t1} />
      </Carte>
      <Carte titre="Lipides">
        <GraphiqueBarres points={serie('lipides')} couleur="var(--serie-lipides)" unite="g" format={grammes} debut={t0} fin={t1} />
      </Carte>
      <Carte titre="Fibres">
        <GraphiqueBarres points={serie('fibres')} couleur="var(--serie-fibres)" unite="g" format={grammes} debut={t0} fin={t1} />
      </Carte>

      <Carte titre="Déficit estimé" detail="coefficient d’activité forfaitaire">
        <GraphiqueBarres
          points={deficits}
          couleur="var(--serie-kcal)"
          unite="kcal"
          format={(v) => formatEstimation(v).replace('≈ ', '')}
          debut={t0}
          fin={t1}
        />
        <LigneCumul libelle="Cumul sur la période" cumul={cumulPeriode} />
        <LigneCumul libelle="Cumul depuis le début" cumul={cumulTotal} />
      </Carte>

      <Carte titre="Moyennes" detail="jours renseignés uniquement">
        <TableMoyennes titre="Semaine du" lignes={semaines} libelle={(m) => libelleCourt(m.plage.debut)} />
        <TableMoyennes titre="Mois" lignes={mois} libelle={(m) => libelleMois(m.plage.debut)} />
      </Carte>

      <Carte titre="Régularité" detail="jours renseignés par mois">
        <GraphiqueCategories points={assiduite} couleur="var(--serie-kcal)" format={(v) => String(v)} infobulle={(p) => p.detail} />
      </Carte>
    </div>
  )
}

function Carte({ titre, detail, children }: { titre: string; detail?: string; children: ReactNode }) {
  return (
    <section className="carte">
      <div className="carte-titre">
        <h2>{titre}</h2>
        {detail && <span className="petit discret">{detail}</span>}
      </div>
      {children}
    </section>
  )
}

function LigneCumul({ libelle, cumul }: { libelle: string; cumul: { somme: number; jours: number } }) {
  return (
    <div className="entre">
      <span className="petit attenue">{libelle}</span>
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

function TableMoyennes({ titre, lignes, libelle }: { titre: string; lignes: Moyenne[]; libelle: (m: Moyenne) => string }) {
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
