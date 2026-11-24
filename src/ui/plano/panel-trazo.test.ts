import { describe, expect, it } from 'vitest'
import type { ResumenTrazo } from '../../juego/trazo-plano'
import { vistaTrazo } from './panel-trazo'
import { textoMotivoTrazo } from './texto-motivo'

const base: ResumenTrazo = {
  herramienta: 'vallas',
  quitar: false,
  recurso: 'madera',
  cantidad: 6,
  casillas: [],
  validas: 3,
  invalidas: 1,
  sinFondos: false,
  bloqueaPaso: false,
  motivo: 'agua',
}

describe('vistaTrazo', () => {
  it('sin trazo no muestra nada', () => {
    expect(vistaTrazo(null)).toEqual({ importe: '', casillas: '', aviso: '', rojo: false })
  })
  it('muestra el coste total y el motivo de las rojas', () => {
    const v = vistaTrazo(base)
    expect(v.importe).toBe('Coste: 6 madera')
    expect(v.casillas).toBe('3 casillas, 1 en rojo')
    expect(v.aviso).toBe('Hay agua')
    expect(v.rojo).toBe(false)
  })
  it('al quitar muestra el reembolso; los caminos, en piedra', () => {
    const v = vistaTrazo({ ...base, quitar: true, recurso: 'piedra', cantidad: 2 })
    expect(v.importe).toBe('Devuelve: 2 piedra')
  })
  it('falta material, cierra el paso o nada válido: en rojo', () => {
    expect(vistaTrazo({ ...base, sinFondos: true }).aviso).toBe('Falta madera')
    expect(vistaTrazo({ ...base, sinFondos: true }).rojo).toBe(true)
    expect(vistaTrazo({ ...base, bloqueaPaso: true }).aviso).toContain('puerta')
    expect(vistaTrazo({ ...base, validas: 0 }).rojo).toBe(true)
  })
})

describe('textoMotivoTrazo', () => {
  it('tiene texto para todos los motivos, incluidos camino y valla', () => {
    for (const m of [
      'fuera-del-valle',
      'no-propia',
      'agua',
      'obstaculo',
      'ocupada',
      'cultivo',
      'arada',
      'ya-hay-valla',
      'ya-hay-camino',
      'camino',
      'valla',
      'personaje',
      'nada-que-quitar',
    ]) {
      expect(textoMotivoTrazo(m)).not.toContain('trazo.motivo')
    }
  })
})
