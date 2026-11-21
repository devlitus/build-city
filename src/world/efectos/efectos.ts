import { Group, Quaternion, Vector3, type Object3D } from 'three'
import type { Obstaculo } from '../../core'
import type { LectorEstado, Suscriptor } from '../../juego/almacen'
import { posicionObstaculo } from '../dispersion'
import { personajeAMetros } from '../personaje/medidas'
import type { FuncionAltura } from '../terreno/altura'
import type { Vegetacion } from '../vegetacion'
import {
  anguloCaida,
  anguloSacudida,
  direccionCaida,
  ejeCaida,
  escalaDesvanecer,
  type Punto2,
} from './caida'
import { DATOS_EFECTOS, type DatosEfectos } from './efectos-datos'
import { GestorEfectos, type Efecto } from './gestor'

const GRADOS = Math.PI / 180

/** Lo que los efectos necesitan para enterarse de lo que pasa en el núcleo (el almacén lo cumple). */
export interface FuenteEventos {
  suscribir(suscriptor: Suscriptor): () => void
}

export interface Efectos {
  /** Llamar una vez por fotograma con el tiempo transcurrido (s). */
  actualizar(dt: number): void
  /** Efectos que siguen vivos (para pruebas y depuración). */
  readonly vivos: number
  destruir(): void
}

export interface OpcionesEfectos {
  readonly escena: Object3D
  readonly lector: LectorEstado & FuenteEventos
  readonly vegetacion: Vegetacion
  readonly altura: FuncionAltura
  readonly datos?: DatosEfectos
}

/**
 * Efectos visuales de la recolección. Solo dibuja: escucha los eventos del núcleo que publica el
 * almacén (`obstaculo-golpeado`, `obstaculo-quitado`) y anima copias temporales; no cambia el
 * estado del juego ni decide reglas.
 */
export function crearEfectos(opciones: OpcionesEfectos): Efectos {
  const { escena, lector, vegetacion, altura, datos = DATOS_EFECTOS } = opciones
  const gestor = new GestorEfectos()

  const buscar = (x: number, y: number): Obstaculo | undefined =>
    lector.estado.obstaculos.find((o) => o.x === x && o.y === y)

  const granjeroEnMetros = (): Punto2 => {
    const { personaje, valle } = lector.estado
    return personajeAMetros(personaje.x, personaje.y, valle)
  }

  /** Copia del árbol de la casilla en un pivote en su base; devuelve también cómo retirarla. */
  const crearFantasma = (o: Obstaculo) => {
    const p = posicionObstaculo(o, lector.estado.valle)
    const arbol = vegetacion.crearArbolSuelto(o.variante)
    const pivote = new Group()
    pivote.name = 'arbol-fantasma'
    pivote.position.set(p.x, altura(p.x, p.z), p.z)
    pivote.add(arbol.objeto)
    escena.add(pivote)
    const direccion = direccionCaida({ x: p.x, z: p.z }, granjeroEnMetros())
    return {
      pivote,
      direccion,
      eje: new Vector3(ejeCaida(direccion).x, 0, ejeCaida(direccion).z),
      retirar: () => {
        arbol.liberar()
        pivote.removeFromParent()
      },
    }
  }

  const sacudirArbol = (o: Obstaculo): void => {
    const f = crearFantasma(o)
    const { duracion, anguloMaximo, frecuencia } = datos.sacudida
    vegetacion.ocultarArbol(o.x, o.y, true)
    const efecto: Efecto = {
      duracion,
      actualizar: (t) => {
        const angulo = anguloSacudida(t, duracion, anguloMaximo, frecuencia) * GRADOS
        f.pivote.quaternion.setFromAxisAngle(f.eje, angulo)
      },
      terminar: () => {
        f.retirar()
        vegetacion.ocultarArbol(o.x, o.y, false)
      },
    }
    gestor.alta(efecto, `arbol-${o.x}-${o.y}`)
  }

  const caerArbol = (o: Obstaculo): void => {
    const f = crearFantasma(o)
    const { duracion, fraccionCaida, anguloFinal, fraccionDesvanecer } = datos.caida
    const duracionCaida = duracion * fraccionCaida
    const inicioDesvanecer = duracion * (1 - fraccionDesvanecer)
    const giro = new Quaternion()
    const efecto: Efecto = {
      duracion,
      actualizar: (t) => {
        const angulo = anguloCaida(t, duracionCaida, anguloFinal) * GRADOS
        f.pivote.quaternion.copy(giro.setFromAxisAngle(f.eje, angulo))
        f.pivote.scale.setScalar(Math.max(1e-4, escalaDesvanecer(t, duracion, inicioDesvanecer)))
      },
      terminar: () => {
        f.retirar()
        // Si el golpe final llegó durante una sacudida, aquella ya se terminó al sustituirla.
        vegetacion.ocultarArbol(o.x, o.y, false)
      },
    }
    gestor.alta(efecto, `arbol-${o.x}-${o.y}`)
  }

  const alEvento: Suscriptor = (n) => {
    if (!n.ok) return
    for (const e of n.eventos) {
      if (e.tipo === 'obstaculo-golpeado' && e.obstaculo === 'arbol') {
        const o = buscar(e.x, e.y)
        if (o) sacudirArbol(o)
      } else if (e.tipo === 'obstaculo-quitado' && e.obstaculo === 'arbol') {
        // El núcleo ya dejó un tocón en la casilla, con la misma variante que tenía el árbol.
        const o = buscar(e.x, e.y)
        if (o) caerArbol(o)
      }
    }
  }
  const quitarSuscripcion = lector.suscribir(alEvento)

  return {
    actualizar: (dt) => gestor.actualizar(dt),
    get vivos() {
      return gestor.vivos
    },
    destruir: () => {
      quitarSuscripcion()
      gestor.limpiar()
    },
  }
}
