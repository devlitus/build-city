import { describe, expect, it } from 'vitest'
import { HERRAMIENTAS } from '../core/inventario'
import {
  comandoHerramientaDeRueda,
  comandoHerramientaDeTecla,
  comandoUsarHerramienta,
  crearTeclas,
  direccionRelativa,
  instalarEleccionHerramienta,
  instalarEntrada,
} from './entrada'

const W = { adelante: true, atras: false, izquierda: false, derecha: false }

describe('direccionRelativa', () => {
  it('con yaw 0 la cámara mira al norte: W va al norte (-y), alejándose de la cámara', () => {
    const d = direccionRelativa(W, 0)
    expect(d.dx).toBeCloseTo(0, 9)
    expect(d.dy).toBeCloseTo(-1, 9)
  })

  it('W con la cámara girada 90° mueve en X', () => {
    const d = direccionRelativa(W, Math.PI / 2)
    expect(d.dx).toBeCloseTo(1, 9)
    expect(d.dy).toBeCloseTo(0, 9)
  })

  it('A y D van a los lados de la cámara', () => {
    const d = direccionRelativa({ ...W, adelante: false, derecha: true }, 0)
    expect(d.dx).toBeCloseTo(1, 9)
    expect(d.dy).toBeCloseTo(0, 9)
    const i = direccionRelativa({ ...W, adelante: false, izquierda: true }, 0)
    expect(i.dx).toBeCloseTo(-1, 9)
  })

  it('las diagonales salen normalizadas', () => {
    for (const yaw of [0, 0.7, 2, -3]) {
      const d = direccionRelativa({ ...W, derecha: true }, yaw)
      expect(Math.hypot(d.dx, d.dy)).toBeCloseTo(1, 9)
    }
  })

  it('sin teclas, o con teclas opuestas, la dirección es cero', () => {
    const cero = { adelante: false, atras: false, izquierda: false, derecha: false }
    expect(direccionRelativa(cero, 1.2)).toEqual({ dx: 0, dy: 0 })
    expect(direccionRelativa({ ...cero, adelante: true, atras: true }, 1.2)).toEqual({
      dx: 0,
      dy: 0,
    })
  })
})

describe('instalarEntrada', () => {
  function objetivoFalso() {
    const oyentes = new Map<string, (e: never) => void>()
    return {
      oyentes,
      addEventListener: (t: string, f: (e: never) => void) => void oyentes.set(t, f),
      removeEventListener: (t: string) => void oyentes.delete(t),
    }
  }
  const tecla = (code: string, extra: object = {}) => ({ code, target: null, ...extra })

  it('Mayús activa correr y WASD marca las direcciones', () => {
    const o = objetivoFalso()
    const t = crearTeclas()
    instalarEntrada(o as unknown as Window, t)
    o.oyentes.get('keydown')?.(tecla('KeyW') as never)
    o.oyentes.get('keydown')?.(tecla('ShiftLeft') as never)
    expect(t.adelante).toBe(true)
    expect(t.correr).toBe(true)
    o.oyentes.get('keyup')?.(tecla('ShiftLeft') as never)
    expect(t.correr).toBe(false)
  })

  it('al perder el foco se sueltan todas las teclas', () => {
    const o = objetivoFalso()
    const t = crearTeclas()
    instalarEntrada(o as unknown as Window, t)
    o.oyentes.get('keydown')?.(tecla('KeyD') as never)
    o.oyentes.get('blur')?.(undefined as never)
    expect(t).toEqual(crearTeclas())
  })

  it('Ctrl+tecla no mueve; quitar los oyentes los retira', () => {
    const o = objetivoFalso()
    const t = crearTeclas()
    const quitar = instalarEntrada(o as unknown as Window, t)
    o.oyentes.get('keydown')?.(tecla('KeyW', { ctrlKey: true }) as never)
    expect(t.adelante).toBe(false)
    quitar()
    expect(o.oyentes.size).toBe(0)
  })
})

function en(i: number) {
  const h = HERRAMIENTAS[i]
  if (h === undefined) throw new Error(`no hay herramienta ${i}`)
  return h
}

describe('elegir herramienta', () => {
  const sin = { altKey: false, ctrlKey: false, metaKey: false }
  const ultima = en(HERRAMIENTAS.length - 1)

  it('la tecla 3 elige la tercera herramienta', () => {
    expect(comandoHerramientaDeTecla({ code: 'Digit3', ...sin })).toEqual({
      tipo: 'ElegirHerramienta',
      herramienta: HERRAMIENTAS[2],
    })
    expect(comandoHerramientaDeTecla({ code: 'Numpad3', ...sin })?.herramienta).toBe(
      HERRAMIENTAS[2],
    )
  })

  it('las teclas sobrantes no hacen nada', () => {
    expect(comandoHerramientaDeTecla({ code: 'Digit9', ...sin })).toBeUndefined()
    expect(comandoHerramientaDeTecla({ code: 'Digit0', ...sin })).toBeUndefined()
  })

  it('Alt+número no elige herramienta', () => {
    expect(comandoHerramientaDeTecla({ code: 'Digit1', ...sin, altKey: true })).toBeUndefined()
  })

  it('la rueda pasa a la siguiente y da la vuelta', () => {
    const r = { deltaY: 100, ...sin }
    expect(comandoHerramientaDeRueda(r, en(0))?.herramienta).toBe(HERRAMIENTAS[1])
    expect(comandoHerramientaDeRueda(r, ultima)?.herramienta).toBe(HERRAMIENTAS[0])
  })

  it('la rueda hacia arriba pasa a la anterior y da la vuelta', () => {
    const r = { deltaY: -100, ...sin }
    expect(comandoHerramientaDeRueda(r, en(1))?.herramienta).toBe(HERRAMIENTAS[0])
    expect(comandoHerramientaDeRueda(r, en(0))?.herramienta).toBe(ultima)
  })

  it('Alt+rueda (zoom) no elige herramienta', () => {
    expect(comandoHerramientaDeRueda({ deltaY: 100, ...sin, altKey: true }, en(0))).toBeUndefined()
  })

  it('en Modo Plano la rueda es el zoom de la cámara y no elige herramienta', () => {
    const r = { deltaY: 100, ...sin }
    expect(comandoHerramientaDeRueda(r, en(0), HERRAMIENTAS, 'plano')).toBeUndefined()
    expect(comandoHerramientaDeRueda(r, en(0), HERRAMIENTAS, 'vida')?.herramienta).toBe(
      HERRAMIENTAS[1],
    )
  })

  it('los oyentes despachan y la función de retirada los quita', () => {
    const oyentes = new Map<string, (e: never) => void>()
    const o = {
      addEventListener: (n: string, f: (e: never) => void) => void oyentes.set(n, f),
      removeEventListener: (n: string) => void oyentes.delete(n),
    }
    const despachados: unknown[] = []
    const quitar = instalarEleccionHerramienta(
      {
        estado: { herramienta: HERRAMIENTAS[0] } as never,
        despachar: ((c: unknown) => despachados.push(c)) as never,
      },
      o as unknown as Window,
    )
    const e = { code: 'Digit2', ...sin, repeat: false, target: null, preventDefault: () => {} }
    oyentes.get('keydown')?.(e as never)
    expect(despachados).toEqual([{ tipo: 'ElegirHerramienta', herramienta: HERRAMIENTAS[1] }])
    quitar()
    expect(oyentes.size).toBe(0)
  })
})

describe('comandoUsarHerramienta', () => {
  const sinMods = { altKey: false, ctrlKey: false, metaKey: false }
  // Mira al este desde el centro de (10, 10): delante hay un árbol en (11, 10).
  const estado = {
    personaje: { x: 10.5, y: 10.5, orientacion: 'este' as const },
    obstaculos: [{ tipo: 'arbol' as const, x: 11, y: 10, variante: 0 }],
  }
  const E = { code: 'KeyE', ...sinMods }
  const clic = { button: 0, ...sinMods }
  const esperado = { tipo: 'UsarHerramienta', x: 11, y: 10 }

  it('E siempre usa la herramienta sobre la casilla de objetivoDelante', () => {
    expect(comandoUsarHerramienta(E, false, estado)).toEqual(esperado)
    expect(comandoUsarHerramienta(E, true, estado)).toEqual(esperado)
  })

  it('sin obstáculo delante apunta a la casilla de enfrente', () => {
    expect(comandoUsarHerramienta(E, false, { ...estado, obstaculos: [] })).toEqual(esperado)
  })

  it('el clic izquierdo usa la herramienta solo con el ratón capturado', () => {
    expect(comandoUsarHerramienta(clic, true, estado)).toEqual(esperado)
    expect(comandoUsarHerramienta(clic, false, estado)).toBeUndefined()
    expect(comandoUsarHerramienta({ ...clic, button: 2 }, true, estado)).toBeUndefined()
  })

  it('otras teclas y teclas con modificadores no hacen nada', () => {
    expect(comandoUsarHerramienta({ code: 'KeyW', ...sinMods }, true, estado)).toBeUndefined()
    expect(comandoUsarHerramienta({ ...E, ctrlKey: true }, true, estado)).toBeUndefined()
  })
})
