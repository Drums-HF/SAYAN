import { describe, expect, it } from 'vitest'
import {
  apport,
  apportEntree,
  COEFFICIENTS_ACTIVITE,
  courbeLissee,
  deficitCumule,
  deficitDuJour,
  depenseJournaliere,
  ecartTrajectoire,
  metabolismeBase,
  metabolismeBaseAuJour,
  moyenne7,
  poidsAuJour,
  totaux,
  totauxParDate,
  trajectoire,
  valeurTheorique,
} from './calculs.ts'
import { arrondir } from './nombres.ts'
import type { Aliment, Entree, Jalon, Pesee, Profil } from './types.ts'

const aliment = (id: string, v: [number, number, number, number, number | null]): Aliment => ({
  id,
  nom: id,
  marque: null,
  code_barres: null,
  source: 'manuel',
  source_ref: null,
  kcal_100g: v[0],
  glucides_100g: v[1],
  proteines_100g: v[2],
  lipides_100g: v[3],
  fibres_100g: v[4],
  kcal_estimee: false,
  archive: false,
  created_at: '',
})

const RIZ = aliment('riz', [130, 28.2, 2.7, 0.3, 0.4])
const POULET = aliment('poulet', [121, 0, 26.2, 1.8, null])
const ALIMENTS = new Map([RIZ, POULET].map((a) => [a.id, a]))
const entree = (date: string, aliment_id: string, grammes: number, id = `${date}${aliment_id}${grammes}`): Entree => ({
  id,
  date,
  aliment_id,
  grammes,
})
const pesee = (date: string, kg: number): Pesee => ({ id: date, date, kg })

const PROFIL: Profil = {
  sexe: 'homme',
  date_naissance: '1996-01-10',
  taille_cm: 180,
  poids_initial_kg: 82,
  niveau_activite: 'modere',
  objectif_calorique: 1500,
  date_debut: '2026-09-15',
}

describe('§7.2 apport alimentaire', () => {
  it('apport = valeur pour 100 g × grammes / 100', () => {
    expect(apport(130, 150)).toBe(195)
    expect(apport(28.2, 152.5)).toBeCloseTo(43.005, 10)
    expect(apportEntree(RIZ, 200)).toEqual({ kcal: 260, glucides: 56.4, proteines: 5.4, lipides: 0.6, fibres: 0.8 })
  })

  it('compte des fibres absentes pour 0', () => {
    expect(apportEntree(POULET, 100).fibres).toBe(0)
  })

  it('somme les entrées d’une date sans aucun arrondi intermédiaire', () => {
    // 30 entrées de 33,3 g à 130 kcal : 43,29 kcal chacune. Arrondir avant de sommer donnerait 1 290.
    const entrees = Array.from({ length: 30 }, (_, i) => entree('2026-09-30', 'riz', 33.3, `e${i}`))
    const t = totaux(entrees, ALIMENTS)
    expect(t.kcal).toBeCloseTo(1298.7, 9)
    expect(arrondir(t.kcal)).toBe(1299)
  })

  it('regroupe par date et ne retient que les jours renseignés', () => {
    const t = totauxParDate(
      [entree('2026-09-29', 'riz', 100), entree('2026-09-30', 'riz', 100), entree('2026-09-30', 'poulet', 150)],
      ALIMENTS,
    )
    expect([...t.keys()].sort()).toEqual(['2026-09-29', '2026-09-30'])
    expect(t.get('2026-09-30')!.kcal).toBeCloseTo(130 + 181.5, 10)
    expect(t.get('2026-09-30')!.proteines).toBeCloseTo(2.7 + 39.3, 10)
  })
})

describe('§7.4 métabolisme de base (Mifflin-St Jeor)', () => {
  it('homme : 10 × poids + 6,25 × taille − 5 × âge + 5', () => {
    expect(metabolismeBase('homme', 80, 180, 30)).toBe(1780)
  })

  it('femme : 10 × poids + 6,25 × taille − 5 × âge − 161', () => {
    expect(metabolismeBase('femme', 60, 165, 25)).toBe(1345.25)
  })

  it('utilise l’âge révolu au jour calculé', () => {
    // Né le 1996-01-10 : 30 ans le 2026-01-10.
    const pesees = [pesee('2026-01-01', 80)]
    expect(metabolismeBaseAuJour(PROFIL, pesees, '2026-01-09')).toBe(metabolismeBase('homme', 80, 180, 29))
    expect(metabolismeBaseAuJour(PROFIL, pesees, '2026-01-10')).toBe(metabolismeBase('homme', 80, 180, 30))
  })
})

describe('§7.4 poids utilisé', () => {
  const pesees = [pesee('2026-09-20', 80.4), pesee('2026-09-25', 79.8), pesee('2026-09-30', 79.1)]

  it('prend la pesée du jour si elle existe', () => {
    expect(poidsAuJour(pesees, '2026-09-25', 82)).toBe(79.8)
  })

  it('sinon la plus récente antérieure, jamais une postérieure', () => {
    expect(poidsAuJour(pesees, '2026-09-24', 82)).toBe(80.4)
    expect(poidsAuJour(pesees, '2026-09-29', 82)).toBe(79.8)
  })

  it('pour le jour courant : la plus récente pesée ≤ aujourd’hui', () => {
    expect(poidsAuJour(pesees, '2026-10-02', 82)).toBe(79.1)
  })

  it('à défaut de pesée antérieure : le poids initial du profil', () => {
    expect(poidsAuJour(pesees, '2026-09-19', 82)).toBe(82)
    expect(poidsAuJour([], '2026-09-30', 82)).toBe(82)
  })

  it('ne dépend pas de l’ordre des pesées', () => {
    expect(poidsAuJour([...pesees].reverse(), '2026-09-27', 82)).toBe(79.8)
  })
})

describe('§7.5 dépense énergétique et déficit', () => {
  it('coefficients d’activité', () => {
    expect(COEFFICIENTS_ACTIVITE).toEqual({
      sedentaire: 1.2,
      leger: 1.375,
      modere: 1.55,
      actif: 1.725,
      tres_actif: 1.9,
    })
  })

  it('DEJ = MB × coefficient', () => {
    // 30 ans au 2026-09-30, 80 kg : MB 1 780, modéré 1,55 → 2 759.
    const dej = depenseJournaliere(PROFIL, [pesee('2026-09-30', 80)], '2026-09-30')
    expect(dej).toBeCloseTo(2759, 9)
  })

  it('déficit = DEJ − total kcal ; aucun déficit pour un jour sans entrée', () => {
    expect(deficitDuJour(2759, 1500)).toBe(1259)
    expect(deficitDuJour(2759, 3000)).toBe(-241)
    expect(deficitDuJour(2759, 0)).toBe(2759) // entrées à 0 kcal : jour renseigné
    expect(deficitDuJour(2759, null)).toBeNull()
    expect(deficitDuJour(2759, undefined)).toBeNull()
  })

  it('cumul : jours renseignés uniquement, avec leur nombre', () => {
    const pesees = [pesee('2026-09-01', 80)]
    const t = totauxParDate(
      [entree('2026-09-28', 'riz', 1000), entree('2026-09-30', 'riz', 500)],
      ALIMENTS,
    )
    const jours = ['2026-09-28', '2026-09-29', '2026-09-30']
    const r = deficitCumule(jours, PROFIL, pesees, t)
    expect(r.jours).toBe(2)
    expect(r.somme).toBeCloseTo(2759 - 1300 + (2759 - 650), 9)
  })
})

describe('§7.6 moyenne glissante sur 7 jours', () => {
  it('moyenne les pesées existantes de [J − 6 ; J], bornes incluses, sans interpolation', () => {
    const pesees = [pesee('2026-09-23', 81), pesee('2026-09-24', 80), pesee('2026-09-29', 79), pesee('2026-09-30', 78)]
    expect(moyenne7(pesees, '2026-09-29')).toBeCloseTo((81 + 80 + 79) / 3, 12)
    expect(moyenne7(pesees, '2026-09-30')).toBeCloseTo((80 + 79 + 78) / 3, 12) // 09-23 sort de la fenêtre
  })

  it('n’utilise jamais une valeur postérieure à J', () => {
    const pesees = [pesee('2026-09-01', 80), pesee('2026-09-02', 80), pesee('2026-09-03', 80), pesee('2026-09-04', 90)]
    expect(moyenne7(pesees, '2026-09-03')).toBe(80)
  })

  it('aucun point sous 3 pesées dans la fenêtre', () => {
    const pesees = [pesee('2026-09-01', 80), pesee('2026-09-02', 81)]
    expect(moyenne7(pesees, '2026-09-02')).toBeNull()
    expect(moyenne7([...pesees, pesee('2026-09-09', 79)], '2026-09-09')).toBeNull() // 09-01 hors fenêtre
  })

  it('la courbe lissée commence au troisième jour de suivi et ne porte que sur les jours pesés', () => {
    const pesees = [pesee('2026-09-01', 80), pesee('2026-09-02', 81), pesee('2026-09-03', 82), pesee('2026-09-05', 83)]
    expect(courbeLissee(pesees)).toEqual([
      { date: '2026-09-03', kg: 81 },
      { date: '2026-09-05', kg: 81.5 }, // 80, 81, 82, 83 dans [08-30 ; 09-05]
    ])
  })
})

describe('§7.7 trajectoire et jalons', () => {
  const jalon = (mois: string, kg: number): Jalon => ({ id: mois, mois, poids_cible_kg: kg })
  const JALONS = [jalon('2026-10-01', 84), jalon('2026-09-01', 85)]

  it('relie le début au dernier jour de chaque mois, dans l’ordre', () => {
    expect(trajectoire({ ...PROFIL, poids_initial_kg: 86 }, JALONS)).toEqual([
      { date: '2026-09-15', kg: 86 },
      { date: '2026-09-30', kg: 85 },
      { date: '2026-10-31', kg: 84 },
    ])
  })

  it('ignore un jalon dont le dernier jour est ≤ date_debut', () => {
    const p = { ...PROFIL, date_debut: '2026-09-30' }
    expect(trajectoire(p, JALONS).map((x) => x.date)).toEqual(['2026-09-30', '2026-10-31'])
  })

  it('interpole linéairement jour par jour', () => {
    const points = trajectoire({ ...PROFIL, poids_initial_kg: 86 }, JALONS)
    expect(valeurTheorique(points, '2026-09-15')).toBe(86)
    expect(valeurTheorique(points, '2026-09-20')).toBeCloseTo(86 - 5 / 15, 12)
    expect(valeurTheorique(points, '2026-09-30')).toBe(85)
    expect(valeurTheorique(points, '2026-10-15')).toBeCloseTo(85 - 15 / 31, 12)
    expect(valeurTheorique(points, '2026-10-31')).toBe(84)
  })

  it('saute un mois sans jalon', () => {
    const points = trajectoire({ ...PROFIL, poids_initial_kg: 86 }, [jalon('2026-09-01', 85), jalon('2026-11-01', 83)])
    expect(valeurTheorique(points, '2026-10-31')).toBeCloseTo(85 - 2 * (31 / 61), 12)
  })

  it('n’existe pas avant le début ni après le dernier jalon', () => {
    const points = trajectoire(PROFIL, JALONS)
    expect(valeurTheorique(points, '2026-09-14')).toBeNull()
    expect(valeurTheorique(points, '2026-11-01')).toBeNull()
  })

  it('écart = moyenne glissante − valeur théorique', () => {
    const profil = { ...PROFIL, poids_initial_kg: 86 }
    const pesees = [pesee('2026-09-28', 85.6), pesee('2026-09-29', 85.2), pesee('2026-09-30', 85.4)]
    expect(ecartTrajectoire(pesees, profil, JALONS, '2026-09-30')).toBeCloseTo(85.4 - 85, 12)
  })

  it('utilise la moyenne même sans pesée le jour même', () => {
    const profil = { ...PROFIL, poids_initial_kg: 86 }
    const pesees = [pesee('2026-09-27', 85.6), pesee('2026-09-28', 85.2), pesee('2026-09-29', 85.4)]
    expect(ecartTrajectoire(pesees, profil, JALONS, '2026-09-30')).toBeCloseTo(85.4 - 85, 12)
  })

  it('indisponible sans moyenne (jamais de repli sur la pesée brute) ou hors trajectoire', () => {
    const profil = { ...PROFIL, poids_initial_kg: 86 }
    expect(ecartTrajectoire([pesee('2026-09-30', 85)], profil, JALONS, '2026-09-30')).toBeNull()
    const pesees = [pesee('2026-11-01', 84), pesee('2026-11-02', 84), pesee('2026-11-03', 84)]
    expect(ecartTrajectoire(pesees, profil, JALONS, '2026-11-03')).toBeNull()
  })
})
