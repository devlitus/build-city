import { describe, expect, it } from 'vitest'
import { conTierraLabrable } from '../../../tests/unit/fixtures/labranza'
import {
  aplicarComando,
  CONFIG_CULTIVOS,
  crearEstadoInicial,
  CULTIVOS,
  diasHastaMadurar,
  ladoValle,
  type EstadoJuego,
  type Planta,
} from '../../core'
import { empezarDiaSiguiente } from '../../core/obras'
import {
  agruparPlantas,
  capacidadNecesaria,
  faseVisualDePlanta,
  gruposQueCambian,
  planDeMallas,
} from './agrupacion'

const LADO = 100
const idx = (c: string) => CULTIVOS.indexOf(c as (typeof CULTIVOS)[number])
const planta = (casilla: number, cultivo: string, dias = 0, marchita: 0 | 1 = 0): Planta => [
  casilla,
  idx(cultivo),
  dias,
  0,
  0,
  marchita,
]

describe('faseVisualDePlanta', () => {
  const dpf = CONFIG_CULTIVOS.cultivos.patata.diasPorFase
  const total = diasHastaMadurar(CONFIG_CULTIVOS.cultivos.patata)
  it('brote antes de acabar la primera fase, luego crecimiento y maduro', () => {
    expect(faseVisualDePlanta(planta(1, 'patata', 0))).toBe('brote')
    expect(faseVisualDePlanta(planta(1, 'patata', (dpf[0] ?? 1) - 1))).toBe('brote')
    expect(faseVisualDePlanta(planta(1, 'patata', dpf[0]))).toBe('crecimiento')
    expect(faseVisualDePlanta(planta(1, 'patata', total - 1))).toBe('crecimiento')
    expect(faseVisualDePlanta(planta(1, 'patata', total))).toBe('maduro')
  })
  it('marchita manda sobre los días', () => {
    expect(faseVisualDePlanta(planta(1, 'patata', total, 1))).toBe('marchito')
  })
  it('la fresa que rebrota se dibuja en crecimiento', () => {
    const def = CONFIG_CULTIVOS.cultivos.fresa
    const dias = diasHastaMadurar(def) - (def.rebrota?.dias ?? 0)
    expect(faseVisualDePlanta(planta(1, 'fresa', dias))).toBe('crecimiento')
  })
  it('cultivo desconocido: sin fase', () => {
    expect(faseVisualDePlanta([1, 99, 0, 0, 0, 0])).toBeUndefined()
  })
})

describe('agruparPlantas', () => {
  const total = diasHastaMadurar(CONFIG_CULTIVOS.cultivos.patata)
  it('agrupa por cultivo y fase', () => {
    const grupos = agruparPlantas(
      [
        planta(5, 'patata', 0),
        planta(7, 'patata', 0),
        planta(205, 'patata', total),
        planta(310, 'lechuga', 0),
        planta(412, 'patata', 0, 1),
        planta(413, 'lechuga', 0, 1),
      ],
      LADO,
    )
    expect([...grupos.keys()].sort()).toEqual(
      ['lechuga/brote', 'marchito', 'patata/brote', 'patata/maduro'].sort(),
    )
    expect(grupos.get('patata/brote')?.casillas.map((c) => c.indice)).toEqual([5, 7])
    expect(grupos.get('patata/maduro')?.casillas[0]).toEqual({ x: 5, y: 2, indice: 205 })
    // El marchito es común a todos los cultivos.
    expect(grupos.get('marchito')?.casillas).toHaveLength(2)
  })

  it('un cambio en una casilla solo cambia su grupo', () => {
    const antes = [planta(5, 'patata', 0), planta(7, 'patata', 0), planta(310, 'lechuga', 0)]
    const despues = [planta(5, 'patata', 0), planta(7, 'patata', 0), planta(310, 'lechuga', 1)]
    // Ningún cambio: nada que reescribir.
    expect(gruposQueCambian(agruparPlantas(antes, LADO), agruparPlantas(antes, LADO))).toEqual([])
    // La lechuga pasa de brote a crecimiento (1 día de la primera fase): solo se tocan sus dos grupos.
    const cambian = gruposQueCambian(agruparPlantas(antes, LADO), agruparPlantas(despues, LADO))
    expect(cambian.sort()).toEqual(['lechuga/brote', 'lechuga/crecimiento'])
  })

  it('un grupo vacío no crea malla', () => {
    expect(planDeMallas(agruparPlantas([], LADO))).toEqual([])
    const grupos = agruparPlantas([planta(5, 'patata', 0), planta(6, 'rabano', 0)], LADO)
    expect(planDeMallas(grupos).sort()).toEqual(['patata/brote', 'rabano/brote'])
    // Un grupo con lista vacía tampoco da malla.
    const vacio = new Map([
      ['x', { clave: 'x', cultivo: null, fase: 'marchito' as const, casillas: [] }],
    ])
    expect(planDeMallas(vacio)).toEqual([])
  })

  it('el número de mallas nunca supera 5 cultivos x 3 fases + marchito', () => {
    const todas: Planta[] = []
    let i = 0
    for (const c of CULTIVOS) {
      const t = diasHastaMadurar(CONFIG_CULTIVOS.cultivos[c])
      for (const dias of [0, CONFIG_CULTIVOS.cultivos[c].diasPorFase[0] ?? 1, t]) {
        todas.push(planta(i++, c, dias), planta(i++, c, dias, 1))
      }
    }
    expect(planDeMallas(agruparPlantas(todas, LADO))).toHaveLength(CULTIVOS.length * 3 + 1)
  })
})

describe('capacidadNecesaria', () => {
  it('mantiene la capacidad si basta y crece con margen si no', () => {
    expect(capacidadNecesaria(10, 32)).toBe(32)
    expect(capacidadNecesaria(33, 32)).toBeGreaterThan(33)
    expect(capacidadNecesaria(1, 0)).toBeGreaterThan(1)
  })
})

describe('lo dibujado coincide con el estado del núcleo', () => {
  const base = crearEstadoInicial({ semilla: 1 })
  const lado = ladoValle(base.valle)
  const e0: EstadoJuego = conTierraLabrable(
    { ...base, personaje: { x: 50.5, y: 50.5, orientacion: 'sur' } },
    50,
    50,
  )
  const ok = (r: ReturnType<typeof aplicarComando>): EstadoJuego => {
    if (!r.ok) throw new Error(`rechazado: ${r.error}`)
    return r.estado
  }
  const usar = (e: EstadoJuego, x: number, y: number) =>
    ok(aplicarComando(e, { tipo: 'UsarHerramienta', x, y }))
  const con = (e: EstadoJuego, herramienta: EstadoJuego['herramienta']) => ({ ...e, herramienta })
  const amanece = (e: EstadoJuego): EstadoJuego => ({
    ...empezarDiaSiguiente(e, 'dormir').estado,
    personaje: e.personaje,
  })

  /** La agrupación contiene exactamente las plantas del estado, cada una en el grupo de su fase. */
  function coincide(e: EstadoJuego): void {
    const grupos = agruparPlantas(e.plantas, lado)
    const dibujadas = [...grupos.values()].flatMap((g) =>
      g.casillas.map((c) => ({ indice: c.indice, clave: g.clave })),
    )
    expect(dibujadas).toHaveLength(e.plantas.length)
    for (const p of e.plantas) {
      const fase = faseVisualDePlanta(p)
      const clave = fase === 'marchito' ? 'marchito' : `${CULTIVOS[p[1]]}/${fase}`
      expect(dibujadas.filter((d) => d.indice === p[0])).toEqual([{ indice: p[0], clave }])
    }
  }

  it('tras sembrar, regar y pasar varias noches (crecer, madurar y marchitar)', () => {
    let e = coincideAlAplicar(con(e0, 'azada'))
    e = usar(e, 50, 51)
    e = usar(e, 51, 51)
    e = { ...e, semillaElegida: 'semilla-patata', herramienta: 'semillas' }
    e = usar(e, 50, 51)
    e = { ...e, semillaElegida: 'semilla-rabano' }
    e = usar(e, 51, 51)
    expect(e.plantas).toHaveLength(2)
    coincide(e)
    e = con(e, 'regadera')
    for (let noche = 0; noche < 12; noche++) {
      // Se riega solo la patata: el rábano acabará marchita.
      // Cuando la patata madura la regadera rechaza regarla (el núcleo lo dice): se sigue igual.
      const riego = aplicarComando(e, { tipo: 'UsarHerramienta', x: 50, y: 51 })
      if (riego.ok) e = riego.estado
      e = amanece(e)
      coincide(e)
    }
    const fases = e.plantas.map((p) => faseVisualDePlanta(p))
    expect(fases).toContain('marchito')
    expect(fases).toContain('maduro')
  })

  function coincideAlAplicar(e: EstadoJuego): EstadoJuego {
    coincide(e)
    return e
  }

  it('tras limpiar una marchita con la azada, desaparece de los grupos', () => {
    const arado = usar(con(e0, 'azada'), 50, 51)
    const casilla = 51 * lado + 50
    const e = { ...arado, plantas: [[casilla, idx('rabano'), 0, 0, 3, 1]] as Planta[] }
    coincide(e)
    expect(agruparPlantas(e.plantas, lado).get('marchito')?.casillas).toHaveLength(1)
    const limpio = usar(e, 50, 51)
    expect(limpio.plantas).toHaveLength(0)
    coincide(limpio)
  })
})
