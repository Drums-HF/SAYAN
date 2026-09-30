import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Accueil from './Accueil.tsx'

describe('Accueil', () => {
  it('affiche le nom de l’application', () => {
    expect(renderToStaticMarkup(<Accueil />)).toContain('SAYAN')
  })
})
