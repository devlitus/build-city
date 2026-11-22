import { useEffect, useState } from 'preact/hooks'
import type { CanalEdicionPlano } from '../../juego/edicion-plano'
import type { CanalHerramientaPlano } from '../../juego/herramienta-plano'
import type { FuenteDespacho } from '../fuente'
import { t } from '../textos'
import { textoDevuelve, vistaAcciones } from './panel-acciones'

const estiloBoton = (principal: boolean, desactivado = false) => ({
  flex: 1,
  padding: '6px 10px',
  borderRadius: '6px',
  border: `1px solid ${principal ? 'var(--ui-acento)' : 'var(--ui-linea)'}`,
  background: principal ? 'color-mix(in srgb, var(--ui-acento) 25%, transparent)' : 'transparent',
  color: 'var(--ui-texto)',
  cursor: desactivado ? 'not-allowed' : 'pointer',
  opacity: desactivado ? 0.5 : 1,
  font: 'inherit',
})

/**
 * Panel de la herramienta Demoler (tecla X), abajo en el centro para no tapar el reloj, el
 * catálogo, el selector de Zonas, la columna de estado ni el panel de parcela. Sin edificio
 * elegido muestra la ayuda; con uno, pide confirmación con el reembolso que calcula el núcleo
 * (`reembolso`). Una obra en curso se cancela (100 %); la casa terminada no se puede demoler.
 * Solo envía el comando al confirmar.
 */
export function Acciones({
  almacen,
  canal,
  herramienta,
}: {
  readonly almacen: FuenteDespacho
  readonly canal: CanalEdicionPlano
  readonly herramienta: CanalHerramientaPlano
}) {
  const [, refrescar] = useState(0)
  useEffect(() => {
    const bajas = [
      almacen.suscribir(() => refrescar((n) => n + 1)),
      canal.suscribir(() => refrescar((n) => n + 1)),
      herramienta.suscribir(() => refrescar((n) => n + 1)),
    ]
    return () => bajas.forEach((b) => b())
  }, [almacen, canal, herramienta])

  if (almacen.estado.modo !== 'plano' || herramienta.herramienta !== 'demoler') return null
  const vista = canal.pendiente === null ? null : vistaAcciones(almacen.estado, canal.pendiente)
  const nombre = vista ? t(vista.nombre) : ''

  const confirmar = (): void => {
    if (vista?.comando) almacen.despachar(vista.comando)
    canal.descartar()
  }

  return (
    <div
      role={vista ? 'dialog' : 'status'}
      aria-label={t('acciones.etiqueta')}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        minWidth: '260px',
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid var(--ui-linea)',
        background: 'color-mix(in srgb, var(--ui-panel) 90%, transparent)',
        color: 'var(--ui-texto)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        fontSize: '13px',
        pointerEvents: vista ? 'auto' : 'none',
        userSelect: 'none',
        textAlign: 'center',
      }}
    >
      {!vista && <div style={{ color: 'var(--ui-apagado)' }}>{t('acciones.ayuda')}</div>}
      {vista && (
        <>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
            {vista.accion === 'no-demolible'
              ? t('acciones.noDemolible', { nombre })
              : t(vista.accion === 'cancelar' ? 'acciones.cancelarObra' : 'acciones.demoler', {
                  nombre,
                })}
          </div>
          {vista.accion !== 'no-demolible' && (
            <div style={{ color: 'var(--ui-apagado)', marginBottom: '8px' }}>
              {textoDevuelve(vista.devuelve)}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              disabled={vista.comando === null}
              style={estiloBoton(true, vista.comando === null)}
              onClick={confirmar}
            >
              {t('acciones.confirmar')}
            </button>
            <button type="button" style={estiloBoton(false)} onClick={() => canal.descartar()}>
              {t('acciones.cancelar')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
