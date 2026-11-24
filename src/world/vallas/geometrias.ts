import { BoxGeometry, type BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { LADO_E, LADO_N, LADO_O, LADO_S, type MascaraVecinos } from './forma'
import type { DatosDibujoVallas } from './dibujo-datos'
import { color } from '../paleta'

/** Pinta toda la geometría de un color de la paleta (atributo de color por vértice). */
function tintar(g: BufferGeometry, nombre: string): BufferGeometry {
  const c = new Color(color(nombre))
  const n = g.getAttribute('position').count
  const a: number[] = []
  for (let i = 0; i < n; i++) a.push(c.r, c.g, c.b)
  g.setAttribute('color', new Float32BufferAttribute(a, 3))
  return g
}

function unir(piezas: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(piezas, false)
  piezas.forEach((p) => p.dispose())
  return g
}

function poste(d: DatosDibujoVallas, x: number, z: number): BufferGeometry {
  const { ancho, alto, hundimiento } = d.poste
  const g = new BoxGeometry(ancho, alto + hundimiento, ancho)
  g.translate(x, (alto - hundimiento) / 2, z)
  return tintar(g, d.poste.color)
}

/**
 * Pieza de valla en giro 0: poste central y, hacia cada lado de la máscara, las tablas desde el
 * centro hasta el borde de la casilla (la vecina dibuja la otra mitad). N = -z, E = +x, S = +z, O = -x.
 */
export function crearGeometriaPieza(d: DatosDibujoVallas, mascara: MascaraVecinos): BufferGeometry {
  const piezas: BufferGeometry[] = [poste(d, 0, 0)]
  const { alto, grosor, alturas } = d.tabla
  for (const h of alturas) {
    const lados: [number, number, number][] = [
      [LADO_N, 0, -0.25],
      [LADO_S, 0, 0.25],
      [LADO_E, 0.25, 0],
      [LADO_O, -0.25, 0],
    ]
    for (const [bit, x, z] of lados) {
      if ((mascara & bit) === 0) continue
      const largoX = x === 0 ? grosor : 0.5
      const largoZ = z === 0 ? grosor : 0.5
      const t = new BoxGeometry(largoX, alto, largoZ)
      t.translate(x, h, z)
      piezas.push(tintar(t, d.tabla.color))
    }
  }
  return unir(piezas)
}

/** Marco de la puerta con el eje a lo largo de x: un poste a cada lado. */
export function crearGeometriaMarcoPuerta(d: DatosDibujoVallas): BufferGeometry {
  const m = d.puerta.mitadSeparacion
  return unir([poste(d, -m, 0), poste(d, m, 0)])
}

/**
 * Hoja de la puerta con el origen en su bisagra y extendida hacia +x: dos travesaños y dos
 * largueros.
 */
export function crearGeometriaHoja(d: DatosDibujoVallas): BufferGeometry {
  const { largoHoja, altoHoja, alturaHoja, grosorHoja } = d.puerta
  const trav = Math.min(0.1, altoHoja / 4)
  const piezas: BufferGeometry[] = []
  for (const y of [alturaHoja + trav / 2, alturaHoja + altoHoja - trav / 2]) {
    const t = new BoxGeometry(largoHoja, trav, grosorHoja)
    t.translate(largoHoja / 2, y, 0)
    piezas.push(tintar(t, d.puerta.colorHoja))
  }
  for (const x of [grosorHoja / 2, largoHoja - grosorHoja / 2]) {
    const l = new BoxGeometry(grosorHoja, altoHoja, grosorHoja)
    l.translate(x, alturaHoja + altoHoja / 2, 0)
    piezas.push(tintar(l, d.puerta.colorHoja))
  }
  return unir(piezas)
}
