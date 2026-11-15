import { InstancedMesh, PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'
import { crearEstadoInicial } from '../core'
import { crearVegetacion } from './vegetacion'
import { trozoCercano } from './dispersion'
import { crearAltura } from './terreno/altura'

const semilla = 1
const { valle, obstaculos } = crearEstadoInicial({ semilla })
const altura = crearAltura(valle, semilla)

function mallas(objeto: { children: unknown[] }): InstancedMesh[] {
  return objeto.children as InstancedMesh[]
}

describe('trozoCercano', () => {
  const rango = { xMin: 0, xMax: 20, zMin: 0, zMax: 20 }

  it('dibuja el trozo si la cámara está dentro del radio y lo oculta si está lejos', () => {
    expect(trozoCercano(rango, { x: 10, y: 5, z: 10 }, 50, 3)).toBe(true)
    expect(trozoCercano(rango, { x: 60, y: 0, z: 10 }, 50, 3)).toBe(true)
    expect(trozoCercano(rango, { x: 80, y: 0, z: 10 }, 50, 3)).toBe(false)
    // La altura de la cámara cuenta: en alto, un trozo cercano en planta puede quedar lejos.
    expect(trozoCercano(rango, { x: 10, y: 80, z: 10 }, 50, 3)).toBe(false)
  })
})

describe('crearVegetacion', () => {
  const veg = crearVegetacion(valle, obstaculos, altura, semilla)

  it('tiene una instancia por cada árbol, roca y plantón del núcleo', () => {
    const por = (nombre: string) => mallas(veg.objeto).find((m) => m.name === nombre)?.count ?? -1
    const arboles = obstaculos.filter((o) => o.tipo !== 'roca').length
    expect(por('rocas')).toBe(obstaculos.filter((o) => o.tipo === 'roca').length)
    expect(por('arboles-tronco')).toBe(arboles)
    expect(por('arboles-copa-pino') + por('arboles-copa-redonda')).toBe(arboles)
  })

  it('oculta los trozos de hierba lejanos y muestra los cercanos', () => {
    const hierba = mallas(veg.objeto).filter((m) => m.name.startsWith('hierba-'))
    expect(hierba.length).toBeGreaterThan(20)
    const camara = new PerspectiveCamera()
    camara.position.set(0, 2, 0)
    veg.actualizar(0.016, camara)
    const cerca = hierba.filter((m) => m.visible).length
    expect(cerca).toBeGreaterThan(0)
    expect(cerca).toBeLessThan(hierba.length)
    camara.position.set(0, 600, 0)
    veg.actualizar(0.016, camara)
    expect(hierba.every((m) => !m.visible)).toBe(true)
  })

  it('cada trozo de hierba tiene su esfera de contención', () => {
    for (const m of mallas(veg.objeto)) expect(m.boundingSphere).not.toBeNull()
  })
})
