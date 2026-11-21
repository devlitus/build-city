import {
  Color,
  LinearSRGBColorSpace,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from 'three'
import { colorHex, paletaJuego, type Paleta } from './paleta'
import {
  CATALOGO_MATERIALES,
  hexARgb,
  srgbALineal,
  tinteSobreTextura,
  type CatalogoMateriales,
  type DatosMaterial,
  type Rgb,
} from './materiales-datos'

/** Carga una imagen como textura (en las pruebas se sustituye por una falsa). */
export type CargadorTexturas = (url: string) => Texture

export interface FabricaMateriales {
  /** Material PBR del catálogo, creado una sola vez por nombre. */
  material(nombre: string): MeshStandardMaterial
  /** Datos del catálogo de un material; lanza si no existe. */
  datos(nombre: string): DatosMaterial
  /**
   * Multiplicador lineal por canal para que un color de la paleta (sRGB 0..1) se vea tal cual
   * sobre la textura del material; si no tiene textura, el propio color en lineal.
   */
  tinteDeVertice(nombre: string, color: Rgb): Rgb
}

/**
 * Crea la fábrica de materiales. Las texturas se cachean por nombre y solo `_diff` es sRGB
 * (normales y rugosidad son datos). Repetición en `RepeatWrapping`: las UV van en metros
 * divididos por `metrosPorRepeticion`, así que `repeat` queda en 1.
 */
export function crearFabrica(
  catalogo: CatalogoMateriales,
  paleta: Paleta,
  cargar: CargadorTexturas,
): FabricaMateriales {
  const materiales = new Map<string, MeshStandardMaterial>()
  const texturas = new Map<string, Texture>()

  const datos = (nombre: string): DatosMaterial => {
    const d = Object.hasOwn(catalogo.materiales, nombre) ? catalogo.materiales[nombre] : undefined
    if (d === undefined) throw new Error(`Material "${nombre}" no existe en el catálogo`)
    return d
  }

  const textura = (archivo: string, srgb: boolean): Texture => {
    let t = texturas.get(archivo)
    if (!t) {
      t = cargar(`${import.meta.env.BASE_URL}texturas/${archivo}.jpg`)
      t.wrapS = t.wrapT = RepeatWrapping
      t.anisotropy = catalogo.anisotropia
      t.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace
      texturas.set(archivo, t)
    }
    return t
  }

  const tinteDeVertice = (nombre: string, c: Rgb): Rgb => {
    const d = datos(nombre)
    if (d.colorMedio === undefined) return [srgbALineal(c[0]), srgbALineal(c[1]), srgbALineal(c[2])]
    return tinteSobreTextura(c, hexARgb(d.colorMedio))
  }

  return {
    datos,
    tinteDeVertice,
    material(nombre) {
      let m = materiales.get(nombre)
      if (m) return m
      const d = datos(nombre)
      const objetivo = hexARgb(colorHex(paleta, d.tinte))
      m = new MeshStandardMaterial({ roughness: d.rugosidad, metalness: 0 })
      if (d.colorPorVertice === true) {
        m.vertexColors = true
      } else if (d.colorMedio === undefined) {
        m.color = new Color().setRGB(objetivo[0], objetivo[1], objetivo[2], SRGBColorSpace)
      } else {
        const t = tinteSobreTextura(objetivo, hexARgb(d.colorMedio))
        m.color = new Color().setRGB(t[0], t[1], t[2], LinearSRGBColorSpace)
      }
      if (d.textura !== undefined) {
        m.map = textura(`${d.textura}_diff`, true)
        m.normalMap = textura(`${d.textura}_nor_gl`, false)
        m.normalScale = new Vector2(1, 1)
        m.roughnessMap = textura(`${d.textura}_rough`, false)
      }
      materiales.set(nombre, m)
      return m
    },
  }
}

let fabricaJuego: FabricaMateriales | undefined

/** Fábrica del juego (catálogo y paleta reales, texturas desde `public/texturas/`), creada al usarla. */
export function fabricaDelJuego(): FabricaMateriales {
  fabricaJuego ??= crearFabrica(CATALOGO_MATERIALES, paletaJuego, (url) =>
    new TextureLoader().load(url),
  )
  return fabricaJuego
}

/** Material compartido del catálogo, creado una sola vez por nombre. */
export function materialDe(nombre: string): MeshStandardMaterial {
  return fabricaDelJuego().material(nombre)
}
