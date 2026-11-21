import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { crearEstadoInicial } from '../../core'
import { t } from '../textos'
import {
  formatearHora,
  formatearMonedas,
  nombreEstacion,
  textoFecha,
  textoVelocidad,
  vistaReloj,
  vistasIguales,
} from './formato'

const estado = crearEstadoInicial({ semilla: 1 })

describe('formato del HUD', () => {
  it('formatea 375 minutos como 06:15', () => {
    expect(formatearHora(375)).toBe('06:15')
  })

  it('formatea 1500 minutos como 01:00 y rellena con ceros', () => {
    expect(formatearHora(1500)).toBe('01:00')
    expect(formatearHora(0)).toBe('00:00')
    expect(formatearHora(9 * 60 + 5)).toBe('09:05')
  })

  it('da el nombre de estación y el día correctos', () => {
    expect(nombreEstacion('primavera')).toBe('Primavera')
    expect(nombreEstacion('otono')).toBe('Otoño')
    expect(textoFecha({ dia: 1 })).toBe('Día 1 · Primavera · Año 1')
    expect(textoFecha({ dia: 3 })).toContain('Día 3')
    // 4 estaciones de 21 días: el día 85 es el 1 del año 2.
    expect(textoFecha({ dia: 1 + 4 * 21 })).toContain('Año 2')
  })

  it('muestra pausa o velocidad', () => {
    expect(textoVelocidad({ ...estado, pausado: true })).toBe('Pausa')
    expect(textoVelocidad({ ...estado, pausado: false, velocidad: 2 })).toBe('x2')
    expect(textoVelocidad({ ...estado, pausado: false, modo: 'plano' })).toBe('Pausa')
  })

  it('la vista solo cambia cuando cambia algo visible', () => {
    const a = vistaReloj(estado)
    const mismoMinuto = vistaReloj({ ...estado })
    expect(vistasIguales(a, mismoMinuto)).toBe(true)
    expect(vistasIguales(a, vistaReloj({ ...estado, minutoDelDia: estado.minutoDelDia + 1 }))).toBe(
      false,
    )
  })

  it('t devuelve la clave si falta el texto', () => {
    expect(t('no.existe')).toBe('no.existe')
  })
})

describe('monedas del HUD', () => {
  it('agrupa los miles con punto', () => {
    expect(formatearMonedas(1240)).toBe('1.240')
    expect(formatearMonedas(0)).toBe('0')
    expect(formatearMonedas(999)).toBe('999')
    expect(formatearMonedas(1_000_000)).toBe('1.000.000')
    expect(formatearMonedas(-1240)).toBe('-1.240')
  })
})

describe('Reloj.tsx', () => {
  const fuente = readFileSync(new URL('./Reloj.tsx', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  it('no tiene texto visible escrito a mano: todo sale de `textos`', () => {
    // Texto JSX entre etiquetas que contenga letras (las expresiones `{...}` no cuentan).
    const textoJsx = [...fuente.matchAll(/>([^<>{}]*\p{L}[^<>{}]*)</gu)].map((m) => m[1])
    expect(textoJsx).toEqual([])
    // Atributos de texto accesible con literal.
    expect(fuente).not.toMatch(/aria-(label|description)="/)
    expect(fuente).not.toMatch(/(title|alt|placeholder)="/)
  })

  it('no tiene colores escritos a mano: usa variables de la paleta', () => {
    expect(fuente).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
  })
})
