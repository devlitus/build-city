import * as v from 'valibot'
import { CULTIVOS } from '../../core/datos/claves'
import modelosJson from '../../../data/cultivos-modelos.json'
import { paletaJuego } from '../paleta'

const positivo = v.pipe(v.number(), v.gtValue(0))
const entero = v.pipe(v.number(), v.integer(), v.minValue(1))
const color = v.pipe(v.string(), v.minLength(1))

const esquemaHojas = v.object({
  n: entero,
  /** Radio (m) del anillo donde arranca cada hoja. */
  radio: v.pipe(v.number(), v.minValue(0)),
  alto: positivo,
  ancho: positivo,
  /** Cuánto se abre cada hoja hacia fuera, en radianes. */
  inclinacion: v.pipe(v.number(), v.minValue(0), v.maxValue(Math.PI / 2)),
  color,
})

const esquemaCuerpo = v.object({
  desde: v.picklist(['crecimiento', 'maduro']),
  forma: v.picklist(['esfera', 'cilindro']),
  radio: positivo,
  alto: positivo,
  /** Altura (m) del centro sobre el suelo. */
  y: v.number(),
  color,
})

const esquemaAdorno = v.object({
  desde: v.picklist(['crecimiento', 'maduro']),
  n: entero,
  anillo: v.pipe(v.number(), v.minValue(0)),
  y: v.number(),
  radio: positivo,
  color,
})

const esquemaCultivo = v.object({
  hojas: esquemaHojas,
  cuerpo: v.optional(esquemaCuerpo),
  adornos: v.array(esquemaAdorno),
})

const esquemaFase = v.object({ escala: positivo, hojasMax: entero })

/** Esquema de `data/cultivos-modelos.json`. Medidas en metros. */
export const esquemaModelosCultivos = v.object({
  rugosidad: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  lados: v.pipe(v.number(), v.integer(), v.minValue(3)),
  ladosEsfera: v.pipe(v.number(), v.integer(), v.minValue(4)),
  fases: v.object({ brote: esquemaFase, crecimiento: esquemaFase, maduro: esquemaFase }),
  marchito: v.object({
    hojas: esquemaHojas,
    tallo: v.object({ radio: positivo, alto: positivo, color }),
  }),
  cultivos: v.object(
    Object.fromEntries(CULTIVOS.map((c) => [c, esquemaCultivo])) as Record<
      (typeof CULTIVOS)[number],
      typeof esquemaCultivo
    >,
  ),
})

export type DatosModelosCultivos = v.InferOutput<typeof esquemaModelosCultivos>

/** Valida el JSON de modelos de cultivo; lanza si no cumple el esquema o un color no existe. */
export function cargarModelosCultivos(json: unknown): DatosModelosCultivos {
  const r = v.safeParse(esquemaModelosCultivos, json)
  if (!r.success)
    throw new Error(`Modelos de cultivo inválidos: ${r.issues.map((i) => i.message).join('; ')}`)
  const d = r.output
  const nombres = [
    d.marchito.hojas.color,
    d.marchito.tallo.color,
    ...Object.values(d.cultivos).flatMap((c) => [
      c.hojas.color,
      ...(c.cuerpo ? [c.cuerpo.color] : []),
      ...c.adornos.map((a) => a.color),
    ]),
  ]
  for (const n of nombres)
    if (!Object.hasOwn(paletaJuego, n))
      throw new Error(`Modelos de cultivo inválidos: el color "${n}" no existe en la paleta`)
  return d
}

/** Datos de los modelos de cultivo, cargados y validados al importar. */
export const DATOS_MODELOS_CULTIVOS: DatosModelosCultivos = cargarModelosCultivos(modelosJson)
