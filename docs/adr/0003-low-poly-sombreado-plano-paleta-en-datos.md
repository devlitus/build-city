# 0003 — Low-poly con sombreado plano y paleta en datos

**Estado:** Aceptado
**Fecha:** 2026-11-15
**Relacionado:** [GDD §9.1](../../GDD.md#91-estilo) · [GDD §10](../../GDD.md#10-técnica-propuesta) · [ADR 0005](0005-pipeline-de-arte.md)

## Contexto
Necesitamos un estilo visual coherente, barato de producir y que rinda a 60 fps en un PC medio con gráfica integrada. El GDD define un look low-poly estilizado, proporciones «de juguete» y sin texturas fotográficas. Además, la regla del proyecto es que los colores no se escriben a mano en el código.

## Decisión
- Estilo **low-poly estilizado con sombreado plano**, contornos limpios y sin texturas fotográficas.
- **Paleta en una sola textura** (atlas de colores de 256×1 px): todos los modelos comparten un material, lo que reduce *draw calls* y mantiene la paleta coherente.
- Los colores viven en `data/` (JSON validado con esquema); el código y las herramientas de arte los leen de ahí, nunca los llevan escritos a mano.
- Iluminación: sol direccional cálido, luz de hemisferio y niebla de distancia; postproceso suave (SSAO ligero, *bloom* solo de noche).

## Alternativas descartadas
| Alternativa | Motivo del descarte |
|---|---|
| Realismo con texturas PBR | Coste de producción y de memoria muy alto; incoherente con el estilo de juguete |
| Pixel art o voxel | No encaja con el estilo definido ni con el arte conceptual del borrador |
| Una textura o material por modelo | Más *draw calls* y paleta difícil de mantener coherente |
| Colores fijados en el código | Contradice la regla de `data/` y dificulta ajustar la paleta |

## Consecuencias
- **+** Un único material facilita agrupar y usar `InstancedMesh`; buen rendimiento.
- **+** Cambiar la paleta es editar datos, sin tocar código.
- **−** Los modelos deben pintarse con UVs sobre el atlas de 256×1; limita los degradados y detalles finos.
- **−** El sombreado plano exige cuidar las normales al exportar.
- **Abierto:** el esquema concreto del JSON de la paleta y cómo se genera el atlas; lo definen las tareas de datos.
