import { useEffect, useState } from 'preact/hooks'
import type { FuenteEstado } from '../fuente'
import { avisoContextual, textoRecogida } from './aviso-contextual'
import { SEGUNDOS_AVISO } from './texto-aviso'

const ESTILO = {
  position: 'fixed',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '6px 12px',
  borderRadius: '10px',
  border: '1px solid var(--ui-linea)',
  background: 'color-mix(in srgb, var(--ui-panel) 85%, transparent)',
  color: 'var(--ui-texto)',
  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  fontSize: '14px',
  pointerEvents: 'none',
  userSelect: 'none',
} as const

/**
 * Aviso contextual (encima de la barra de herramientas) y mensaje flotante al recoger.
 * Solo dibuja: el texto lo deciden `avisoContextual` y `textoRecogida`. El aviso se recalcula solo
 * si cambia algo de lo que depende (personaje, herramienta, obstáculos, energía, modo…).
 */
export function Aviso({ almacen }: { readonly almacen: FuenteEstado }) {
  const [aviso, setAviso] = useState<string | undefined>(() => avisoContextual(almacen.estado))
  const [recogida, setRecogida] = useState<string | undefined>(undefined)

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined
    let previo = almacen.estado
    setAviso(avisoContextual(previo))
    const quitar = almacen.suscribir((n) => {
      const e = almacen.estado
      if (
        e.personaje !== previo.personaje ||
        e.herramienta !== previo.herramienta ||
        e.obstaculos !== previo.obstaculos ||
        e.energia !== previo.energia ||
        e.modo !== previo.modo ||
        e.valle !== previo.valle
      ) {
        setAviso(avisoContextual(e))
      }
      previo = e
      const texto = textoRecogida(n)
      if (texto !== undefined) {
        setRecogida(texto)
        clearTimeout(temporizador)
        temporizador = setTimeout(() => setRecogida(undefined), SEGUNDOS_AVISO * 1000)
      }
    })
    return () => {
      quitar()
      clearTimeout(temporizador)
    }
  }, [almacen])

  return (
    <>
      {recogida !== undefined && (
        <div role="status" style={{ ...ESTILO, bottom: '120px', color: 'var(--ui-acento)' }}>
          {recogida}
        </div>
      )}
      {aviso !== undefined && (
        <div role="status" style={{ ...ESTILO, bottom: '82px' }}>
          {aviso}
        </div>
      )}
    </>
  )
}
