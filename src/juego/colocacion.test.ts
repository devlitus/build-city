import { describe, expect, it } from 'vitest'
import { crearCanalColocacion, enlazarConstruccion } from './colocacion'
import { crearCanalEdificioElegido } from './edificio-elegido'
import { crearCanalHerramientaPlano } from './herramienta-plano'

describe('canal de colocación', () => {
  it('gira en cuartos de vuelta y avisa', () => {
    const c = crearCanalColocacion()
    const vistos: number[] = []
    c.suscribir((e) => vistos.push(e.rotacion))
    c.girar()
    c.girar()
    c.girar()
    c.girar()
    expect(vistos).toEqual([1, 2, 3, 0])
  })

  it('solo avisa si el veredicto cambia', () => {
    const c = crearCanalColocacion()
    let n = 0
    c.suscribir(() => n++)
    c.fijarVeredicto({ valida: true })
    c.fijarVeredicto({ valida: true })
    expect(n).toBe(1)
    c.fijarVeredicto({ valida: false, motivo: 'agua', faltan: { dinero: 0, madera: 0, piedra: 0 } })
    expect(n).toBe(2)
    c.reiniciar()
    expect(c.veredicto).toBeNull()
    expect(c.rotacion).toBe(0)
  })
})

describe('enlazarConstruccion', () => {
  const montar = () => {
    const edificio = crearCanalEdificioElegido()
    const herr = crearCanalHerramientaPlano()
    const col = crearCanalColocacion()
    enlazarConstruccion(edificio, herr, col)
    return { edificio, herr, col }
  }

  it('elegir un edificio activa construir', () => {
    const { edificio, herr } = montar()
    edificio.elegir('casa')
    expect(herr.herramienta).toBe('construir')
  })

  it('volver a elegirlo (null) cancela y vuelve a parcelas', () => {
    const { edificio, herr } = montar()
    edificio.elegir('casa')
    edificio.elegir(null)
    expect(herr.herramienta).toBe('parcelas')
  })

  it('Esc (volver a parcelas) limpia el edificio elegido, el giro y el veredicto', () => {
    const { edificio, herr, col } = montar()
    edificio.elegir('casa')
    col.girar()
    col.fijarVeredicto({ valida: true })
    herr.elegirHerramienta('parcelas')
    expect(edificio.actual).toBeNull()
    expect(col.rotacion).toBe(0)
    expect(col.veredicto).toBeNull()
  })

  it('cambiar de herramienta (zonas) también cancela', () => {
    const { edificio, herr } = montar()
    edificio.elegir('tienda')
    herr.elegirHerramienta('zonas')
    expect(edificio.actual).toBeNull()
  })
})
