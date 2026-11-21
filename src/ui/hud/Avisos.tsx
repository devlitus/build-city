import { useEffect, useState } from 'preact/hooks'
import type { FuenteEstado } from '../fuente'
import { SEGUNDOS_AVISO, textoAviso } from './texto-aviso'

/**
 * Aviso simple del HUD (arriba, en el centro): muestra el último mensaje unos segundos.
 * Provisional: M3-T07 hará los mensajes definitivos.
 */
export function Avisos({ almacen }: { readonly almacen: FuenteEstado }) {
  const [texto, setTexto] = useState<string | undefined>(undefined)

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined
    const quitar = almacen.suscribir((n) => {
      const nuevo = textoAviso(n)
      if (nuevo === undefined) return
      setTexto(nuevo)
      clearTimeout(temporizador)
      temporizador = setTimeout(() => setTexto(undefined), SEGUNDOS_AVISO * 1000)
    })
    return () => {
      quitar()
      clearTimeout(temporizador)
    }
  }, [almacen])

  if (texto === undefined) return null
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: '14px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 14px',
        borderRadius: '10px',
        border: '1px solid var(--ui-linea)',
        background: 'color-mix(in srgb, var(--ui-panel) 85%, transparent)',
        color: 'var(--ui-texto)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        fontSize: '14px',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {texto}
    </div>
  )
}
