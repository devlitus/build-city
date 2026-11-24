import { useEffect, useState } from 'preact/hooks'
import type { FuenteEstado } from '../fuente'
import { t } from '../textos'
import { vistaReloj, vistasIguales, type VistaReloj } from './formato'

/**
 * Panel del reloj (arriba a la izquierda). Se suscribe al almacén, pero solo cambia su estado
 * (y por tanto re-renderiza) cuando cambia algún texto mostrado, p. ej. un minuto de juego.
 * Los colores son variables CSS `--ui-*` que `montar.tsx` genera desde `data/paleta.json`.
 */
/** Alto reservado arriba a la izquierda por el reloj (hora, fecha, velocidad), en px. */
export const ALTO_RELOJ = 96

export function Reloj({ almacen }: { readonly almacen: FuenteEstado }) {
  const [vista, setVista] = useState<VistaReloj>(() => vistaReloj(almacen.estado))

  useEffect(() => {
    const actualizar = () => {
      const nueva = vistaReloj(almacen.estado)
      setVista((previa) => (vistasIguales(previa, nueva) ? previa : nueva))
    }
    actualizar()
    return almacen.suscribir(actualizar)
  }, [almacen])

  return (
    <div
      role="timer"
      aria-label={t('reloj.etiqueta')}
      style={{
        position: 'fixed',
        top: '14px',
        left: '14px',
        padding: '10px 14px',
        minWidth: '150px',
        borderRadius: '10px',
        border: '1px solid color-mix(in srgb, var(--ui-linea) 100%, transparent)',
        background: 'color-mix(in srgb, var(--ui-panel) 80%, transparent)',
        backdropFilter: 'blur(4px)',
        color: 'var(--ui-texto)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          fontFamily: '"JetBrains Mono", ui-monospace, Consolas, monospace',
          fontWeight: 500,
          fontSize: '26px',
          lineHeight: 1.1,
          color: 'var(--ui-acento)',
        }}
      >
        {vista.hora}
      </div>
      <div style={{ fontSize: '13px', marginTop: '4px' }}>{vista.fecha}</div>
      <div
        style={{
          fontSize: '12px',
          marginTop: '4px',
          color: vista.detenido ? 'var(--ui-acento)' : 'var(--ui-apagado)',
        }}
      >
        {vista.velocidad}
      </div>
    </div>
  )
}
