/* eslint-disable @typescript-eslint/no-non-null-assertion -- aserciones de catálogo conocido en tests */
import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import {
  CONFIG_EDIFICIOS,
  EsquemaConfigEdificios,
  materialesQueFaltan,
  type TipoEdificio,
  catalogo,
  crearEstadoInicial,
  defEdificio,
  diasRestantes,
  entradaCatalogo,
  faltaPagar,
  restoTrasPagar,
  TIPOS_EDIFICIO,
  type EstadoJuego,
} from './index'

const base = crearEstadoInicial({ semilla: 42 })
const con = (e: Partial<EstadoJuego>): EstadoJuego => ({ ...base, ...e })

describe('catálogo de edificios (M4-05)', () => {
  it('lista todos los tipos del catálogo, en orden', () => {
    expect(catalogo(base).map((e) => e.tipo)).toEqual([...TIPOS_EDIFICIO])
  })

  it('con el lote de bienvenida y 1.100 monedas se puede construir todo', () => {
    for (const e of catalogo(base)) {
      expect(e.motivo).toBeUndefined()
      expect(e.faltan).toEqual({ dinero: 0, madera: 0, piedra: 0 })
    }
  })

  it('sin dinero: fondos-insuficientes y cuánto falta', () => {
    const e = entradaCatalogo(con({ dinero: 100 }), 'cobertizo')
    expect(e.motivo).toBe('fondos-insuficientes')
    expect(e.faltan).toEqual({ dinero: 200, madera: 0, piedra: 0 })
  })

  it('sin materiales: materiales-insuficientes y cuánto falta de cada uno', () => {
    const e = entradaCatalogo(con({ materiales: { madera: 30, piedra: 4 } }), 'cobertizo')
    expect(e.motivo).toBe('materiales-insuficientes')
    expect(e.faltan).toEqual({ dinero: 0, madera: 20, piedra: 6 })
  })

  it('si faltan dinero y materiales gana el dinero (como en colocacionValida)', () => {
    const e = entradaCatalogo(con({ dinero: 0, materiales: { madera: 0, piedra: 0 } }), 'cobertizo')
    expect(e.motivo).toBe('fondos-insuficientes')
    expect(e.faltan).toEqual({ dinero: 300, madera: 50, piedra: 10 })
  })

  it('la casa es gratis: se puede «pagar» con 0 de todo', () => {
    const e = entradaCatalogo(con({ dinero: 0, materiales: { madera: 0, piedra: 0 } }), 'casa')
    expect(e.motivo).toBeUndefined()
  })

  it('un edificio único que ya existe (obra incluida) da unico-ya-existe', () => {
    const e = entradaCatalogo(
      con({ edificios: [{ id: 1, tipo: 'casa', x: 0, y: 0, obra: { diaInicio: 1, diaFin: 4 } }] }),
      'casa',
    )
    expect(e.motivo).toBe('unico-ya-existe')
    // Los que no son únicos no se ven afectados.
    expect(
      entradaCatalogo(
        con({ edificios: [{ id: 1, tipo: 'caja-envio', x: 0, y: 0, obra: null }] }),
        'caja-envio',
      ).motivo,
    ).toBeUndefined()
  })

  it('faltaPagar coincide con el motivo de pago de colocacionValida para un dinero no entero', () => {
    expect(faltaPagar(con({ dinero: Number.NaN }), defEdificio('caja-envio')!)).toBe(
      'fondos-insuficientes',
    )
  })

  it('restoTrasPagar resta el coste de cada cosa', () => {
    const def = defEdificio('cobertizo')!
    expect(restoTrasPagar(base, def.coste)).toEqual({
      dinero: base.dinero - 300,
      madera: base.materiales.madera - 50,
      piedra: base.materiales.piedra - 10,
    })
  })

  it('es pura: no muta el estado', () => {
    const antes = JSON.stringify(base)
    catalogo(base)
    expect(JSON.stringify(base)).toBe(antes)
  })
})

describe('diasRestantes', () => {
  it('es diaFin - dia y nunca negativo', () => {
    const obra = { diaInicio: 2, diaFin: 5 }
    expect(diasRestantes(obra, 2)).toBe(3)
    expect(diasRestantes(obra, 4)).toBe(1)
    expect(diasRestantes(obra, 5)).toBe(0)
    expect(diasRestantes(obra, 9)).toBe(0)
  })
})

describe('entradaCatalogo con dinero corrupto', () => {
  it('si el motivo es de pago, faltan no sale a cero', () => {
    for (const dinero of [100.5, 2 ** 60, Number.NaN]) {
      const e = entradaCatalogo(
        { edificios: [], dinero, materiales: { madera: 100, piedra: 100 } },
        'caja-envio',
      )
      expect(e.motivo).toBe('fondos-insuficientes')
      expect(e.faltan.dinero).toBeGreaterThan(0)
    }
  })
})

describe('catálogo del MVP 3D (M5-T02)', () => {
  it('los datos cumplen el esquema', () => {
    expect(v.safeParse(EsquemaConfigEdificios, CONFIG_EDIFICIOS).success).toBe(true)
    expect([...TIPOS_EDIFICIO]).toEqual(['casa', 'tienda', 'caja-envio', 'cobertizo'])
    for (const t of TIPOS_EDIFICIO) {
      const d = defEdificio(t)!
      expect(d.altura).toBeGreaterThan(0)
      expect(Array.isArray(d.niveles)).toBe(true)
    }
  })

  it('las huellas y alturas son las del GDD §7.4', () => {
    const medidas = (t: TipoEdificio) => {
      const d = defEdificio(t)!
      return [d.ancho, d.alto, d.altura]
    }
    expect(medidas('tienda')).toEqual([3, 3, 1.8])
    expect(medidas('caja-envio')).toEqual([2, 1, 1])
    expect(medidas('cobertizo')).toEqual([4, 3, 3.5])
    expect(medidas('casa')).toEqual([7, 5, 5])
  })

  it('la tienda es barata, rápida y de vivienda', () => {
    const t = defEdificio('tienda')!
    expect(t.zonas).toEqual(['vivienda'])
    expect(t.dias).toBe(1)
    expect(t.coste).toEqual({ dinero: 100, madera: 10, piedra: 0 })
    expect(t.unico).toBe(false)
    expect(t.demolible).toBe(true)
  })

  it('los niveles de mejora previstos van en los datos y no cambian la huella base', () => {
    const cob = defEdificio('cobertizo')!
    expect(cob.niveles.map((n) => n.nombre)).toEqual(['granero', 'granero-grande'])
    expect(cob.niveles[0]).toMatchObject({ ancho: 8, alto: 6, altura: 8 })
    expect(defEdificio('casa')!.niveles).toEqual([])
  })

  it('materialesQueFaltan con inventario parcial', () => {
    const parcial = con({ dinero: 120, materiales: { madera: 30, piedra: 4 } })
    expect(materialesQueFaltan(parcial, 'cobertizo')).toEqual({
      dinero: 180,
      madera: 20,
      piedra: 6,
    })
    expect(materialesQueFaltan(parcial, 'tienda')).toEqual({ dinero: 0, madera: 0, piedra: 0 })
    expect(materialesQueFaltan(parcial, 'caja-envio')).toEqual({ dinero: 0, madera: 0, piedra: 0 })
    expect(materialesQueFaltan(parcial, 'casa')).toEqual({ dinero: 0, madera: 0, piedra: 0 })
  })

  it('la casa 7×5 cabe en una parcela del valle inicial', () => {
    const { casillasPorParcela: c } = base.valle
    const casa = defEdificio('casa')!
    expect(casa.ancho).toBeLessThanOrEqual(c)
    expect(casa.alto).toBeLessThanOrEqual(c)
  })
})
