import { useEffect, useState } from 'preact/hooks'
import type { FuenteEstado } from '../fuente'
import { t } from '../textos'
import { duracionDesmayo, haHabidoDesmayo, opacidadDesmayo } from './fundido-desmayo'

/**
 * Fundido a negro al recibir el evento `desmayo`. El núcleo ya ha recolocado al granjero y
 * repuesto la energía: esta capa solo lo tapa y lo destapa (`opacidadDesmayo`).
 */
export function Desmayo({ almacen }: { readonly almacen: FuenteEstado }) {
  const [opacidad, setOpacidad] = useState(0)

  useEffect(() => {
    let cuadro = 0
    const parar = () => cancelAnimationFrame(cuadro)
    const quitar = almacen.suscribir((n) => {
      if (!haHabidoDesmayo(n)) return
      parar()
      const inicio = performance.now()
      const paso = (ahora: number) => {
        const s = (ahora - inicio) / 1000
        setOpacidad(opacidadDesmayo(s))
        if (s < duracionDesmayo()) cuadro = requestAnimationFrame(paso)
      }
      cuadro = requestAnimationFrame(paso)
    })
    return () => {
      quitar()
      parar()
    }
  }, [almacen])

  if (opacidad <= 0) return null
  return (
    <div
      role="status"
      aria-label={t('desmayo.etiqueta')}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        opacity: opacidad,
        pointerEvents: 'none',
      }}
    />
  )
}
