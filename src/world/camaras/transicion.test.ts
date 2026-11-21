import { describe, expect, it } from 'vitest'
import {
  avanzarTransicion,
  invertirTransicion,
  iniciarTransicion,
  poseDeTransicion,
  suavizado,
  transicionTerminada,
  type Pose,
} from './transicion'

const origen: Pose = { posicion: { x: 0, y: 2, z: 5 }, objetivo: { x: 0, y: 1.5, z: 0 } }
const destino: Pose = { posicion: { x: 10, y: 60, z: -20 }, objetivo: { x: 10, y: 0, z: -30 } }

describe('transición de cámara', () => {
  it('t=0 da el origen y t=1 el destino', () => {
    const t0 = iniciarTransicion(origen, 0.8)
    expect(poseDeTransicion(t0, destino)).toEqual(origen)
    const t1 = avanzarTransicion(t0, 0.8)
    expect(transicionTerminada(t1)).toBe(true)
    expect(poseDeTransicion(t1, destino)).toEqual(destino)
    // pasarse de tiempo no sobrepasa el destino
    expect(poseDeTransicion(avanzarTransicion(t0, 5), destino)).toEqual(destino)
  })

  it('la curva es monótona', () => {
    let previo = -1
    for (let i = 0; i <= 100; i++) {
      const s = suavizado(i / 100)
      expect(s).toBeGreaterThanOrEqual(previo)
      previo = s
    }
    expect(suavizado(0)).toBe(0)
    expect(suavizado(1)).toBe(1)
  })

  it('invertir a mitad parte de la posición actual (sin saltos)', () => {
    const t = avanzarTransicion(iniciarTransicion(origen, 0.8), 0.3)
    const antes = poseDeTransicion(t, destino)
    const inv = invertirTransicion(t, destino, 0.8)
    expect(poseDeTransicion(inv, origen)).toEqual(antes)
    expect(inv.progreso).toBe(0)
    // Una vez invertida, llega al origen.
    expect(poseDeTransicion(avanzarTransicion(inv, inv.duracion), origen)).toEqual(origen)
  })

  it('la posición es continua al invertir y avanzar fotogramas', () => {
    let t = iniciarTransicion(origen, 0.8)
    for (let i = 0; i < 20; i++) t = avanzarTransicion(t, 1 / 60)
    const antes = poseDeTransicion(t, destino).posicion
    t = invertirTransicion(t, destino, 0.8)
    const despues = poseDeTransicion(avanzarTransicion(t, 1 / 60), origen).posicion
    const dist = Math.hypot(antes.x - despues.x, antes.y - despues.y, antes.z - despues.z)
    expect(dist).toBeLessThan(1)
  })

  it('invertir al inicio dura un mínimo y no divide por cero', () => {
    const inv = invertirTransicion(iniciarTransicion(origen, 0.8), destino, 0.8)
    expect(inv.duracion).toBeGreaterThan(0)
    const p = poseDeTransicion(avanzarTransicion(inv, 1), origen)
    expect(Number.isFinite(p.posicion.x)).toBe(true)
  })
})
