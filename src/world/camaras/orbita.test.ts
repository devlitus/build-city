import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { direccionRelativa } from '../../juego/entrada'
import { cargarCamara, DATOS_CAMARA } from './camara-datos'
import {
  alturaMinimaCamara,
  aplicarGiro,
  aplicarInclinacion,
  diferenciaAngular,
  factorSeguimiento,
  limitarDistancia,
  limitarInclinacion,
  normalizarAngulo,
  posicionOrbita,
  puntoHombro,
} from './orbita'

describe('inclinación', () => {
  it('la inclinación se limita', () => {
    expect(limitarInclinacion(5, -0.1, 1.3)).toBe(1.3)
    expect(limitarInclinacion(-5, -0.1, 1.3)).toBe(-0.1)
    expect(limitarInclinacion(0.4, -0.1, 1.3)).toBe(0.4)
    expect(aplicarInclinacion(1.2, 1000, 0.0025, -0.1, 1.3)).toBe(1.3)
    expect(aplicarInclinacion(0, -1000, 0.0025, -0.1, 1.3)).toBe(-0.1)
  })

  it('arrastrar hacia abajo sube la cámara', () => {
    expect(aplicarInclinacion(0.3, 10, 0.01, -0.1, 1.3)).toBeCloseTo(0.4, 9)
  })
})

describe('giro horizontal', () => {
  it('da la vuelta sin saltos: el yaw queda en (-π, π] y es continuo', () => {
    const casi = Math.PI - 0.01
    const pasado = aplicarGiro(casi, 10, 0.002) // + 0.02 rad: cruza π
    expect(pasado).toBeCloseTo(-Math.PI + 0.01, 9)
    expect(diferenciaAngular(casi, pasado)).toBeCloseTo(0.02, 9)
  })

  it('el giro a la derecha aumenta el yaw', () => {
    expect(aplicarGiro(0, 100, 0.01)).toBeCloseTo(1, 9)
  })

  it('normalizar siempre da (-π, π] y conserva seno y coseno', () => {
    fc.assert(
      fc.property(fc.double({ min: -1000, max: 1000, noNaN: true }), (a) => {
        const n = normalizarAngulo(a)
        expect(n).toBeGreaterThan(-Math.PI)
        expect(n).toBeLessThanOrEqual(Math.PI)
        expect(Math.sin(n)).toBeCloseTo(Math.sin(a), 6)
        expect(Math.cos(n)).toBeCloseTo(Math.cos(a), 6)
      }),
    )
  })

  it('la diferencia angular toma el camino más corto', () => {
    expect(diferenciaAngular(3, -3)).toBeCloseTo(2 * Math.PI - 6, 9)
    expect(diferenciaAngular(-3, 3)).toBeCloseTo(6 - 2 * Math.PI, 9)
  })
})

describe('posición de la cámara', () => {
  const pies = { x: 10, y: 2, z: 20 }

  it('con yaw 0 la cámara está detrás (al sur) y W aleja al personaje de ella', () => {
    const objetivo = puntoHombro(pies, 0, 1.5, 0)
    const cam = posicionOrbita(objetivo, 0, 0, 5)
    expect(cam.z).toBeCloseTo(25, 9) // más al sur (+z) que el personaje
    expect(cam.x).toBeCloseTo(10, 9)
    const w = direccionRelativa(
      { adelante: true, atras: false, izquierda: false, derecha: false },
      0,
    )
    // El paso hacia W aumenta la distancia a la cámara.
    const antes = Math.hypot(cam.x - pies.x, cam.z - pies.z)
    const despues = Math.hypot(cam.x - (pies.x + w.dx), cam.z - (pies.z + w.dy))
    expect(despues).toBeGreaterThan(antes)
  })

  it('con yaw 90° la cámara está al oeste y W va al este, alejándose', () => {
    const cam = posicionOrbita(puntoHombro(pies, Math.PI / 2, 1.5, 0), Math.PI / 2, 0, 5)
    expect(cam.x).toBeCloseTo(5, 9)
    expect(cam.z).toBeCloseTo(20, 9)
  })

  it('la distancia al punto mirado es la pedida y la inclinación sube la cámara', () => {
    const objetivo = puntoHombro(pies, 0.7, 1.5, 0.4)
    const cam = posicionOrbita(objetivo, 0.7, 0.5, 6)
    expect(Math.hypot(cam.x - objetivo.x, cam.y - objetivo.y, cam.z - objetivo.z)).toBeCloseTo(6, 9)
    expect(cam.y).toBeGreaterThan(objetivo.y)
  })

  it('el hombro desplaza el punto a la derecha de la cámara', () => {
    expect(puntoHombro(pies, 0, 1.5, 0.4)).toEqual({ x: 10.4, y: 3.5, z: 20 })
  })
})

describe('la cámara no queda bajo el terreno', () => {
  it('sube hasta terreno + margen y no baja lo que ya está más alto', () => {
    expect(alturaMinimaCamara(1, 3, 0.5)).toBe(3.5)
    expect(alturaMinimaCamara(10, 3, 0.5)).toBe(10)
  })

  it('para cualquier terreno y pose, la altura final supera suelo + margen', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -20, max: 20, noNaN: true }),
        fc.double({ min: -20, max: 20, noNaN: true }),
        fc.double({ min: 0, max: 2, noNaN: true }),
        (y, suelo, margen) => {
          expect(alturaMinimaCamara(y, suelo, margen)).toBeGreaterThanOrEqual(suelo + margen)
        },
      ),
    )
  })
})

describe('zoom y seguimiento', () => {
  it('el zoom queda acotado', () => {
    expect(limitarDistancia(4, 100, 2.5, 9)).toBe(9)
    expect(limitarDistancia(4, 0.001, 2.5, 9)).toBe(2.5)
  })

  it('el seguimiento es independiente del fotograma: dos pasos de dt/2 = uno de dt', () => {
    const uno = factorSeguimiento(0.1, 10)
    const medio = factorSeguimiento(0.05, 10)
    expect(1 - (1 - medio) * (1 - medio)).toBeCloseTo(uno, 9)
    expect(factorSeguimiento(0, 10)).toBe(0)
  })
})

describe('datos de la cámara', () => {
  it('los datos del repositorio son válidos', () => {
    expect(DATOS_CAMARA.sensibilidad).toBeGreaterThan(0)
  })

  it('rechaza límites de inclinación incoherentes', () => {
    expect(() =>
      cargarCamara({ ...DATOS_CAMARA, inclinacion: { min: 1, max: 0, inicial: 0.5 } }),
    ).toThrow()
  })
})
