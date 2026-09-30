import { describe, expect, it } from 'vitest'
import { etat, famille, lireValeurCiqual, selectionnerVariantesCuites, type LigneCiqual } from './ciqual.ts'

const l = (code: string, nom: string, sousGroupe = '0201'): LigneCiqual => ({ code, nom, sousGroupe })
const noms = (lignes: LigneCiqual[]) => lignes.map((x) => x.nom)

describe('import CIQUAL : variante cuite', () => {
  it('retient la variante cuite quand crue et cuite existent', () => {
    const lignes = [
      l('9100', 'Riz blanc, cru', '0301'),
      l('9104', 'Riz blanc, cuit, sans sel ajouté', '0301'),
      l('9102', 'Riz complet, cru', '0301'),
      l('9103', 'Riz complet, cuit, sans sel ajouté', '0301'),
    ]
    expect(noms(selectionnerVariantesCuites(lignes))).toEqual([
      'Riz blanc, cuit, sans sel ajouté',
      'Riz complet, cuit, sans sel ajouté',
    ])
  })

  it('apparie les légumineuses sèches et bouillies', () => {
    const lignes = [
      l('20585', 'Lentille verte, sèche', '0203'),
      l('20587', 'Lentille verte, bouillie/cuite à l\'eau', '0203'),
    ]
    expect(noms(selectionnerVariantesCuites(lignes))).toEqual(['Lentille verte, bouillie/cuite à l\'eau'])
  })

  it('préfère la cuisson à l’eau, puis la vapeur, puis « cuit », puis l’aliment moyen', () => {
    const lignes = [
      l('20057', 'Brocoli, cru'),
      l('20302', 'Brocoli, bouilli/cuit à l\'eau, croquant'),
      l('20303', 'Brocoli, bouilli/cuit à l\'eau, fondant'),
      l('20304', 'Brocoli, cuit à la vapeur'),
      l('20350', 'Brocoli, bouilli/cuit à l\'eau (aliment moyen)'),
      l('20351', 'Brocoli, cuit (aliment moyen)'),
      l('20259', 'Brocoli, purée'),
    ]
    expect(noms(selectionnerVariantesCuites(lignes))).toEqual([
      'Brocoli, bouilli/cuit à l\'eau (aliment moyen)',
      'Brocoli, purée',
    ])
  })

  it('retient la vapeur en l’absence de cuisson à l’eau', () => {
    const lignes = [l('1', 'Chou, cru'), l('2', 'Chou, cuit à la vapeur'), l('3', 'Chou, cuit')]
    expect(noms(selectionnerVariantesCuites(lignes))).toEqual(['Chou, cuit à la vapeur'])
  })

  it('ignore les qualificatifs neutres pour apparier (peau, sel)', () => {
    const lignes = [
      l('20020', 'Courgette, chair et peau, crue'),
      l('20021', 'Courgette, chair et peau, cuite'),
      l('4008', 'Pomme de terre, sans peau, crue', '0202'),
      l('4003', 'Pomme de terre, bouillie/cuite à l\'eau', '0202'),
    ]
    expect(noms(selectionnerVariantesCuites(lignes))).toEqual([
      'Courgette, chair et peau, cuite',
      'Pomme de terre, bouillie/cuite à l\'eau',
    ])
  })

  it('n’exclut pas les cuissons avec matière grasse ni les autres préparations', () => {
    const lignes = [
      l('4008', 'Pomme de terre, sans peau, crue', '0202'),
      l('4003', 'Pomme de terre, bouillie/cuite à l\'eau', '0202'),
      l('4015', 'Pomme de terre poêlée, avec matière grasse', '0202'),
      l('4026', 'Pomme de terre, rôtie/cuite au four', '0202'),
    ]
    expect(noms(selectionnerVariantesCuites(lignes))).toEqual([
      'Pomme de terre, bouillie/cuite à l\'eau',
      'Pomme de terre poêlée, avec matière grasse',
      'Pomme de terre, rôtie/cuite au four',
    ])
  })

  it('garde la variante crue quand aucune variante cuite n’existe', () => {
    const lignes = [l('20276', 'Tomate ronde, crue'), l('20172', 'Tomate cerise, crue')]
    expect(noms(selectionnerVariantesCuites(lignes))).toEqual(noms(lignes))
  })

  it('distingue le surgelé du frais', () => {
    const lignes = [
      l('20061', 'Haricot vert, cru'),
      l('20320', 'Haricot vert, bouilli/cuit à l\'eau'),
      l('20070', 'Haricot vert, surgelé, cru'),
      l('20071', 'Haricot vert, surgelé, cuit'),
    ]
    expect(noms(selectionnerVariantesCuites(lignes))).toEqual([
      'Haricot vert, bouilli/cuit à l\'eau',
      'Haricot vert, surgelé, cuit',
    ])
  })

  it('masque une variante crue dont l’équivalent cuit porte un nom voisin', () => {
    const lignes = [
      l('9119', 'Riz thaï ou basmati, cru', '0301'),
      l('9124', 'Riz thaï, cuit, sans sel ajouté', '0301'),
      l('9125', 'Riz basmati, cuit, sans sel ajouté', '0301'),
      l('20204', 'Brocoli, surgelé, cru'),
      l('20304', 'Brocoli, cuit à la vapeur'),
      l('20208', 'Carotte, surgelée, crue'),
    ]
    expect(noms(selectionnerVariantesCuites(lignes))).toEqual([
      'Riz thaï, cuit, sans sel ajouté',
      'Riz basmati, cuit, sans sel ajouté',
      'Brocoli, cuit à la vapeur',
      'Carotte, surgelée, crue',
    ])
  })

  it('ne s’applique pas hors des féculents et légumes', () => {
    const lignes = [
      l('13039', 'Pomme, crue', '0204'),
      l('13040', 'Pomme, cuite', '0204'),
      l('21500', 'Poulet, filet, cru', '0402'),
      l('21501', 'Poulet, filet, cuit', '0401'),
    ]
    expect(noms(selectionnerVariantesCuites(lignes))).toEqual(noms(lignes))
  })

  it('détecte l’état et la famille', () => {
    expect(etat('Riz blanc, cuit, sans sel ajouté')).toEqual({ type: 'cuit', priorite: 3 })
    expect(etat('Lentille, sèche (aliment moyen)')).toEqual({ type: 'cru' })
    expect(etat('Pâtes sèches, standard, crues')).toEqual({ type: 'cru' })
    expect(etat('Pomme de terre dauphine, surgelée, cuite')).toEqual({ type: 'cuit', priorite: 3 })
    expect(famille('Pâtes sèches, standard, cuites, sans sel ajouté')).toBe('pâtes sèches, standard')
  })
})

describe('import CIQUAL : lecture des valeurs', () => {
  it('lit les formats particuliers de la table', () => {
    expect(lireValeurCiqual('12,5')).toBe(12.5)
    expect(lireValeurCiqual('0')).toBe(0)
    expect(lireValeurCiqual('traces')).toBe(0)
    expect(lireValeurCiqual('< 0,5')).toBe(0.25)
    expect(lireValeurCiqual('< 3')).toBe(1.5)
    expect(lireValeurCiqual('-')).toBeNull()
    expect(lireValeurCiqual('')).toBeNull()
    expect(lireValeurCiqual(undefined)).toBeNull()
  })
})
