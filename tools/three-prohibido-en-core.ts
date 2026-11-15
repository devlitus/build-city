// Sustituto de `three` para tsconfig.core.json (ADR 0004). Si el núcleo importa three.js, el
// compilador resuelve aquí y falla con el error de abajo. No se importa desde ningún otro sitio.
export const prohibido: 'core/ no puede importar three.js' = 0 as never as 1
