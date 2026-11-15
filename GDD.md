# GDD — Borrador del juego de granja 3D

> **Título provisional:** *Raíces 3D* (hermano en 3D de [build-frame / Raíces](../build-frame/GDD.md))
> **Versión:** 0.3 · 2026-11-15 (estilo visual y pipeline de arte decididos, ver §9 y ADR 0003/0005) · **Estado:** borrador antes de escribir código
> **Material visual:** [borrador/](borrador/) — arte conceptual (ComfyUI) y bocetos 3D (Blender)

---

## 1. Resumen

| | |
|---|---|
| **Género** | Simulación de granja + construcción, mundo abierto, *cozy* |
| **Plataforma** | Solo web: navegador de escritorio con teclado y ratón. Móvil fuera del alcance por ahora |
| **Motor** | three.js + TypeScript + Vite |
| **Perspectiva** | 3D: tercera persona (Modo Vida) y cámara cenital orbital (Modo Plano) |
| **Estilo** | **PBR estilizado** con texturas propias (ComfyUI), paleta cálida (salvia, ocre, terracota, crema) como tinte y gradación de color ([ADR 0003](docs/adr/0003-estilo-visual.md)) |
| **Modo** | Un jugador; online por fases (igual que Raíces) |

**Pitch:** llegas a un valle vacío con una mochila, una tienda de campaña y tus ahorros. Talas, recoges piedra, compras tu primera parcela y, temporada a temporada, conviertes un prado salvaje en la granja que se ve desde lo alto de la colina.

**Qué cambia respecto a Raíces (2D):** el *mismo* diseño de fondo (parcelas, zonas, recursos, obras, bienestar), pero vivido en un mundo 3D que se recorre a pie, donde la granja se ve crecer desde cualquier ángulo y la construcción es tangible (andamios, piezas que suben, humo de la chimenea).

---

## 2. Pilares (heredados de Raíces, con su lectura 3D)

1. **Tu granja, tu plano.** Colocación libre sobre cuadrícula; ninguna distribución es la correcta.
2. **Progreso visible.** En 3D se ve desde lejos: al volver del pueblo, la silueta de tu granja ha cambiado.
3. **De las manos a la gestión.** Empiezas con hacha y azada; acabas con aspersores, ayudantes y molinos.
4. **Calma, no estrés.** Sin combate ni game over. Lo peor que pasa es que un cultivo se detiene.
5. **Pequeñas sorpresas.** Ruinas por explorar, vecinos, clima, eventos de estación.
6. **(Nuevo) Paseo con recompensa.** El mundo abierto tiene que pagar el paseo: miradores, ruinas, recursos raros y atajos que se desbloquean.

---

## 3. Referencias de juegos publicados

| Juego | Qué tomamos | Qué evitamos |
|---|---|---|
| **Raíces / build-frame** (propio) | Todo el diseño de sistemas y el núcleo por comandos | La limitación 2D |
| **My Time at Portia / Sandrock** | Taller y cadenas de procesado en 3D; encargos del pueblo como motor del progreso | Cargas de tiempo largas con menús |
| **Lightyear Frontier** | Colocación libre y cómoda de edificios; la granja "bonita" sale sola con piezas prefabricadas; lista clara de materiales por edificio | El riego manual repetitivo (las reseñas lo señalan como tedioso) → aspersores pronto |
| **The Ranchers** | Mundo abierto rural con cultivos y ganado a escala | Escala excesiva que vacía el mapa |
| **Farming Simulator 25** | Sensación de explotación grande al final del juego | Realismo y maquinaria compleja |
| **Dragon Quest Builders 2** | Construir y que el mundo reaccione (vecinos que usan lo que construyes) | Construcción por bloques sueltos |
| **Valheim** | Construcción con integridad visual, sensación de "mi base" en un mundo grande | Supervivencia y combate |
| **Stardew Valley** | Bucle de día y estaciones, calidad de cultivos, amistad | — |
| **Tiny Glade / Townscaper** | Construir debe dar placer por sí mismo: piezas que se adaptan solas | — |

---

## 4. El mundo abierto

### 4.1 Geografía (ver `borrador/blender/valle.png`)
- **Valle central** de **8×8 parcelas de 20×20 m** (160×160 m). Una casilla de cuadrícula = **1 m**.
- Rodeado de **colinas con bosque** (fuera de las parcelas, zona de recolección libre) y **montañas** como límite natural.
- **Río** que cruza el valle: arcilla, riego barato, pesca (post-MVP).
- **Pueblo** al sur: mercado, carpintero, panadería, campanario. Se llega andando en ~1 minuto.
- **Ruinas** de la antigua granja repartidas por el valle y las colinas.
- **Miradores** en las colinas: desde ahí se ve la granja entera (pilar 2) y suben el bienestar.

### 4.2 Tamaño y ritmo
- Cruzar el valle a pie: ~60–90 s. Con camino de grava: un 30 % más rápido. Más adelante: carro o caballo.
- El mapa es **finito y hecho a mano** (con generación procedural del relleno: árboles, rocas, hierba), no infinito. Mejor un valle pequeño y denso que uno grande y vacío.

### 4.3 Terreno
- *Heightmap* suave con pendientes. Para construir, las casillas deben estar **niveladas**: la azada/pala puede **aplanar** casillas (terraformado ligero, coste de energía).
- Tipos de parcela (heredados): **prado** (fértil, fibra), **bosque** (madera), **rocosa** (piedra, barata), **con río** (arcilla, agua).

---

## 5. Cámara y control: dos modos

| Modo | Cámara | Teclado y ratón |
|---|---|---|
| **Modo Vida** (por defecto) | **Tercera persona libre**, por detrás del hombro, orbitable (decidido) | WASD para andar, Mayús para correr, ratón para orbitar; clic = usar herramienta; 1–9 herramientas; E interactuar |
| **Modo Plano** (tecla Tab) | Sube a vista cenital isométrica, orbital con zoom | Clic para colocar, R para rotar 90°, rueda = zoom, botón central = orbitar, arrastrar para dibujar vallas y caminos |

- Solo escritorio: no hay controles táctiles en el MVP (decidido). Se puede reevaluar más adelante.
- Sin montura en el MVP: se anda a pie y los caminos de grava aceleran. Un **carro** llega en una fase posterior (decidido).

- **Transición animada** entre cámaras (la cámara sube de la espalda del granjero al cielo): es el "momento mágico" del juego.
- En Modo Plano el tiempo se pausa (opcional), el mundo se desatura y aparece la cuadrícula (ver `concept/04-modo-plano.png`).

---

## 6. Bucles de juego

```
Minuto     moverse → golpear/plantar/regar → partícula + sonido + objeto a la mochila
Día        despertar → revisar granja → trabajar (energía) → pueblo (vender/comprar) → planificar → dormir (guardado)
Estación   elegir cultivos → ampliar parcelas/zonas → evento de estación → desbloqueos
Largo      comprar el valle → automatizar → proyectos del pueblo → colección → decorar
```

**Arco de progresión** (ver `borrador/blender/progresion.png`):

| Etapa | Tiempo de juego | Lo que tienes | Lo que haces |
|---|---|---|---|
| **Día 1 — Campamento** | 0 | Tienda, hoguera, hacha y azada viejas, 1.100 monedas | Talar, recoger piedra, comprar la 1ª parcela, primer bancal |
| **Mes 1 — Asentamiento** | ~1 estación | Cobertizo, caja de envío, 1–2 bancales, valla | Vender en el pueblo, comprar 2ª parcela, primeras zonas |
| **Año 1 — Granja** | ~4 estaciones | Casa, granero, aserradero, gallinero, camino | Procesar materiales, animales, encargos del pueblo |
| **Año 2+ — Explotación** | — | Molino, silo, invernadero, aspersores, ayudantes | Gestionar en Modo Plano, decorar, proyectos grandes |

---

## 7. Sistemas

> Los sistemas de Raíces (GDD §6) se mantienen casi sin cambios. Aquí solo se detalla lo que el 3D añade o cambia.

### 7.1 Tiempo y clima
- Reloj 06:00–02:00, 4 estaciones × 21 días, x1/x2/x3, pausa.
- **3D añade:** sol que cruza el cielo con sombras dinámicas, niebla de mañana, lluvia con partículas, nieve que se acumula en tejados (ver `concept/08-estaciones.png`), farolas y ventanas que se encienden de noche.

### 7.2 Parcelas
- Compra con regla de adyacencia, precio por atributos y subida progresiva (igual que Raíces).
- **3D añade:** mojones y cartel "Se vende" físicos en cada parcela; al comprarla, una animación de valla/mojones aparece en el borde.

### 7.3 Zonas
- Pintar zonas (Cultivo, Huerto, Vivienda, Almacén, Ganado, Taller, Ocio) gratis en Modo Plano.
- Se ven como una capa translúcida de color sobre el terreno solo en Modo Plano.

### 7.4 Construcción (el núcleo del juego)
Dos capas de construcción:

**a) Edificios prefabricados con niveles** (lo principal, como Raíces)
- Se colocan sobre la cuadrícula de 1 m, rotación en pasos de 90°, en zona compatible y terreno nivelado.
- **Fantasma** azul (válido) / rojo (inválido) con la huella en el suelo y la lista de materiales que faltan.
- **Obra visible:** cimientos → estructura con andamios → paredes → tejado. El carpintero trabaja de día; si ayudas (gastando energía), avanza más rápido.
- **Mejora por niveles** en el mismo sitio (ver `concept/05-edificios-niveles.png`): cobertizo de lona → cobertizo → granero → granero grande con silo.
- Mover (gratis) y demoler (reembolso parcial).

**b) Vallas y caminos libres** (en el MVP, decidido)
- **Vallas** que se dibujan arrastrando y se adaptan solas (esquinas, puertas) y **caminos** que se pintan sobre la cuadrícula.
- Post-MVP: setos, farolas, bancos, macetas y otras piezas de decoración.
- Inspiración Tiny Glade/Townscaper: la pieza se ajusta sola al vecino.

**Escala de referencia** (ver `borrador/blender/escala.png`, cuadrícula de 1 m, granjero de 1,75 m):

| Edificio | Huella | Altura aprox. |
|---|---|---|
| Tienda de campaña | 3×3 | 1,8 m |
| Cobertizo | 4×3 | 3,5 m |
| Casa (nivel 1) | 7×5 | 5 m |
| Granero | 8×6 | 8 m |
| Silo | 3×3 | 8 m |

### 7.5 Recursos
Igual que Raíces (madera, piedra, fibra, arcilla → tablones, ladrillos, cuerda → metal, cristal, piezas → planos).

**3D añade:**
- Los recursos **existen en el mundo**: árboles que caen, tocones que quedan, rocas que se rompen en trozos, troncos que se apilan en la leñera.
- **El almacén se ve**: la leñera muestra más troncos cuanto más madera tienes (pilar 2).
- **Carretilla** (mejora temprana): permite cargar más antes de volver a casa.

### 7.6 Cultivos
- Mismo ciclo y datos que Raíces (`data/cultivos.json` reutilizable).
- **3D:** cada fase es un modelo distinto, dibujado con `InstancedMesh` (miles de plantas sin coste). Las plantas se mecen con el viento (shader de vértices).
- **Lección de Lightyear Frontier:** el riego manual cansa. Regadera mejorada (3×3) a la semana 1 y **aspersores** en la 2ª estación.

### 7.7 Animales (post-MVP)
Gallinas, vacas, ovejas, cerdos y abejas, con IA sencilla de deambular dentro del corral y volver al establo de noche.

### 7.8 Personaje
- Energía y **bienestar** (mecánica distintiva de Raíces).
- **3D añade:** el bienestar sube al sentarse en un banco con vistas, al visitar un mirador o al ver el atardecer.
- Modelo: «Farmer» de Grab3D (CC0), adulto con sombrero de paja, peto vaquero, camisa de cuadros y pañuelo (ver ADR 0003 y `borrador/prueba-estilo/modelos/granjero.glb`). Sustituye al concepto `concept/06-granjero.png`.
- Personalización básica (piel, pelo, sombrero, ropa): pendiente; con un modelo cerrado hay que estudiar cómo hacerla (cambiar texturas o piezas).

### 7.9 Economía, pueblo y vecinos
Igual que Raíces: mercado con precios dinámicos suaves, caja de envío, procesado, 8–12 vecinos, **proyectos del pueblo** (reparar el puente, reabrir la panadería, la feria). En 3D los proyectos **cambian el pueblo físicamente** (el puente roto del día 1 se repara; ver `concept/01-dia-uno.png`).

### 7.10 Exploración (nuevo por el mundo abierto)
- **Ruinas:** materiales escasos + fragmentos de historia (cartas, fotos).
- **Miradores:** bienestar + punto de guardado del "álbum" de la granja (foto automática que muestra el progreso).
- **Recursos raros fuera del valle:** setas, miel silvestre, cristal de río, semillas silvestres.
- **Atajos:** puentes y caminos que se desbloquean con proyectos.

---

## 8. Interfaz (HUD)

- **Arriba izquierda:** hora, día, estación, clima.
- **Arriba derecha:** monedas, energía y bienestar.
- **Abajo centro:** barra de herramientas (1–9) con la herramienta activa resaltada.
- **Contextual:** al mirar un objeto aparece un aviso flotante ("E — Talar", "Cosechar zanahoria").
- **Modo Plano:** panel lateral con el catálogo de edificios por categoría, coste y materiales; barra inferior con Mover / Rotar / Demoler / Pintar zona.
- Diseñado para escritorio: atajos de teclado visibles en cada botón. La UI es DOM (Preact) sobre el canvas de three.js.

---

## 9. Arte y pipeline

### 9.1 Estilo
> Decidido con la prueba de estilo de M0 ([`borrador/prueba-estilo/`](borrador/prueba-estilo/), estilo 4). Detalle en [ADR 0003](docs/adr/0003-estilo-visual.md).

- **PBR estilizado:** materiales físicos (color, normales, rugosidad), proporciones algo exageradas y bordes biselados; nada de aristas de caja perfectas.
- **Texturas propias** generadas con ComfyUI con una receta común (mismo prompt base y paleta, semilla fija por textura). **Poly Haven** (CC0) solo para piedra, roca y corteza, teñidas hacia la paleta.
- **Paleta en datos** (`data/`), usada como **tinte de materiales y gradación de color** (cielo, niebla, luz), no como atlas de un solo material.
- **Iluminación:** cielo físico que también ilumina la escena, sol con sombras suaves en cascada, mapeo de tonos ACES, niebla suave y oclusión ambiental (GTAO) como opción de calidad.
- **Vegetación con volumen:** hierba densa instanciada, copas con tarjetas de hojas y cultivos en tarjetas, todo con viento por *shader*.
- **Coste:** más caro que el *low-poly*; densidad de hierba, oclusión ambiental y resolución de sombras son opciones de calidad (M8).

### 9.2 Pipeline
> Detalle en [ADR 0005](docs/adr/0005-pipeline-arte.md). Lista de lo que falta: [docs/arte/inventario.md](docs/arte/inventario.md).

| Recurso | Herramienta | Salida |
|---|---|---|
| Arte conceptual, *moodboard* | ComfyUI (Qwen-Image 2512, el mismo workflow que Raíces) | PNG + ficha con prompt y semilla |
| **Texturas de material** | ComfyUI con la receta `borrador/workflows/texturas/recetas.json` → `hacer_repetible.py` (repetible + normales + rugosidad) | `_diff`, `_nor_gl`, `_rough` → KTX2 |
| Texturas con relieve escaneado | Poly Haven (CC0), 1K, teñidas | Igual que arriba |
| Edificios, props, cultivos | **Blender** (por script o a mano), bordes biselados y UV en metros | `.glb` con meshopt |
| **Personaje** | «Farmer» de Grab3D (CC0) preparado con `borrador/blender/preparar_granjero_grab3d.py` | `.glb` con Reposo, Andar y Correr |
| Animaciones nuevas (golpear, regar, sentarse) | Bibliotecas gratuitas compatibles con su esqueleto + Blender | Dentro del `.glb` del personaje |
| Terreno | Heightmap generado + mezcla de texturas por tipo de suelo | En tiempo de ejecución |
| Iconos de UI | ComfyUI | PNG/WebP |

**Probado y descartado para el personaje:** modelarlo por piezas en Blender (aspecto de muñeco) y generarlo con Hunyuan3D 2.1 desde el concepto pintándolo por proyección (manchas y zonas sin pintar). Ver ADR 0005.

**Regla (heredada):** todo recurso tiene una ficha (prompt, semilla, identificador de Poly Haven, modelo o `.blend`) para poder regenerarlo. Los workflows usados están en `borrador/workflows/`.

---

## 10. Técnica (propuesta)

| Capa | Elección | Por qué |
|---|---|---|
| Render | **three.js** (WebGL2; WebGPU cuando sea estable en móvil) | Lo pedido; enorme ecosistema |
| Lenguaje / build | TypeScript + Vite | Igual que Raíces |
| UI | Preact sobre el canvas | Reutilizar componentes de Raíces |
| **Lógica** | **Copia de `src/core` de Raíces** (puro, determinista, por comandos) en este proyecto, con sus tests | Parte de algo probado y evoluciona libre; las casillas 2D pasan a ser la cuadrícula de 1 m del suelo 3D |
| Física / colisión | Colisiones propias simples (cápsula contra cajas) o Rapier si hace falta | El juego no necesita física compleja |
| Mundo | Chunks de 20×20 m (= parcela), LOD de árboles, `InstancedMesh` para vegetación y cultivos | 60 fps en un PC medio con gráfica integrada reciente |
| Sombras | Cascaded Shadow Maps (`three/addons/csm`) solo cerca de la cámara | Coste controlado |
| Guardado | IndexedDB (ADR 0001 de Raíces) | Reutilizar |
| Tests | Vitest, solo tests unitarios de lógica (sin e2e por ahora) | Decidido el 2026-11-15, ver PROCESO §7 |

**Decidido:** proyecto nuevo e independiente (`build-city`) que **copia** el núcleo de Raíces en lugar de compartirlo. Los dos juegos pueden evolucionar por separado; si más adelante conviene, se puede extraer un paquete común.

---

## 11. MVP 3D (alcance propuesto)

1. Valle 3D (terreno, río, árboles, rocas) recorrible en tercera persona.
2. Ciclo día/noche y tiempo de Raíces.
3. Talar y picar → madera y piedra visibles en el inventario.
4. Comprar parcelas con mojones físicos.
5. Modo Plano: pintar zonas y colocar 3 edificios (cobertizo, caja de envío, casa) con fantasma y obra visible.
6. Modo Plano: dibujar vallas y caminos arrastrando.
7. Arar, plantar, regar y cosechar 5 cultivos de primavera.
8. Vender en la caja de envío y dormir para guardar.

**Fuera del MVP:** animales, vecinos con amistad, procesado, decoración libre (setos, farolas, bancos), estaciones completas, clima avanzado, carro, controles táctiles, online.

---

## 12. Decisiones tomadas (2026-11-15)

| Pregunta | Decisión |
|---|---|
| Organización del código | Proyecto nuevo (`build-city`) con una **copia** del núcleo de Raíces |
| Plataforma | **Solo web**, navegador de escritorio con teclado y ratón |
| Cámara del Modo Vida | **Tercera persona libre**, orbitable |
| Construcción en el MVP | **Edificios prefabricados con niveles + vallas y caminos** dibujados a mano |
| Montura | **No en el MVP**; carro en una fase posterior |
| Nombre provisional | **Raíces 3D** |
| Estilo visual | **PBR estilizado con texturas propias de ComfyUI** (ADR 0003) |
| Personaje | **«Farmer» de Grab3D (CC0)**, preparado en Blender (ADR 0005) |

### Preguntas que siguen abiertas
- Nombre definitivo del valle (Raíces usa «Valle Sereno» de forma provisional).
- ¿Hay una meta final (valoración a los 3 años) o el juego es infinito? (heredada de Raíces)
