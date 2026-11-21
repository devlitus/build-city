import { useEffect, useState } from 'preact/hooks'
import type { FuenteEstado } from '../fuente'
import { t } from '../textos'
import {
  DURACION_DESTELLO_MS,
  direccionCambio,
  formatearMonedas,
  type DireccionCambio,
} from './formato'

/** Destello breve: el color vuelve al de reposo. Colores = variables `--ui-*` de la paleta. */
const ESTILOS = `
@keyframes destello-sube { from { color: var(--ui-sube); transform: scale(1.12); } to { color: var(--ui-acento); transform: scale(1); } }
@keyframes destello-baja { from { color: var(--ui-baja); transform: scale(0.92); } to { color: var(--ui-acento); transform: scale(1); } }
`

/**
 * Monedas del jugador (arriba a la derecha). Lee `estado.dinero` directamente en cada render:
 * no guarda copia del valor, solo la dirección del último cambio para el destello.
 */
export function Estado({ almacen }: { readonly almacen: FuenteEstado }) {
  // `cambio.id` cambia en cada variación para reiniciar la animación CSS (clave del span).
  const [cambio, setCambio] = useState<{ dir: DireccionCambio; id: number }>({
    dir: 'igual',
    id: 0,
  })

  useEffect(() => {
    let previo = almacen.estado.dinero
    return almacen.suscribir(() => {
      const actual = almacen.estado.dinero
      if (actual === previo) return
      const dir = direccionCambio(previo, actual)
      previo = actual
      setCambio((c) => ({ dir, id: c.id + 1 }))
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
      <style>{ESTILOS}</style>
      <span
        key={cambio.id}
        style={{
          display: 'inline-block',
          transformOrigin: 'right center',
          color: 'var(--ui-acento)',
          animation:
            cambio.dir === 'igual'
              ? undefined
              : `destello-${cambio.dir} ${DURACION_DESTELLO_MS}ms ease-out`,
        }}
      >
        {formatearMonedas(almacen.estado.dinero)}
      </span>
    </div>
  )
}
