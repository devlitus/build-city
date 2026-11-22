/* eslint-disable @typescript-eslint/no-non-null-assertion -- aserciones de catálogo conocido en tests */
import { describe, expect, it } from 'vitest'
import { crearEstadoInicial, defEdificio, puertaDe, ROTACIONES, type Edificio } from '../../core'
import { casillaAMetros } from '../terreno/coordenadas'
import { centroHuella, claveEdificio, giroEdificio, huellaEdificio } from './colocacion-edificio'

const { valle } = crearEstadoInicial({ semilla: 1 })
const casa = (rotacion?: 0 | 1 | 2 | 3): Edificio => ({
  id: 1,
  tipo: 'casa',
  x: 20,
  y: 30,
  obra: null,
  ...(rotacion === undefined ? {} : { rotacion }),
})

describe('giroEdificio', () => {
  it('la puerta del modelo (+z) queda donde dice puertaDe del núcleo', () => {
    const def = defEdificio('casa')!
    for (const r of ROTACIONES) {
      const e = casa(r)
      const h = huellaEdificio(e)!
      const centro = centroHuella(h, valle)
      const p = puertaDe(def, e.x, e.y, r)
      const pm = casillaAMetros(p.x, p.y, valle)
      // Dirección real de la puerta, normalizada al eje dominante.
      const dx = pm.x - centro.x
      const dz = pm.z - centro.z
      const g = giroEdificio(e)
      // Rotar (0, 0, 1) un ángulo g alrededor de Y da (sin g, cos g) en (x, z).
      const mx = Math.sin(g)
      const mz = Math.cos(g)
      const mayor =
        Math.abs(dx) > Math.abs(dz) ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) }
      expect(Math.round(mx) + 0).toBe(mayor.x + 0)
      expect(Math.round(mz) + 0).toBe(mayor.z + 0)
    }
  })
  it('sin rotación no gira', () => {
    expect(giroEdificio(casa())).toBe(0)
  })
})

describe('centroHuella', () => {
  it('es el centro del rectángulo de la huella girada', () => {
    const h = huellaEdificio(casa(1))!
    expect(h.x1 - h.x0 + 1).toBe(5)
    expect(h.y1 - h.y0 + 1).toBe(7)
    const c = centroHuella(h, valle)
    const a = casillaAMetros(h.x0, h.y0, valle)
    expect(c.x).toBeCloseTo(a.x + 2)
    expect(c.z).toBeCloseTo(a.z + 3)
  })
})

describe('claveEdificio', () => {
  it('cambia con la etapa, la posición, el giro y el tipo, y no con lo demás', () => {
    const e = casa()
    const k = claveEdificio(e, 'cimientos')
    expect(claveEdificio({ ...e }, 'cimientos')).toBe(k)
    expect(claveEdificio(e, 'paredes')).not.toBe(k)
    expect(claveEdificio({ ...e, x: 21 }, 'cimientos')).not.toBe(k)
    expect(claveEdificio({ ...e, rotacion: 2 }, 'cimientos')).not.toBe(k)
    expect(claveEdificio({ ...e, tipo: 'tienda' }, 'cimientos')).not.toBe(k)
    expect(claveEdificio({ ...e, rotacion: 0 }, 'cimientos')).toBe(k)
  })
})
