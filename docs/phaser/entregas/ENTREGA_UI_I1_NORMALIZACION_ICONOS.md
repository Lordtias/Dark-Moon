# ENTREGA UI-I1 — Normalización de renderizado y resaltado de iconos

## 1. Estado de la etapa

- Repositorio: `/mnt/data/ui_i1/Dark-Moon`
- Rama: `main`
- Commit base / HEAD verificado: `eed8bdd9b68afac07a48134a0f0a4af8d85769a4`
- Dependencias nuevas: ninguna.
- Persistencia: sin cambios.
- Gameplay y contratos de CD1: sin cambios.

El ZIP recibido marca 186 archivos como modificados por diferencias CRLF/LF. Antes de implementar se comparó cada archivo contra `HEAD` normalizando finales de línea y se confirmó que había **0 cambios funcionales heredados**.

## 2. Objetivo aprobado

Eliminar tratamientos de presentación que degradaban la iconografía ilustrada —principalmente `pixelated`, `crisp-edges`, `drop-shadow` sobre la imagen y halos difuminados alrededor de casillas pequeñas— sin perder información de selección, rareza, bloqueo o disponibilidad.

La etapa también auditó el pipeline Phaser para comprobar si el mismo defecto ocurría en el mundo.

## 3. Resultado sencillo

Los iconos de habilidades, objetos y creación de personaje ahora usan el suavizado normal del navegador. La selección y la rareza siguen siendo visibles, pero se expresan mediante bordes y anillos sólidos en el contenedor en lugar de difuminar o iluminar el PNG.

No se encontró en Phaser el mismo defecto confirmado del DOM: el runtime ya utiliza `antialias: true`, `pixelArt: false`, `roundPixels: false` y canvas con `image-rendering: auto`. Por eso no se modificó JavaScript/Phaser.

## 4. Cambios implementados

### 4.1 Iconografía DOM

- se eliminó `pixelated`/`crisp-edges` de la iconografía UI;
- se explicitó `image-rendering: auto` para habilidades, objetos, profesiones y vistas de detalle relevantes;
- se retiraron `drop-shadow` aplicados directamente a imágenes de objetos y a siluetas de ranuras vacías;
- se eliminó el halo difuminado de la habilidad seleccionada;
- se reemplazaron halos de rareza/selección de inventario, equipamiento, comercio y botín por bordes/anillos sólidos e interiores;
- se mantuvieron `grayscale`, `opacity` y filtros equivalentes cuando representan estados semánticos como bloqueado/no aprendido.

### 4.2 Canvas y Phaser

La auditoría confirmó:

- `src/interfaz/graficos/phaser/ConfiguracionPhaser.js`: `antialias: true`, `pixelArt: false`, `roundPixels: false`;
- `assets/estilos/phaser/phaser.css`: canvas Phaser con `image-rendering: auto`;
- no se encontraron pipelines de glow/blur o filtros Phaser aplicados globalmente a sprites;
- `setDisplaySize`, `setScale` y zoom fraccionario usan el suavizado lineal esperado para la dirección ilustrada.

Como refuerzo preventivo de consistencia, las dos reglas genéricas históricas de `canvas` en `base/style.css` también pasan de `pixelated` a `auto`. No cambia geometría, tamaño ni cámara.

## 5. Archivos modificados

- `assets/estilos/base/style.css`
- `assets/estilos/paneles/habilidades-maestrias.css`
- `assets/estilos/paneles/panel-objetos.css`
- `assets/estilos/pantallas/menu-creacion-personaje.css`
- `assets/estilos/modales/modal-comercio.css`
- `assets/estilos/modales/modal-contenedor-objetos.css`
- `assets/estilos/modales/modal-detalle-objeto.css`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

## 6. Archivos agregados

- `docs/phaser/entregas/ENTREGA_UI_I1_NORMALIZACION_ICONOS.md`

Archivos eliminados: ninguno.

## 7. Archivos auditados sin cambios

Se revisaron los 21 CSS del proyecto. Además de los siete CSS modificados, se comprobaron y no requirieron cambios:

- `assets/estilos/herramientas/balance.css`
- `assets/estilos/modales/ajustes-modales.css`
- `assets/estilos/modales/detalle-economico-objeto.css`
- `assets/estilos/modales/modal-ayuda-juego.css`
- `assets/estilos/modales/modal-curacion.css`
- `assets/estilos/modales/modal-derrota.css`
- `assets/estilos/modales/modal-detalle-entidad.css`
- `assets/estilos/modales/modal-seleccion-mazmorra.css`
- `assets/estilos/modales/nivel-expedicion.css`
- `assets/estilos/paneles/panel-personaje.css`
- `assets/estilos/paneles/panel-resumen-inventario.css`
- `assets/estilos/pantallas/interfaz-partida.css`
- `assets/estilos/pantallas/responsive.css`
- `assets/estilos/phaser/phaser.css`

## 8. Dependencias

Ninguna. No se modifica `package.json`, `package-lock.json`, Phaser ni Electron.

## 9. Compatibilidad y persistencia

- Web: sin cambios de contrato; CSS estándar.
- Electron: consume el mismo DOM/CSS/Chromium; sin cambios de integración.
- Persistencia: sin impacto.
- CD1: Dispersión, Penetración, preparación, munición, preview y daño permanecen intactos.

## 10. Validación

### 10.1 CSS completo

Preparación: parsear los 21 CSS mediante `tinycss2` y buscar errores sintácticos.

Resultado: `CSS_FILES 21`, `CSS_PARSE_ERRORS 0`.

Estado: **Correcto**.

### 10.2 Regla de iconografía

Preparación: búsqueda global bajo `assets/estilos`.

Resultado:

- `image-rendering: pixelated`: 0 apariciones;
- `image-rendering: crisp-edges`: 0 apariciones;
- `drop-shadow` asociado a selectores de imágenes de objeto/habilidad: 0 apariciones.

Quedan dos `drop-shadow` intencionales y ajenos al icono: la sombra estructural del bloque HUD y la sombra negra de las conexiones SVG del árbol de habilidades.

Estado: **Correcto**.

### 10.3 Phaser

Preparación: inspección de configuración, canvas, carga de texturas, escalado y cámara.

Resultado:

- `antialias: true`;
- `pixelArt: false`;
- `roundPixels: false`;
- canvas productivo con `image-rendering: auto`;
- no se encontraron pipelines globales de glow/blur aplicados a sprites;
- el escalado y zoom fraccionario conservan el filtrado lineal esperado para recursos ilustrados.

Estado: **Correcto; sin cambios Phaser necesarios**.

### 10.4 Web y Chromium headless

Preparación: iniciar servidor HTTP local, comprobar recursos y solicitar captura mediante Chromium headless.

Resultado HTTP:

- `index.html`: 200;
- `game.js`: 200;
- `assets/estilos/base/style.css`: 200;
- `assets/estilos/paneles/habilidades-maestrias.css`: 200;
- `assets/estilos/phaser/phaser.css`: 200.

Chromium headless no finalizó en el entorno disponible. El log registra fallos de DBus (`/run/dbus/system_bus_socket`) y el proceso agotó el tiempo de ejecución. No se declara prueba visual automatizada superada.

Estado: **HTTP Correcto / captura visual Pendiente por entorno**.

### 10.5 Regresión estática JS/JSON/imports

Aunque la etapa no modifica JavaScript ni JSON, se realizó una comprobación general de regresión:

- 286 archivos JavaScript: `node --check` correcto;
- 40 JSON: parseo correcto;
- imports relativos faltantes: 0.

Estado: **Correcto**.

### 10.6 Diff del alcance

- `git diff --check` restringido a los archivos funcionales de UI-I1: correcto;
- cambios funcionales detectados normalizando CRLF/LF: 9 archivos (8 modificados + 1 agregado);
- cambios ajenos al alcance: 0.

Estado: **Correcto**.

### 10.7 Electron

El ZIP no contiene `node_modules`. No se instalaron dependencias ni se ejecutó Electron para respetar las restricciones de la etapa. La integración no cambia: Electron consume el mismo CSS mediante Chromium.

Estado: **Pendiente de prueba manual en entorno con dependencias ya instaladas**.

### 10.8 Manual pendiente del usuario

- comparar Flecha cargada y Atacar en la barra;
- seleccionar Atacar y verificar que el anillo no difumine el PNG;
- revisar barra completa, árbol y modal de habilidades;
- revisar inventario/equipamiento con varias rarezas;
- revisar botín y comercio;
- revisar creación de personaje;
- repetir en viewport móvil;
- revisar mapa Phaser en zoom 0.9, 1.0, 1.3, 1.5 y 1.8.

## 11. Riesgos y pendientes

- La eliminación de halos cambia presentación, no significado: la rareza y selección deben validarse visualmente dentro del juego.
- El zoom fraccionario Phaser seguirá suavizando imágenes de forma normal; no se considera defecto por sí mismo.
- La validación visual manual completa sigue siendo necesaria antes de afirmar cierre visual definitivo.

## 12. Restricciones comprobadas

- sin nuevas dependencias;
- sin cambios JS de gameplay;
- sin cambios de ecuaciones;
- sin SMC nuevo;
- sin cambio de persistencia;
- sin cambio de Phaser/Electron;
- sin commit ni push;
- sin avanzar a CD2.

## 13. Conventional Commit propuesto

`fix(ui): normalizar renderizado de iconos ilustrados`

- elimina pixelado artificial y halos difuminados de iconografía UI;
- conserva selección y rareza mediante bordes y anillos sólidos;
- audita Phaser y mantiene su filtrado ilustrado existente;
- actualiza el contrato visual canónico y documenta la etapa.

## 14. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Diseño Maestro Visual de Dark Moon / enlace posterior al Plan Maestro de combate a distancia y defensas

ETAPA CERRADA:
UI-I1 — Normalización de renderizado y resaltado de iconos

ESTADO:
Cerrada con pendientes

COMMIT BASE:
eed8bdd9b68afac07a48134a0f0a4af8d85769a4

HEAD FINAL VERIFICADO:
eed8bdd9b68afac07a48134a0f0a4af8d85769a4

GIT STATUS FINAL:
El `git status --short` final muestra 193 archivos trackeados como modificados y 1 archivo no trackeado. El ruido proviene de CRLF/LF heredado del ZIP más los archivos de esta etapa. Normalizando finales de línea, UI-I1 contiene exactamente 8 archivos modificados funcionalmente y 1 archivo nuevo; no hay cambios funcionales ajenos al alcance.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_UI_I1_NORMALIZACION_ICONOS.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
- Sin cambios en el Plan Maestro de combate

OBJETIVO QUE SE COMPLETÓ:
Normalizar la presentación de iconos ilustrados para evitar pixelado y brillo difuminado artificial, conservando selección, rareza y estados semánticos mediante el contenedor.

ARQUITECTURA HEREDADA:
La iconografía UI utiliza suavizado normal; selección/rareza pertenecen al contenedor; Phaser conserva antialiasing y filtrado ilustrado sin cambios de gameplay.

ARCHIVOS CLAVE:
- assets/estilos/base/style.css: contrato base de renderizado de imágenes y canvas.
- assets/estilos/paneles/habilidades-maestrias.css: barra, tarjetas, árbol y detalle de habilidades.
- assets/estilos/paneles/panel-objetos.css: rareza de inventario/equipamiento sin halo sobre el PNG.
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md: contrato visual canónico.

DEPENDENCIAS Y VERSIONES:
Ninguna dependencia nueva. Phaser 4.2.1 y Electron 43.3.0 sin cambios.

PRUEBAS CLAVE SUPERADAS:
- 21 CSS parseados sin errores.
- 0 pixelated/crisp-edges en assets/estilos y 0 drop-shadow sobre iconos de objeto/habilidad.
- 286 JS correctos, 40 JSON válidos y 0 imports relativos faltantes.
- recursos web críticos responden HTTP 200.

PROBLEMAS O RIESGOS PENDIENTES:
- validación visual manual completa en gameplay desktop/móvil;
- Chromium headless bloqueado por DBus del entorno;
- Electron pendiente por ausencia de node_modules en el ZIP.

DECISIONES APROBADAS:
- render normal para iconografía ilustrada;
- eliminar halos/drop-shadow aplicados a iconos;
- mantener selección y rareza mediante bordes/anillos sólidos;
- mantener filtros semánticos de bloqueo/no aprendizaje;
- auditar Phaser y no modificarlo sin evidencia de defecto.

DECISIONES QUE SIGUEN ABIERTAS:
- Ninguna arquitectónica; resta validación visual manual.

SIGUIENTE ETAPA RECOMENDADA:
CD2 — Resistencias negativas y vulnerabilidades

OBJETIVO DE LA SIGUIENTE ETAPA:
Permitir defensas elementales y resistencias a efectos efectivas por debajo de cero de forma canónica, con límites, desgloses, UI y pruebas de estados/Maldiciones.

PRIMEROS ARCHIVOS A REVISAR:
- src/juego/combate/ComponentesDanio.js
- src/juego/efectos/ResistenciasEfectos.js
- src/juego/efectos/SistemaEfectosTemporales.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- fórmula base de Armadura;
- límite de vulnerabilidad física -50%;
- contratos de preparación/Dispersión/Penetración de CD1;
- contrato visual de iconografía definido en UI-I1.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Resistencias negativas resueltas por una única semántica canónica, UI y cálculo consumiendo el mismo resultado, con regresión de resistencias positivas comprobada.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
fix(ui): normalizar renderizado de iconos ilustrados

- elimina pixelado artificial y halos difuminados de iconografía UI;
- conserva selección y rareza mediante bordes y anillos sólidos;
- audita Phaser y mantiene su filtrado ilustrado existente;
- valida CSS, JS, JSON, imports y carga web;
- actualiza el contrato visual canónico y documenta la etapa.

----------------- FIN DEL ENLACE -----------------
