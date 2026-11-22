import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  aplicarComando,
  casillasOcupadas,
  casillasRio,
  veredictoColocacion,
  crearEstadoInicial,
  huellaDe,
  defEdificio,
  type Edificio,
  type DefEdificio,
  ladoValle,
  rotacionDe,
  type Comando,
  type EstadoJuego,
  type Rotacion,
  type TipoEdificio,
} from '../../src/core'

const TIPOS: readonly TipoEdificio[] = ['casa', 'caja-envio', 'cobertizo', 'tienda']

/** Tres parcelas propias, zonas vivienda/almacén alternas y Modo Plano. */
function preparar(semilla: number): EstadoJuego {
  let e = crearEstadoInicial({ semilla, dineroInicial: 50_000 })
  const paso = (c: Comando) => {
    const r = aplicarComando(e, c)
    if (r.ok) e = r.estado
  }
  const N = e.valle.parcelasPorLado
  for (let i = 0; i < N * N; i++) {
    if (e.valle.parcelas.filter((p) => p.estado === 'propia').length >= 3) break
    if (!e.valle.rio.includes(i)) paso({ tipo: 'ComprarParcela', indice: i })
  }
  const lado = ladoValle(e.valle)
  for (let x = 0; x < lado; x += 8) {
    const zona = (x / 8) % 2 === 0 ? 'vivienda' : 'almacen'
    paso({ tipo: 'PintarZona', x0: x, y0: 0, x1: x + 7, y1: lado - 1, zona })
  }
  paso({ tipo: 'CambiarModo', modo: 'plano' })
  return e
}

const ESTADOS = [3, 7, 42].map(preparar)
const rot = fc.constantFrom<Rotacion>(0, 1, 2, 3)
const orden = fc.record({
  tipo: fc.constantFrom(...TIPOS),
  x: fc.integer({ min: -2, max: 165 }),
  y: fc.integer({ min: -2, max: 165 }),
  rotacion: rot,
  mover: fc.boolean(),
})

describe('rotación: el veredicto y el comando coinciden', () => {
  it('también con el día en el límite y con un estado mal formado', () => {
    const casos: EstadoJuego[] = [
      { ...(ESTADOS[0] as EstadoJuego), dia: Number.MAX_SAFE_INTEGER },
      { ...(ESTADOS[1] as EstadoJuego), siguienteIdEdificio: 1.5 },
      { ...(ESTADOS[2] as EstadoJuego), materiales: { madera: -1, piedra: 0 } },
    ]
    fc.assert(
      fc.property(
        fc.nat(2),
        fc.integer({ min: 0, max: 159 }),
        fc.integer({ min: 0, max: 159 }),
        rot,
        (i, x, y, rotacion) => {
          const e = casos[i] as EstadoJuego
          const v = veredictoColocacion(e, 'caja-envio', x, y, rotacion)
          const r = aplicarComando(e, {
            tipo: 'Construir',
            tipoEdificio: 'caja-envio',
            x,
            y,
            rotacion,
          })
          expect(r.ok).toBe(v.valida)
          if (!r.ok && !v.valida) expect(r.error).toBe(v.motivo)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Construir tiene éxito ⇔ veredictoColocacion es válido (con rotaciones aleatorias)', () => {
    fc.assert(
      fc.property(fc.nat(2), fc.array(orden, { maxLength: 12 }), (si, ordenes) => {
        let e = ESTADOS[si] as EstadoJuego
        const lado = ladoValle(e.valle)
        // Se concentran las órdenes en las parcelas propias para que haya éxitos.
        const propias = e.valle.parcelas
          .map((p, i) => (p.estado === 'propia' ? i : -1))
          .filter((i) => i >= 0)
        const c = e.valle.casillasPorParcela
        for (const o of ordenes) {
          const pi = propias[Math.abs(o.x) % propias.length] as number
          const x = (pi % e.valle.parcelasPorLado) * c + (Math.abs(o.x) % c)
          const y = Math.floor(pi / e.valle.parcelasPorLado) * c + (Math.abs(o.y) % c)
          const v = veredictoColocacion(e, o.tipo, x, y, o.rotacion)
          const r = aplicarComando(e, {
            tipo: 'Construir',
            tipoEdificio: o.tipo,
            x,
            y,
            rotacion: o.rotacion,
          })
          expect(r.ok).toBe(v.valida)
          if (!r.ok && !v.valida) expect(r.error).toBe(v.motivo)
          if (r.ok) e = r.estado
        }
        expect(lado).toBeGreaterThan(0)
      }),
      { numRuns: 60 },
    )
  })

  it('ninguna casilla queda ocupada por dos cosas tras Construir y MoverEdificio girados', () => {
    fc.assert(
      fc.property(fc.nat(2), fc.array(orden, { maxLength: 14 }), (si, ordenes) => {
        let e = ESTADOS[si] as EstadoJuego
        const lado = ladoValle(e.valle)
        const c = e.valle.casillasPorParcela
        const propias = e.valle.parcelas
          .map((p, i) => (p.estado === 'propia' ? i : -1))
          .filter((i) => i >= 0)
        for (const o of ordenes) {
          const pi = propias[Math.abs(o.x) % propias.length] as number
          const x = (pi % e.valle.parcelasPorLado) * c + (Math.abs(o.x) % c)
          const y = Math.floor(pi / e.valle.parcelasPorLado) * c + (Math.abs(o.y) % c)
          let cmd: Comando = {
            tipo: 'Construir',
            tipoEdificio: o.tipo,
            x,
            y,
            rotacion: o.rotacion,
          }
          if (o.mover && e.edificios.length > 0) {
            const b = e.edificios[Math.abs(o.x) % e.edificios.length] as Edificio
            // Las obras no se mueven: se terminan a mano para poder moverlas.
            e = { ...e, edificios: e.edificios.map((q) => ({ ...q, obra: null })) }
            cmd = { tipo: 'MoverEdificio', id: b.id, x, y, rotacion: o.rotacion }
          }
          const r = aplicarComando(e, cmd)
          if (r.ok) e = r.estado
          // Ninguna casilla repetida entre edificios, ni con obstáculos, río o plantas.
          const vistas = new Set<number>()
          for (const b of e.edificios) {
            const h = huellaDe(defEdificio(b.tipo) as DefEdificio, b.x, b.y, rotacionDe(b))
            expect(h.x0 >= 0 && h.y0 >= 0 && h.x1 < lado && h.y1 < lado).toBe(true)
            for (let j = h.y0; j <= h.y1; j++)
              for (let i = h.x0; i <= h.x1; i++) {
                const k = j * lado + i
                expect(vistas.has(k)).toBe(false)
                vistas.add(k)
              }
          }
          const ocupadas = casillasOcupadas(e.edificios, lado)
          expect(ocupadas.size).toBe(vistas.size)
          for (const q of casillasRio(e.valle, e.cauce.ancho))
            expect(vistas.has(q.y * lado + q.x)).toBe(false)
          for (const ob of e.obstaculos) expect(vistas.has(ob.y * lado + ob.x)).toBe(false)
          for (const [k] of e.plantas) expect(vistas.has(k)).toBe(false)
        }
      }),
      { numRuns: 60 },
    )
  })
})
