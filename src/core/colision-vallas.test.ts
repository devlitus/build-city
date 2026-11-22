import { describe, expect, it } from 'vitest'
import { buscarCamino } from './camino'
import { circuloSolapaBloqueo } from './colision'
import { crearEstadoInicial, type EstadoJuego } from './estado'
import { ladoValle, mapaTransitabilidad } from './mapa'
import { moverPersonaje } from './personaje'
import { CARACTER_VALLA, vallasVacias } from './vallas-estado'

const R = 0.3
const inicial = crearEstadoInicial({ semilla: 42 })
const LADO = ladoValle(inicial.valle)
const libre: EstadoJuego = { ...inicial, obstaculos: [] }

/** Esquina (x0, y0) de una ventana de 9x9 casillas sin agua cerca de la aparición. */
const { x0: X0, y0: Y0 } = (() => {
  const m = mapaTransitabilidad(libre)
  const ax = Math.floor(libre.aparicion.x)
  const ay = Math.floor(libre.aparicion.y)
  for (let d = 0; d < LADO; d++) {
    for (let y0 = Math.max(0, ay - d); y0 <= Math.min(LADO - 9, ay + d); y0++) {
      for (let x0 = Math.max(0, ax - d); x0 <= Math.min(LADO - 9, ax + d); x0++) {
        // La aparición no puede caer en las casillas donde los tests ponen vallas (3..6).
        let ok = !(ax >= x0 + 3 && ax <= x0 + 6 && ay >= y0 + 3 && ay <= y0 + 6)
        for (let y = y0; y < y0 + 9 && ok; y++) {
          for (let x = x0; x < x0 + 9; x++) if (m.bloqueada[y * LADO + x] === 1) ok = false
        }
        if (ok) return { x0, y0 }
      }
    }
  }
  throw new Error('sin ventana libre')
})()

type Pieza = readonly [number, number, 'valla' | 'puerta']

/** Estado con vallas y puertas en casillas relativas a la ventana. */
function conVallas(piezas: readonly Pieza[]): EstadoJuego {
  const c = vallasVacias(LADO).split('')
  for (const [x, y, t] of piezas) c[(Y0 + y) * LADO + X0 + x] = CARACTER_VALLA[t]
  return { ...libre, vallas: c.join('') }
}
const bloqueada = (e: EstadoJuego, x: number, y: number): number =>
  mapaTransitabilidad(e).bloqueada[(Y0 + y) * LADO + X0 + x] as number
const pers = (x: number, y: number) => ({ x: X0 + x, y: Y0 + y, orientacion: 'este' as const })

describe('colisión con vallas y puertas', () => {
  it('las vallas empiezan vacías y no cambian el mapa inicial', () => {
    const sin = mapaTransitabilidad({ ...libre, vallas: undefined })
    const vacias = mapaTransitabilidad({ ...libre, vallas: vallasVacias(LADO) })
    expect(Array.from(vacias.bloqueada)).toEqual(Array.from(sin.bloqueada))
    expect(inicial.vallas).toBe(vallasVacias(LADO))
  })

  it('la valla bloquea', () => {
    const e = conVallas([[4, 4, 'valla']])
    expect(bloqueada(e, 4, 4)).toBe(1)
    let p = pers(1.5, 4.5)
    for (let i = 0; i < 30; i++) p = moverPersonaje(e, p, 1, 0, 100)
    expect(p.x).toBeLessThanOrEqual(X0 + 4 - R + 1e-9)
    expect(circuloSolapaBloqueo(mapaTransitabilidad(e), p.x, p.y, R)).toBe(false)
  })

  it('la puerta deja pasar', () => {
    const e = conVallas([[4, 4, 'puerta']])
    expect(bloqueada(e, 4, 4)).toBe(0)
    let p = pers(1.5, 4.5)
    for (let i = 0; i < 30; i++) p = moverPersonaje(e, p, 1, 0, 100)
    expect(p.x).toBeGreaterThan(X0 + 6)
  })

  it('el mapa se recalcula al cambiar las vallas (caché)', () => {
    const a = conVallas([[4, 4, 'valla']])
    const b = conVallas([])
    expect(bloqueada(a, 4, 4)).toBe(1)
    expect(bloqueada(b, 4, 4)).toBe(0)
    expect(bloqueada(a, 4, 4)).toBe(1)
  })

  it.each([
    ['andando', 100, false],
    ['corriendo', 100, true],
    ['con pasos grandes', 1000, true],
  ])('no se cuela en diagonal entre dos vallas (%s)', (_nombre, ms, corre) => {
    // Vallas en (4,4) y (5,5): se tocan por la esquina (5,5); (5,4) y (4,5) quedan libres.
    const e = conVallas([
      [4, 4, 'valla'],
      [5, 5, 'valla'],
    ])
    const mapa = mapaTransitabilidad(e)
    // Lado de la diagonal que separa (4,5) de (5,4): signo de x - y.
    const lado = (q: { x: number; y: number }) => Math.sign(q.x - X0 - (q.y - Y0))
    const casos = [
      { ini: pers(4.5, 5.5), dx: 1, dy: -1 },
      { ini: pers(5.5, 4.5), dx: -1, dy: 1 },
      { ini: pers(4.5, 5.5), dx: 1, dy: -0.9 },
      { ini: pers(5.5, 4.5), dx: -0.9, dy: 1 },
    ]
    for (const { ini, dx, dy } of casos) {
      let p = ini
      for (let i = 0; i < 40; i++) {
        p = moverPersonaje(e, p, dx, dy, ms, undefined, corre)
        expect(circuloSolapaBloqueo(mapa, p.x, p.y, R)).toBe(false)
      }
      expect(lado(p)).toBe(lado(ini))
    }
  })

  it('la búsqueda de caminos rodea la valla y cruza por la puerta', () => {
    const desde = { x: X0 + 1.5, y: Y0 + 4.5 }
    const hasta = { x: X0 + 7.5, y: Y0 + 4.5 }
    const enCasilla = (q: { x: number; y: number }, x: number, y: number) =>
      Math.floor(q.x) === X0 + x && Math.floor(q.y) === Y0 + y

    // Pared de lado a lado de la ventana con una puerta: la ruta cruza por ella.
    const pared: Pieza[] = Array.from({ length: 9 }, (_, y) => [
      4,
      y,
      y === 4 ? 'puerta' : 'valla',
    ])
    const conPuerta = conVallas(pared)
    const m1 = mapaTransitabilidad(conPuerta)
    const porPuerta = buscarCamino(conPuerta, desde, hasta)
    expect(porPuerta.some((q) => enCasilla(q, 4, 4))).toBe(true)
    for (const q of porPuerta) expect(m1.bloqueada[Math.floor(q.y) * LADO + Math.floor(q.x)]).toBe(0)
    expect(enCasilla(porPuerta.at(-1) as { x: number; y: number }, 7, 4)).toBe(true)

    // Valla corta (filas 2..6): la ruta la rodea, es más larga y nunca pisa la valla.
    const corta = conVallas(Array.from({ length: 5 }, (_, i): Pieza => [4, i + 2, 'valla']))
    const m2 = mapaTransitabilidad(corta)
    const rodea = buscarCamino(corta, desde, hasta)
    expect(enCasilla(rodea.at(-1) as { x: number; y: number }, 7, 4)).toBe(true)
    for (const q of rodea) expect(m2.bloqueada[Math.floor(q.y) * LADO + Math.floor(q.x)]).toBe(0)
    const sinValla = buscarCamino(libre, desde, hasta)
    expect(rodea.length).toBeGreaterThan(sinValla.length)
  })
})
