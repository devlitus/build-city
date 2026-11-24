import { useEffect, useState } from 'preact/hooks'
import {
  esHerramientaTrazo,
  HERRAMIENTAS_TRAZO,
  type CanalHerramientaPlano,
} from '../../juego/herramienta-plano'
import type { CanalTrazoPlano } from '../../juego/trazo-plano'
import type { FuenteEstado } from '../fuente'
import { t } from '../textos'
import { vistaTrazo } from './panel-trazo'

const estiloBoton = (activo: boolean) => ({
  padding: '6px 10px',
  borderRadius: '6px',
  border: `1px solid ${activo ? 'var(--ui-acento)' : 'var(--ui-linea)'}`,
  background: activo ? 'color-mix(in srgb, var(--ui-acento) 25%, transparent)' : 'transparent',
  color: 'var(--ui-texto)',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left' as const,
})

const estiloPanel = {
  position: 'fixed' as const,
  borderRadius: '10px',
  border: '1px solid var(--ui-linea)',
  background: 'color-mix(in srgb, var(--ui-panel) 90%, transparent)',
  color: 'var(--ui-texto)',
  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  fontSize: '13px',
  userSelect: 'none' as const,
}

/**
 * Barra de las herramientas de trazo del Modo Plano (Vallas V, Puertas P, Caminos C), abajo a la
 * izquierda, y el cartel inferior con la ayuda y, mientras se arrastra, el coste total (o el
 * reembolso al quitar con Mayús) y el motivo de las casillas en rojo. Solo escribe en el canal de
 * la herramienta; trazar lo hace la escena.
 */
export function Trazo({
  almacen,
  canal,
  trazo,
}: {
  readonly almacen: FuenteEstado
  readonly canal: CanalHerramientaPlano
  readonly trazo: CanalTrazoPlano
}) {
  const [, refrescar] = useState(0)
  useEffect(() => {
    const bajas = [
      canal.suscribir(() => refrescar((n) => n + 1)),
      almacen.suscribir(() => refrescar((n) => n + 1)),
      trazo.suscribir(() => refrescar((n) => n + 1)),
    ]
    return () => bajas.forEach((b) => b())
  }, [almacen, canal, trazo])

  if (almacen.estado.modo !== 'plano') return null
  const activa = canal.herramienta
  const vista = vistaTrazo(trazo.resumen)

  return (
    <>
      <div
        role="group"
        aria-label={t('trazo.etiqueta')}
        style={{
          ...estiloPanel,
          bottom: '24px',
          left: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          width: '170px',
          padding: '10px',
          pointerEvents: 'auto',
        }}
      >
        {HERRAMIENTAS_TRAZO.map((h) => (
          <button
            key={h}
            type="button"
            aria-pressed={activa === h}
            style={estiloBoton(activa === h)}
            onClick={() => canal.elegirHerramienta(activa === h ? 'parcelas' : h)}
          >
            {t(`trazo.${h}`)}
          </button>
        ))}
      </div>
      {esHerramientaTrazo(activa) && (
        <div
          role="status"
          aria-label={t('trazo.etiquetaCartel')}
          style={{
            ...estiloPanel,
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: '260px',
            padding: '10px 14px',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          {vista.importe === '' ? (
            <>
              <div style={{ color: 'var(--ui-apagado)' }}>{t('trazo.ayuda')}</div>
              <div style={{ color: 'var(--ui-apagado)' }}>{t('trazo.ayudaQuitar')}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{vista.importe}</div>
              <div style={{ color: 'var(--ui-apagado)' }}>{vista.casillas}</div>
              {vista.aviso !== '' && (
                <div style={{ color: vista.rojo ? 'var(--ui-alerta)' : 'var(--ui-apagado)' }}>
                  {vista.aviso}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
