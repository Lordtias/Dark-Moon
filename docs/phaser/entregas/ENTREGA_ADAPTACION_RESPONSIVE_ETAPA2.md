# Entrega — Etapa 2 · Adaptación responsive móvil

## Estado

- Base: `fd601a248f5313ee6f704d85963c1b9ac660977f`.
- Fecha de implementación: 19/08/2026.
- Estado: **CERRADA Y VALIDADA**.
- Etapa 1 permanece cerrada y no se modifican sus contratos funcionales.
- Commit/push: no realizados durante la entrega.

## Objetivo

Adaptar la interfaz completa de Dark Moon a teléfonos y tablets sin crear una UI paralela y sin degradar la presentación normal de PC. Desktop continúa siendo la referencia visual; responsive agrega reglas sólo cuando el viewport, la orientación o la capacidad táctil lo requieren.

## Cambios realizados

### 1. Capa responsive única y aditiva

Se agrega `assets/estilos/pantallas/responsive.css`, cargada al final de `index.html`.

La hoja concentra:

- viewport dinámico `dvh` con fallback `vh`;
- safe areas mediante `env(safe-area-inset-*)`;
- reglas de portrait;
- reglas de landscape de poca altura;
- adaptación de paneles;
- adaptación del árbol de habilidades;
- ajuste de modales;
- objetivos táctiles para `pointer: coarse`.

Los estilos desktop existentes no fueron trasladados ni reescritos.

### 2. Viewport y safe areas

`index.html` declara `viewport-fit=cover`. El juego conserva `100vh` como fallback y utiliza `100dvh` cuando está disponible. HUD, paneles y modales móviles respetan zonas seguras sin obligar al mapa Phaser a dejar de ser fullscreen.

### 3. HUD portrait

En viewport portrait de teléfono:

- las esferas laterales de Vida y Maná se ocultan;
- Vida y Maná se representan como barras horizontales compactas;
- Vida, Maná y Experiencia forman un bloque centrado arriba de las habilidades;
- las diez ranuras se muestran `5×2`;
- la navegación de Personaje/Objetos/Habilidades/Registro/Menú queda debajo;
- no existe scroll horizontal para buscar habilidades rápidas.

El cambio es exclusivamente visual: las barras compactas consumen los mismos valores canónicos que las esferas desktop y se actualizan desde `HudPartidaDom`.

### 4. HUD landscape bajo

En landscape con poca altura:

- la barra permanece `10×1`;
- se conservan las esferas de Vida y Maná en los laterales;
- la barra de Experiencia queda centrada arriba de las habilidades;
- los estados temporales ocupan su propia zona compacta;
- se preservan objetivos táctiles suficientes;
- el HUD devuelve altura al mapa en lugar de miniaturizar la información.

### 5. Paneles superpuestos

`GestorPanelesPartidaDom` expone la clase visual genérica `panel-partida-abierto` además de la captura de entrada existente.

La clase no contiene conocimiento de responsive. CSS decide que:

- en móvil el HUD se oculta mientras un panel primario está abierto;
- el panel utiliza el viewport completo disponible;
- en desktop el HUD y los tamaños de panel conservan el comportamiento actual;
- tablet mantiene una composición intermedia y Personaje no puede superar la altura de la capa disponible.

### 6. Árbol de habilidades

El árbol deja de intentar entrar en landscape bajo reduciendo indefinidamente los nodos.

- nodo mínimo visual: aproximadamente 58 px;
- árbol con scroll vertical cuando no entra;
- en landscape bajo la navegación de maestrías permanece lateral;
- cabecera y contadores se compactan sólo en poca altura;
- portrait conserva reorganización vertical.

### 7. Modales

Comercio, contenedores, curación, selección de mazmorra, detalle de objeto, detalle de entidad y habilidades reutilizan sus layouts actuales. En móvil reciben viewport dinámico, safe areas, altura útil y scroll correspondiente.

No se creó una variante móvil de cada modal.

### 8. Orden de CSS dinámico

`asegurarHojaEstilos()` inserta cualquier hoja cargada bajo demanda antes de `#estilosResponsiveDarkMoon` cuando esa capa existe. Esto evita que abrir un modal cambie accidentalmente la prioridad del cascade y garantiza que responsive continúe siendo la última capa visual.

Si la capa responsive no existe, la utilidad conserva su comportamiento previo y agrega la hoja al final del `head`.

### 9. Targets táctiles

En `pointer: coarse` con viewport pequeño se aplica un mínimo aproximado de 44×44 px a botones, campos y controles relevantes.

La condición combina capacidad táctil con tamaño/altura. Una notebook táctil de resolución desktop no adopta por ese solo motivo una composición de teléfono.

### 10. Aura/Maldición sin dependencia de hover

Los estados temporales del HUD conservan `title` y `aria-label`, pero además ahora son enfocables y exponen `data-etiqueta-efecto`. En touch, el foco/tap muestra un feedback propio con nombre y turnos.

El tooltip nativo deja de ser la única vía visual para ese dato.

### 11. Teclado virtual

Creación de personaje y comercio tienen área desplazable/`scroll-padding` preparada para que el control enfocado y sus acciones puedan mantenerse accesibles cuando el teclado virtual reduce el viewport.

## Matriz automática ejecutada

Se midió el layout con Chromium headless utilizando viewport y emulación táctil cuando correspondía.

| Viewport | Barra | Touch target navegación | Panel móvil | Resultado |
|---|---:|---:|---|---|
| 360×800 portrait | 5×2 | 44 px | fullscreen, HUD oculto | OK |
| 390×844 portrait | 5×2 | 44 px | fullscreen, HUD oculto | OK |
| 412×915 portrait | 5×2 | 44 px | fullscreen, HUD oculto | OK |
| 667×375 landscape | 10×1 | 44 px | fullscreen, HUD oculto | OK |
| 844×390 landscape | 10×1 | 44 px | fullscreen, HUD oculto | OK |
| 768×1024 tablet | 10×1 | 44 px en touch | composición intermedia | OK |
| 1366×768 desktop | 10×1 | 31 px desktop | desktop | OK |
| 1920×1080 desktop | 10×1 | 31 px desktop | desktop | OK |
| 2560×1440 desktop | 10×1 | 31 px desktop | desktop | OK |

### Regresión desktop

Se comparó la geometría normal antes/después de la capa responsive en:

- 1366×768;
- 1920×1080;
- 2560×1440.

En los tres casos coincidieron exactamente:

- geometría del HUD;
- geometría de la barra rápida;
- distribución `10×1`.

### Árbol de habilidades

- 667×375: nodo 58 px; árbol con scroll vertical.
- 844×390: nodo 58 px; árbol con scroll vertical.
- 390×844: nodo 58 px; árbol con scroll vertical sólo si el contenido lo requiere.

### Creación y modales

- creación 844×390: panel limitado al viewport y una columna desplazable;
- creación 390×844: una columna y campos táctiles de 44 px;
- comercio 844×390 y 390×844: diálogo ajustado al viewport móvil y cierre de 44 px.

## Correctivo final aprobado del HUD móvil

Durante la validación visual se ajustó la composición final del HUD:

- portrait: las esferas se sustituyen por barras compactas de Vida/Maná y el bloque Vida + Maná + Experiencia queda centrado arriba de las habilidades;
- landscape: se preservan las esferas y se centra únicamente Experiencia arriba de la barra rápida;
- desktop: no recibe este cambio de composición.

El correctivo actualiza la misma presentación de recursos; no introduce otro cálculo de Vida/Maná ni modifica combate, habilidades o persistencia.

## Otras validaciones

- `node --check` sobre los JavaScript modificados: OK;
- 40 JSON del proyecto parseados: OK;
- `ValidadorInfraestructuraEntidades.js`: OK;
- `ValidadorInteractuablesMazmorra.js`: OK;
- `ValidadorPoblacionMazmorra.js`: OK;
- `git diff --check`: OK;
- smoke HTTP de `index.html`, `responsive.css` y JS modificados: HTTP 200.

El contenedor de validación no posee `node_modules` con el binario de Electron, por lo que no se declara una ejecución real de Electron en esta entrega. No se modificó código Electron ni dependencias. La regresión Electron permanece dentro de la prueba manual final del paquete.

## Pruebas manuales recomendadas

1. PC 1366×768 o superior: confirmar que visualmente todo sigue como antes.
2. Teléfono portrait: verificar HUD 5×2 y comodidad de las cinco acciones de navegación.
3. Teléfono landscape: verificar HUD 10×1 y que el mapa conserve altura útil.
4. Abrir Personaje/Objetos/Registro/Menú/Habilidades en móvil: HUD debe desaparecer y volver al cerrar.
5. Árbol en landscape bajo: recorrer verticalmente sin nodos diminutos ni contenido cortado.
6. Inventario/Equipamiento portrait: revisar grilla, detalle y scroll.
7. Comercio, botín, curación, selección de mazmorra, detalle de objeto, detalle de entidad y Ayuda en portrait/landscape.
8. Tocar Aura/Maldición: debe poder leerse nombre y duración sin hover.
9. Abrir teclado virtual en creación y cantidad de comercio: control enfocado y acción deben seguir siendo alcanzables.
10. Probar notch/safe areas si el dispositivo las expone.
11. Repetir mouse, teclado, zoom y controles de Etapa 1 para regresión funcional.

## Cierre de la etapa

Las pruebas manuales fueron aprobadas por el usuario el **19/08/2026** después del correctivo final del HUD móvil.

Quedan cerrados los contratos responsive de esta etapa:

- desktop permanece como referencia visual y no adopta layouts móviles;
- portrait móvil usa barras compactas de Vida/Maná y Experiencia centradas arriba de la barra `5×2`;
- landscape móvil conserva las esferas laterales y centra Experiencia arriba de la barra `10×1`;
- paneles móviles aprovechan el viewport sin reservar el HUD cuando están abiertos;
- árbol de habilidades evita miniaturización y usa desplazamiento cuando falta altura;
- modales, safe areas, teclado virtual y objetivos táctiles quedan cubiertos por la capa responsive aditiva;
- información necesaria no depende exclusivamente de hover.

No quedan correcciones funcionales o visuales abiertas dentro de la Etapa 2. Cualquier modificación posterior se tratará como un nuevo ajuste o una etapa explícitamente aprobada.
