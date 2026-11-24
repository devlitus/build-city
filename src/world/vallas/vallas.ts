import { Matrix4, MeshStandardMaterial, Object3D, type BufferGeometry } from 'three'
import { ladoValle, vallaEn } from '../../core'
import type { LectorEstado } from '../../juego/almacen'
import { CapaInstanciada } from '../capa-instanciada'
import { casillasCambiadas, conVecinas } from '../casillas-cambio'
import { casillaAMetros } from '../terreno/coordenadas'
import type { FuncionAltura } from '../terreno/altura'
import { DATOS_DIBUJO_VALLAS, type DatosDibujoVallas } from './dibujo-datos'
import { ejePuerta } from './eje-puerta'
import { formaValla, mascaraVecinos, MASCARA_REFERENCIA, type PiezaValla } from './forma'
import { crearGeometriaHoja, crearGeometriaMarcoPuerta, crearGeometriaPieza } from './geometrias'
import { anguloHoja, avanzarApertura } from './puerta'

export interface VallasMundo {
  readonly objeto: Object3D
  /** Una vez por fotograma: sincroniza con `estado.vallas` (solo las casillas cambiadas) y mueve las hojas. */
  actualizar(dt: number): void
  destruir(): void
}

const PIEZAS: readonly PiezaValla[] = ['poste', 'extremo', 'recta', 'esquina', 'te', 'cruz']

interface Puerta {
  x: number
  y: number
  z: number
  eje: 0 | 1
  apertura: number
  /** Ángulo con el que se dibujó por última vez (para no reescribir la matriz si no cambia). */
  dibujado: number
}

/**
 * Vallas y puertas del mundo. Solo dibuja: lee `estado.vallas` y el personaje. Una capa
 * instanciada por tipo de pieza (poste, extremo, recta…), otra para los marcos de puerta y otra
 * para las hojas. Al cambiar la cadena solo se recalculan las casillas cambiadas y sus vecinas.
 */
export function crearVallasMundo(
  lector: LectorEstado,
  altura: FuncionAltura,
  datos: DatosDibujoVallas = DATOS_DIBUJO_VALLAS,
): VallasMundo {
  const raiz = new Object3D()
  raiz.name = 'vallas'
  const material = new MeshStandardMaterial({
    roughness: datos.rugosidad,
    metalness: 0,
    vertexColors: true,
  })
  const geometrias: BufferGeometry[] = []
  const nueva = (g: BufferGeometry): BufferGeometry => {
    geometrias.push(g)
    return g
  }
  const opciones = (nombre: string, sombra: boolean) => ({
    nombre,
    capacidadInicial: datos.capacidadInicial,
    proyectaSombra: sombra,
    recibeSombra: true,
  })

  const piezas = new Map<PiezaValla, CapaInstanciada>()
  for (const p of PIEZAS) {
    const g = nueva(crearGeometriaPieza(datos, MASCARA_REFERENCIA[p]))
    piezas.set(p, new CapaInstanciada(raiz, g, material, opciones(`valla-${p}`, true)))
  }
  const marcos = new CapaInstanciada(
    raiz,
    nueva(crearGeometriaMarcoPuerta(datos)),
    material,
    opciones('puerta-marco', true),
  )
  const hojas = new CapaInstanciada(
    raiz,
    nueva(crearGeometriaHoja(datos)),
    material,
    opciones('puerta-hoja', true),
  )

  /** Pieza de valla dibujada en cada casilla. */
  const piezaDe = new Map<number, PiezaValla>()
  const puertas = new Map<number, Puerta>()
  let dibujadas: string | undefined

  const m = new Matrix4()
  const m2 = new Matrix4()
  const m3 = new Matrix4()

  const matrizHoja = (p: Puerta, angulo: number): Matrix4 => {
    m.makeRotationY((p.eje * Math.PI) / 2).setPosition(p.x, p.y, p.z)
    m2.makeTranslation(-datos.puerta.mitadSeparacion, 0, 0)
    m3.makeRotationY(angulo)
    return m.multiply(m2).multiply(m3)
  }

  const quitarCasilla = (i: number): void => {
    const pieza = piezaDe.get(i)
    if (pieza) {
      piezas.get(pieza)?.quitar(i)
      piezaDe.delete(i)
    }
    if (puertas.delete(i)) {
      marcos.quitar(i)
      hojas.quitar(i)
    }
  }

  const sincronizar = (): void => {
    const { vallas, valle } = lector.estado
    const lado = ladoValle(valle)
    const esValla = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < lado && y < lado && vallaEn(vallas, y * lado + x) !== undefined
    const cambiadas = casillasCambiadas(dibujadas, vallas)
    for (const i of conVecinas(cambiadas, lado)) {
      const x = i % lado
      const y = Math.floor(i / lado)
      const tipo = vallaEn(vallas, i)
      const p = casillaAMetros(x, y, valle)
      const suelo = altura(p.x, p.z)
      const mascara = mascaraVecinos(esValla, x, y)
      if (tipo === 'valla') {
        const forma = formaValla(mascara)
        const previa = piezaDe.get(i)
        if (previa !== forma.pieza) quitarCasilla(i)
        // Giro horario visto desde arriba: en three.js (y hacia arriba) es una rotación negativa.
        m.makeRotationY((-forma.giro * Math.PI) / 2).setPosition(p.x, suelo, p.z)
        piezas.get(forma.pieza)?.poner(i, m)
        piezaDe.set(i, forma.pieza)
      } else if (tipo === 'puerta') {
        if (piezaDe.has(i)) quitarCasilla(i)
        const eje = ejePuerta(mascara)
        const existente = puertas.get(i)
        const puerta: Puerta = existente ?? {
          x: p.x,
          y: suelo,
          z: p.z,
          eje,
          apertura: 0,
          dibujado: 0,
        }
        puerta.eje = eje
        puerta.y = suelo
        puertas.set(i, puerta)
        m.makeRotationY((eje * Math.PI) / 2).setPosition(p.x, suelo, p.z)
        marcos.poner(i, m)
        hojas.poner(i, matrizHoja(puerta, anguloHoja(puerta.apertura)))
        puerta.dibujado = puerta.apertura
      } else {
        quitarCasilla(i)
      }
    }
    dibujadas = vallas
  }

  const moverHojas = (dt: number): void => {
    if (puertas.size === 0) return
    const { personaje, valle } = lector.estado
    const mitad = ladoValle(valle) / 2
    // El personaje está en casillas (x al este, y al sur); las puertas, en metros.
    const gx = personaje.x - mitad
    const gz = personaje.y - mitad
    for (const [i, p] of puertas) {
      const distancia = Math.hypot(gx - p.x, gz - p.z)
      p.apertura = avanzarApertura(p.apertura, distancia, dt * 1000)
      if (p.apertura === p.dibujado) continue
      hojas.poner(i, matrizHoja(p, anguloHoja(p.apertura)))
      p.dibujado = p.apertura
    }
  }

  return {
    objeto: raiz,
    actualizar: (dt) => {
      if (lector.estado.vallas !== dibujadas) sincronizar()
      moverHojas(dt)
    },
    destruir: () => {
      raiz.removeFromParent()
      for (const c of piezas.values()) c.destruir()
      marcos.destruir()
      hojas.destruir()
      geometrias.forEach((g) => g.dispose())
      material.dispose()
    },
  }
}
