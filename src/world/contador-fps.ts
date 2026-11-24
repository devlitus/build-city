/** Contador de fps para desarrollo. Solo se carga con `import.meta.env.DEV`. */
export function crearContadorFps(
  contenedor: HTMLElement,
  info?: { readonly render: { readonly calls: number; readonly triangles: number } },
): () => void {
  const el = document.createElement('div')
  el.style.cssText =
    'position:absolute;bottom:8px;right:8px;padding:2px 8px;font:12px monospace;' +
    'color:#fff;background:rgba(0,0,0,.55);border-radius:4px;pointer-events:none;z-index:10'
  el.textContent = '-- fps'
  contenedor.append(el)

  let cuadros = 0
  let inicio = performance.now()
  return () => {
    cuadros++
    const ahora = performance.now()
    if (ahora - inicio >= 500) {
      const fps = `${Math.round((cuadros * 1000) / (ahora - inicio))} fps`
      el.textContent = info
        ? `${fps} · ${info.render.calls} llamadas · ${info.render.triangles} tris`
        : fps
      cuadros = 0
      inicio = ahora
    }
  }
}
