import { readFileSync } from 'node:fs'
import { Box3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { describe, expect, it } from 'vitest'
import {
  anguloObjetivo,
  diferenciaAngular,
  elegirAnimacion,
  girarHacia,
  normalizarAngulo,
  suavizar,
  velocidadHorizontal,
} from './animacion'
import { cargarAnimacionPersonaje, DATOS_ANIMACION } from './animacion-datos'
import { escalaParaAltura } from './medidas'

const d = DATOS_ANIMACION

/** Lee un GLB y le quita imágenes y texturas (el cargador necesita el DOM para decodificarlas). */
function glbSinTexturas(ruta: string): ArrayBuffer {
  const bytes = readFileSync(ruta)
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const largoJson = vista.getUint32(12, true)
  const json = JSON.parse(bytes.subarray(20, 20 + largoJson).toString('utf8')) as Record<
    string,
    unknown
  >
  delete json.images
  delete json.textures
  delete json.samplers
  json.materials = []
  for (const malla of json.meshes as { primitives: { material?: number }[] }[])
    for (const prim of malla.primitives) delete prim.material
  let nuevo = Buffer.from(JSON.stringify(json), 'utf8')
  nuevo = Buffer.concat([nuevo, Buffer.alloc((4 - (nuevo.length % 4)) % 4, 0x20)])
  const resto = bytes.subarray(20 + largoJson) // trozo BIN, con su cabecera
  const salida = Buffer.alloc(20 + nuevo.length + resto.length)
  bytes.copy(salida, 0, 0, 12)
  salida.writeUInt32LE(salida.length, 8)
  salida.writeUInt32LE(nuevo.length, 12)
  bytes.copy(salida, 16, 16, 20)
  nuevo.copy(salida, 20)
  resto.copy(salida, 20 + nuevo.length)
  return salida.buffer.slice(salida.byteOffset, salida.byteOffset + salida.byteLength)
}

describe('elegirAnimacion', () => {
  it('parado elige Reposo puro, sin cadencia', () => {
    for (const v of [0, d.umbralParado / 2, d.umbralParado]) {
      const e = elegirAnimacion(v, d)
      expect(e.pesos).toEqual({ reposo: 1, andar: 0, correr: 0 })
      expect(e.timeScale).toBe(1)
    }
  })

  it('andando elige Andar y corriendo elige Correr', () => {
    expect(elegirAnimacion(d.velocidadAndar, d).pesos).toEqual({ reposo: 0, andar: 1, correr: 0 })
    expect(elegirAnimacion(d.velocidadCorrer, d).pesos).toEqual({ reposo: 0, andar: 0, correr: 1 })
  })

  it('los pesos suman 1 a cualquier velocidad', () => {
    for (let v = 0; v <= 6; v += 0.1) {
      const { reposo, andar, correr } = elegirAnimacion(v, d).pesos
      expect(reposo + andar + correr).toBeCloseTo(1, 10)
    }
  })

  it('el ritmo de la animación depende de la velocidad', () => {
    const lento = elegirAnimacion(d.velocidadAndar * 0.6, d).timeScale
    const normal = elegirAnimacion(d.velocidadAndar, d).timeScale
    const rapido = elegirAnimacion(d.velocidadCorrer * 1.3, d).timeScale
    expect(lento).toBeLessThan(normal)
    expect(normal).toBeLessThan(rapido)
  })

  it('el ritmo respeta los límites de los datos', () => {
    expect(elegirAnimacion(d.umbralParado + 0.001, d).timeScale).toBeGreaterThanOrEqual(
      d.ritmo.minimo,
    )
    expect(elegirAnimacion(100, d).timeScale).toBe(d.ritmo.maximo)
  })
})

describe('velocidad y suavizado', () => {
  it('velocidadHorizontal es la distancia entre dt', () => {
    expect(velocidadHorizontal(3, 4, 2)).toBeCloseTo(2.5)
    expect(velocidadHorizontal(3, 4, 0)).toBe(0)
  })

  it('suavizar se acerca al objetivo sin pasarse', () => {
    const a = suavizar(0, 10, 8, 0.1)
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThan(10)
    expect(suavizar(10, 10, 8, 0.1)).toBe(10)
  })
})

describe('giro', () => {
  it('el giro toma el camino más corto', () => {
    // De 170° a -170°: 20° por el lado corto (positivo), no -340°.
    const desde = (170 * Math.PI) / 180
    const hasta = (-170 * Math.PI) / 180
    expect(diferenciaAngular(desde, hasta)).toBeCloseTo((20 * Math.PI) / 180)
    expect(diferenciaAngular(hasta, desde)).toBeCloseTo((-20 * Math.PI) / 180)
    // Y girarHacia avanza en ese sentido: pasa por π, no por 0.
    const siguiente = girarHacia(desde, hasta, 5, 0.1)
    expect(Math.abs(siguiente)).toBeGreaterThan(desde)
  })

  it('vuelta de ±π: la diferencia queda en (-π, π]', () => {
    expect(diferenciaAngular(0, Math.PI)).toBeCloseTo(Math.PI)
    expect(diferenciaAngular(0, -Math.PI)).toBeCloseTo(Math.PI)
    expect(diferenciaAngular(0, 3 * Math.PI)).toBeCloseTo(Math.PI)
    expect(normalizarAngulo(2 * Math.PI)).toBeCloseTo(0)
    expect(normalizarAngulo(-1.5 * Math.PI)).toBeCloseTo(0.5 * Math.PI)
  })

  it('girarHacia converge al objetivo sin pasarse', () => {
    let a = 0
    const objetivo = 2.5
    for (let i = 0; i < 200; i++) {
      a = girarHacia(a, objetivo, d.giro.velocidadAngular, 1 / 60)
      expect(a).toBeLessThanOrEqual(objetivo + 1e-9)
    }
    expect(a).toBeCloseTo(objetivo, 3)
  })

  it('el ángulo objetivo mira hacia el movimiento y, parado, conserva el último', () => {
    const minima = d.giro.velocidadMinima
    expect(anguloObjetivo(0, 1, 1, minima, 0.3)).toBeCloseTo(0) // sur
    expect(anguloObjetivo(1, 0, 1, minima, 0.3)).toBeCloseTo(Math.PI / 2) // este
    expect(anguloObjetivo(0, -1, 1, minima, 0.3)).toBeCloseTo(Math.PI) // norte
    expect(anguloObjetivo(1, 1, 0, minima, 0.3)).toBe(0.3)
    expect(anguloObjetivo(0, 0, 5, minima, 0.3)).toBe(0.3)
  })
})

describe('altura del granjero', () => {
  it('escalaParaAltura lleva la caja a la altura deseada', () => {
    expect(escalaParaAltura(1.75, 1.75)).toBe(1)
    expect(escalaParaAltura(3.5, 1.75)).toBeCloseTo(0.5)
    expect(escalaParaAltura(0, 1.75)).toBe(1)
  })

  it('el glb mide 1,75 m tras aplicar la escala', async () => {
    const gltf = await new GLTFLoader().parseAsync(
      glbSinTexturas('public/modelos/granjero.glb'),
      '',
    )
    const caja = new Box3().setFromObject(gltf.scene)
    const escala = escalaParaAltura(caja.max.y - caja.min.y, d.altura)
    expect((caja.max.y - caja.min.y) * escala).toBeCloseTo(1.75, 2)
    expect(escala).toBeCloseTo(1, 1) // el modelo ya viene a su altura: no hay que reescalarlo
    expect(gltf.animations.map((a) => a.name).sort()).toEqual(['Andar', 'Correr', 'Reposo'])
  })
})

describe('datos de animación', () => {
  it('rechaza velocidades incoherentes', () => {
    expect(() =>
      cargarAnimacionPersonaje({ ...d, velocidadAndar: 5, velocidadCorrer: 2 }),
    ).toThrow()
  })
})
