import { BoxGeometry, ConeGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { colorNumero, paletaJuego } from '../paleta'
import type { EtapaObra, TipoEdificio } from './carga'
import { DATOS_OBRA } from './obra-datos'

/*
 * Formas por código que se ven mientras el `.glb` de una etapa aún no ha cargado. Están en el
 * marco del modelo: centradas en su huella sin girar, base en y=0 y puerta hacia +z. Comparten
 * geometrías unitarias (con la base en y=0) y materiales; solo cambia la escala de cada malla.
 */

let cajaUnidad: BoxGeometry | undefined
let piramideUnidad: ConeGeometry | undefined
const materiales = new Map<string, MeshStandardMaterial>()

function caja(): BoxGeometry {
  if (!cajaUnidad) {
    cajaUnidad = new BoxGeometry(1, 1, 1)
    cajaUnidad.translate(0, 0.5, 0)
  }
  return cajaUnidad
}

/** Pirámide de base cuadrada de lado 1 y alto 1, con la base en y=0. */
function piramide(): ConeGeometry {
  if (!piramideUnidad) {
    piramideUnidad = new ConeGeometry(Math.SQRT1_2, 1, 4)
    piramideUnidad.rotateY(Math.PI / 4)
    piramideUnidad.translate(0, 0.5, 0)
  }
  return piramideUnidad
}

function material(nombre: string): MeshStandardMaterial {
  let m = materiales.get(nombre)
  if (!m) {
    m = new MeshStandardMaterial({ color: colorNumero(paletaJuego, nombre), roughness: 0.9 })
    materiales.set(nombre, m)
  }
  return m
}

function pieza(
  geometria: BoxGeometry | ConeGeometry,
  mat: MeshStandardMaterial,
  sx: number,
  sy: number,
  sz: number,
  x: number,
  y: number,
  z: number,
): Mesh {
  const m = new Mesh(geometria, mat)
  m.scale.set(sx, sy, sz)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

/**
 * Forma provisional de `tipo` en `etapa` para una huella de `ancho` × `fondo` metros (sin girar)
 * y `altura` total. Solo comparte recursos: quitarla de la escena no libera nada.
 */
export function crearFormaProvisional(
  tipo: TipoEdificio,
  etapa: EtapaObra,
  ancho: number,
  fondo: number,
  altura: number,
): Group {
  const d = DATOS_OBRA
  const p = d.provisional
  const col = d.colores.edificios[tipo]
  const g = new Group()
  const matCimiento = material(d.colores.cimientos)
  const hC = Math.min(p.alturaCimientos, altura)
  g.add(pieza(caja(), matCimiento, ancho, hC, fondo, 0, 0, 0))
  const anchoInt = Math.max(0.1, ancho - p.margen * 2)
  const fondoInt = Math.max(0.1, fondo - p.margen * 2)
  if (etapa === 'andamios') {
    const matAnd = material(d.colores.andamios)
    const h = altura * p.fraccionParedes
    const gr = p.grosorAndamio
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        g.add(
          pieza(
            caja(),
            matAnd,
            gr,
            h,
            gr,
            sx * (ancho / 2 - p.margen),
            hC,
            sz * (fondo / 2 - p.margen),
          ),
        )
      }
    }
    return g
  }
  if (etapa === 'cimientos') return g
  const paredes = col?.paredes ?? d.colores.andamios
  if (etapa === 'paredes') {
    const h = altura * p.fraccionParedes
    g.add(pieza(caja(), material(paredes), anchoInt, h, fondoInt, 0, hC, 0))
    return g
  }
  // Terminado.
  const hTejado = altura * p.fraccionTejado
  const hParedes = altura - hTejado
  g.add(pieza(caja(), material(paredes), anchoInt, hParedes, fondoInt, 0, hC, 0))
  g.add(
    pieza(
      piramide(),
      material(col?.tejado ?? d.colores.andamios),
      ancho,
      hTejado,
      fondo,
      0,
      hC + hParedes,
      0,
    ),
  )
  return g
}
