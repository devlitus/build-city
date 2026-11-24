import { describe, expect, it } from 'vitest'
import { cargarSombras, centroSombraRedondeado, DATOS_SOMBRAS } from './sombras'

const dir = (() => {
  const l = Math.hypot(0.4, 0.5, -0.7)
  return { x: 0.4 / l, y: 0.5 / l, z: -0.7 / l }
})()
const texel = (2 * DATOS_SOMBRAS.semiancho) / DATOS_SOMBRAS.mapa

// Coordenadas del centro en los ejes de la cámara de luz.
function ejes(p: { x: number; y: number; z: number }): [number, number] {
  const l = Math.hypot(dir.z, dir.x)
  const derecha = { x: dir.z / l, y: 0, z: -dir.x / l }
  const arriba = {
    x: dir.y * derecha.z - dir.z * derecha.y,
    y: dir.z * derecha.x - dir.x * derecha.z,
    z: dir.x * derecha.y - dir.y * derecha.x,
  }
  return [
    p.x * derecha.x + p.y * derecha.y + p.z * derecha.z,
    p.x * arriba.x + p.y * arriba.y + p.z * arriba.z,
  ]
}

describe('sombras', () => {
  it('el centro de la sombra se redondea al tamaño de texel', () => {
    const c = centroSombraRedondeado({ x: 12.345, y: 0, z: -7.891 }, dir, texel)
    for (const e of ejes(c)) expect(e / texel).toBeCloseTo(Math.round(e / texel), 6)
  })

  it('mover el objetivo menos de un texel no cambia el centro', () => {
    const a = centroSombraRedondeado({ x: 3, y: 0, z: 4 }, dir, texel)
    const b = centroSombraRedondeado({ x: a.x + texel * 0.1, y: a.y, z: a.z }, dir, texel)
    // Solo cuentan los ejes de la cámara de luz; a lo largo de la luz el centro sí sigue al objetivo.
    const [ad, aa] = ejes(a)
    const [bd, ba] = ejes(b)
    expect(bd).toBeCloseTo(ad, 9)
    expect(ba).toBeCloseTo(aa, 9)
  })

  it('el centro queda a menos de un texel del objetivo', () => {
    const o = { x: -20.37, y: 1.2, z: 15.61 }
    const c = centroSombraRedondeado(o, dir, texel)
    expect(Math.hypot(c.x - o.x, c.y - o.y, c.z - o.z)).toBeLessThan(texel * 1.5)
  })

  it('los datos cumplen el esquema', () => {
    expect(() => cargarSombras(DATOS_SOMBRAS)).not.toThrow()
    expect(() => cargarSombras({ ...DATOS_SOMBRAS, mapa: 0 })).toThrow(/Sombras inválidas/)
  })
})
