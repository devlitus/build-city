/** Contador de fps para desarrollo. Solo se carga con `import.meta.env.DEV`. */
export function crearContadorFps(contenedor: HTMLElement): () => void {
  const el = document.createElement('div')
  el.style.cssText =
    'position:absolute;top:8px;right:8px;padding:2px 8px;font:12px monospace;' +
    'color:#fff;background:rgba(0,0,0,.55);border-radius:4px;pointer-events:none;z-index:10'
  el.textContent = '-- fps'
  contenedor.append(el)

  let cuadros = 0
  let inicio = performance.now()
  return () => {
    cuadros++
    const ahora = performance.now()
    if (ahora - inicio >= 500) {
      el.textContent = `${Math.round((cuadros * 1000) / (ahora - inicio))} fps`
      cuadros = 0
      inicio = ahora
    }
  }
}
