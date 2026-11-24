import { useEffect, useState } from 'preact/hooks'
import type { FuenteEstado } from '../fuente'
import { t } from '../textos'
import { barrasIguales, vistaBarra, type VistaRanura } from './barra'

/**
 * Barra de herramientas (abajo, en el centro). Solo dibuja: qué ranura se resalta lo decide
 * `vistaBarra` a partir de `estado.herramienta`. Colores: variables CSS `--ui-*`.
 */
export function Herramientas({ almacen }: { readonly almacen: FuenteEstado }) {
  const [vista, setVista] = useState<readonly VistaRanura[]>(() =>
    vistaBarra(almacen.estado.herramienta, undefined, almacen.estado.semillaElegida),
  )

  useEffect(() => {
    const actualizar = () => {
      const nueva = vistaBarra(almacen.estado.herramienta, undefined, almacen.estado.semillaElegida)
      setVista((previa) => (barrasIguales(previa, nueva) ? previa : nueva))
    }
    actualizar()
    return almacen.suscribir(actualizar)
  }, [almacen])

  return (
    <div
      role="toolbar"
      aria-label={t('herramientas.etiqueta')}
      style={{
        position: 'fixed',
        bottom: '14px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '6px',
        padding: '6px',
        borderRadius: '10px',
        border: '1px solid var(--ui-linea)',
        background: 'color-mix(in srgb, var(--ui-panel) 80%, transparent)',
        backdropFilter: 'blur(4px)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {vista.map((r) => (
        <div
          key={r.herramienta}
          aria-current={r.activa ? 'true' : undefined}
          style={{
            minWidth: '64px',
            padding: '6px 8px',
            textAlign: 'center',
            borderRadius: '8px',
            border: `2px solid ${r.activa ? 'var(--ui-acento)' : 'transparent'}`,
            background: r.activa
              ? 'color-mix(in srgb, var(--ui-acento) 20%, transparent)'
              : 'transparent',
            color: r.activa ? 'var(--ui-texto)' : 'var(--ui-apagado)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--ui-apagado)' }}>{r.tecla}</div>
          <div style={{ fontSize: '13px' }}>{t(`herramientas.${r.herramienta}`)}</div>
          {r.cultivo !== undefined && (
            <div style={{ fontSize: '11px', color: 'var(--ui-acento)' }}>
              {t(`cultivos.${r.cultivo}`)} (R)
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
