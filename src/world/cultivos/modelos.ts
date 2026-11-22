import {
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  SphereGeometry,
  type Material,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Cultivo } from '../../core'
import { color as colorPaleta } from '../paleta'
import { DATOS_MODELOS_CULTIVOS, type DatosModelosCultivos } from './modelos-datos'

/** Fases con modelo propio: las tres de crecimiento y el marchito (común a todos los cultivos). */
export type FaseVisual = 'brote' | 'crecimiento' | 'maduro' | 'marchito'
export const FASES_VISUALES: readonly FaseVisual[] = ['brote', 'crecimiento', 'maduro', 'marchito']

type Datos = DatosModelosCultivos
type Hojas = Datos['marchito']['hojas']
type Orden = 'brote' | 'crecimiento' | 'maduro'

const RANGO: Record<Orden, number> = { brote: 0, crecimiento: 1, maduro: 2 }

/** Pinta toda la geometría de un color (atributo de vértice) y la deja sin índice ni UV. */
function colorear(g: BufferGeometry, nombre: string): BufferGeometry {
  const plana = g.index ? g.toNonIndexed() : g
  plana.deleteAttribute('uv')
  const c = new Color(colorPaleta(nombre))
  const n = plana.getAttribute('position').count
  const datos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.toArray(datos, i * 3)
  plana.setAttribute('color', new Float32BufferAttribute(datos, 3))
  return plana
}

/** Anillo de hojas: conos que se abren hacia fuera, repartidos a intervalos regulares. */
function hojas(h: Hojas, n: number, lados: number, f: number): BufferGeometry[] {
  const piezas: BufferGeometry[] = []
  for (let i = 0; i < n; i++) {
    const g = new ConeGeometry(h.ancho * f, h.alto * f, lados)
    g.translate(0, (h.alto * f) / 2, 0)
    g.rotateX(h.inclinacion)
    g.translate(0, 0, h.radio * f)
    // Cada hoja gira un poco más que el reparto uniforme para no alinearse con el anillo.
    g.rotateY(((i + (i % 2) * 0.25) / n) * Math.PI * 2)
    piezas.push(colorear(g, h.color))
  }
  return piezas
}

function fusionar(piezas: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(piezas, false)
  piezas.forEach((p) => p.dispose())
  return g
}

function construir(d: Datos, cultivo: Cultivo, fase: Orden): BufferGeometry {
  const c = d.cultivos[cultivo]
  const { escala, hojasMax } = d.fases[fase]
  const piezas = hojas(c.hojas, Math.min(c.hojas.n, hojasMax), d.lados, escala)
  const cuerpo = c.cuerpo
  if (cuerpo && RANGO[fase] >= RANGO[cuerpo.desde]) {
    let g: BufferGeometry
    if (cuerpo.forma === 'esfera') {
      g = new SphereGeometry(cuerpo.radio * escala, d.ladosEsfera, d.ladosEsfera / 2)
      g.scale(1, cuerpo.alto / cuerpo.radio, 1)
    } else {
      g = new CylinderGeometry(
        cuerpo.radio * escala,
        cuerpo.radio * escala,
        cuerpo.alto * escala,
        8,
      )
    }
    g.translate(0, cuerpo.y * escala, 0)
    piezas.push(colorear(g, cuerpo.color))
  }
  for (const a of c.adornos) {
    if (RANGO[fase] < RANGO[a.desde]) continue
    for (let i = 0; i < a.n; i++) {
      const g = new SphereGeometry(a.radio, d.ladosEsfera, d.ladosEsfera / 2)
      const ang = ((i + 0.5) / a.n) * Math.PI * 2
      g.translate(Math.sin(ang) * a.anillo, a.y, Math.cos(ang) * a.anillo)
      piezas.push(colorear(g, a.color))
    }
  }
  return fusionar(piezas)
}

function construirMarchito(d: Datos): BufferGeometry {
  const { hojas: h, tallo } = d.marchito
  const t = new CylinderGeometry(tallo.radio, tallo.radio, tallo.alto, 5)
  t.translate(0, tallo.alto / 2, 0)
  return fusionar([colorear(t, tallo.color), ...hojas(h, h.n, d.lados, 1)])
}

let materialCompartido: MeshStandardMaterial | undefined
const geometrias = new Set<BufferGeometry>()

/**
 * Modelo de un cultivo en una fase: una sola geometría fusionada (colores de vértice) y un solo
 * material, compartido por todos los modelos, para que cada (cultivo, fase) sea una llamada de
 * dibujo. Origen en el suelo y centrado en la casilla de 1 m. «marchito» es igual en todos.
 * Llamar a `liberarModelosCultivos` al destruir la escena.
 */
export function crearModeloCultivo(
  cultivo: Cultivo,
  fase: FaseVisual,
): { geometria: BufferGeometry; material: Material } {
  materialCompartido ??= new MeshStandardMaterial({
    vertexColors: true,
    roughness: DATOS_MODELOS_CULTIVOS.rugosidad,
    metalness: 0,
  })
  const geometria =
    fase === 'marchito'
      ? construirMarchito(DATOS_MODELOS_CULTIVOS)
      : construir(DATOS_MODELOS_CULTIVOS, cultivo, fase)
  geometrias.add(geometria)
  return { geometria, material: materialCompartido }
}

/** Libera el material compartido y todas las geometrías creadas con `crearModeloCultivo`. */
export function liberarModelosCultivos(): void {
  materialCompartido?.dispose()
  materialCompartido = undefined
  geometrias.forEach((g) => g.dispose())
  geometrias.clear()
}
