// État de l'application après déverrouillage : toutes les données, déchiffrées, en mémoire.
// Les calculs (§4 « absence de calcul serveur ») se font à partir de cet état.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Contexte, type Actions } from './contexte.ts'
import type { Depot } from './lib/depot.ts'
import type { Donnees } from './lib/types.ts'

const parDate = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date)

export function FournisseurDonnees({ depot, children }: { depot: Depot; children: ReactNode }) {
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    depot
      .charger()
      .then(setDonnees)
      .catch((e: Error) => setErreur(`Chargement impossible : ${e.message}`))
  }, [depot])

  const modifier = useCallback((f: (d: Donnees) => Donnees) => {
    setDonnees((d) => (d ? f(d) : d))
  }, [])

  const actions = useMemo<Actions>(
    () => ({
      async enregistrerProfil(profil) {
        await depot.enregistrerProfil(profil)
        modifier((d) => ({ ...d, profil }))
      },
      async ajouterAliment(aliment) {
        const cree = await depot.ajouterAliment(aliment)
        modifier((d) => ({ ...d, aliments: [...d.aliments, cree] }))
        return cree
      },
      async modifierAliment(aliment) {
        const modifie = await depot.modifierAliment(aliment)
        modifier((d) => ({
          ...d,
          aliments: d.aliments.map((a) => (a.id === modifie.id ? modifie : a)),
        }))
        return modifie
      },
      async supprimerAliment(id) {
        await depot.supprimerAliment(id)
        modifier((d) => ({ ...d, aliments: d.aliments.filter((a) => a.id !== id) }))
      },
      async ajouterEntrees(entrees) {
        const creees = await depot.ajouterEntrees(entrees)
        modifier((d) => ({ ...d, entrees: [...d.entrees, ...creees].sort(parDate) }))
      },
      async modifierEntree(entree) {
        const modifiee = await depot.modifierEntree(entree)
        modifier((d) => ({
          ...d,
          entrees: d.entrees.map((e) => (e.id === modifiee.id ? modifiee : e)).sort(parDate),
        }))
      },
      async supprimerEntree(id) {
        await depot.supprimerEntree(id)
        modifier((d) => ({ ...d, entrees: d.entrees.filter((e) => e.id !== id) }))
      },
      async enregistrerPesee(date, kg) {
        const pesee = await depot.enregistrerPesee(date, kg)
        modifier((d) => ({
          ...d,
          pesees: [...d.pesees.filter((p) => p.date !== date), pesee].sort(parDate),
        }))
      },
      async supprimerPesee(id) {
        await depot.supprimerPesee(id)
        modifier((d) => ({ ...d, pesees: d.pesees.filter((p) => p.id !== id) }))
      },
      async enregistrerJalon(mois, kg) {
        const jalon = await depot.enregistrerJalon(mois, kg)
        modifier((d) => ({
          ...d,
          jalons: [...d.jalons.filter((j) => j.mois !== mois), jalon].sort((a, b) =>
            a.mois.localeCompare(b.mois),
          ),
        }))
      },
      async supprimerJalon(id) {
        await depot.supprimerJalon(id)
        modifier((d) => ({ ...d, jalons: d.jalons.filter((j) => j.id !== id) }))
      },
      async remplacerTout(nouvelles) {
        await depot.remplacerTout(nouvelles)
        setDonnees(await depot.charger())
      },
    }),
    [depot, modifier],
  )

  if (erreur) {
    return (
      <div className="ecran">
        <div className="contenu centre">
          <p className="message">{erreur}</p>
          <button className="bouton plein" onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </div>
      </div>
    )
  }
  if (!donnees) {
    return (
      <div className="ecran">
        <div className="contenu centre ligne" style={{ justifyContent: 'center' }}>
          <span className="indicateur" />
          <span className="attenue">Déchiffrement…</span>
        </div>
      </div>
    )
  }
  return <Contexte.Provider value={{ donnees, actions }}>{children}</Contexte.Provider>
}
