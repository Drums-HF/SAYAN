// Génère les icônes PWA (PNG) sans dépendance : fond noir, anneau à l'accent, trait de mesure.
// Usage : node scripts/icones.ts
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const FOND = [0, 0, 0]
const ACCENT = [0xc8, 0xf5, 0x60]
const TEXTE = [0xf5, 0xf5, 0xf5]

const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc(octets: Buffer): number {
  let c = 0xffffffff
  for (const o of octets) c = TABLE[(c ^ o) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function bloc(type: string, donnees: Buffer): Buffer {
  const longueur = Buffer.alloc(4)
  longueur.writeUInt32BE(donnees.length)
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), donnees])
  const somme = Buffer.alloc(4)
  somme.writeUInt32BE(crc(corps))
  return Buffer.concat([longueur, corps, somme])
}

function png(taille: number, pixel: (x: number, y: number) => number[]): Buffer {
  const lignes = Buffer.alloc(taille * (taille * 3 + 1))
  for (let y = 0; y < taille; y++) {
    lignes[y * (taille * 3 + 1)] = 0
    for (let x = 0; x < taille; x++) {
      const [r, v, b] = pixel(x, y)
      const i = y * (taille * 3 + 1) + 1 + x * 3
      lignes[i] = r
      lignes[i + 1] = v
      lignes[i + 2] = b
    }
  }
  const entete = Buffer.alloc(13)
  entete.writeUInt32BE(taille, 0)
  entete.writeUInt32BE(taille, 4)
  entete[8] = 8 // profondeur
  entete[9] = 2 // RVB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', entete),
    bloc('IDAT', deflateSync(lignes, { level: 9 })),
    bloc('IEND', Buffer.alloc(0)),
  ])
}

const melange = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const couverture = (distance: number, pas: number) => Math.min(1, Math.max(0, 0.5 - distance / pas))

/** Anneau ouvert (arc de 300°) et trait vertical central, dessinés avec anticrénelage. */
function icone(taille: number, marge: number): Buffer {
  const c = taille / 2
  const utile = taille * (1 - 2 * marge)
  const rayon = utile * 0.36
  const epaisseur = utile * 0.075
  const pas = 1
  const ouverture = (60 * Math.PI) / 180 // arc ouvert vers le bas
  return png(taille, (px, py) => {
    const x = px + 0.5 - c
    const y = py + 0.5 - c
    const r = Math.hypot(x, y)
    const angle = Math.atan2(x, y) // 0 = vers le bas
    let couleur = FOND
    const dansArc = Math.abs(angle) > ouverture / 2
    if (dansArc) {
      couleur = melange(couleur, ACCENT, couverture(Math.abs(r - rayon) - epaisseur / 2, pas))
    }
    // Trait de mesure : segment du centre vers le haut.
    const demiLargeur = epaisseur * 0.45
    if (y <= 0 && y >= -rayon * 0.62) {
      couleur = melange(couleur, TEXTE, couverture(Math.abs(x) - demiLargeur, pas))
    }
    const pointCentral = Math.hypot(x, y) - epaisseur * 0.9
    couleur = melange(couleur, TEXTE, couverture(pointCentral, pas))
    return couleur
  })
}

writeFileSync('public/icone-192.png', icone(192, 0))
writeFileSync('public/icone-512.png', icone(512, 0))
writeFileSync('public/icone-masquable-512.png', icone(512, 0.1))
writeFileSync('public/apple-touch-icon.png', icone(180, 0))
console.log('Icônes écrites dans public/')
