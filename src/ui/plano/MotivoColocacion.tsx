import { useEffect, useState } from 'preact/hooks'
import type { CanalColocacion } from '../../juego/colocacion'
import type { CanalEdicionPlano } from '../../juego/edicion-plano'
import type { CanalHerramientaPlano } from '../../juego/herramienta-plano'
import { t } from '../textos'
import { textoMotivo } from './texto-motivo'

/**
 * Cartel inferior del Modo Plano mientras se coloca o se mueve un edificio: la ayuda de teclas y, si el
 * fantasma está en rojo, el motivo del rechazo (el mismo veredicto del núcleo que pinta la escena).
 */
export function MotivoColocacion({
  colocacion,
  herramienta,
  edicion,
}: {
  readonly colocacion: CanalColocacion
  readonly herramienta: CanalHerramientaPlano
  readonly edicion: CanalEdicionPlano
}) {
  const [, refrescar] = useState(0)
  useEffect(() => colocacion.suscribir(() => refrescar((n) => n + 1)), [colocacion])
  useEffect(() => herramienta.suscribir(() => refrescar((n) => n + 1)), [herramienta])
  useEffect(() => edicion.suscribir(() => refrescar((n) => n + 1)), [edicion])

  const h = herramienta.herramienta
  if (h !== 'construir' && h !== 'mover') return null
  const v = colocacion.veredicto
  const invalido = v !== null && !v.valida
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 14px',
        borderRadius: '10px',
        border: '1px solid var(--ui-linea)',
        background: 'color-mix(in srgb, var(--ui-panel) 90%, transparent)',
        color: 'var(--ui-texto)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        fontSize: '13px',
        pointerEvents: 'none',
        textAlign: 'center',
      }}
    >
      {invalido && (
        <div style={{ color: 'var(--ui-alerta)', fontWeight: 600 }}>
          {textoMotivo(v.motivo, v.faltan)}
        </div>
      )}
      <div style={{ color: 'var(--ui-apagado)' }}>
        {t(
          h === 'construir'
            ? 'construir.ayuda'
            : edicion.cogido === null
              ? 'mover.ayuda'
              : 'mover.ayudaCogido',
        )}
      </div>
    </div>
  )
}
