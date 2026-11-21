import { useEffect, useState } from 'preact/hooks'
import type { FuenteEstado } from '../fuente'
import { t } from '../textos'
import { formatearMonedas } from './formato'

/**
 * Monedas del jugador (arriba a la derecha). Se re-renderiza al cambiar el estado y lee
 * `estado.dinero` directamente en cada render: no guarda copia que pueda desincronizarse.
 */
export function Estado({ almacen }: { readonly almacen: FuenteEstado }) {
  const [, forzar] = useState(0)

  useEffect(() => {
    let previo = almacen.estado.dinero
    return almacen.suscribir(() => {
      const actual = almacen.estado.dinero
      if (actual !== previo) {
        previo = actual
        forzar((n) => n + 1)
      }
    })
  }, [almacen])

  return (
    <div
      role="status"
      aria-label={t('estado.monedas')}
      style={{
        position: 'fixed',
        top: '14px',
        right: '14px',
        padding: '10px 14px',
        minWidth: '110px',
        textAlign: 'right',
        borderRadius: '10px',
        border: '1px solid color-mix(in srgb, var(--ui-linea) 100%, transparent)',
        background: 'color-mix(in srgb, var(--ui-panel) 80%, transparent)',
        backdropFilter: 'blur(4px)',
        color: 'var(--ui-texto)',
        fontFamily: '"JetBrains Mono", ui-monospace, Consolas, monospace',
        fontWeight: 500,
        fontSize: '22px',
        lineHeight: 1.1,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span style={{ color: 'var(--ui-acento)' }}>{formatearMonedas(almacen.estado.dinero)}</span>
    </div>
  )
}
