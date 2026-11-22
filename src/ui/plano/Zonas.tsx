import { useEffect, useState } from 'preact/hooks'
import { ZONAS } from '../../core'
import type { CanalHerramientaPlano, ZonaElegida } from '../../juego/herramienta-plano'
import { CLAVE_PALETA_ZONA } from '../../world/plano/datos-zonas'
import { colorHex, paletaJuego } from '../../world/paleta'
import type { FuenteEstado } from '../fuente'
import { t } from '../textos'
import { ALTO_CATALOGO } from './Catalogo'

const OPCIONES: readonly ZonaElegida[] = [...ZONAS, 'borrar']

const estiloBoton = (activo: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 10px',
  borderRadius: '6px',
  border: `1px solid ${activo ? 'var(--ui-acento)' : 'var(--ui-linea)'}`,
  background: activo ? 'color-mix(in srgb, var(--ui-acento) 25%, transparent)' : 'transparent',
  color: 'var(--ui-texto)',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left' as const,
})

/**
 * Selector de la herramienta Zonas del Modo Plano (también con la tecla Z): Cultivo, Huerto,
 * Vivienda, Almacén y Borrar. Solo escribe en el canal de la herramienta; pintar lo hace la escena.
 */
export function Zonas({
  almacen,
  canal,
}: {
  readonly almacen: FuenteEstado
  readonly canal: CanalHerramientaPlano
}) {
  const [, refrescar] = useState(0)
  useEffect(() => {
    const bajaCanal = canal.suscribir(() => refrescar((n) => n + 1))
    const bajaAlmacen = almacen.suscribir(() => refrescar((n) => n + 1))
    return () => {
      bajaCanal()
      bajaAlmacen()
    }
  }, [almacen, canal])

  if (almacen.estado.modo !== 'plano') return null
  const activa = canal.herramienta === 'zonas'

  return (
    <div
      role="group"
      aria-label={t('zonas.etiqueta')}
      style={{
        position: 'fixed',
        top: `${14 + ALTO_CATALOGO + 10}px`,
        left: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '170px',
        padding: '10px',
        borderRadius: '10px',
        border: '1px solid var(--ui-linea)',
        background: 'color-mix(in srgb, var(--ui-panel) 90%, transparent)',
        color: 'var(--ui-texto)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        fontSize: '13px',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <button
        type="button"
        aria-pressed={activa}
        style={{ ...estiloBoton(activa), fontWeight: 600 }}
        onClick={() => canal.elegirHerramienta(activa ? 'parcelas' : 'zonas')}
      >
        {t('zonas.titulo')}
      </button>
      {activa && (
        <>
          {OPCIONES.map((zona) => (
            <button
              key={zona}
              type="button"
              aria-pressed={canal.zona === zona}
              style={estiloBoton(canal.zona === zona)}
              onClick={() => canal.elegirZona(zona)}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  border: '1px solid var(--ui-linea)',
                  background: colorHex(paletaJuego, CLAVE_PALETA_ZONA[zona]),
                }}
              />
              {t(`zonas.${zona}`)}
            </button>
          ))}
          <div style={{ color: 'var(--ui-apagado)', fontSize: '12px' }}>{t('zonas.ayuda')}</div>
        </>
      )}
    </div>
  )
}
