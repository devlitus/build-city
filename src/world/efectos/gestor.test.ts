import { describe, expect, it } from 'vitest'
import { GestorEfectos, type Efecto } from './gestor'

/** Efecto de prueba que cuenta sus llamadas. */
function falso(duracion: number): Efecto & { terminados: number; ultimoT: number } {
  const e = {
    duracion,
    terminados: 0,
    ultimoT: -1,
    actualizar(t: number) {
      e.ultimoT = t
    },
    terminar() {
      e.terminados++
    },
  }
  return e
}

describe('GestorEfectos', () => {
  it('al acabar los efectos no queda ninguno vivo y cada uno se termina una vez', () => {
    const g = new GestorEfectos()
    const a = falso(0.5)
    const b = falso(1)
    g.alta(a)
    g.alta(b)
    expect(g.vivos).toBe(2)
    g.actualizar(0.5)
    expect(g.vivos).toBe(1)
    expect(a.terminados).toBe(1)
    g.actualizar(0.6)
    expect(g.vivos).toBe(0)
    expect(b.terminados).toBe(1)
    g.actualizar(10)
    expect(a.terminados).toBe(1)
    expect(b.terminados).toBe(1)
  })

  it('un efecto con la misma clave sustituye al anterior y lo termina', () => {
    const g = new GestorEfectos()
    const a = falso(1)
    const b = falso(1)
    g.alta(a, 'arbol-3-4')
    g.alta(b, 'arbol-3-4')
    expect(g.vivos).toBe(1)
    expect(a.terminados).toBe(1)
    expect(b.terminados).toBe(0)
  })

  it('pasa a cada efecto el tiempo transcurrido desde su alta', () => {
    const g = new GestorEfectos()
    const a = falso(1)
    g.alta(a)
    g.actualizar(0.25)
    g.actualizar(0.25)
    expect(a.ultimoT).toBeCloseTo(0.5, 10)
  })

  it('limpiar termina y retira todo', () => {
    const g = new GestorEfectos()
    const efectos = [falso(5), falso(5), falso(5)]
    for (const e of efectos) g.alta(e)
    g.limpiar()
    expect(g.vivos).toBe(0)
    expect(efectos.map((e) => e.terminados)).toEqual([1, 1, 1])
  })
})
