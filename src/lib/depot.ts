// Accès aux données. Tout ce qui est de santé est chiffré ici avant l'envoi et déchiffré au
// retour : le reste de l'application ne manipule que du clair.
import { chiffrer, dechiffrer, type Chiffre } from './crypto.ts'
import { cleCourante } from './session.ts'
import { supabase } from './supabase.ts'
import type { Aliment, Donnees, Entree, Jalon, NouvelAliment, Pesee, Profil } from './types.ts'

export interface Depot {
  charger(): Promise<Donnees>
  enregistrerProfil(profil: Profil): Promise<void>
  ajouterAliment(aliment: NouvelAliment): Promise<Aliment>
  modifierAliment(aliment: Aliment): Promise<Aliment>
  supprimerAliment(id: string): Promise<void>
  ajouterEntrees(entrees: Omit<Entree, 'id'>[]): Promise<Entree[]>
  modifierEntree(entree: Entree): Promise<Entree>
  supprimerEntree(id: string): Promise<void>
  /** Une pesée par date : remplace celle du même jour. */
  enregistrerPesee(date: string, kg: number): Promise<Pesee>
  supprimerPesee(id: string): Promise<void>
  /** Un jalon par mois : remplace celui du même mois. */
  enregistrerJalon(mois: string, poidsCibleKg: number): Promise<Jalon>
  supprimerJalon(id: string): Promise<void>
  /** Restauration (§10) : remplace toutes les données existantes. */
  remplacerTout(donnees: Donnees & { profil: Profil }): Promise<void>
}

// ---------- Supabase ----------

const PAGE = 1000

function verifier<T>(resultat: { data: T; error: { message: string } | null }): T {
  if (resultat.error) throw new Error(resultat.error.message)
  return resultat.data
}

/** PostgREST plafonne les réponses : lecture par pages. */
async function toutLire<T>(table: string, colonnes: string, tri: string): Promise<T[]> {
  const lignes: T[] = []
  for (let debut = 0; ; debut += PAGE) {
    const page = verifier(
      await supabase
        .from(table)
        .select(colonnes)
        .order(tri)
        .order('id')
        .range(debut, debut + PAGE - 1),
    ) as T[]
    lignes.push(...page)
    if (page.length < PAGE) return lignes
  }
}

interface LigneChiffree {
  id: string
  date: string
  payload: Chiffre
}

const COLONNES_ALIMENT =
  'id, nom, marque, code_barres, source, source_ref, kcal_100g, glucides_100g, proteines_100g, lipides_100g, fibres_100g, kcal_estimee, archive, created_at'

function versAliment(ligne: Record<string, unknown>): Aliment {
  const nombre = (v: unknown) => Number(v)
  return {
    ...(ligne as unknown as Aliment),
    kcal_100g: nombre(ligne.kcal_100g),
    glucides_100g: nombre(ligne.glucides_100g),
    proteines_100g: nombre(ligne.proteines_100g),
    lipides_100g: nombre(ligne.lipides_100g),
    fibres_100g: ligne.fibres_100g === null ? null : nombre(ligne.fibres_100g),
  }
}

async function versEntree(ligne: LigneChiffree): Promise<Entree> {
  const clair = await dechiffrer<{ aliment_id: string; grammes: number }>(cleCourante(), ligne.payload)
  return { id: ligne.id, date: ligne.date, aliment_id: clair.aliment_id, grammes: clair.grammes }
}

async function versPesee(ligne: LigneChiffree): Promise<Pesee> {
  const clair = await dechiffrer<{ kg: number }>(cleCourante(), ligne.payload)
  return { id: ligne.id, date: ligne.date, kg: clair.kg }
}

async function versJalon(ligne: { id: string; mois: string; payload: Chiffre }): Promise<Jalon> {
  const clair = await dechiffrer<{ poids_cible_kg: number }>(cleCourante(), ligne.payload)
  return { id: ligne.id, mois: ligne.mois, poids_cible_kg: clair.poids_cible_kg }
}

const chiffre = (valeur: unknown) => chiffrer(cleCourante(), valeur)

function estProfilComplet(p: Partial<Profil>): p is Profil {
  return Boolean(p.sexe && p.date_naissance && p.taille_cm && p.poids_initial_kg && p.date_debut)
}

export const depotSupabase: Depot = {
  async charger() {
    const [ligneProfil, aliments, entrees, pesees, jalons] = await Promise.all([
      supabase.from('profil').select('payload').single().then(verifier),
      toutLire<Record<string, unknown>>('aliments', COLONNES_ALIMENT, 'created_at'),
      toutLire<LigneChiffree>('entrees', 'id, date, payload', 'date'),
      toutLire<LigneChiffree>('poids', 'id, date, payload', 'date'),
      toutLire<{ id: string; mois: string; payload: Chiffre }>(
        'objectifs_mensuels',
        'id, mois, payload',
        'mois',
      ),
    ])
    const profil = await dechiffrer<Partial<Profil>>(cleCourante(), ligneProfil!.payload as Chiffre)
    return {
      profil: estProfilComplet(profil) ? profil : null,
      aliments: aliments.map(versAliment),
      entrees: await Promise.all(entrees.map(versEntree)),
      pesees: await Promise.all(pesees.map(versPesee)),
      jalons: await Promise.all(jalons.map(versJalon)),
    }
  },

  async enregistrerProfil(profil) {
    const { data: { session } } = await supabase.auth.getSession()
    verifier(
      await supabase
        .from('profil')
        .update({ payload: await chiffre(profil) })
        .eq('user_id', session!.user.id),
    )
  },

  async ajouterAliment(aliment) {
    const ligne = verifier(
      await supabase.from('aliments').insert(aliment).select(COLONNES_ALIMENT).single(),
    )
    return versAliment(ligne as Record<string, unknown>)
  },

  async modifierAliment(aliment) {
    const champs: Partial<Aliment> = { ...aliment }
    delete champs.id
    delete champs.created_at
    const ligne = verifier(
      await supabase
        .from('aliments')
        .update(champs)
        .eq('id', aliment.id)
        .select(COLONNES_ALIMENT)
        .single(),
    )
    return versAliment(ligne as Record<string, unknown>)
  },

  async supprimerAliment(id) {
    verifier(await supabase.from('aliments').delete().eq('id', id))
  },

  async ajouterEntrees(entrees) {
    if (entrees.length === 0) return []
    const lignes = await Promise.all(
      entrees.map(async (e) => ({
        date: e.date,
        payload: await chiffre({ aliment_id: e.aliment_id, grammes: e.grammes }),
      })),
    )
    const inserees = verifier(await supabase.from('entrees').insert(lignes).select('id, date, payload'))
    return Promise.all((inserees as LigneChiffree[]).map(versEntree))
  },

  async modifierEntree(entree) {
    const ligne = verifier(
      await supabase
        .from('entrees')
        .update({
          date: entree.date,
          payload: await chiffre({ aliment_id: entree.aliment_id, grammes: entree.grammes }),
        })
        .eq('id', entree.id)
        .select('id, date, payload')
        .single(),
    )
    return versEntree(ligne as LigneChiffree)
  },

  async supprimerEntree(id) {
    verifier(await supabase.from('entrees').delete().eq('id', id))
  },

  async enregistrerPesee(date, kg) {
    const ligne = verifier(
      await supabase
        .from('poids')
        .upsert({ date, payload: await chiffre({ kg }) }, { onConflict: 'user_id,date' })
        .select('id, date, payload')
        .single(),
    )
    return versPesee(ligne as LigneChiffree)
  },

  async supprimerPesee(id) {
    verifier(await supabase.from('poids').delete().eq('id', id))
  },

  async enregistrerJalon(mois, poidsCibleKg) {
    const ligne = verifier(
      await supabase
        .from('objectifs_mensuels')
        .upsert(
          { mois, payload: await chiffre({ poids_cible_kg: poidsCibleKg }) },
          { onConflict: 'user_id,mois' },
        )
        .select('id, mois, payload')
        .single(),
    )
    return versJalon(ligne as { id: string; mois: string; payload: Chiffre })
  },

  async supprimerJalon(id) {
    verifier(await supabase.from('objectifs_mensuels').delete().eq('id', id))
  },

  async remplacerTout(donnees) {
    const tout = (table: string) =>
      supabase.from(table).delete().not('id', 'is', null).then(verifier)
    await tout('entrees')
    await tout('poids')
    await tout('objectifs_mensuels')
    await tout('aliments')

    const paquets = <T>(liste: T[], taille = 500) =>
      Array.from({ length: Math.ceil(liste.length / taille) }, (_, i) =>
        liste.slice(i * taille, (i + 1) * taille),
      )

    for (const paquet of paquets(donnees.aliments)) {
      verifier(await supabase.from('aliments').insert(paquet))
    }
    for (const paquet of paquets(donnees.entrees)) {
      const lignes = await Promise.all(
        paquet.map(async (e) => ({
          id: e.id,
          date: e.date,
          payload: await chiffre({ aliment_id: e.aliment_id, grammes: e.grammes }),
        })),
      )
      verifier(await supabase.from('entrees').insert(lignes))
    }
    for (const paquet of paquets(donnees.pesees)) {
      const lignes = await Promise.all(
        paquet.map(async (p) => ({ id: p.id, date: p.date, payload: await chiffre({ kg: p.kg }) })),
      )
      verifier(await supabase.from('poids').insert(lignes))
    }
    for (const paquet of paquets(donnees.jalons)) {
      const lignes = await Promise.all(
        paquet.map(async (j) => ({
          id: j.id,
          mois: j.mois,
          payload: await chiffre({ poids_cible_kg: j.poids_cible_kg }),
        })),
      )
      verifier(await supabase.from('objectifs_mensuels').insert(lignes))
    }
    await this.enregistrerProfil(donnees.profil)
  },
}

// ---------- Mémoire (aperçu de développement, tests) ----------

export function creerDepotMemoire(initial: Donnees): Depot {
  const d: Donnees = structuredClone(initial)
  const id = () => crypto.randomUUID()
  const retirer = <T extends { id: string }>(liste: T[], cible: string) => {
    const i = liste.findIndex((x) => x.id === cible)
    if (i >= 0) liste.splice(i, 1)
  }

  return {
    async charger() {
      return structuredClone(d)
    },
    async enregistrerProfil(profil) {
      d.profil = structuredClone(profil)
    },
    async ajouterAliment(aliment) {
      const cree = { ...aliment, id: id(), archive: false, created_at: new Date().toISOString() }
      d.aliments.push(cree)
      return cree
    },
    async modifierAliment(aliment) {
      d.aliments = d.aliments.map((a) => (a.id === aliment.id ? aliment : a))
      return aliment
    },
    async supprimerAliment(cible) {
      retirer(d.aliments, cible)
    },
    async ajouterEntrees(entrees) {
      const creees = entrees.map((e) => ({ ...e, id: id() }))
      d.entrees.push(...creees)
      return creees
    },
    async modifierEntree(entree) {
      d.entrees = d.entrees.map((e) => (e.id === entree.id ? entree : e))
      return entree
    },
    async supprimerEntree(cible) {
      retirer(d.entrees, cible)
    },
    async enregistrerPesee(date, kg) {
      const existante = d.pesees.find((p) => p.date === date)
      const pesee = { id: existante?.id ?? id(), date, kg }
      d.pesees = [...d.pesees.filter((p) => p.date !== date), pesee]
      return pesee
    },
    async supprimerPesee(cible) {
      retirer(d.pesees, cible)
    },
    async enregistrerJalon(mois, poids_cible_kg) {
      const existant = d.jalons.find((j) => j.mois === mois)
      const jalon = { id: existant?.id ?? id(), mois, poids_cible_kg }
      d.jalons = [...d.jalons.filter((j) => j.mois !== mois), jalon]
      return jalon
    },
    async supprimerJalon(cible) {
      retirer(d.jalons, cible)
    },
    async remplacerTout(donnees) {
      Object.assign(d, structuredClone(donnees))
    },
  }
}
