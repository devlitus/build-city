import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { LinearSRGBColorSpace, RepeatWrapping, SRGBColorSpace, Texture } from 'three'
import materialesJson from '../../data/materiales.json'
import { crearFabrica } from './materiales'
import {
  cargarMateriales,
  CATALOGO_MATERIALES,
  escalaRepeticion,
  esquemaMateriales,
  tinteSobreTextura,
} from './materiales-datos'
import { paletaJuego } from './paleta'

const fabrica = () => crearFabrica(CATALOGO_MATERIALES, paletaJuego, () => new Texture())

describe('catálogo de materiales', () => {
  it('el catálogo cumple el esquema', () => {
    expect(v.safeParse(esquemaMateriales, materialesJson).success).toBe(true)
    expect(() =>
      cargarMateriales({ anisotropia: 8, materiales: { x: { tinte: 'prado' } } }),
    ).toThrow(/rugosidad|inválid/i)
    // Con textura hacen falta metros y color medio.
    expect(() =>
      cargarMateriales({
        anisotropia: 8,
        materiales: { x: { textura: 't', tinte: 'prado', rugosidad: 1 } },
      }),
    ).toThrow(/metrosPorRepeticion/)
  })

  it('todo tinte existe en la paleta', () => {
    for (const [nombre, m] of Object.entries(CATALOGO_MATERIALES.materiales)) {
      expect(Object.hasOwn(paletaJuego, m.tinte), `${nombre}: ${m.tinte}`).toBe(true)
    }
    expect(() =>
      cargarMateriales({
        anisotropia: 8,
        materiales: { x: { tinte: 'fucsia', rugosidad: 1 } },
      }),
    ).toThrow(/fucsia/)
  })

  it('los metros por repeticion son positivos y coinciden con el inventario', () => {
    for (const [nombre, m] of Object.entries(CATALOGO_MATERIALES.materiales)) {
      if (m.textura !== undefined) expect(m.metrosPorRepeticion, nombre).toBeGreaterThan(0)
    }
    for (const n of ['hierba', 'camino', 'surcos']) {
      expect(CATALOGO_MATERIALES.materiales[n]?.metrosPorRepeticion).toBe(2.5)
    }
  })

  it('pedir dos veces el mismo material devuelve el mismo objeto', () => {
    const f = fabrica()
    expect(f.material('hierba')).toBe(f.material('hierba'))
    expect(f.material('crema')).toBe(f.material('crema'))
    expect(f.material('hierba')).not.toBe(f.material('camino'))
    expect(() => f.material('nada')).toThrow(/nada/)
  })

  it('la escala de repetición es 1 / metros', () => {
    expect(escalaRepeticion(2.5)).toBeCloseTo(0.4, 10)
    expect(escalaRepeticion(1.6)).toBeCloseTo(1 / 1.6, 10)
  })

  it('solo la textura difusa es sRGB y todas se repiten', () => {
    const f = fabrica()
    const m = f.material('hierba')
    expect(m.map?.colorSpace).toBe(SRGBColorSpace)
    expect(m.normalMap?.colorSpace).toBe(LinearSRGBColorSpace)
    expect(m.roughnessMap?.colorSpace).toBe(LinearSRGBColorSpace)
    for (const t of [m.map, m.normalMap, m.roughnessMap]) {
      expect(t?.wrapS).toBe(RepeatWrapping)
      expect(t?.wrapT).toBe(RepeatWrapping)
      expect(t?.anisotropy).toBe(CATALOGO_MATERIALES.anisotropia)
    }
    // El material del terreno toma el color de los vértices y comparte las texturas de la hierba.
    const t = f.material('terreno')
    expect(t.vertexColors).toBe(true)
    expect(t.map).toBe(m.map)
  })

  it('el tinte reproduce el color objetivo sobre la textura', () => {
    const [r, g, b] = tinteSobreTextura([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
    expect([r, g, b]).toEqual([1, 1, 1])
    const [r2] = tinteSobreTextura([0.8, 0.5, 0.5], [0.4, 0.5, 0.5])
    expect(r2).toBeGreaterThan(1)
  })
})
