import { describe, expect, it } from 'vitest'
import {
  comandoDeZona,
  esTeclaGirar,
  crearCanalHerramientaPlano,
  herramientaDeTecla,
  instalarTeclasHerramientaPlano,
} from './herramienta-plano'

const tecla = (code: string, extra: Partial<Record<string, boolean>> = {}) => ({
  code,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  repeat: false,
  ...extra,
})

describe('canal de herramienta del Modo Plano', () => {
  it('empieza en parcelas, avisa solo cuando cambia y permite desuscribirse', () => {
    const c = crearCanalHerramientaPlano()
    expect(c.herramienta).toBe('parcelas')
    const vistos: string[] = []
    const baja = c.suscribir((e) => vistos.push(`${e.herramienta}/${e.zona}`))
    c.elegirHerramienta('zonas')
    c.elegirHerramienta('zonas')
    c.elegirZona('borrar')
    c.reiniciar()
    c.reiniciar()
    baja()
    c.elegirHerramienta('zonas')
    expect(vistos).toEqual(['zonas/cultivo', 'zonas/borrar', 'parcelas/borrar'])
  })
})

describe('teclas de herramienta', () => {
  it('Z activa Zonas y Esc vuelve a parcelas, solo en Modo Plano', () => {
    expect(herramientaDeTecla(tecla('KeyZ'), { modo: 'plano' })).toBe('zonas')
    expect(herramientaDeTecla(tecla('Escape'), { modo: 'plano' })).toBe('parcelas')
    expect(herramientaDeTecla(tecla('KeyZ'), { modo: 'vida' })).toBeUndefined()
  })
  it('ignora repetición, combinaciones y las teclas reservadas', () => {
    expect(herramientaDeTecla(tecla('KeyZ', { repeat: true }), { modo: 'plano' })).toBeUndefined()
    expect(herramientaDeTecla(tecla('KeyZ', { ctrlKey: true }), { modo: 'plano' })).toBeUndefined()
    for (const code of ['KeyR', 'KeyM', 'KeyX', 'Digit1', 'Digit9']) {
      expect(herramientaDeTecla(tecla(code), { modo: 'plano' })).toBeUndefined()
    }
  })
})

describe('instalarTeclasHerramientaPlano', () => {
  it('cambia con el teclado y reinicia al salir del Modo Plano', () => {
    const estado = { modo: 'plano' as 'plano' | 'vida' }
    const suscriptores = new Set<() => void>()
    const almacen = {
      get estado() {
        return estado as never
      },
      suscribir(s: () => void) {
        suscriptores.add(s)
        return () => {
          suscriptores.delete(s)
        }
      },
    }
    let oyente: ((e: KeyboardEvent) => void) | undefined
    const objetivo = {
      addEventListener: (_: string, f: unknown) => {
        oyente = f as (e: KeyboardEvent) => void
      },
      removeEventListener: () => {
        oyente = undefined
      },
    }
    const canal = crearCanalHerramientaPlano()
    const quitar = instalarTeclasHerramientaPlano(almacen as never, canal, objetivo)
    oyente?.({ ...tecla('KeyZ'), target: null } as unknown as KeyboardEvent)
    expect(canal.herramienta).toBe('zonas')
    estado.modo = 'vida'
    for (const s of suscriptores) s()
    expect(canal.herramienta).toBe('parcelas')
    quitar()
    expect(oyente).toBeUndefined()
    expect(suscriptores.size).toBe(0)
  })
})

describe('comandoDeZona', () => {
  const rect = { x0: 1, y0: 2, x1: 3, y1: 4 }
  it('pinta con la zona o borra', () => {
    expect(comandoDeZona('huerto', rect)).toEqual({ tipo: 'PintarZona', ...rect, zona: 'huerto' })
    expect(comandoDeZona('borrar', rect)).toEqual({ tipo: 'BorrarZona', ...rect })
  })
})

describe('esTeclaGirar (R)', () => {
  const plano = { modo: 'plano' as const }
  it('solo gira en Plano con construir', () => {
    expect(esTeclaGirar(tecla('KeyR'), plano, 'construir')).toBe(true)
    expect(esTeclaGirar(tecla('KeyR'), plano, 'parcelas')).toBe(false)
    expect(esTeclaGirar(tecla('KeyR'), plano, 'zonas')).toBe(false)
    expect(esTeclaGirar(tecla('KeyR'), { modo: 'vida' }, 'construir')).toBe(false)
  })
  it('ignora repetición, modificadores y otras teclas (Z, Esc, M, X)', () => {
    expect(esTeclaGirar(tecla('KeyR', { repeat: true }), plano, 'construir')).toBe(false)
    expect(esTeclaGirar(tecla('KeyR', { ctrlKey: true }), plano, 'construir')).toBe(false)
    for (const c of ['KeyZ', 'Escape', 'KeyM', 'KeyX', 'Digit1']) {
      expect(esTeclaGirar(tecla(c), plano, 'construir')).toBe(false)
    }
  })
})
