import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { creerExport, fichiersCsv, lireExport, versCsv, zipCsv } from './export.ts'
import type { Donnees, Profil } from './types.ts'
import { crc32 } from './zip.ts'

const PROFIL: Profil = {
  sexe: 'homme',
  date_naissance: '1990-01-01',
  taille_cm: 180,
  poids_initial_kg: 82.5,
  niveau_activite: 'actif',
  objectif_calorique: 1500,
  date_debut: '2026-09-01',
}

const DONNEES: Donnees & { profil: Profil } = {
  profil: PROFIL,
  aliments: [
    {
      id: 'a1',
      nom: 'Riz blanc; cuit "nature"',
      marque: null,
      code_barres: null,
      source: 'ciqual',
      source_ref: '9104',
      kcal_100g: 155,
      glucides_100g: 33.5,
      proteines_100g: 3,
      lipides_100g: 0.4,
      fibres_100g: null,
      kcal_estimee: false,
      archive: false,
      created_at: '2026-09-01T20:00:00Z',
    },
  ],
  entrees: [{ id: 'e1', date: '2026-09-30', aliment_id: 'a1', grammes: 152.5 }],
  pesees: [{ id: 'p1', date: '2026-09-30', kg: 81.2 }],
  jalons: [{ id: 'j1', mois: '2026-10-01', poids_cible_kg: 80 }],
}

describe('export JSON', () => {
  it('contient toutes les données en clair et se relit à l’identique', () => {
    const e = creerExport(DONNEES, '2026-09-30')
    const relu = lireExport(JSON.stringify(e))
    expect(relu).toEqual({ ok: true, export: e })
  })

  it('refuse un fichier non reconnu, incomplet ou incohérent', () => {
    const e = creerExport(DONNEES, '2026-09-30')
    expect(lireExport('pas du json').ok).toBe(false)
    expect(lireExport(JSON.stringify({ ...e, format: 'autre' })).ok).toBe(false)
    expect(lireExport(JSON.stringify({ ...e, version: 2 })).ok).toBe(false)
    expect(lireExport(JSON.stringify({ ...e, profil: { ...PROFIL, sexe: 'x' } })).ok).toBe(false)
    expect(lireExport(JSON.stringify({ ...e, entrees: [{ ...e.entrees[0], aliment_id: 'inconnu' }] })).ok).toBe(false)
    expect(lireExport(JSON.stringify({ ...e, pesees: [...e.pesees, { id: 'p2', date: '2026-09-30', kg: 80 }] })).ok).toBe(false)
    expect(lireExport(JSON.stringify({ ...e, jalons: [{ id: 'j', mois: '2026-10-15', poids_cible_kg: 80 }] })).ok).toBe(false)
  })
})

describe('export CSV', () => {
  it('échappe les séparateurs et guillemets, nombres à la française', () => {
    const csv = versCsv(['nom', 'kg'], [['a;b "c"', 81.2]])
    expect(csv).toBe('﻿nom;kg\r\n"a;b ""c""";81,2\r\n')
  })

  it('produit un fichier par table', () => {
    const f = fichiersCsv(creerExport(DONNEES, '2026-09-30'))
    expect(f.map((x) => x.nom)).toEqual([
      'aliments.csv',
      'entrees.csv',
      'pesees.csv',
      'objectifs_mensuels.csv',
      'profil.csv',
    ])
    expect(f[1].contenu).toContain('e1;2026-09-30;a1;"Riz blanc; cuit ""nature""";152,5')
  })

  it('les réunit dans une archive zip valide', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    const dossier = mkdtempSync(join(tmpdir(), 'sayan-'))
    const chemin = join(dossier, 'export.zip')
    writeFileSync(chemin, zipCsv(creerExport(DONNEES, '2026-09-30')))
    const test = execFileSync('unzip', ['-t', chemin], { encoding: 'utf8' })
    expect(test).toContain('No errors detected')
    const pesees = execFileSync('unzip', ['-p', chemin, 'pesees.csv'], { encoding: 'utf8' })
    expect(pesees).toBe('﻿id;date;kg\r\np1;2026-09-30;81,2\r\n')
  })
})
