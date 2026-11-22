import { Group, Mesh, type Object3D } from 'three'
import { defEdificio, type Edificio, type EstadoJuego } from '../../core'
import type { LectorEstado } from '../../juego/almacen'
import { alturaAsiento } from '../terreno/aplanar'
import { crearZocalo } from '../terreno/aplanar-malla'
import type { FuncionAltura } from '../terreno/altura'
import { cargarModeloEdificio, modeloEdificioListo, type EtapaObra } from './carga'
import { centroHuella, claveEdificio, giroEdificio, huellaEdificio } from './colocacion-edificio'
import { crearFormaProvisional } from './forma-provisional'
import { DATOS_OBRA } from './obra-datos'
import { escalaTerminado, etapaDeEdificio } from './obra'

export interface EdificiosMundo {
  readonly objeto: Object3D
  /** Una vez por fotograma: reconstruye solo lo que cambió y avanza la animación de terminado. */
  actualizar(dt: number): void
  destruir(): void
}

interface Entrada {
  clave: string
  etapa: EtapaObra
  /** El modelo se dibuja con la forma por código porque el `.glb` aún no ha cargado. */
  provisional: boolean
  readonly raiz: Group
  readonly modelo: Object3D
  readonly zocalo: Mesh
  /** Segundos de animación de terminado transcurridos; `null` si no se anima. */
  anim: number | null
}

/**
 * Dibuja los edificios del núcleo: un objeto por edificio con el modelo de su etapa de obra
 * (`etapaObra(progresoObra(e, dia))`), girado según su rotación, a la altura de asiento y con su
 * zócalo. Visibles en Modo Vida y en Modo Plano. Solo reconstruye los edificios que cambian.
 */
export function crearEdificios(lector: LectorEstado, altura: FuncionAltura): EdificiosMundo {
  const raiz = new Group()
  raiz.name = 'edificios'
  const entradas = new Map<number, Entrada>()
  let ultimos: EstadoJuego['edificios'] | undefined
  let ultimoDia = NaN
  let primeraVez = true

  const quitar = (en: Entrada): void => {
    raiz.remove(en.raiz)
    // La geometría del zócalo es propia; su material y las formas/modelos son compartidos.
    en.zocalo.geometry.dispose()
  }

  const construir = (
    e: Edificio,
    etapa: EtapaObra,
    clave: string,
    anim: number | null,
  ): Entrada | undefined => {
    const def = defEdificio(e.tipo)
    const huella = huellaEdificio(e)
    if (!def || !huella) return undefined
    const { valle } = lector.estado
    const listo = modeloEdificioListo(e.tipo, etapa)
    const modelo: Object3D = listo
      ? listo.clone()
      : crearFormaProvisional(e.tipo, etapa, def.ancho, def.alto, def.altura)
    if (listo) {
      modelo.traverse((o) => {
        if (o instanceof Mesh) {
          o.castShadow = true
          o.receiveShadow = true
        }
      })
    }
    const base = alturaAsiento(huella, valle, altura)
    const centro = centroHuella(huella, valle)
    modelo.position.set(centro.x, base, centro.z)
    modelo.rotation.y = giroEdificio(e)
    const zocalo = crearZocalo(huella, valle, altura)
    const grupo = new Group()
    grupo.add(zocalo, modelo)
    raiz.add(grupo)
    return { clave, etapa, provisional: !listo, raiz: grupo, modelo, zocalo, anim }
  }

  const sincronizar = (): void => {
    const { edificios, dia } = lector.estado
    const vistos = new Set<number>()
    for (const e of edificios) {
      vistos.add(e.id)
      const etapa = etapaDeEdificio(e, dia)
      // Pide el modelo; si falla se queda la forma por código.
      void cargarModeloEdificio(e.tipo, etapa).catch(() => undefined)
      const listo = modeloEdificioListo(e.tipo, etapa) !== undefined
      const clave = `${claveEdificio(e, etapa)}|${listo ? 'm' : 'p'}`
      const previa = entradas.get(e.id)
      if (previa?.clave === clave) continue
      // Solo anima el paso de una etapa de obra a terminado; no al cargar la partida.
      const termina = previa !== undefined && previa.etapa !== 'terminado' && etapa === 'terminado'
      const anim = termina ? 0 : (previa?.anim ?? null)
      const nueva = construir(e, etapa, clave, anim)
      if (previa) quitar(previa)
      if (nueva) {
        entradas.set(e.id, nueva)
        if (anim !== null) nueva.modelo.scale.setScalar(escalaTerminado(anim))
      } else {
        entradas.delete(e.id)
      }
    }
    for (const [id, en] of entradas) {
      if (vistos.has(id)) continue
      quitar(en)
      entradas.delete(id)
    }
    ultimos = edificios
    ultimoDia = dia
    primeraVez = false
  }

  return {
    objeto: raiz,
    actualizar: (dt) => {
      const { edificios, dia } = lector.estado
      let pendiente = primeraVez || edificios !== ultimos || dia !== ultimoDia
      if (!pendiente) {
        // ¿Ha terminado de cargar algún modelo que se dibuja con la forma por código?
        for (const [id, en] of entradas) {
          const e = edificios.find((x) => x.id === id)
          if (en.provisional && e && modeloEdificioListo(e.tipo, en.etapa)) {
            pendiente = true
            break
          }
        }
      }
      if (pendiente) sincronizar()
      for (const en of entradas.values()) {
        if (en.anim === null) continue
        en.anim += dt
        const fin = en.anim >= DATOS_OBRA.aparicion.duracion
        en.modelo.scale.setScalar(fin ? 1 : escalaTerminado(en.anim))
        if (fin) en.anim = null
      }
    },
    destruir: () => {
      for (const en of entradas.values()) quitar(en)
      entradas.clear()
      raiz.removeFromParent()
    },
  }
}
