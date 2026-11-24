import {
  validarQuitarCaminos,
  validarCaminos,
  validarQuitarVallas,
  validarVallas,
  type Comando,
  type EstadoJuego,
} from '../core'
import type { HerramientaTrazo } from './herramienta-plano'

/** Casilla del trazo con su veredicto (la escena la pinta verde o roja). */
export interface CasillaTrazoVista {
  readonly x: number
  readonly y: number
  readonly valida: boolean
  /** Motivo del núcleo (o `nada-que-quitar`) si no es válida. */
  readonly motivo?: string
}

/**
 * Lo que la vista previa de un trazo muestra: casillas verdes y rojas, el coste total (o el
 * reembolso al quitar) y por qué algo está en rojo. Se calcula con las funciones de consulta del
 * núcleo, las mismas que usa el comando. Es estado de interfaz: no se guarda.
 */
export interface ResumenTrazo {
  readonly herramienta: HerramientaTrazo
  readonly quitar: boolean
  readonly recurso: 'madera' | 'piedra'
  /** Coste de colocar las casillas válidas, o reembolso de quitarlas. */
  readonly cantidad: number
  readonly casillas: readonly CasillaTrazoVista[]
  readonly validas: number
  readonly invalidas: number
  /** Falta material para colocar todas las válidas (nunca al quitar). */
  readonly sinFondos: boolean
  /** Las vallas válidas cerrarían el paso (nunca con puertas ni caminos). */
  readonly bloqueaPaso: boolean
  /** Motivo de la primera casilla inválida, para mostrarlo en un texto. */
  readonly motivo: string | undefined
}

/** Resumen de la vista previa de `casillas` con la `herramienta` (y `quitar` con Mayús). Pura. */
export function resumenTrazo(
  estado: EstadoJuego,
  herramienta: HerramientaTrazo,
  casillas: readonly { readonly x: number; readonly y: number }[],
  quitar: boolean,
): ResumenTrazo {
  const recurso = herramienta === 'caminos' ? 'piedra' : 'madera'
  let vista: CasillaTrazoVista[]
  let cantidad: number
  let sinFondos = false
  let bloqueaPaso = false
  if (quitar) {
    if (herramienta === 'caminos') {
      const q = validarQuitarCaminos(estado, casillas)
      const con = new Set(q.casillas.map((c) => `${c.x},${c.y}`))
      vista = casillas.map((c) =>
        con.has(`${c.x},${c.y}`)
          ? { ...c, valida: true }
          : { ...c, valida: false, motivo: 'nada-que-quitar' },
      )
      cantidad = q.reembolsoPiedra
    } else {
      const q = validarQuitarVallas(estado, casillas)
      const con = new Set(q.casillas.map((c) => `${c.x},${c.y}`))
      vista = casillas.map((c) =>
        con.has(`${c.x},${c.y}`)
          ? { ...c, valida: true }
          : { ...c, valida: false, motivo: 'nada-que-quitar' },
      )
      cantidad = q.reembolsoMadera
    }
  } else if (herramienta === 'caminos') {
    const v = validarCaminos(estado, casillas)
    vista = v.casillas.map((c) =>
      c.valida
        ? { x: c.x, y: c.y, valida: true }
        : { x: c.x, y: c.y, valida: false, motivo: c.motivo ?? 'desconocido' },
    )
    cantidad = v.coste
    sinFondos = !(estado.materiales.piedra >= v.coste)
  } else {
    const v = validarVallas(estado, casillas, herramienta === 'puertas' ? 'puerta' : 'valla')
    vista = v.casillas.map((c) =>
      c.motivo === undefined
        ? { x: c.x, y: c.y, valida: true }
        : { x: c.x, y: c.y, valida: false, motivo: c.motivo ?? 'desconocido' },
    )
    cantidad = v.costeMadera
    sinFondos = v.sinMadera
    bloqueaPaso = v.bloqueaPaso
  }
  const validas = vista.filter((c) => c.valida).length
  return {
    herramienta,
    quitar,
    recurso,
    cantidad,
    casillas: vista,
    validas,
    invalidas: vista.length - validas,
    sinFondos,
    bloqueaPaso,
    motivo: vista.find((c) => !c.valida)?.motivo,
  }
}

/** ¿Se puede soltar el trazo? Hay algo que hacer, alcanza el material y no cierra el paso. Pura. */
export function trazoEnviable(r: ResumenTrazo): boolean {
  return r.validas > 0 && !r.sinFondos && !r.bloqueaPaso
}

/** Comando del trazo (solo las casillas válidas). Pura. */
export function comandoDeTrazo(r: ResumenTrazo): Comando {
  const casillas = r.casillas.filter((c) => c.valida).map(({ x, y }) => ({ x, y }))
  if (r.herramienta === 'caminos') {
    return { tipo: r.quitar ? 'QuitarCamino' : 'ColocarCamino', casillas }
  }
  if (r.quitar) return { tipo: 'QuitarVallas', casillas }
  return {
    tipo: 'ColocarVallas',
    casillas,
    tipoValla: r.herramienta === 'puertas' ? 'puerta' : 'valla',
  }
}

/** Firma de un resumen para saber si la UI debe repintarse. */
export function firmaResumen(r: ResumenTrazo | null): string {
  if (!r) return ''
  return [
    r.herramienta,
    r.quitar,
    r.cantidad,
    r.validas,
    r.invalidas,
    r.sinFondos,
    r.bloqueaPaso,
    r.motivo ?? '',
  ].join('|')
}

export type OyenteTrazo = (resumen: ResumenTrazo | null) => void

export interface CanalTrazoPlano {
  /** Resumen del trazo en curso, o `null` si no hay trazo. */
  readonly resumen: ResumenTrazo | null
  fijar(resumen: ResumenTrazo | null): void
  suscribir(oyente: OyenteTrazo): () => void
}

export function crearCanalTrazoPlano(): CanalTrazoPlano {
  let resumen: ResumenTrazo | null = null
  let firma = ''
  const oyentes = new Set<OyenteTrazo>()
  return {
    get resumen() {
      return resumen
    },
    fijar(nuevo) {
      const f = firmaResumen(nuevo)
      resumen = nuevo
      if (f === firma) return
      firma = f
      for (const o of [...oyentes]) o(resumen)
    },
    suscribir(oyente) {
      oyentes.add(oyente)
      return () => {
        oyentes.delete(oyente)
      }
    },
  }
}

/** Canal único de la aplicación, compartido por la escena y la UI. */
export const trazoPlano: CanalTrazoPlano = crearCanalTrazoPlano()
