import { describe, expect, it } from 'vitest'
import {
  defEdificio,
  type DefEdificio,
  edificiosValidos,
  esRotacion,
  girar,
  huellaDe,
  puertaDe,
  ROTACIONES,
} from './index'

const casa = defEdificio('casa') as DefEdificio // 7×5
const caja = defEdificio('caja-envio') as DefEdificio // 2×1

describe('rotación de edificios', () => {
  it('esRotacion solo acepta 0, 1, 2 y 3', () => {
    for (const r of ROTACIONES) expect(esRotacion(r)).toBe(true)
    for (const r of [4, -1, 1.5, NaN, '1', null, undefined]) expect(esRotacion(r)).toBe(false)
  })

  it('girar da la vuelta completa en cuatro pasos', () => {
    expect(girar(0)).toBe(1)
    expect(girar(3)).toBe(0)
    expect(girar(girar(girar(girar(2))))).toBe(2)
  })

  it('puertaDe: con rotación 0 mira al sur y gira en sentido horario', () => {
    expect(puertaDe(casa, 10, 20)).toEqual({ x: 13, y: 25 })
    expect(puertaDe(casa, 10, 20, 0)).toEqual({ x: 13, y: 25 })
    // 1: al oeste, centro del lado de 7 casillas (huella 5×7).
    expect(puertaDe(casa, 10, 20, 1)).toEqual({ x: 9, y: 23 })
    // 2: al norte.
    expect(puertaDe(casa, 10, 20, 2)).toEqual({ x: 13, y: 19 })
    // 3: al este.
    expect(puertaDe(casa, 10, 20, 3)).toEqual({ x: 15, y: 23 })
  })

  it('puertaDe: la puerta queda siempre pegada a la huella girada', () => {
    for (const def of [casa, caja]) {
      for (const r of ROTACIONES) {
        const h = huellaDe(def, 10, 10, r)
        const p = puertaDe(def, 10, 10, r)
        const dx = p.x < h.x0 ? h.x0 - p.x : p.x > h.x1 ? p.x - h.x1 : 0
        const dy = p.y < h.y0 ? h.y0 - p.y : p.y > h.y1 ? p.y - h.y1 : 0
        expect(dx + dy).toBe(1)
      }
    }
  })

  it('puertaDe: girar 180° refleja la puerta del giro 0', () => {
    expect(puertaDe(caja, 5, 5, 0)).toEqual({ x: 6, y: 6 })
    expect(puertaDe(caja, 5, 5, 2)).toEqual({ x: 5, y: 4 })
  })

  it('edificiosValidos: rotación ausente vale 0 y los valores raros se rechazan', () => {
    const e = { id: 1, tipo: 'casa', x: 0, y: 0, obra: null }
    expect(edificiosValidos([e])).toBe(true)
    for (const r of [0, 1, 2, 3]) expect(edificiosValidos([{ ...e, rotacion: r }])).toBe(true)
    for (const r of [4, -1, 1.5, '1', null, NaN]) {
      expect(edificiosValidos([{ ...e, rotacion: r }])).toBe(false)
    }
  })
})
