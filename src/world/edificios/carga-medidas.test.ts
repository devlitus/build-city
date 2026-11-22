import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ETAPAS_OBRA, TIPOS_EDIFICIO } from './carga'

interface MedidaEtapa {
  ancho: number
  fondo: number
  alto: number
  centroX: number
  centroZ: number
  base: number
  triangulos: number
  bytes: number
}
const medidas = JSON.parse(readFileSync('assets-src/fichas/medidas.json', 'utf-8')) as {
  meshopt: boolean
  edificios: Record<string, Record<string, MedidaEtapa>>
}

// Huellas del GDD (1 casilla = 1 m) y altura total aproximada. M5-T02 fija las definitivas en
// data/edificios.json: revisar esta tabla al integrar.
const ESPERADO: Record<string, { ancho: number; fondo: number; alto: number }> = {
  tienda: { ancho: 3, fondo: 3, alto: 1.8 },
  'caja-envio': { ancho: 2, fondo: 1, alto: 1 },
  cobertizo: { ancho: 4, fondo: 3, alto: 3.5 },
  casa: { ancho: 7, fondo: 5, alto: 5 },
}

function medida(tipo: string, etapa: string): MedidaEtapa {
  const m = medidas.edificios[tipo]?.[etapa]
  if (!m) throw new Error(`falta la ficha de ${tipo}_${etapa}`)
  return m
}

describe('modelos de edificios', () => {
  it('hay ficha para los 4 edificios y las 4 etapas', () => {
    for (const tipo of TIPOS_EDIFICIO) {
      for (const etapa of ETAPAS_OBRA) expect(medidas.edificios[tipo]?.[etapa]).toBeDefined()
    }
  })

  it('las medidas coinciden con la huella y están centradas con la base en y=0', () => {
    for (const tipo of TIPOS_EDIFICIO) {
      const { ancho, fondo, alto } = ESPERADO[tipo] ?? { ancho: 0, fondo: 0, alto: 0 }
      // La losa de cimientos y el terminado ocupan exactamente la huella.
      for (const etapa of ['cimientos', 'terminado'] as const) {
        const m = medida(tipo, etapa)
        expect(m.ancho).toBeCloseTo(ancho, 2)
        expect(m.fondo).toBeCloseTo(fondo, 2)
      }
      expect(medida(tipo, 'terminado').alto).toBeCloseTo(alto, 2)
      for (const etapa of ETAPAS_OBRA) {
        const m = medida(tipo, etapa)
        expect(m.ancho).toBeLessThanOrEqual(ancho + 0.001)
        expect(m.fondo).toBeLessThanOrEqual(fondo + 0.001)
        expect(m.base).toBeCloseTo(0, 3)
        expect(Math.abs(m.centroX)).toBeLessThan(0.01)
        expect(Math.abs(m.centroZ)).toBeLessThan(0.01)
      }
    }
  })

  it('cada .glb existe, pesa menos de 200 KB y su peso coincide con la ficha', () => {
    for (const tipo of TIPOS_EDIFICIO) {
      for (const etapa of ETAPAS_OBRA) {
        const bytes = statSync(`public/modelos/edificios/${tipo}_${etapa}.glb`).size
        expect(bytes).toBeLessThan(200 * 1024)
        expect(bytes).toBe(medida(tipo, etapa).bytes)
      }
    }
  })
})
