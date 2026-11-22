import { useEffect, useState } from 'preact/hooks'
import type { FuenteEstado } from '../fuente'
import { t } from '../textos'
import { vistaEnergia, vistasEnergiaIguales, type VistaEnergia } from './energia'

/** Barra de energía (en la columna de `Estado`). Solo re-renderiza cuando cambia la energía mostrada. */
export function BarraEnergia({ almacen }: { readonly almacen: FuenteEstado }) {
  const [vista, setVista] = useState<VistaEnergia>(() => vistaEnergia(almacen.estado))

  useEffect(() => {
    const actualizar = () => {
      const nueva = vistaEnergia(almacen.estado)
      setVista((previa) => (vistasEnergiaIguales(previa, nueva) ? previa : nueva))
    }
    actualizar()
    return almacen.suscribir(actualizar)
  }, [almacen])

  const color = vista.baja ? 'var(--ui-alerta)' : 'var(--ui-acento)'
  return (
    <div
      role="meter"
      aria-label={t('energia.etiqueta')}
      aria-valuemin={0}
      aria-valuemax={vista.maximo}
      aria-valuenow={vista.actual}
      style={{
        padding: '10px 14px',
        minWidth: '170px',
        borderRadius: '10px',
        border: '1px solid var(--ui-linea)',
        background: 'color-mix(in srgb, var(--ui-panel) 80%, transparent)',
        backdropFilter: 'blur(4px)',
        color: 'var(--ui-texto)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        fontSize: '13px',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span>{t('energia.nombre')}</span>
        <span style={{ color }}>
          {t('energia.valor', { actual: vista.actual, maximo: vista.maximo })}
        </span>
      </div>
      <div
        style={{
          height: '8px',
          borderRadius: '4px',
          background: 'var(--ui-linea)',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${vista.fraccion * 100}%`, height: '100%', background: color }} />
      </div>
    </div>
  )
}
