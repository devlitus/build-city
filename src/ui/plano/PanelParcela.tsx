import { useEffect, useState } from 'preact/hooks'
import type { CanalSeleccionParcela } from '../../juego/seleccion-parcela'
import type { FuenteDespacho } from '../fuente'
import { formatearMonedas } from '../hud/formato'
import { t } from '../textos'
import { datosPanelParcela } from './panel-parcela'

const monedas = (n: number) => t('parcela.monedas', { n: formatearMonedas(n) })

const estiloBoton = (activo: boolean) => ({
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid var(--ui-linea)',
  background: activo ? 'var(--ui-acento)' : 'transparent',
  color: activo ? 'var(--ui-panel)' : 'var(--ui-apagado)',
  cursor: activo ? 'pointer' : 'not-allowed',
  font: 'inherit',
})

/**
 * Panel de la parcela elegida con clic en Modo Plano. Se cierra con Esc, con el botón o al salir
 * del Modo Plano. Comprar pide confirmación dentro del panel y envía `ComprarParcela`.
 */
export function PanelParcela({
  almacen,
  canal,
}: {
  readonly almacen: FuenteDespacho
  readonly canal: CanalSeleccionParcela
}) {
  const [indice, setIndice] = useState<number | null>(canal.actual)
  const [confirmando, setConfirmando] = useState(false)
  const [, refrescar] = useState(0)

  useEffect(
    () =>
      canal.suscribir((i) => {
        setIndice(i)
        setConfirmando(false)
      }),
    [canal],
  )
  useEffect(
    () =>
      almacen.suscribir(() => {
        if (almacen.estado.modo !== 'plano') canal.seleccionar(null)
        refrescar((n) => n + 1)
      }),
    [almacen, canal],
  )
  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') canal.seleccionar(null)
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [canal])

  const estado = almacen.estado
  if (indice === null || estado.modo !== 'plano') return null
  const d = datosPanelParcela(estado, indice)
  const parcela = estado.valle.parcelas[indice]
  if (!d || !parcela) return null

  const comprar = () => {
    almacen.despachar({ tipo: 'ComprarParcela', indice })
    setConfirmando(false)
  }

  return (
    <div
      role="dialog"
      aria-label={t('parcela.etiqueta')}
      style={{
        position: 'fixed',
        top: '14px',
        right: '14px',
        width: '260px',
        padding: '12px 14px',
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
        {t('parcela.titulo', { fila: parcela.fila + 1, columna: parcela.columna + 1 })}
      </div>
      <div>
        {t('parcela.tipo')}: {t(`parcela.terreno.${d.terreno}`)}
      </div>
      <div>
        {t('parcela.fertilidad')}: {t(`parcela.nivel.${d.fertilidad}`)}
      </div>
      <div>
        {t('parcela.agua')}: {t(`parcela.fuente.${d.agua}`)}
      </div>
      {d.precio !== undefined && (
        <div style={{ marginTop: '6px', color: 'var(--ui-acento)' }}>
          {t('parcela.precio')}: {monedas(d.precio)}
        </div>
      )}
      {d.motivo !== undefined && (
        <div style={{ marginTop: '6px', color: 'var(--ui-apagado)' }}>
          {t(`parcela.motivo.${d.motivo}`, { falta: formatearMonedas(d.falta) })}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
        {!d.propia && !confirmando && (
          <button
            type="button"
            disabled={!d.comprable}
            style={estiloBoton(d.comprable)}
            onClick={() => setConfirmando(true)}
          >
            {t('parcela.comprar')}
          </button>
        )}
        {confirmando && d.comprable && d.precio !== undefined && (
          <>
            <span style={{ flexBasis: '100%' }}>
              {t('parcela.confirmarPregunta', { precio: monedas(d.precio) })}
            </span>
            <button type="button" style={estiloBoton(true)} onClick={comprar}>
              {t('parcela.confirmar')}
            </button>
            <button type="button" style={estiloBoton(false)} onClick={() => setConfirmando(false)}>
              {t('parcela.cancelar')}
            </button>
          </>
        )}
        <button
          type="button"
          style={{ ...estiloBoton(false), cursor: 'pointer', marginLeft: 'auto' }}
          onClick={() => canal.seleccionar(null)}
        >
          {t('parcela.cerrar')}
        </button>
      </div>
    </div>
  )
}
