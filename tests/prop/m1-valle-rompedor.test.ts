/**
 * Rompedor · M1-T01 Datos del valle a escala 3D (sistema crítico: parcelas).
 * Ataques: generación del valle 8×8 de 20 casillas con semillas límite (río continuo, vados,
 * obstáculos, aparición, determinismo), precio de parcela con subida atenuada y mínimo
 * (monotonía, enteros, coherencia con el dinero), esquema de economía y tamaño del estado.
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import * as v from 'valibot'
import economiaJson from '../../data/economia.json'
import {
  CONFIG_VALLE,
  EsquemaConfigEconomia,
  aplicarComando,
  aguaBloqueada,
  casillaBloqueada,
  casillasRio,
  claveCasilla,
  crearEstadoInicial,
  ladoValle,
  mapaTransitabilidad,
  parcelaComprable,
  precioParcela,
  rioVertical,
  type EstadoJuego,
} from '../../src/core'

const SEMILLAS_LIMITE = [0, 1, 2 ** 31 - 1, 2 ** 31, 2 ** 32 - 1, -1, -(2 ** 31), 123456789]
const semillaArb = fc.oneof(fc.constantFrom(...SEMILLAS_LIMITE), fc.integer())

/** Número de franjas contiguas (a lo largo del cauce) que forman los vados. */
function franjasDeVados(e: EstadoJuego): number {
  const lado = ladoValle(e.valle)
  const vertical = rioVertical(e.valle)
  const ejes = [...new Set(e.cauce.vados.map((k) => (vertical ? Math.floor(k / lado) : k % lado)))]
  ejes.sort((a, b) => a - b)
  let franjas = 0
  ejes.forEach((a, i) => {
    if (i === 0 || a !== (ejes[i - 1] as number) + 1) franjas++
  })
  return franjas
}

describe('M1-T01 rompedor · generación del valle', () => {
  it('64 parcelas de 20 casillas, río continuo de borde a borde y 1–2 vados con cualquier semilla', () => {
    fc.assert(
      fc.property(semillaArb, (semilla) => {
        const e = crearEstadoInicial({ semilla })
        const { valle } = e
        expect(valle.parcelas).toHaveLength(64)
        expect(valle.casillasPorParcela).toBe(20)
        const lado = ladoValle(valle)
        expect(lado).toBe(160)
        // Río de casillas: 4-conexo y toca dos bordes opuestos.
        const rio = casillasRio(valle, e.cauce.ancho)
        const enRio = new Set(rio.map((c) => claveCasilla(lado, c.x, c.y)))
        const vertical = rioVertical(valle)
        const inicio = rio.find((c) => (vertical ? c.y === 0 : c.x === 0))
        if (!inicio) throw new Error('el río no toca el borde de entrada')
        const vistas = new Set<number>()
        const pila = [claveCasilla(lado, inicio.x, inicio.y)]
        let llegaAlOtroBorde = false
        while (pila.length > 0) {
          const k = pila.pop() as number
          if (vistas.has(k)) continue
          vistas.add(k)
          const x = k % lado
          const y = (k - x) / lado
          if ((vertical ? y : x) === lado - 1) llegaAlOtroBorde = true
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= lado || ny >= lado) continue
            const nk = claveCasilla(lado, nx, ny)
            if (enRio.has(nk) && !vistas.has(nk)) pila.push(nk)
          }
        }
        expect(llegaAlOtroBorde).toBe(true)
        expect(vistas.size).toBe(enRio.size)
        // Vados: casillas de río, entre 1 y 2 franjas.
        expect(e.cauce.vados.length).toBeGreaterThan(0)
        for (const k of e.cauce.vados) expect(enRio.has(k)).toBe(true)
        const franjas = franjasDeVados(e)
        expect(franjas).toBeGreaterThanOrEqual(CONFIG_VALLE.vados.min)
        expect(franjas).toBeLessThanOrEqual(CONFIG_VALLE.vados.max)
      }),
      { numRuns: 25 },
    )
  })

  it('obstáculos dentro del valle, nunca en el río ni duplicados; aparición transitable', () => {
    fc.assert(
      fc.property(semillaArb, (semilla) => {
        const e = crearEstadoInicial({ semilla })
        const lado = ladoValle(e.valle)
        const enRio = new Set(
          casillasRio(e.valle, e.cauce.ancho).map((c) => claveCasilla(lado, c.x, c.y)),
        )
        const ocupadas = new Set<number>()
        for (const o of e.obstaculos) {
          expect(Number.isInteger(o.x) && Number.isInteger(o.y)).toBe(true)
          expect(o.x >= 0 && o.y >= 0 && o.x < lado && o.y < lado).toBe(true)
          const k = claveCasilla(lado, o.x, o.y)
          expect(enRio.has(k)).toBe(false)
          expect(ocupadas.has(k)).toBe(false)
          ocupadas.add(k)
        }
        const ax = Math.floor(e.aparicion.x)
        const ay = Math.floor(e.aparicion.y)
        expect(ax >= 0 && ay >= 0 && ax < lado && ay < lado).toBe(true)
        expect(aguaBloqueada(e.valle, e.cauce)[claveCasilla(lado, ax, ay)]).toBe(0)
        expect(ocupadas.has(claveCasilla(lado, ax, ay))).toBe(false)
        expect(casillaBloqueada(mapaTransitabilidad(e), ax, ay)).toBe(false)
        expect(e.personaje.x).toBe(e.aparicion.x)
        expect(e.personaje.y).toBe(e.aparicion.y)
      }),
      { numRuns: 25 },
    )
  })

  it('las dos orillas se alcanzan a pie: toda parcela tiene alguna casilla transitable', () => {
    for (const semilla of SEMILLAS_LIMITE) {
      const e = crearEstadoInicial({ semilla })
      const mapa = mapaTransitabilidad(e)
      const c = e.valle.casillasPorParcela
      for (const p of e.valle.parcelas) {
        let alguna = false
        for (let y = 0; y < c && !alguna; y++)
          for (let x = 0; x < c && !alguna; x++)
            alguna = !casillaBloqueada(mapa, p.columna * c + x, p.fila * c + y)
        expect(alguna, `semilla ${semilla}, parcela ${p.fila},${p.columna}`).toBe(true)
      }
    }
  })

  it('determinismo: misma semilla da el mismo estado; semilla y semilla>>>0 son equivalentes', () => {
    fc.assert(
      fc.property(fc.integer(), (semilla) => {
        const a = JSON.stringify(crearEstadoInicial({ semilla }))
        expect(JSON.stringify(crearEstadoInicial({ semilla }))).toBe(a)
        expect(JSON.stringify(crearEstadoInicial({ semilla: semilla >>> 0 }))).toBe(a)
      }),
      { numRuns: 10 },
    )
  })
})

describe('M1-T01 rompedor · precio y compra de parcelas', () => {
  it('el precio de cada parcela es entero, ≥ 10, múltiplo de 10 y sube estrictamente hasta 63 compras', () => {
    const e = crearEstadoInicial({ semilla: 42 })
    for (let i = 0; i < e.valle.parcelas.length; i++) {
      let previo = -1
      for (let compras = 0; compras <= 63; compras++) {
        const p = precioParcela({ valle: e.valle, comprasHechas: compras }, i)
        if (p === undefined) throw new Error(`sin precio: parcela ${i}, compras ${compras}`)
        expect(Number.isSafeInteger(p)).toBe(true)
        expect(p % 10).toBe(0)
        expect(p).toBeGreaterThanOrEqual(10)
        expect(p).toBeGreaterThan(previo)
        previo = p
      }
    }
  })

  it('comprar todo el valle en orden de adyacencia: el dinero baja justo el precio y nunca es negativo', () => {
    fc.assert(
      fc.property(semillaArb, fc.nat(63), fc.nat(), (semilla, primera, sorteo) => {
        let e = crearEstadoInicial({ semilla, dineroInicial: Number.MAX_SAFE_INTEGER })
        const dineroInicial = e.dinero
        let gastado = 0
        let r = sorteo
        for (let k = 0; k < 64; k++) {
          const candidatas = e.valle.parcelas
            .map((_, i) => i)
            .filter((i) => parcelaComprable(e, i).comprable)
          const indice = k === 0 ? primera : candidatas[r % candidatas.length]
          r = Math.floor(r / 3) + 7 * k
          if (indice === undefined) throw new Error('no queda parcela comprable')
          const precio = precioParcela(e, indice) ?? Number.NaN
          const res = aplicarComando(e, { tipo: 'ComprarParcela', indice })
          expect(res.ok).toBe(true)
          expect(res.estado.dinero).toBe(e.dinero - precio)
          expect(res.estado.dinero).toBeGreaterThanOrEqual(0)
          expect(res.estado.comprasHechas).toBe(k + 1)
          gastado += precio
          e = res.estado
          // No se puede comprar dos veces.
          const doble = aplicarComando(e, { tipo: 'ComprarParcela', indice })
          expect(doble.ok).toBe(false)
          expect(doble.estado).toBe(e)
        }
        expect(e.valle.parcelas.every((p) => p.estado === 'propia')).toBe(true)
        expect(e.dinero).toBe(dineroInicial - gastado)
      }),
      { numRuns: 8 },
    )
  })

  it('fondos justos compran; un euro menos no, y el estado no cambia', () => {
    fc.assert(
      fc.property(semillaArb, fc.nat(63), (semilla, indice) => {
        const base = crearEstadoInicial({ semilla })
        const precio = precioParcela(base, indice) ?? Number.NaN
        const justo = { ...base, dinero: precio }
        const ok = aplicarComando(justo, { tipo: 'ComprarParcela', indice })
        expect(ok.ok).toBe(true)
        expect(ok.estado.dinero).toBe(0)
        const pobre = { ...base, dinero: precio - 1 }
        const ko = aplicarComando(pobre, { tipo: 'ComprarParcela', indice })
        expect(ko.ok).toBe(false)
        expect(ko.estado).toBe(pobre)
        // Tras comprar, una parcela no adyacente no se puede comprar.
        const n = base.valle.parcelasPorLado
        const f = Math.floor(indice / n)
        const c = indice % n
        const lejana = base.valle.parcelas.findIndex(
          (p) => Math.abs(p.fila - f) + Math.abs(p.columna - c) >= 2,
        )
        const rico = { ...ok.estado, dinero: 10 ** 12 }
        expect(parcelaComprable(rico, lejana)).toMatchObject({
          comprable: false,
          motivo: 'no-adyacente',
        })
      }),
      { numRuns: 20 },
    )
  })

  it('el esquema rechaza atenuacionSubida ≤ 0 o > 1 y subidaMinima < 0, y acepta los datos reales', () => {
    expect(v.safeParse(EsquemaConfigEconomia, economiaJson).success).toBe(true)
    for (const atenuacionSubida of [0, -0.1, 1.0001, 2, Number.NaN, Infinity]) {
      const r = v.safeParse(EsquemaConfigEconomia, { ...economiaJson, atenuacionSubida })
      expect(r.success, `atenuacionSubida ${atenuacionSubida}`).toBe(false)
    }
    for (const subidaMinima of [-0.01, -1, Number.NaN, -Infinity]) {
      const r = v.safeParse(EsquemaConfigEconomia, { ...economiaJson, subidaMinima })
      expect(r.success, `subidaMinima ${subidaMinima}`).toBe(false)
    }
    // Con cualquier configuración válida el precio es entero ≥ 10 o `undefined`, nunca NaN.
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.double({ min: Number.MIN_VALUE, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.nat(200),
        (subidaPorCompra, atenuacionSubida, subidaMinima, compras) => {
          const config = v.parse(EsquemaConfigEconomia, {
            ...economiaJson,
            subidaPorCompra,
            atenuacionSubida,
            subidaMinima,
          })
          const e = crearEstadoInicial({ semilla: 3 })
          const p = precioParcela({ valle: e.valle, comprasHechas: compras }, 0, config)
          if (p !== undefined) {
            expect(Number.isSafeInteger(p)).toBe(true)
            expect(p).toBeGreaterThanOrEqual(10)
          }
        },
      ),
      { numRuns: 60 },
    )
  })
})

describe('M1-T01 rompedor · tamaño del estado', () => {
  it('estado inicial: cadenas por casilla del tamaño del valle, JSON razonable y ida y vuelta exacta', () => {
    for (const semilla of SEMILLAS_LIMITE) {
      const e = crearEstadoInicial({ semilla })
      const lado = ladoValle(e.valle)
      expect(e.zonas).toHaveLength(lado * lado)
      expect(e.tierra).toHaveLength(lado * lado)
      for (const k of e.cauce.vados) expect(k >= 0 && k < lado * lado).toBe(true)
      for (const i of e.valle.rio) expect(i >= 0 && i < e.valle.parcelas.length).toBe(true)
      const json = JSON.stringify(e)
      expect(json.length).toBeLessThan(2_000_000)
      expect(JSON.parse(json)).toEqual(e)
    }
  })
})
