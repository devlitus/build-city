import { describe, expect, it } from 'vitest'
import { crearEstadoInicial } from '../core'
import { casillaAMetros, ladoCasillas, metrosACasilla } from './terreno/coordenadas'
import {
  celdasOcupadas,
  clavesAgua,
  colocarObstaculos,
  crearFiltroPueblo,
  dispersarBosque,
  hash,
  posicionObstaculo,
  tipoCopa,
  variacionDe,
  type EntornoDispersion,
} from './dispersion'
import { celdasAgua } from './agua'
import { crearAltura } from './terreno/altura'
import { PARAMETROS_TERRENO } from './terreno/parametros'
import { DATOS_VEGETACION, cargarVegetacion } from './vegetacion-datos'
import vegetacionJson from '../../data/vegetacion.json'
import valleJson from '../../data/valle.json'

const estado = crearEstadoInicial({ semilla: 1 })
const { valle, obstaculos } = estado

describe('datos de vegetación', () => {
  it('cumplen el esquema y rechazan rangos invertidos', () => {
    expect(() => cargarVegetacion(vegetacionJson)).not.toThrow()
    const malo = {
      ...vegetacionJson,
      arbol: { ...vegetacionJson.arbol, escala: { min: 2, max: 1 } },
    }
    expect(() => cargarVegetacion(malo)).toThrow(/Vegetación inválida/)
  })
})

describe('obstáculos del núcleo', () => {
  it('la posición en metros de un obstáculo es el centro de su casilla', () => {
    expect(obstaculos.length).toBeGreaterThan(0)
    for (const o of obstaculos) {
      const p = posicionObstaculo(o, valle)
      expect(p).toEqual(casillaAMetros(o.x, o.y, valle))
      // Centro exacto: la parte fraccionaria es 0,5 y vuelve a la misma casilla.
      expect(p.x - Math.floor(p.x)).toBeCloseTo(0.5, 9)
      expect(p.z - Math.floor(p.z)).toBeCloseTo(0.5, 9)
      expect(metrosACasilla(p.x, p.z, valle)).toEqual({ x: o.x, y: o.y })
    }
  })

  it('se dibuja exactamente lo que hay en el núcleo, en su casilla y con su variante', () => {
    const colocaciones = colocarObstaculos(valle, obstaculos)
    expect(colocaciones).toHaveLength(obstaculos.length)
    colocaciones.forEach((c, i) => {
      const o = obstaculos[i]
      expect(c.tipo).toBe(o?.tipo)
      expect(c.variante).toBe(o?.variante)
      expect(metrosACasilla(c.x, c.z, valle)).toEqual({ x: o?.x, y: o?.y })
    })
  })

  it('respeta la densidad de valle.json en los obstáculos del núcleo', () => {
    const lado = ladoCasillas(valle)
    const c = valle.casillasPorParcela
    for (const terreno of ['prado', 'bosque', 'rocoso'] as const) {
      const parcelas = valle.parcelas.filter((p) => p.terreno === terreno)
      if (parcelas.length === 0) continue
      const casillas = parcelas.length * c * c
      const contar = (tipo: string): number =>
        obstaculos.filter((o) => {
          const p =
            valle.parcelas[Math.floor(o.y / c) * valle.parcelasPorLado + Math.floor(o.x / c)]
          return o.tipo === tipo && p?.terreno === terreno
        }).length
      const dens = valleJson.densidadDecoracion[terreno]
      // El río quita casillas, así que la densidad real no supera la de datos (con margen estadístico).
      expect(contar('arbol') / casillas).toBeLessThanOrEqual(dens.arbol * 1.4 + 0.01)
      expect(contar('roca') / casillas).toBeLessThanOrEqual(dens.roca * 1.4 + 0.01)
    }
    expect(lado).toBe(160)
  })
})

function entornoDe(semilla: number): EntornoDispersion {
  const { valle, obstaculos } = crearEstadoInicial({ semilla })
  const altura = crearAltura(valle, semilla)
  return {
    valle,
    semilla,
    altura,
    agua: clavesAgua(celdasAgua(valle, altura)),
    ocupadas: celdasOcupadas(obstaculos),
    datos: DATOS_VEGETACION,
  }
}

describe('bosque de las colinas', () => {
  const entorno = entornoDe(1)

  it('misma semilla, mismas posiciones; otra semilla, otras', () => {
    const a = dispersarBosque(entorno)
    expect(a.length).toBeGreaterThan(500)
    expect(dispersarBosque(entornoDe(1))).toEqual(a)
    expect(dispersarBosque(entornoDe(2))).not.toEqual(a)
  })

  for (const semilla of [1, 7, 12345]) {
    it(`no coloca nada en el río ni en su extrusión (semilla ${semilla})`, () => {
      const e = entornoDe(semilla)
      const aguas = celdasAgua(e.valle, e.altura)
      const arboles = dispersarBosque(e)
      for (const c of arboles) {
        const casilla = metrosACasilla(c.x, c.z, e.valle)
        expect(aguas.some((a) => a.x === casilla.x && a.y === casilla.y)).toBe(false)
        expect(e.altura(c.x, c.z)).toBeGreaterThan(PARAMETROS_TERRENO.nivelAgua)
      }
    })
  }

  it('queda fuera del valle y fuera del pueblo (explanada, camino y edificios)', () => {
    const mitad = ladoCasillas(valle) / 2
    const enPueblo = crearFiltroPueblo(valle, 0)
    for (const c of dispersarBosque(entorno)) {
      expect(Math.abs(c.x) > mitad || Math.abs(c.z) > mitad).toBe(true)
      expect(enPueblo(c.x, c.z)).toBe(false)
    }
  })

  it('respeta la densidad de datos dentro de un margen', () => {
    const plano: EntornoDispersion = { ...entorno, altura: () => 3, agua: new Set() }
    const d = DATOS_VEGETACION.bosqueColinas
    const mitad = ladoCasillas(valle) / 2
    const limite = mitad + PARAMETROS_TERRENO.malla.radioColinas
    const lado = 2 * limite
    const interior = 2 * (mitad + d.margenValle)
    const celdas = (lado * lado - interior * interior) / (d.celda * d.celda)
    const n = dispersarBosque(plano).length
    // El pueblo quita una pequeña parte del anillo sur.
    expect(n / celdas).toBeGreaterThan(d.densidad * 0.9)
    expect(n / celdas).toBeLessThan(d.densidad * 1.05)
  })
})

describe('variación determinista', () => {
  it('misma semilla y variante, misma variación; otra semilla, otra', () => {
    const r = DATOS_VEGETACION.arbol.escala
    expect(variacionDe(0.37, 1, r)).toEqual(variacionDe(0.37, 1, r))
    expect(variacionDe(0.37, 1, r)).not.toEqual(variacionDe(0.37, 2, r))
    expect(tipoCopa(0.37, 1, DATOS_VEGETACION.arbol)).toBe(
      tipoCopa(0.37, 1, DATOS_VEGETACION.arbol),
    )
  })

  it('la escala queda dentro del rango de datos y hay pinos y árboles redondos', () => {
    const r = DATOS_VEGETACION.arbol.escala
    let pinos = 0
    for (let i = 0; i < 400; i++) {
      const variante = i / 400
      const v = variacionDe(variante, 1, r)
      expect(v.escala).toBeGreaterThanOrEqual(r.min)
      expect(v.escala).toBeLessThanOrEqual(r.max)
      expect(Math.abs(v.tono)).toBeLessThanOrEqual(1)
      if (tipoCopa(variante, 1, DATOS_VEGETACION.arbol) === 'pino') pinos++
    }
    expect(pinos / 400).toBeGreaterThan(DATOS_VEGETACION.arbol.proporcionPino - 0.1)
    expect(pinos / 400).toBeLessThan(DATOS_VEGETACION.arbol.proporcionPino + 0.1)
  })

  it('el hash está en [0, 1) y es estable', () => {
    for (let i = 0; i < 200; i++) {
      const h = hash(5, i, -i, 3)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(1)
    }
    expect(hash(5, 1, 2, 3)).toBe(hash(5, 1, 2, 3))
  })
})
