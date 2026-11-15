# ADR 0005 — Pipeline de arte: texturas con ComfyUI, modelos en Blender, `.glb` para el juego

- **Estado:** aceptado
- **Fecha:** 2026-11-15
- **Relacionado:** [ADR 0003 — Estilo visual](0003-estilo-visual.md) · inventario en
  [docs/arte/inventario.md](../arte/inventario.md)

## Contexto

Con el estilo PBR estilizado (ADR 0003) el juego necesita muchas texturas y modelos coherentes entre sí,
producidos por un equipo pequeño, gratis y que se puedan **regenerar** (regla heredada de Raíces: todo
recurso tiene ficha). En la prueba de estilo se probaron varios caminos; este ADR recoge los que funcionan.

## Decisión

### Texturas de material (madera, tejas, hierba, tierra, pintura…)
1. **Receta** en `borrador/workflows/texturas/recetas.json`: prompt propio + prompt base común, negativo,
   semilla, metros que cubre una repetición, fuerza del relieve y rango de rugosidad.
2. `generar_workflows.py` crea el workflow de ComfyUI de cada textura (Qwen-Image 2512 fp8 + LoRA Lightning
   de 4 pasos, 1024×1024).
3. Se genera en el ComfyUI local (gratis). Se revisa a ojo: si sale en perspectiva, con marco o con borde,
   se ajusta el prompt o la semilla.
4. `hacer_repetible.py` aplana la iluminación de la foto, la hace repetible (busca el mejor punto de corte
   y funde una franja estrecha) y deduce normales (convención OpenGL) y rugosidad.
5. Salida: `<nombre>_diff.jpg`, `<nombre>_nor_gl.jpg`, `<nombre>_rough.jpg`.

### Texturas CC0 de terceros
Solo **Poly Haven** (CC0) y solo para materiales donde el relieve escaneado importa (piedra, roca, corteza).
Se descargan a 1K y se tiñen hacia la paleta. Se anotan en el inventario con su identificador.

### Personaje y modelos con esqueleto
- **Granjero:** «Farmer» de [Grab3D](https://grab3d.com/models/characters/farmer/) (CC0), versión con
  esqueleto. `borrador/blender/preparar_granjero_grab3d.py` lo deja listo: quita objetos sueltos, lo diezma
  a ~45 000 triángulos conservando los pesos, reduce texturas (color 2048, normal y metal/rugosidad 1024),
  lo escala a 1,75 m y deja las animaciones **Reposo**, **Andar** y **Correr**. De 13,2 MB a 3,4 MB.
- **Animaciones nuevas** (golpear, regar, sentarse): se buscarán primero en bibliotecas gratuitas
  compatibles con su esqueleto de 24 huesos (Mixamo, Quaternius Universal Animation Library) y se
  reasignan en Blender.

### Edificios, props y cultivos
Modelado en **Blender** (por script o a mano) con bordes biselados y UV en metros, usando las texturas de
la receta. Exportación a `.glb`.

### Formato final para el juego
- `.glb` con **meshopt** para la geometría.
- Texturas en **KTX2** (Basis Universal); rugosidad + oclusión + metal empaquetados en una imagen.
- Las fuentes (PNG de ComfyUI, `.blend`, workflows) van en `assets-src/` con su ficha; lo que carga el
  juego va en `public/`.

## Alternativas descartadas

- **Generar el personaje con Hunyuan3D 2.1 y pintarlo por proyección** desde la hoja del concepto: forma
  buena, pero manchas, costuras y zonas que ninguna vista ve. Pintar de verdad necesita los modelos de
  pintura de Hunyuan (varios GB) y aun así no trae esqueleto.
- **Personaje por script con piezas sencillas en Blender:** aspecto de muñeco de trapo.
- **Generadores de pago con esqueleto y animación (Tripo, Meshy):** buena calidad, pero de pago.
- **Horneado de Cycles por línea de órdenes** para pasar color de una malla a otra: devolvía la textura en
  negro con atributos de color; si hiciera falta se usa un horneado propio por píxel.

## Consecuencias

- Todo es **gratis y local**: ComfyUI y Blender en la máquina del autor, Poly Haven y Grab3D en CC0.
- Cada textura nueva cuesta un par de intentos de generación; la receta y la semilla la hacen
  reproducible.
- Las licencias quedan anotadas en el inventario. Grab3D no indica autor ni si el modelo está hecho con IA;
  conviene confirmarlo antes de publicar.
- El granjero **no es el del concepto** (`concept/06-granjero.png`): es un adulto con barba, camisa de
  cuadros y pañuelo. El concepto se actualizará a este modelo.
