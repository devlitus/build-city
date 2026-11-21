import { InstancedMesh, PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'
import { CONFIG_RECURSOS, crearEstadoInicial } from '../core'
import { crearVegetacion } from './vegetacion'
import { trozoCercano } from './dispersion'
import { crearAltura } from './terreno/altura'
import { DATOS_VEGETACION } from './vegetacion-datos'

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
    const arboles = obstaculos.filter((o) => o.tipo === 'arbol').length
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

describe('crearVegetacion.sincronizar', () => {
  const por = (veg: { objeto: { children: unknown[] } }, nombre: string) =>
    mallas(veg.objeto).find((m) => m.name === nombre)?.count ?? -1

  it('árbol talado -> tocón; roca picada y tocón quitado desaparecen', () => {
    const veg = crearVegetacion(valle, obstaculos, altura, semilla)
    const iArbol = obstaculos.findIndex((o) => o.tipo === 'arbol')
    const arbol = obstaculos[iArbol]
    if (!arbol) throw new Error('el valle de prueba no tiene árboles')
    const arboles0 = por(veg, 'arboles-tronco')
    const rocas0 = por(veg, 'rocas')

    const talado = obstaculos.map((o, i) =>
      i === iArbol ? { tipo: 'tocon' as const, x: o.x, y: o.y, variante: o.variante } : o,
    )
    veg.sincronizar(talado, 1)
    expect(por(veg, 'arboles-tronco')).toBe(arboles0 - 1)
    expect(por(veg, 'tocones')).toBe(1)

    const sinRoca = talado.filter(
      (o, i) => o.tipo !== 'roca' || i !== talado.findIndex((r) => r.tipo === 'roca'),
    )
    veg.sincronizar(sinRoca, 1)
    expect(por(veg, 'rocas')).toBe(rocas0 - 1)

    veg.sincronizar(
      sinRoca.filter((o) => o.tipo !== 'tocon'),
      1,
    )
    expect(por(veg, 'tocones')).toBe(0)
    // Sin duplicar mallas: cada nombre aparece una sola vez.
    const nombres = mallas(veg.objeto).map((m) => m.name)
    expect(new Set(nombres).size).toBe(nombres.length)
    veg.destruir()
  })

  it('sin cambios visibles no reconstruye las mallas', () => {
    const veg = crearVegetacion(valle, obstaculos, altura, semilla)
    const antes = mallas(veg.objeto).find((m) => m.name === 'rocas')
    veg.sincronizar(
      obstaculos.map((o) => ({ ...o, golpes: 1 })),
      1,
    )
    expect(mallas(veg.objeto).find((m) => m.name === 'rocas')).toBe(antes)
    veg.destruir()
  })

  it('un plantón cambia de modelo al crecer y desaparece de las fases al ser árbol', () => {
    const veg = crearVegetacion(valle, [], altura, semilla, 1)
    const planton = { tipo: 'planton' as const, x: 60, y: 60, variante: 0.4, diaPlantado: 1 }
    const nombres = () => mallas(veg.objeto).map((m) => m.name)
    const faseDe = () =>
      nombres()
        .filter((n) => n.endsWith('-tronco') && n.startsWith('planton-'))
        .map((n) => n.split('-')[1])
    veg.sincronizar([planton], 1)
    expect(faseDe()).toEqual(['0'])
    const dias = CONFIG_RECURSOS.planton.diasCrecimiento
    const ultima = DATOS_VEGETACION.planton.escalas.length - 1
    veg.sincronizar([planton], 1 + dias - 1)
    expect(faseDe()).toEqual([String(ultima)])
    // Mismo día y mismos obstáculos: no se reconstruye.
    const malla = mallas(veg.objeto).find((m) => m.name === `planton-${ultima}-tronco`)
    veg.sincronizar([planton], 1 + dias - 1)
    expect(mallas(veg.objeto).find((m) => m.name === `planton-${ultima}-tronco`)).toBe(malla)
    veg.sincronizar([{ ...planton, tipo: 'arbol' as const }], 1 + dias)
    expect(faseDe()).toEqual([])
    expect(por(veg, 'arboles-tronco')).toBe(1)
    veg.destruir()
  })
})
