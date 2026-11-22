import { CONFIG_CAMINOS } from './datos/caminos'
import type { EstadoJuego } from './estado'
import { casillasOcupadas, edificiosValidos } from './edificios'
import { ladoValle } from './mapa'
import { aguaDe } from './zonas'
import { obstaculosDe } from './construccion'
import { esCaracterArada } from './tierra'

/**
 * Caminos de grava (M6-T04). `EstadoJuego.caminos` es una cadena de `lado*lado` caracteres
 * (índice y*lado+x): `.` nada, `c` camino. No bloquean el paso: solo aceleran al personaje.
 */
export const CARACTER_SIN_CAMINO = '.'
export const CARACTER_CAMINO = 'c'

/** Cadena de caminos vacía para un valle de `lado` casillas por lado. */
export function caminosVacios(lado: number): string {
  return CARACTER_SIN_CAMINO.repeat(lado * lado)
}

/** Casilla de la que habla un comando de caminos. */
export interface CasillaCamino {
  readonly x: number
  readonly y: number
}

/**
 * Por qué una casilla no admite camino, en orden de prioridad. «Bajo puertas» lo permitirá la
 * tarea de vallas al integrarse (aquí aún no existen).
 */
export type MotivoNoCamino =
  | 'fuera-del-valle'
  | 'no-propia'
  | 'agua'
  | 'obstaculo'
  /** Edificio, obra o planta. */
  | 'ocupada'
  /** Tierra arada (con o sin planta). */
  | 'arada'
  | 'ya-hay-camino'

export interface CasillaValidada extends CasillaCamino {
  readonly valida: boolean
  /** Presente solo si `valida` es `false`. */
  readonly motivo?: MotivoNoCamino
}

export interface ValidacionCaminos {
  /** Casillas sin duplicados, en el orden de la primera aparición. */
  readonly casillas: readonly CasillaValidada[]
  /** Nº de casillas válidas. */
  readonly validas: number
  /** Piedra total de las casillas válidas. */
  readonly coste: number
}

/** Parte del estado que necesita la consulta. */
export type EstadoCaminos = Pick<
  EstadoJuego,
  'valle' | 'cauce' | 'obstaculos' | 'edificios' | 'tierra' | 'caminos'
> &
  Partial<Pick<EstadoJuego, 'plantas'>>

/** ¿Hay camino en la casilla (x, y)? `false` fuera del valle o si el estado no trae `caminos`. */
export function hayCamino(
  estado: Pick<EstadoJuego, 'valle'> & Partial<Pick<EstadoJuego, 'caminos'>>,
  x: number,
  y: number,
): boolean {
  const lado = ladoValle(estado.valle)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= lado || y >= lado) {
    return false
  }
  return typeof estado.caminos === 'string' && estado.caminos[y * lado + x] === CARACTER_CAMINO
}

/** Factor de velocidad del personaje con el centro en (x, y): el dato sobre camino, 1 fuera. */
export function factorVelocidadEn(
  estado: Pick<EstadoJuego, 'valle'> & Partial<Pick<EstadoJuego, 'caminos'>>,
  x: number,
  y: number,
): number {
  return hayCamino(estado, Math.floor(x), Math.floor(y)) ? CONFIG_CAMINOS.multiplicadorVelocidad : 1
}

/** ¿Trae el estado lo que necesitan los comandos de caminos? */
export function estadoDeCaminosValido(estado: EstadoCaminos): boolean {
  const lado = ladoValle(estado.valle)
  return (
    typeof estado.caminos === 'string' &&
    estado.caminos.length === lado * lado &&
    typeof estado.tierra === 'string' &&
    estado.tierra.length === lado * lado &&
    edificiosValidos(estado.edificios)
  )
}

/** Casillas sin repetir, en orden de primera aparición (-0 se normaliza a 0). */
function sinDuplicados(casillas: readonly CasillaCamino[]): CasillaCamino[] {
  const vistas = new Set<string>()
  const r: CasillaCamino[] = []
  for (const c of casillas) {
    const k = `${c.x},${c.y}`
    if (vistas.has(k)) continue
    vistas.add(k)
    r.push({ x: c.x + 0, y: c.y + 0 })
  }
  return r
}

/**
 * Qué casillas de `casillas` admitirían camino y cuánta piedra costarían (cada casilla una sola
 * vez). Pura. Válida = dentro del valle, en parcela propia, sin río (vados incluidos), sin
 * obstáculo, sin edificio u obra, sin tierra arada ni planta y sin camino. La usan el comando
 * `ColocarCamino` y la interfaz (casillas en rojo y coste total). Requiere un estado válido
 * (`estadoDeCaminosValido`) y casillas de coordenadas enteras seguras.
 */
export function validarCaminos(
  estado: EstadoCaminos,
  casillas: readonly CasillaCamino[],
): ValidacionCaminos {
  const { valle } = estado
  const lado = ladoValle(valle)
  const c = valle.casillasPorParcela
  const agua = aguaDe(valle, estado.cauce.ancho, lado)
  const obstaculos = obstaculosDe(estado, lado)
  const ocupadas = casillasOcupadas(estado.edificios, lado)
  const conPlanta = new Set((estado.plantas ?? []).map((p) => p[0]))
  let validas = 0
  const r = sinDuplicados(casillas).map((q): CasillaValidada => {
    const no = (motivo: MotivoNoCamino): CasillaValidada => ({ ...q, valida: false, motivo })
    if (q.x < 0 || q.y < 0 || q.x >= lado || q.y >= lado) return no('fuera-del-valle')
    const p = valle.parcelas[Math.floor(q.y / c) * valle.parcelasPorLado + Math.floor(q.x / c)]
    if (p?.estado !== 'propia') return no('no-propia')
    const i = q.y * lado + q.x
    if (agua.has(i)) return no('agua')
    if (obstaculos.has(i)) return no('obstaculo')
    if (ocupadas.has(i) || conPlanta.has(i)) return no('ocupada')
    if (esCaracterArada(estado.tierra[i])) return no('arada')
    if (estado.caminos[i] === CARACTER_CAMINO) return no('ya-hay-camino')
    validas++
    return { ...q, valida: true }
  })
  return { casillas: r, validas, coste: validas * CONFIG_CAMINOS.costePiedra }
}

/** `caminos` con `caracter` en las casillas `indices`. */
function poner(caminos: string, indices: readonly number[], caracter: string): string {
  const celdas = caminos.split('')
  for (const i of indices) celdas[i] = caracter
  return celdas.join('')
}

/** Resultado de `colocarCaminos` y `quitarCaminos`. */
export type ResultadoCaminos =
  | {
      readonly ok: true
      readonly estado: EstadoJuego
      /** Casillas que cambiaron (únicas). */
      readonly casillas: readonly CasillaCamino[]
      /** Piedra cobrada (colocar) o devuelta (quitar). */
      readonly piedra: number
    }
  | {
      readonly ok: false
      readonly error:
        | 'parametro-invalido'
        | 'estado-invalido'
        | 'sin-casillas-validas'
        | 'materiales-insuficientes'
        | 'limite-de-recursos'
    }

function casillasBienFormadas(casillas: unknown): casillas is readonly CasillaCamino[] {
  return (
    Array.isArray(casillas) &&
    casillas.every(
      (c: unknown) =>
        typeof c === 'object' &&
        c !== null &&
        Number.isSafeInteger((c as CasillaCamino).x) &&
        Number.isSafeInteger((c as CasillaCamino).y),
    )
  )
}

function materialesValidos(estado: EstadoJuego): boolean {
  const m = estado.materiales
  return (
    typeof m === 'object' &&
    m !== null &&
    Number.isSafeInteger(m.piedra) &&
    m.piedra >= 0 &&
    Number.isSafeInteger(m.madera) &&
    m.madera >= 0
  )
}

/**
 * `ColocarCamino`: coloca camino en las casillas válidas y cobra solo por esas (duplicados una
 * vez). Ninguna válida → `sin-casillas-validas`; piedra insuficiente para todas las válidas →
 * `materiales-insuficientes`, sin colocar ni cobrar nada. No depende del modo ni del reloj.
 */
export function colocarCaminos(estado: EstadoJuego, casillas: unknown): ResultadoCaminos {
  if (!casillasBienFormadas(casillas)) return { ok: false, error: 'parametro-invalido' }
  if (!estadoDeCaminosValido(estado) || !materialesValidos(estado)) {
    return { ok: false, error: 'estado-invalido' }
  }
  const lado = ladoValle(estado.valle)
  const v = validarCaminos(estado, casillas)
  if (v.validas === 0) return { ok: false, error: 'sin-casillas-validas' }
  if (estado.materiales.piedra < v.coste) return { ok: false, error: 'materiales-insuficientes' }
  const buenas = v.casillas.filter((c) => c.valida).map(({ x, y }) => ({ x, y }))
  return {
    ok: true,
    casillas: buenas,
    piedra: v.coste,
    estado: {
      ...estado,
      caminos: poner(
        estado.caminos,
        buenas.map((c) => c.y * lado + c.x),
        CARACTER_CAMINO,
      ),
      materiales: { ...estado.materiales, piedra: estado.materiales.piedra - v.coste },
    },
  }
}

/**
 * `QuitarCamino`: quita el camino de las casillas que lo tienen (el resto se ignora) y devuelve
 * `reembolsoPiedra` por cada una. Ninguna con camino → `sin-casillas-validas`.
 */
export function quitarCaminos(estado: EstadoJuego, casillas: unknown): ResultadoCaminos {
  if (!casillasBienFormadas(casillas)) return { ok: false, error: 'parametro-invalido' }
  if (!estadoDeCaminosValido(estado) || !materialesValidos(estado)) {
    return { ok: false, error: 'estado-invalido' }
  }
  const lado = ladoValle(estado.valle)
  const con = sinDuplicados(casillas).filter((c) => hayCamino(estado, c.x, c.y))
  if (con.length === 0) return { ok: false, error: 'sin-casillas-validas' }
  const piedra = con.length * CONFIG_CAMINOS.reembolsoPiedra
  if (!Number.isSafeInteger(estado.materiales.piedra + piedra)) {
    return { ok: false, error: 'limite-de-recursos' }
  }
  return {
    ok: true,
    casillas: con,
    piedra,
    estado: {
      ...estado,
      caminos: poner(
        estado.caminos,
        con.map((c) => c.y * lado + c.x),
        CARACTER_SIN_CAMINO,
      ),
      materiales: { ...estado.materiales, piedra: estado.materiales.piedra + piedra },
    },
  }
}
