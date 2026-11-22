import { useEffect, useState } from 'preact/hooks'
import type { CanalEdificioElegido } from '../../juego/edificio-elegido'
import type { FuenteDespacho } from '../fuente'
import { formatearMonedas } from '../hud/formato'
import { t } from '../textos'
import { datosPanelCatalogo } from './panel-catalogo'

/**
 * Catálogo de edificios del Modo Plano, a la izquierda. De momento el clic solo marca el
 * edificio elegido en el canal; la colocación la hace M5-T03. Esc o salir del Modo Plano lo
 * desmarcan. Lo que falta de dinero o materiales se pinta en rojo.
 */
export function Catalogo({
  almacen,
  canal,
}: {
  readonly almacen: FuenteDespacho
  readonly canal: CanalEdificioElegido
}) {
  const [elegido, setElegido] = useState(canal.actual)
  const [, refrescar] = useState(0)

  useEffect(() => canal.suscribir(setElegido), [canal])
  useEffect(
    () =>
      almacen.suscribir(() => {
        if (almacen.estado.modo !== 'plano') canal.elegir(null)
        refrescar((n) => n + 1)
      }),
    [almacen, canal],
  )

  const estado = almacen.estado
  if (estado.modo !== 'plano') return null

  return (
    <div
      role="listbox"
      aria-label={t('catalogo.etiqueta')}
      style={{
        position: 'fixed',
        top: '14px',
        left: '14px',
        width: '240px',
        padding: '10px 12px',
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
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
        {t('catalogo.titulo')}
      </div>
      {datosPanelCatalogo(estado).map((e) => (
        <button
          key={e.tipo}
          type="button"
          role="option"
          aria-selected={elegido === e.tipo}
          onClick={() => canal.elegir(elegido === e.tipo ? null : e.tipo)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            marginBottom: '6px',
            padding: '6px 8px',
            borderRadius: '6px',
            border: `1px solid ${elegido === e.tipo ? 'var(--ui-acento)' : 'var(--ui-linea)'}`,
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontWeight: 600 }}>{t(`catalogo.edificio.${e.tipo}`)}</div>
          <div style={{ color: 'var(--ui-apagado)' }}>
            {t('catalogo.huella', { ancho: e.ancho, alto: e.alto, dias: e.dias })}
          </div>
          <div>
            {e.costes.length === 0 && t('catalogo.gratis')}
            {e.costes.map((l, i) => (
              <span
                key={l.clave}
                style={{ color: l.falta > 0 ? 'var(--ui-alerta)' : 'var(--ui-texto)' }}
              >
                {i > 0 ? ' · ' : ''}
                {formatearMonedas(l.cantidad)} {t(`catalogo.${l.clave}`)}
                {l.falta > 0 && ` (${t('catalogo.falta', { n: formatearMonedas(l.falta) })})`}
              </span>
            ))}
          </div>
          {e.motivo === 'unico-ya-existe' && (
            <div style={{ color: 'var(--ui-apagado)' }}>{t('catalogo.unico')}</div>
          )}
        </button>
      ))}
    </div>
  )
}
