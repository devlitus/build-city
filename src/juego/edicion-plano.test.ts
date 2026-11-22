import { describe, expect, it } from 'vitest'
import { crearCanalColocacion } from './colocacion'
import { crearCanalEdicionPlano, enlazarEdicion } from './edicion-plano'
import { crearCanalHerramientaPlano } from './herramienta-plano'

describe('canal de edición del Plano', () => {
  it('avisa solo cuando cambia el edificio cogido o el pendiente', () => {
    const c = crearCanalEdicionPlano()
    const vistos: string[] = []
    const baja = c.suscribir((e) => vistos.push(`${e.cogido}/${e.pendiente}`))
    c.coger(3)
    c.coger(3)
    c.pedirQuitar(5)
    c.soltar()
    c.soltar()
    c.descartar()
    baja()
    c.coger(1)
    expect(vistos).toEqual(['3/null', '3/5', 'null/5', 'null/null'])
  })

  it('cambiar de herramienta cancela lo que estuviera a medias', () => {
    const h = crearCanalHerramientaPlano()
    const c = crearCanalEdicionPlano()
    enlazarEdicion(h, c)
    h.elegirHerramienta('mover')
    c.coger(2)
    h.elegirHerramienta('demoler')
    expect(c.cogido).toBeNull()
    c.pedirQuitar(2)
    h.elegirHerramienta('mover')
    expect(c.pendiente).toBeNull()
    c.coger(2)
    h.reiniciar() // Esc
    expect(c.cogido).toBeNull()
  })

  it('fijarRotacion del canal de colocación avisa solo si cambia', () => {
    const c = crearCanalColocacion()
    let n = 0
    c.suscribir(() => n++)
    c.fijarRotacion(2)
    c.fijarRotacion(2)
    expect(c.rotacion).toBe(2)
    expect(n).toBe(1)
  })
})
