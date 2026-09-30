import { describe, expect, it, vi } from 'vitest'
import aberrant from './fixtures/off/aberrant.json'
import complet from './fixtures/off/complet.json'
import incomplet from './fixtures/off/incomplet.json'
import introuvable from './fixtures/off/introuvable.json'
import partielKj from './fixtures/off/partiel-kj.json'
import partielSansEnergie from './fixtures/off/partiel-sans-energie.json'
import sansNutriments from './fixtures/off/sans-nutriments.json'
import suspect from './fixtures/off/suspect.json'
import { chercherProduit, codeBarresValide, interpreterReponse, urlProduit } from './openfoodfacts.ts'

const CODE = '3033491234567'

describe('code-barres', () => {
  it('accepte 8, 12 ou 13 chiffres', () => {
    expect(codeBarresValide('12345678')).toBe(true)
    expect(codeBarresValide('012345678905')).toBe(true)
    expect(codeBarresValide(CODE)).toBe(true)
    for (const c of ['1234567', '123456789', '12345678901234', '30334912345ab', '']) {
      expect(codeBarresValide(c)).toBe(false)
    }
  })

  it('s’identifie par paramètres, sans en-tête User-Agent', () => {
    const url = new URL(urlProduit(CODE))
    expect(url.pathname).toBe(`/api/v2/product/${CODE}.json`)
    expect(url.searchParams.get('app_name')).toBe('SAYAN')
    expect(url.searchParams.get('app_version')).toBeTruthy()
  })
})

describe('import Open Food Facts', () => {
  it('réponse complète : produit prêt à valider', () => {
    expect(interpreterReponse(CODE, complet)).toEqual({
      type: 'produit',
      suspect: false,
      prerempli: {
        nom: 'Skyr nature 0 %',
        marque: "Siggi's",
        code_barres: CODE,
        kcal: 63,
        glucides: 4,
        proteines: 11,
        lipides: 0.2,
        fibres: 0,
      },
    })
  })

  it('réponse partielle, énergie en kJ seulement : conversion kJ / 4,184', () => {
    const r = interpreterReponse(CODE, partielKj)
    expect(r.type).toBe('produit')
    expect(r.prerempli.kcal).toBeCloseTo(1050 / 4.184, 6)
    expect(r.prerempli).toMatchObject({ glucides: 42.5, proteines: 9.1, lipides: 4.2, fibres: null })
  })

  it('réponse partielle sans énergie : laissée vide pour recalcul par Atwater', () => {
    const r = interpreterReponse(CODE, partielSansEnergie)
    expect(r).toMatchObject({ type: 'produit', prerempli: { kcal: null, fibres: 11 } })
  })

  it('valeurs absentes : formulaire manuel pré-rempli avec ce qui a été récupéré', () => {
    const r = interpreterReponse(CODE, incomplet)
    expect(r.type).toBe('manuel')
    expect(r.prerempli).toMatchObject({
      nom: 'Biscuit',
      marque: null,
      code_barres: CODE,
      kcal: 480,
      glucides: 65,
      proteines: 6,
      lipides: null,
    })
  })

  it('sans nutriments : formulaire manuel avec le nom et le code-barres', () => {
    const r = interpreterReponse(CODE, sansNutriments)
    expect(r).toMatchObject({ type: 'manuel', prerempli: { nom: 'Eau gazeuse', code_barres: CODE } })
  })

  it('valeurs aberrantes : formulaire manuel, valeurs hors bornes écartées', () => {
    const r = interpreterReponse(CODE, aberrant)
    expect(r.type).toBe('manuel')
    expect(r.prerempli).toMatchObject({ kcal: null, lipides: null, glucides: 32, proteines: 9 })
  })

  it('produit introuvable : formulaire manuel avec le seul code-barres', () => {
    const r = interpreterReponse(CODE, introuvable)
    expect(r).toMatchObject({ type: 'manuel', prerempli: { nom: '', code_barres: CODE, kcal: null } })
  })

  it('énergie incohérente : produit marqué suspect, enregistrable', () => {
    expect(interpreterReponse(CODE, suspect)).toMatchObject({ type: 'produit', suspect: true })
  })

  it('réseau indisponible ou 404 : formulaire manuel, jamais d’exception', async () => {
    const enPanne = vi.fn().mockRejectedValue(new Error('hors ligne'))
    expect(await chercherProduit(CODE, enPanne)).toMatchObject({
      type: 'manuel',
      raison: 'Open Food Facts injoignable.',
    })
    const absent = vi.fn().mockResolvedValue(new Response(JSON.stringify(introuvable), { status: 404 }))
    expect(await chercherProduit(CODE, absent)).toMatchObject({ type: 'manuel' })
    const trouve = vi.fn().mockResolvedValue(new Response(JSON.stringify(complet), { status: 200 }))
    expect(await chercherProduit(CODE, trouve)).toMatchObject({ type: 'produit' })
    expect(trouve.mock.calls[0]).toHaveLength(1) // aucun en-tête personnalisé
  })
})
