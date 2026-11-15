import { CONFIG_ECONOMIA } from './datos/economia'
import type { ConfigEconomia } from './datos/esquemas'
import type { EstadoJuego } from './estado'

const PRECIO_MINIMO = 10n
/** Con subida > 0, más compras que esto desbordan cualquier entero seguro. */
const TOPE_COMPRAS = 10_000
/** Tope de dígitos del cálculo exacto (anti-abuso con decimales absurdos): da `undefined`. */
const TOPE_DIGITOS = 100_000

/** Fracción exacta n/d con d = 10^k. */
interface Decimal {
  readonly n: bigint
  readonly d: bigint
}

/**
 * Valor decimal exacto de un número finito ≥ 0, tomando su representación decimal más corta
 * (1,4 es 14/10, no el binario 1,399999…). Así 175 × 1,4 es exactamente 245 y no 244,999….
 */
function decimalDe(x: number): Decimal {
  const [mantisa = '0', exp = '0'] = x.toExponential().split('e')
  const [ent = '0', frac = ''] = mantisa.split('.')
  const digitos = BigInt(ent + frac)
  const e10 = Number(exp) - frac.length
  return e10 >= 0
    ? { n: digitos * 10n ** BigInt(e10), d: 1n }
    : { n: digitos, d: 10n ** BigInt(-e10) }
}

/**
 * Factor de subida tras `n` compras como fracción exacta: `Π_{i<n} (1 + max(subidaMinima,
 * subida · atenuacion^i))`. Sin atenuación ni mínimo (los valores por omisión: 1 y 0) es el
 * `(1 + subida)^n` de siempre. Devuelve `undefined` si el cálculo exacto excede `TOPE_DIGITOS`.
 */
function factorSubida(
  config: Pick<ConfigEconomia, 'subidaPorCompra' | 'atenuacionSubida' | 'subidaMinima'>,
  n: number,
): Decimal | undefined {
  const s = decimalDe(config.subidaPorCompra)
  const a = decimalDe(config.atenuacionSubida ?? 1)
  const m = decimalDe(config.subidaMinima ?? 0)
  let num = 1n
  let den = 1n
  let digitos = 0
  let rn = s.n
  let rd = s.d
  // Sin atenuación la subida es constante: max(subida, mínimo) elevado a n.
  if (a.n === a.d) {
    const r = rn * m.d >= m.n * rd ? { n: rn, d: rd } : m
    if (r.d.toString().length * n > TOPE_DIGITOS) return undefined
    return { n: (r.d + r.n) ** BigInt(n), d: r.d ** BigInt(n) }
  }
  for (let i = 0; i < n; i++) {
    // Subida de este paso: rn/rd = subida · atenuacion^i; si no supera el mínimo, el resto usa el mínimo.
    if (rn * m.d <= m.n * rd) {
      const restantes = n - i
      if (m.d.toString().length * restantes > TOPE_DIGITOS) return undefined
      return { n: num * (m.d + m.n) ** BigInt(restantes), d: den * m.d ** BigInt(restantes) }
    }
    num *= rd + rn
    den *= rd
    digitos += rd.toString().length
    if (digitos > TOPE_DIGITOS) return undefined
    rn *= a.n
    rd *= a.d
  }
  return { n: num, d: den }
}

/**
 * Precio de la parcela `indice` (índice en `estado.valle.parcelas`) con las compras hechas.
 * `base × factores × Π_{i<compras} (1 + max(subidaMinima, subidaPorCompra · atenuacionSubida^i))`,
 * calculado en aritmética exacta (BigInt sobre los decimales de los datos) y redondeado a la
 * decena más cercana (mitades hacia arriba), nunca menor que 10. La subida de cada compra se
 * atenúa con las anteriores pero nunca baja del mínimo, así el precio sube en todas las compras.
 * Devuelve `undefined` si el índice no es un entero dentro del valle, si `comprasHechas` no es un
 * entero seguro ≥ 0 o si el resultado no es un entero seguro.
 * El estado de la parcela (en venta o propia) no influye: decidir si se puede comprar es
 * cosa del comando de compra.
 */
export function precioParcela(
  estado: Pick<EstadoJuego, 'valle' | 'comprasHechas'>,
  indice: number,
  config: ConfigEconomia = CONFIG_ECONOMIA,
): number | undefined {
  const parcela = Number.isInteger(indice) ? estado.valle.parcelas[indice] : undefined
  if (parcela === undefined) return undefined
  const compras = estado.comprasHechas
  if (!Number.isSafeInteger(compras) || compras < 0) return undefined
  const factores = [
    decimalDe(config.factorTerreno[parcela.terreno]),
    decimalDe(config.factorFertilidad[parcela.fertilidad]),
    decimalDe(config.factorAgua[parcela.agua]),
  ]
  // Sin subida ni mínimo el factor es 1 sea cual sea el número de compras.
  const sinSubida = config.subidaPorCompra === 0 && !config.subidaMinima
  const n = sinSubida ? 0 : compras
  if (n > TOPE_COMPRAS) return undefined
  const factor = factorSubida(config, n)
  if (factor === undefined) return undefined
  let num = BigInt(config.precioBase) * factor.n
  let den = factor.d
  for (const f of factores) {
    num *= f.n
    den *= f.d
  }
  // Redondeo a la decena con mitades hacia arriba: floor((num/den + 5) / 10) × 10.
  const decenas = (num + 5n * den) / (10n * den)
  const precio = decenas * 10n < PRECIO_MINIMO ? PRECIO_MINIMO : decenas * 10n
  return precio <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(precio) : undefined
}
