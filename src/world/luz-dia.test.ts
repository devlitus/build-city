import { describe, expect, it } from 'vitest'
import {
  anguloEntre,
  cargarLuz,
  DATOS_LUZ,
  horaDeMinutos,
  luzDelDia,
  type LuzDelDia,
} from './luz-dia'

const claveNombrada = (n: string) => DATOS_LUZ.claves.find((c) => c.nombre === n)!

/** Mayor diferencia por canal (0 a 1) entre dos colores 0xrrggbb. */
function saltoColor(a: number, b: number): number {
  return Math.max(...[16, 8, 0].map((d) => Math.abs(((a >> d) & 255) - ((b >> d) & 255)) / 255))
}

/** Mayor salto entre dos luces: ángulos en grados, resto de magnitudes en su unidad. */
function distancia(a: LuzDelDia, b: LuzDelDia): number {
  return Math.max(
    Math.abs(a.intensidadSol - b.intensidadSol),
    Math.abs(a.intensidadHemisferio - b.intensidadHemisferio),
    Math.abs(a.intensidadEntorno - b.intensidadEntorno),
    Math.abs(a.exposicion - b.exposicion),
    Math.abs(a.intensidadVentanas - b.intensidadVentanas),
    saltoColor(a.colorSol, b.colorSol),
    saltoColor(a.colorNiebla, b.colorNiebla),
    saltoColor(a.hemisferioCielo, b.hemisferioCielo),
    anguloEntre(a.direccionSol, b.direccionSol) / 90,
    anguloEntre(a.direccionLuz, b.direccionLuz) / 90,
  )
}

describe('luzDelDia', () => {
  it('los datos cumplen el esquema y el esquema rechaza datos inválidos', () => {
    expect(() => cargarLuz(DATOS_LUZ)).not.toThrow()
    expect(DATOS_LUZ.claves.map((c) => c.nombre)).toEqual(
      expect.arrayContaining([
        'amanecer',
        'mañana',
        'mediodía',
        'tarde',
        'atardecer',
        'anochecer',
        'noche',
      ]),
    )
    expect(() => cargarLuz({ ...DATOS_LUZ, umbralEntornoGrados: 0 })).toThrow(/Luz inválida/)
    const mala = { ...DATOS_LUZ.claves[0], colorNiebla: 'rojo' }
    expect(() => cargarLuz({ ...DATOS_LUZ, claves: [mala, DATOS_LUZ.claves[1]] })).toThrow(
      /Luz inválida/,
    )
    expect(() => cargarLuz({ ...DATOS_LUZ, sol: { ...DATOS_LUZ.sol, salida: 21 } })).toThrow(
      /Luz inválida/,
    )
  })

  it('en una clave devuelve exactamente sus valores', () => {
    for (const c of DATOS_LUZ.claves) {
      const l = luzDelDia(c.hora * 60)
      expect(l.colorSol).toBe(parseInt(c.colorSol.slice(1), 16))
      expect(l.hemisferioCielo).toBe(parseInt(c.hemisferioCielo.slice(1), 16))
      expect(l.hemisferioSuelo).toBe(parseInt(c.hemisferioSuelo.slice(1), 16))
      expect(l.colorNiebla).toBe(parseInt(c.colorNiebla.slice(1), 16))
      expect(l.intensidadSol).toBeCloseTo(c.intensidadSol, 10)
      expect(l.intensidadHemisferio).toBeCloseTo(c.intensidadHemisferio, 10)
      expect(l.intensidadEntorno).toBeCloseTo(c.intensidadEntorno, 10)
      expect(l.exposicion).toBeCloseTo(c.exposicion, 10)
      expect(l.intensidadVentanas).toBeCloseTo(c.intensidadVentanas, 10)
      expect(l.turbidez).toBeCloseTo(c.turbidez, 10)
      expect(l.rayleigh).toBeCloseTo(c.rayleigh, 10)
    }
  })

  it('es continua en 23:59 → 00:00 y acepta minutos de otro día', () => {
    const antes = luzDelDia(23 * 60 + 59)
    const despues = luzDelDia(24 * 60)
    expect(distancia(antes, despues)).toBeLessThan(0.01)
    expect(luzDelDia(0)).toEqual(luzDelDia(24 * 60))
    // 02:00 del día siguiente en el calendario del núcleo (1560 min) = 02:00.
    expect(luzDelDia(1560)).toEqual(luzDelDia(120))
    expect(horaDeMinutos(-60)).toBe(23)
  })

  it('no hay saltos en ningún punto del día (también al cambiar de clave)', () => {
    let previa = luzDelDia(0)
    for (let m = 1; m <= 1440; m++) {
      const actual = luzDelDia(m)
      expect(distancia(previa, actual)).toBeLessThan(0.02)
      previa = actual
    }
    // Y justo antes y después de cada clave.
    for (const c of DATOS_LUZ.claves) {
      const m = c.hora * 60
      expect(distancia(luzDelDia(m - 0.01), luzDelDia(m + 0.01))).toBeLessThan(0.001)
    }
  })

  it('el sol está sobre el horizonte entre el amanecer y el atardecer, y sale por el este', () => {
    const ini = claveNombrada('amanecer').hora * 60
    const fin = claveNombrada('atardecer').hora * 60
    for (let m = ini; m <= fin; m += 10) {
      const l = luzDelDia(m)
      expect(l.elevacionSol).toBeGreaterThan(0)
      expect(l.direccionSol.y).toBeGreaterThan(0)
      expect(l.direccionLuz.y).toBeGreaterThan(0)
    }
    const mañana = luzDelDia(claveNombrada('mañana').hora * 60).direccionSol
    const mediodia = luzDelDia(claveNombrada('mediodía').hora * 60).direccionSol
    const tarde = luzDelDia(claveNombrada('tarde').hora * 60).direccionSol
    expect(mañana.x).toBeGreaterThan(0)
    expect(mediodia.z).toBeGreaterThan(0) // el sur es +z
    expect(tarde.x).toBeLessThan(0)
  })

  it('de noche la luz direccional es una luna alta y tenue, y el sol está bajo el horizonte', () => {
    const noche = luzDelDia(claveNombrada('noche').hora * 60)
    expect(noche.elevacionSol).toBeLessThan(0)
    expect(noche.direccionLuz.y).toBeGreaterThan(0.5)
    expect(noche.intensidadSol).toBeGreaterThan(0)
    expect(noche.intensidadSol).toBeLessThan(luzDelDia(13 * 60).intensidadSol / 5)
  })

  it('las luces se encienden de noche y se apagan de día', () => {
    expect(luzDelDia(claveNombrada('noche').hora * 60).intensidadVentanas).toBeGreaterThan(0)
    expect(luzDelDia(22 * 60).intensidadVentanas).toBeGreaterThan(0)
    expect(luzDelDia(claveNombrada('mediodía').hora * 60).intensidadVentanas).toBe(0)
    expect(luzDelDia(claveNombrada('mañana').hora * 60).intensidadVentanas).toBe(0)
    expect(luzDelDia(claveNombrada('tarde').hora * 60).intensidadVentanas).toBe(0)
  })
})
