/* eslint-disable @typescript-eslint/no-non-null-assertion -- catálogo e ids conocidos en tests */
/**
 * Rompedor · M5-T03 Fantasma, rotación y validación (sistema crítico: reglas de construcción).
 * Ataques sobre el núcleo, con oráculos propios (la huella girada se recalcula aquí a mano):
 * - la huella girada se valida entera (parcela, río, obstáculos, edificios, zona) y el motivo de
 *   rechazo tiene un testigo en esa huella, no en la sin girar;
 * - rotaciones raras como parámetro y dentro del estado (4, -1, 1.5, '1', NaN, null);
 * - secuencias mezcladas Construir/Mover/Demoler/Cancelar/Dormir/desmayo con giros: invariantes de
 *   casillas, parcelas, zonas, alcance, dinero y materiales, `unico`, y fantasma ⇔ comando;
 * - despertar con la casa girada contra el borde, el río u otros edificios.
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  aplicarComando,
  casillasRio,
  CONFIG_EDIFICIOS,
  CONFIG_PERSONAJE,
  comprobarConstruir,
  crearEstadoInicial,
  ladoValle,
  personajeAlDespertar,
  veredictoColocacion,
  zonaEn,
  type Comando,
  type Edificio,
  type EstadoJuego,
  type Rotacion,
  type TipoEdificio,
} from '../../src/core'

const TIPOS: readonly TipoEdificio[] = ['casa', 'tienda', 'caja-envio', 'cobertizo']
const rot = fc.constantFrom<Rotacion>(0, 1, 2, 3)

/** Huella girada calculada a mano (independiente de `huellaDe`). */
function huella(tipo: string, x: number, y: number, r: unknown) {
  const def = CONFIG_EDIFICIOS.edificios[tipo as TipoEdificio]
  const impar = r === 1 || r === 3
  const an = impar ? def.alto : def.ancho
  const al = impar ? def.ancho : def.alto
  const celdas: [number, number][] = []
  for (let j = y; j < y + al; j++) for (let i = x; i < x + an; i++) celdas.push([i, j])
  return { x0: x, y0: y, x1: x + an - 1, y1: y + al - 1, celdas }
}

/**
 * Plano con parcelas propias salvo una de cada tres (en diagonal), franjas de zona de 9 vivienda,
 * 6 almacén y 3 sin zona (la casa 7×5 solo cabe en vivienda; girada mide 5 de ancho).
 */
function preparar(semilla: number): EstadoJuego {
  let e = crearEstadoInicial({ semilla, dineroInicial: 100_000 })
  const N = e.valle.parcelasPorLado
  e = {
    ...e,
    valle: {
      ...e.valle,
      parcelas: e.valle.parcelas.map((p, i) => ({
        ...p,
        estado: ((i % N) + Math.floor(i / N)) % 3 === 0 && i !== 0 ? p.estado : 'propia',
      })),
    },
  }
  const lado = ladoValle(e.valle)
  const paso = (c: Comando) => {
    const r = aplicarComando(e, c)
    if (r.ok) e = r.estado
  }
  for (let x = 0; x < lado; x += 18) {
    paso({ tipo: 'PintarZona', x0: x, y0: 0, x1: x + 8, y1: lado - 1, zona: 'vivienda' })
    paso({ tipo: 'PintarZona', x0: x + 9, y0: 0, x1: x + 14, y1: lado - 1, zona: 'almacen' })
  }
  paso({ tipo: 'CambiarModo', modo: 'plano' })
  return { ...e, dinero: 4_000, materiales: { madera: 400, piedra: 60 } }
}

const ESTADOS = [5, 11, 2026].map(preparar)

/** Casillas de agua (vados incluidos) y obstáculos, por clave. */
function fijos(e: EstadoJuego) {
  const lado = ladoValle(e.valle)
  const agua = new Set(casillasRio(e.valle, e.cauce.ancho).map((c) => c.y * lado + c.x))
  const vados = new Set(e.cauce.vados)
  const obst = new Set(e.obstaculos.map((o) => o.y * lado + o.x))
  return { lado, agua, vados, obst }
}

/** Clave → id de las huellas de todos los edificios; falla si dos se pisan o alguno se sale. */
function mapaHuellas(e: EstadoJuego): Map<number, number> {
  const lado = ladoValle(e.valle)
  const m = new Map<number, number>()
  for (const b of e.edificios) {
    const h = huella(b.tipo, b.x, b.y, b.rotacion ?? 0)
    expect(h.x0 >= 0 && h.y0 >= 0 && h.x1 < lado && h.y1 < lado).toBe(true)
    for (const [i, j] of h.celdas) {
      const k = j * lado + i
      expect(m.has(k)).toBe(false)
      m.set(k, b.id)
    }
  }
  return m
}

/** Casillas transitables alcanzables (4-conexas) desde la aparición, con un BFS propio. */
function alcance(e: EstadoJuego, huellas: Map<number, number>): Uint8Array {
  const { lado, agua, vados, obst } = fijos(e)
  const bloq = (k: number) => (agua.has(k) && !vados.has(k)) || obst.has(k) || huellas.has(k)
  const vista = new Uint8Array(lado * lado)
  const ini = Math.floor(e.aparicion.y) * lado + Math.floor(e.aparicion.x)
  if (bloq(ini)) return vista
  const cola = [ini]
  vista[ini] = 1
  while (cola.length > 0) {
    const k = cola.pop()!
    const x = k % lado
    for (const v of [k - lado, k + lado, x > 0 ? k - 1 : -1, x < lado - 1 ? k + 1 : -1]) {
      if (v >= 0 && v < lado * lado && vista[v] === 0 && !bloq(v)) {
        vista[v] = 1
        cola.push(v)
      }
    }
  }
  return vista
}

/** Casillas que toca la caja de colisión del personaje. */
function cajaPersonaje(p: { x: number; y: number }): [number, number][] {
  const m = CONFIG_PERSONAJE.tamanoCaja / 2
  const r: [number, number][] = []
  for (let j = Math.floor(p.y - m); j <= Math.ceil(p.y + m) - 1; j++)
    for (let i = Math.floor(p.x - m); i <= Math.ceil(p.x + m) - 1; i++) r.push([i, j])
  return r
}

/** Invariantes de construcción que deben valer en cualquier estado alcanzado por comandos. */
function comprobarInvariantes(e: EstadoJuego): void {
  const { lado, agua, obst } = fijos(e)
  const huellas = mapaHuellas(e)
  const c = e.valle.casillasPorParcela
  const plantas = new Set(e.plantas.map((p) => p[0]))
  for (const b of e.edificios) {
    const def = CONFIG_EDIFICIOS.edificios[b.tipo]
    for (const [i, j] of huella(b.tipo, b.x, b.y, b.rotacion ?? 0).celdas) {
      const k = j * lado + i
      const p = e.valle.parcelas[Math.floor(j / c) * e.valle.parcelasPorLado + Math.floor(i / c)]
      expect(p?.estado).toBe('propia')
      expect(agua.has(k) || obst.has(k) || plantas.has(k)).toBe(false)
      expect(def.zonas).toContain(zonaEn(e, i, j))
    }
  }
  // Nada tapa la aparición; la caja del personaje no toca ninguna huella y está en el valle.
  expect(huellas.has(Math.floor(e.aparicion.y) * lado + Math.floor(e.aparicion.x))).toBe(false)
  for (const [i, j] of cajaPersonaje(e.personaje)) {
    expect(i >= 0 && j >= 0 && i < lado && j < lado).toBe(true)
    expect(huellas.has(j * lado + i)).toBe(false)
  }
  // El personaje siempre puede volver a la aparición.
  const vista = alcance(e, huellas)
  expect(vista[Math.floor(e.personaje.y) * lado + Math.floor(e.personaje.x)]).toBe(1)
  // Recursos: enteros seguros ≥ 0; `unico` respetado.
  for (const n of [e.dinero, e.materiales.madera, e.materiales.piedra]) {
    expect(Number.isSafeInteger(n) && n >= 0).toBe(true)
  }
  expect(e.edificios.filter((b) => b.tipo === 'casa').length).toBeLessThanOrEqual(1)
  for (const b of e.edificios)
    expect(b.rotacion === undefined || [1, 2, 3].includes(b.rotacion)).toBe(true)
}

/** Patrimonio en dinero y materiales: lo que se tiene más lo pagado por lo que sigue en pie. */
function patrimonio(e: EstadoJuego): [number, number, number] {
  const s: [number, number, number] = [e.dinero, e.materiales.madera, e.materiales.piedra]
  for (const b of e.edificios) {
    const p = b.pagado ?? CONFIG_EDIFICIOS.edificios[b.tipo].coste
    s[0] += p.dinero
    s[1] += p.madera
    s[2] += p.piedra
  }
  return s
}

/** Coordenadas concentradas en parcelas (casi todas propias) a partir de dos naturales. */
function sitio(e: EstadoJuego, a: number, b: number): [number, number] {
  const lado = ladoValle(e.valle)
  return [(a % (lado + 4)) - 2, (b % (lado + 4)) - 2]
}

describe('M5-T03 rompedor · huella girada', () => {
  it('éxito ⇒ toda la huella girada es válida; rechazo ⇒ hay un testigo del motivo en la huella girada', () => {
    fc.assert(
      fc.property(
        fc.nat(2),
        fc.constantFrom(...TIPOS),
        fc.nat(),
        fc.nat(),
        rot,
        (si, tipo, a, b, r) => {
          const e = ESTADOS[si]!
          const [x, y] = sitio(e, a, b)
          const { lado, agua, obst } = fijos(e)
          const huellas = mapaHuellas(e)
          const c = e.valle.casillasPorParcela
          const h = huella(tipo, x, y, r)
          const def = CONFIG_EDIFICIOS.edificios[tipo]
          const dentro = h.x0 >= 0 && h.y0 >= 0 && h.x1 < lado && h.y1 < lado
          const celda = (pred: (i: number, j: number, k: number) => boolean) =>
            h.celdas.some(([i, j]) => pred(i, j, j * lado + i))
          const ajena = () =>
            celda(
              (i, j) =>
                e.valle.parcelas[Math.floor(j / c) * e.valle.parcelasPorLado + Math.floor(i / c)]
                  ?.estado !== 'propia',
            )
          const res = aplicarComando(e, {
            tipo: 'Construir',
            tipoEdificio: tipo,
            x,
            y,
            rotacion: r,
          })
          const v = veredictoColocacion(e, tipo, x, y, r)
          expect(res.ok).toBe(v.valida)
          if (res.ok) {
            expect(dentro).toBe(true)
            expect(ajena()).toBe(false)
            expect(celda((_i, _j, k) => agua.has(k) || obst.has(k) || huellas.has(k))).toBe(false)
            expect(celda((i, j) => !def.zonas.includes(zonaEn(e, i, j) as never))).toBe(false)
            // Cobra exactamente el coste y lo anota en `pagado`.
            expect(res.estado.dinero).toBe(e.dinero - def.coste.dinero)
            expect(res.estado.materiales.madera).toBe(e.materiales.madera - def.coste.madera)
            expect(res.estado.materiales.piedra).toBe(e.materiales.piedra - def.coste.piedra)
            const nuevo = res.estado.edificios.at(-1)!
            expect(nuevo.pagado).toEqual(def.coste)
            expect(nuevo.rotacion ?? 0).toBe(r)
          } else {
            expect(res.estado).toBe(e)
            const testigo: Record<string, () => boolean> = {
              'fuera-del-valle': () => !dentro,
              'no-propia': ajena,
              agua: () => celda((_i, _j, k) => agua.has(k)),
              obstaculo: () => celda((_i, _j, k) => obst.has(k)),
              ocupada: () => celda((_i, _j, k) => huellas.has(k)),
              'zona-incompatible': () =>
                celda((i, j) => !def.zonas.includes(zonaEn(e, i, j) as never)),
            }
            const t = testigo[res.error]
            if (t) expect(t()).toBe(true)
          }
        },
      ),
      { numRuns: 400 },
    )
  })

  it('casa 7×5 en un rectángulo de vivienda de 5×7: solo cabe girada (1 y 3); sin girar, zona-incompatible', () => {
    // Se borra toda la zona y se pinta vivienda solo en 5×7: la zona se comprueba en la huella girada.
    const e0 = ESTADOS[0]!
    const lado = ladoValle(e0.valle)
    let e = e0
    const r1 = aplicarComando(e, { tipo: 'BorrarZona', x0: 0, y0: 0, x1: lado - 1, y1: lado - 1 })
    if (r1.ok) e = r1.estado
    // Vivienda 5 de ancho × 7 de alto en una esquina propia sin obstáculos ni río.
    const { agua, obst } = fijos(e)
    let hecho = false
    for (let y = 0; y + 8 < lado && !hecho; y++) {
      for (let x = 0; x + 8 < lado && !hecho; x++) {
        const libre = huella('casa', x, y, 0).celdas.concat(huella('casa', x, y, 1).celdas)
        const propia = (i: number, j: number) =>
          e.valle.parcelas[Math.floor(j / 20) * e.valle.parcelasPorLado + Math.floor(i / 20)]
            ?.estado === 'propia'
        if (
          libre.some(([i, j]) => agua.has(j * lado + i) || obst.has(j * lado + i) || !propia(i, j))
        )
          continue
        const ap = { x: Math.floor(e.aparicion.x), y: Math.floor(e.aparicion.y) }
        if (Math.abs(ap.x - x) < 12 && Math.abs(ap.y - y) < 12) continue
        const pz = aplicarComando(e, {
          tipo: 'PintarZona',
          x0: x,
          y0: y,
          x1: x + 4,
          y1: y + 6,
          zona: 'vivienda',
        })
        if (!pz.ok) continue
        const z = pz.estado
        for (const r of [0, 2] as Rotacion[]) {
          expect(comprobarConstruir(z, 'casa', x, y, r)).toBe('zona-incompatible')
        }
        for (const r of [1, 3] as Rotacion[]) {
          expect(comprobarConstruir(z, 'casa', x, y, r)).toBeUndefined()
          expect(veredictoColocacion(z, 'casa', x, y, r).valida).toBe(true)
        }
        // Una casilla más a la derecha: la huella girada sale de la vivienda.
        expect(comprobarConstruir(z, 'casa', x + 1, y, 1)).toBe('zona-incompatible')
        hecho = true
      }
    }
    expect(hecho).toBe(true)
  })
})

describe('M5-T03 rompedor · rotaciones raras', () => {
  const RARAS: unknown[] = [4, -1, 1.5, '1', NaN, null, Infinity, -0.5, true, {}]

  it('como parámetro: Construir, MoverEdificio y el veredicto dicen parametro-invalido sin cambiar nada', () => {
    let e = ESTADOS[1]!
    // Un edificio terminado para poder moverlo.
    for (let k = 0; k < 4000 && e.edificios.length === 0; k++) {
      const [x, y] = sitio(e, k * 37, k * 53)
      const r = aplicarComando(e, { tipo: 'Construir', tipoEdificio: 'caja-envio', x, y })
      if (r.ok)
        e = { ...r.estado, edificios: r.estado.edificios.map((b) => ({ ...b, obra: null })) }
    }
    const b = e.edificios[0]!
    for (const rotacion of RARAS) {
      const r = rotacion as Rotacion
      const c = aplicarComando(e, {
        tipo: 'Construir',
        tipoEdificio: 'caja-envio',
        x: b.x,
        y: b.y + 3,
        rotacion: r,
      })
      expect(c.ok).toBe(false)
      expect(c.estado).toBe(e)
      if (!c.ok) expect(c.error).toBe('parametro-invalido')
      const v = veredictoColocacion(e, 'caja-envio', b.x, b.y + 3, r)
      expect(v.valida).toBe(false)
      if (!v.valida) expect(v.motivo).toBe('parametro-invalido')
      const m = aplicarComando(e, { tipo: 'MoverEdificio', id: b.id, x: b.x, y: b.y, rotacion: r })
      expect(m.ok).toBe(false)
      expect(m.estado).toBe(e)
    }
  })

  it('dentro del estado: ningún comando de edificios ni el cambio de día lanzan ni aceptan el estado', () => {
    const base = ESTADOS[2]!
    for (const rotacion of RARAS) {
      const raro: Edificio = {
        id: 900,
        tipo: 'casa',
        x: 2,
        y: 2,
        obra: null,
        rotacion: rotacion as Rotacion,
      }
      const e: EstadoJuego = { ...base, edificios: [raro], siguienteIdEdificio: 901 }
      const comandos: Comando[] = [
        { tipo: 'Construir', tipoEdificio: 'caja-envio', x: 40, y: 40 },
        { tipo: 'MoverEdificio', id: 900, x: 3, y: 3 },
        { tipo: 'DemolerEdificio', id: 900 },
        { tipo: 'CancelarObra', id: 900 },
      ]
      for (const c of comandos) {
        const r = aplicarComando(e, c)
        expect(r.ok).toBe(false)
        expect(r.estado).toBe(e)
      }
      expect(veredictoColocacion(e, 'caja-envio', 40, 40, 0).valida).toBe(false)
      // En Modo Vida: dormir y el desmayo rechazan sin lanzar.
      const vida: EstadoJuego = { ...e, modo: 'vida', minutoDelDia: 1559 }
      expect(aplicarComando(vida, { tipo: 'Dormir' }).ok).toBe(false)
      expect(aplicarComando(vida, { tipo: 'AvanzarTiempo', minutos: 600 }).ok).toBe(false)
    }
  })
})

/** Orden de una secuencia mezclada. */
const orden = fc.record({
  accion: fc.constantFrom(
    'construir',
    'construir',
    'construir',
    'mover',
    'mover',
    'demoler',
    'cancelar',
    'dormir',
  ),
  tipo: fc.constantFrom(...TIPOS),
  a: fc.nat(),
  b: fc.nat(),
  rotacion: fc.option(rot, { nil: undefined }),
})

describe('M5-T03 rompedor · secuencias mezcladas con giros', () => {
  it('invariantes de casillas, parcelas, zonas, alcance, recursos y fantasma ⇔ comando tras cada paso', () => {
    fc.assert(
      fc.property(fc.nat(2), fc.array(orden, { minLength: 5, maxLength: 20 }), (si, ordenes) => {
        let e = ESTADOS[si]!
        for (const o of ordenes) {
          const [x, y] = sitio(e, o.a, o.b)
          const antes = patrimonio(e)
          const alcanceAntes =
            o.accion === 'construir' || o.accion === 'mover'
              ? alcance(e, mapaHuellas(e))
              : undefined
          let cmd: Comando
          const b = e.edificios.length > 0 ? e.edificios[o.a % e.edificios.length]! : undefined
          if (o.accion === 'mover' && b) {
            // Las obras no se mueven: se terminan a mano (como haría pasar el día).
            e = {
              ...e,
              edificios: e.edificios.map((q) => (q.id === b.id ? { ...q, obra: null } : q)),
            }
            cmd = {
              tipo: 'MoverEdificio',
              id: b.id,
              x,
              y,
              ...(o.rotacion === undefined ? {} : { rotacion: o.rotacion }),
            }
          } else if (o.accion === 'demoler' && b) {
            cmd = { tipo: 'DemolerEdificio', id: b.id }
          } else if (o.accion === 'cancelar' && b) {
            cmd = { tipo: 'CancelarObra', id: b.id }
          } else if (o.accion === 'dormir') {
            // Ir a la cama, dormir y volver al plano.
            const cama = personajeAlDespertar(e)
            let v: EstadoJuego = { ...e, modo: 'vida', personaje: cama }
            const d = aplicarComando(v, { tipo: 'Dormir' })
            expect(d.ok).toBe(true)
            v = d.estado
            comprobarInvariantes(v)
            e = { ...v, modo: 'plano' }
            continue
          } else {
            const rotacion = o.rotacion ?? 0
            const v = veredictoColocacion(e, o.tipo, x, y, rotacion)
            cmd = { tipo: 'Construir', tipoEdificio: o.tipo, x, y, rotacion }
            const r = aplicarComando(e, cmd)
            expect(r.ok).toBe(v.valida)
            if (!r.ok && !v.valida) expect(r.error).toBe(v.motivo)
          }
          const r = aplicarComando(e, cmd)
          if (!r.ok) {
            expect(r.estado).toBe(e)
            continue
          }
          if (cmd.tipo === 'MoverEdificio') {
            const movido = r.estado.edificios.find((q) => q.id === cmd.id)!
            const previo = e.edificios.find((q) => q.id === cmd.id)!
            // Sin rotación conserva el giro; con 0 lo quita.
            expect(movido.rotacion ?? 0).toBe(cmd.rotacion ?? previo.rotacion ?? 0)
            if (cmd.rotacion === 0) expect('rotacion' in movido).toBe(false)
            expect(patrimonio(r.estado)).toEqual(antes)
          }
          if (cmd.tipo === 'Construir' || cmd.tipo === 'CancelarObra') {
            expect(patrimonio(r.estado)).toEqual(antes)
          }
          if (cmd.tipo === 'DemolerEdificio') {
            const p = patrimonio(r.estado)
            for (let i = 0; i < 3; i++) expect(p[i]).toBeLessThanOrEqual(antes[i]!)
          }
          e = r.estado
          comprobarInvariantes(e)
          // bloquea-paso: lo alcanzable antes sigue alcanzable salvo la huella nueva.
          if (alcanceAntes && (cmd.tipo === 'Construir' || cmd.tipo === 'MoverEdificio')) {
            const huellas = mapaHuellas(e)
            const ahora = alcance(e, huellas)
            for (let k = 0; k < ahora.length; k++) {
              if (alcanceAntes[k] === 1 && !huellas.has(k)) expect(ahora[k]).toBe(1)
            }
          }
        }
      }),
      { numRuns: 60 },
    )
  }, 180_000)
})

describe('M5-T03 rompedor · bloquea-paso con giros', () => {
  it('rellenar con cajas y tiendas giradas todo lo posible alrededor de la aparición no encierra a nadie', () => {
    for (const base of ESTADOS) {
      const lado = ladoValle(base.valle)
      let e: EstadoJuego = {
        ...base,
        dinero: 1_000_000,
        materiales: { madera: 1_000_000, piedra: 1_000 },
        valle: {
          ...base.valle,
          parcelas: base.valle.parcelas.map((p) => ({ ...p, estado: 'propia' })),
        },
      }
      const ax = Math.floor(e.aparicion.x)
      const ay = Math.floor(e.aparicion.y)
      const pz = aplicarComando(e, {
        tipo: 'PintarZona',
        x0: Math.max(ax - 8, 0),
        y0: Math.max(ay - 8, 0),
        x1: Math.min(ax + 8, lado - 1),
        y1: Math.min(ay + 8, lado - 1),
        zona: 'vivienda',
      })
      if (pz.ok) e = pz.estado
      const alcance0 = alcance(e, mapaHuellas(e))
      let puestos = 0
      for (const tipo of ['tienda', 'caja-envio'] as const) {
        for (const r of [0, 1, 2, 3] as Rotacion[]) {
          for (let y = ay - 6; y <= ay + 6; y++) {
            for (let x = ax - 6; x <= ax + 6; x++) {
              const c = aplicarComando(e, {
                tipo: 'Construir',
                tipoEdificio: tipo,
                x,
                y,
                rotacion: r,
              })
              if (!c.ok) continue
              puestos++
              e = c.estado
            }
          }
        }
      }
      expect(puestos).toBeGreaterThan(5)
      comprobarInvariantes(e)
      const huellas = mapaHuellas(e)
      const ahora = alcance(e, huellas)
      for (let k = 0; k < ahora.length; k++) {
        if (alcance0[k] === 1 && !huellas.has(k)) expect(ahora[k]).toBe(1)
      }
    }
  })
})

describe('M5-T03 rompedor · despertar con la casa girada', () => {
  it('casa girada contra el borde, el río o rodeada de cajas: despierta dentro del valle, libre y alcanzable', () => {
    fc.assert(
      fc.property(
        fc.nat(2),
        rot,
        fc.nat(),
        fc.nat(),
        fc.array(fc.record({ a: fc.nat(), b: fc.nat(), r: rot }), { maxLength: 30 }),
        (si, r, a, b, cajas) => {
          let e: EstadoJuego = {
            ...ESTADOS[si]!,
            dinero: 100_000,
            materiales: { madera: 10_000, piedra: 1_000 },
          }
          // Casa girada: se prueban esquinas pegadas a los bordes del valle y sitios aleatorios.
          const lado = ladoValle(e.valle)
          const h = huella('casa', 0, 0, r)
          const an = h.x1 + 1
          const al = h.y1 + 1
          const candidatos: [number, number][] = [
            [0, 0],
            [lado - an, 0],
            [0, lado - al],
            [lado - an, lado - al],
            [a % (lado - an + 1), 0],
            [0, b % (lado - al + 1)],
          ]
          for (let k = 0; k < 400; k++) candidatos.push(sitio(e, a + k * 131, b + k * 71))
          let casa: Edificio | undefined
          for (const [x, y] of candidatos) {
            const c = aplicarComando(e, {
              tipo: 'Construir',
              tipoEdificio: 'casa',
              x,
              y,
              rotacion: r,
            })
            if (c.ok) {
              e = c.estado
              casa = e.edificios.at(-1)
              break
            }
          }
          if (!casa) return
          // Cajas alrededor de la casa (pueden tapar la puerta girada).
          const p = { x: casa.x, y: casa.y }
          for (const q of cajas) {
            const x = p.x - 3 + (q.a % (an + 6))
            const y = p.y - 3 + (q.b % (al + 6))
            const c = aplicarComando(e, {
              tipo: 'Construir',
              tipoEdificio: 'caja-envio',
              x,
              y,
              rotacion: q.r,
            })
            if (c.ok) e = c.estado
          }
          e = { ...e, edificios: e.edificios.map((q) => ({ ...q, obra: null })) }
          comprobarInvariantes(e)
          const desp = personajeAlDespertar(e)
          comprobarInvariantes({ ...e, personaje: desp })
          // Y por el camino real: desmayo en Modo Vida.
          const vida: EstadoJuego = { ...e, modo: 'vida', minutoDelDia: 1559 }
          const d = aplicarComando(vida, { tipo: 'AvanzarTiempo', minutos: 600 })
          expect(d.ok).toBe(true)
          comprobarInvariantes(d.estado)
        },
      ),
      { numRuns: 100 },
    )
  }, 180_000)
})
