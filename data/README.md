# data/

Contenido del juego (cultivos, edificios, precios) en JSON validado con esquema (ADR 0001).
Los números de balance viven aquí, nunca en el código. El build (`validarDatos` en `vite.config.ts`) valida estos JSON contra los esquemas valibot de `src/core/datos/`.

## Origen

Copiados de **Raíces (build-frame)**, <https://github.com/devlitus/build-frame>, en el commit
`030218bb1f059fd03bac957a490b22f53256d519`, el 2026-11-15, junto con `src/core/`. Son la base de balance de Raíces 3D; los cambios posteriores se hacen aquí.

## Ficheros

- `valle.json`: tamaño del valle (parcelas y casillas) y pesos de terreno, fertilidad, agua y desvío del río; también el ancho del río, la densidad de árboles y rocas por terreno y los vados (cantidad y grosor). Se valida con valibot (ADR 0006).
- `tiempo.json`: reloj y calendario (minutos desde 00:00 de inicio y fin de jornada, días por estación, claves de estaciones, minutos reales por día a velocidad 1 y velocidades permitidas); se valida con valibot.
- `personaje.json`: velocidad (casillas/s), lado de la caja de colisión, lado del valle donde está el pueblo (aparición) y tope de ms por comando de movimiento; se valida con valibot.
- `economia.json`: ahorros iniciales (`dineroInicial`), precio base de una parcela, factores multiplicadores por terreno, fertilidad y agua, y subida porcentual del precio por cada parcela ya comprada (`subidaPorCompra`); se valida con valibot (GDD §6.2).
- `edificios.json`: lote de materiales de bienvenida (`materialesIniciales`), fracción que se reembolsa al demoler (`reembolsoDemolicion`), su redondeo (`redondeoReembolso`, hoy solo `abajo`) y catálogo `edificios` por tipo (`casa`, `caja-envio`, `cobertizo`): huella (`ancho`×`alto`), zonas compatibles, coste (dinero, madera, piedra), días de obra, `unico` y `demolible`; se valida con valibot (GDD §6.3–6.5).
- `inventario.json`: capacidad base del inventario (`capacidadBase`), ranuras que suma cada edificio terminado (`ranurasPorEdificio`; hoy solo el cobertizo), herramienta inicial, lote de regalo (`loteInicial`) y catálogo `objetos` (semilla y producto de cada cultivo, plantón) con su categoría y pila máxima; se valida con valibot (GDD §6.11 y §8). Madera y piedra no son objetos: van en `materiales`.
- `energia.json`: energía máxima (`maximo`), fracción del máximo con la que se despierta tras un desmayo (`desmayoFraccion`, se redondea hacia abajo) y coste por golpe de cada herramienta (`costes`); se valida con valibot (GDD §6.8).
- `recursos.json`: golpes que cuesta talar un árbol o picar una roca, madera y piedra que dan según el terreno de su parcela, plantones que deja un árbol talado (`plantones`) con su probabilidad (`probabilidadPlanton`, sorteada con el RNG del estado) y días que tarda un plantón en hacerse árbol (`planton.diasCrecimiento`); se valida con valibot (GDD §6.8 y §8).
- `cultivos.json`: días sin regar tras los que la tierra vuelve a hierba (`tierra`) y catálogo `cultivos`: estaciones, días por fase, necesidad de agua, rebrote, cosecha, precio base y zonas; se valida con valibot.
- `terreno.json`: altura del terreno de la escena (metros): `nivelAgua`, `alturaBase` del valle llano, ruido dentro de las parcelas (`ruidoParcela`: amplitud y longitud de onda), hundimiento del río (`cauce`: profundidad, `bordeFondo` (metros dentro del río, desde su borde, donde ya está a fondo) y `anchoOrilla` (metros de subida hacia la tierra, que queda llana pasada la orilla)) y colinas del anillo exterior (`colinas`: altura, ancho de subida desde el borde, ruido y `alturaMinima` esperada pasado el ancho de subida); se valida con valibot (`src/world/terreno/parametros.ts`).
- `pueblo.json`: pueblo provisional al sur del valle. Posiciones en metros **relativas al borde sur** (`x` al este desde el centro, `distanciaAlBorde` hacia el sur): `plaza` (centro y radio), `camino` (ancho), `explanada` (`margenPlaza` y `semiAnchoCamino` de suelo llano y `anchoMezcla` de transición suave hacia la cota `alturaBase` de `terreno.json`), `campanario` y `casas` (centro, tamaño, alto del tejado y `giro` en grados). Se valida con valibot (`src/world/pueblo-datos.ts`); la plaza debe quedar a menos de 1 minuto andando del centro (`personaje.json`) y el primer edificio a ≤ 80 m del borde.
- `horizonte.json`: anillo de montañas (`margenRadio` sobre el radio que circunscribe el valle, ancho, hundimiento de la base bajo el terreno, resolución, fracción de subida hasta la cresta, alturas mínima y de picos, `umbralNieve` como fracción de la altura de pico), niebla lineal (`cerca`, `lejos`) y nubes (cantidad, altura, radio, tamaño, velocidad en m/s); se valida con valibot (`src/world/horizonte-parametros.ts`).
