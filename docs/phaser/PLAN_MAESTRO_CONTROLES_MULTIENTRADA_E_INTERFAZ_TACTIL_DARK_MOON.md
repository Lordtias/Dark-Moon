# Plan Maestro — Controles multientrada e interfaz táctil de Dark Moon

## Estado del plan

- **Etapa 1 — Controles multientrada e inspección:** CERRADA el 19/08/2026.
- **Validación manual:** APROBADA por el usuario.
- **Etapa 2 — Adaptación responsive móvil:** CERRADA el 19/08/2026.
- **Commit/push:** no realizados durante la entrega.


## 1. Propósito

Este plan define un único contrato de acciones jugables para teclado, mouse, touch, barra de habilidades y acciones contextuales. El objetivo no es crear motores paralelos por dispositivo, sino traducir entradas diferentes a los mismos comandos y sistemas canónicos de Dark Moon.

La primera etapa implementa controles multientrada, inspección de entidades, habilidades básicas Atacar/Esperar y ayuda actualizada. La segunda etapa consolida la adaptación responsive integral de la interfaz móvil manteniendo desktop como referencia visual obligatoria.

## 2. Principios obligatorios

1. Teclado, mouse, touch, barra y modal no contienen reglas de movimiento, combate, interacción o habilidades.
2. Todas las acciones jugables convergen en `EjecutorAccionesJugador` y desde allí en los sistemas canónicos existentes.
3. El movimiento por puntero nunca conserva un destino ni crea una cola: cada entrada calcula y ejecuta un único paso.
4. El buscador de camino es una utilidad espacial compartida por IA y jugador; no duplica reglas de bloqueo.
5. La inspección no consume turno y no recalcula estadísticas: muestra estado canónico ya resuelto.
6. El modal de entidad renderiza secciones, campos, listas y acciones genéricas; no conoce clases concretas como Enemigo, NPC o Cofre.
7. Las habilidades básicas Atacar y Esperar no crean maestría, XP ni gasto de puntos. Siempre existen en grado 1/1.
8. Atacar y Esperar son opcionales en la barra y pueden asignarse, moverse o quitarse libremente de cualquier ranura.
9. La ubicación inicial sugerida de una barra nueva es `1 = Atacar` y `0 = Esperar`; no son ranuras reservadas.
10. La presentación contextual de Atacar puede cambiar de icono, pero nunca modifica la resolución canónica del ataque.
11. Interactuar continúa siendo un comando contextual, no una habilidad.
12. No se agregan dependencias nuevas.

## 3. Contrato canónico de comandos jugables

| Comando | Intención | Entradas actuales | Consumidor canónico |
|---|---|---|---|
| `MOVER` | Mover un paso o desplazar selector activo | WASD, flechas, diagonales, numérico | `EjecutorAccionesJugador` → selector activo o `Juego.moverJugador` |
| `MOVER_HACIA_CASILLA` | Avanzar un solo paso hacia una casilla distante | clic/tap sobre suelo | `BuscadorCamino.buscarSiguientePaso` → `Juego.moverJugador` |
| `ESPERAR` | Consumir el turno sin desplazarse | Espacio, Numpad 5, habilidad básica Esperar | `Juego.esperarTurno` |
| `ACTIVAR_O_CONFIRMAR_SELECCION` | Activar/confirmar combate o confirmar habilidad | F, habilidad básica Atacar, segundo clic/tap sobre selector de combate/habilidad | combate o sistema de habilidades activo |
| `ACTIVAR_ATAQUE_RESPALDO` | Forzar ataque natural de respaldo | G | contrato de ataque físico existente |
| `CANCELAR_SELECCION` | Cancelar selector activo | Escape | habilidad/interacción/combate activo |
| `SELECCIONAR_HABILIDAD_RANURA` | Usar el contenido de una ranura rápida | teclas 1–0, clic/tap en barra | habilidad normal o acción básica declarada |
| `SELECCIONAR_CASILLA` | Fijar selector sobre una coordenada | clic/tap en otra casilla durante selector | habilidad/interacción/combate activo |
| `INTERACTUAR_O_CONFIRMAR` | Iniciar o confirmar interacción | R, segundo clic/tap sobre selector de interacción | `SistemaInteraccionJugador` |
| `INSPECCIONAR_CASILLA` | Abrir detalle de una entidad visible | clic/tap sobre entidad fuera de selección | presentador genérico de detalle |
| `ACTIVAR_ATAQUE_EN_CASILLA` | Preparar ataque sobre entidad inspeccionada | botón Atacar del modal | `Juego.entrarModoCombate(x,y)` |
| `INTERACTUAR_EN_CASILLA` | Solicitar interacción con entidad inspeccionada | acción del modal | opción canónica de interacción disponible |

Los controles de cámara (`IJKL`, `H`, zoom, doble clic/tap y arrastre) son entradas visuales y no son comandos jugables ni consumen turno.

## 4. Movimiento por mouse y touch

### 4.1 Clic/tap sobre suelo

Flujo obligatorio:

`puntero → casilla lógica → MOVER_HACIA_CASILLA → buscarSiguientePaso → MOVER(dx,dy) → SistemaMovimientoJugador`

El buscador devuelve una única posición siguiente. El destino no se guarda. Si el jugador vuelve a pulsar la misma casilla, el camino se calcula de nuevo desde el estado actual del mundo.

Esto permite fijar una cámara libre sobre una habitación y acercar al personaje mediante pulsaciones repetidas sobre un mismo destino sin introducir movimiento automático.

### 4.2 Reglas espaciales

El cálculo comparte `BuscadorCamino` con la IA y consulta `SistemaEspacial` para:

- límites de mapa;
- terreno bloqueante;
- entidades bloqueantes;
- zonas que bloquean movimiento;
- restricciones diagonales.

El paso final continúa pasando por `SistemaMovimientoJugador`, que conserva la autoridad de consumo temporal, movimiento a combate, zonas, orientación y mensajes.

## 5. Selección y confirmación mediante puntero

Mientras exista selector de combate, interacción o habilidad:

- pulsar otra casilla emite `SELECCIONAR_CASILLA`;
- pulsar la casilla actualmente seleccionada confirma;
- combate/habilidad confirman mediante `ACTIVAR_O_CONFIRMAR_SELECCION`;
- interacción confirma mediante `INTERACTUAR_O_CONFIRMAR`.

No se exige doble clic ni velocidad especial para confirmar. Es una segunda pulsación semántica sobre la selección actual.

Durante un selector táctico, una pulsación corta tiene prioridad sobre el gesto de doble clic/tap de cámara. En touch, mantener y arrastrar se discrimina antes de ejecutar el tap y desplaza temporalmente la cámara sin seleccionar ni confirmar.

## 6. Inspección genérica de entidades

Fuera de un selector, una entidad visible tiene prioridad sobre el suelo:

`clic/tap entidad → INSPECCIONAR_CASILLA → crearDetalleEntidad → ModalDetalleEntidad`

La inspección no consume tiempo ni ejecuta una acción del mundo.

### 6.1 Contrato del modal

El modal recibe únicamente:

- nombre;
- descripción;
- recurso visual opcional;
- lista de secciones;
- campos por sección;
- listas por sección;
- acciones disponibles.

El modal no contiene decisiones por clase o nombre de entidad. Una entidad futura puede agregar nuevos datos desde el presentador sin cambiar la vista.

### 6.2 Datos actualmente aprovechados

**Enemigos y objetivos combatibles**

- Vida y estado físico;
- Armadura cuando exista;
- Nivel;
- Variante;
- comportamiento configurado (`activa` / `reactiva`);
- estado actual de alerta/persecución;
- auras activas;
- maldiciones activas;
- otros efectos temporales;
- acción Atacar.

**Destructibles e interactuables**

- Vida y estado físico cuando exista;
- Armadura;
- familia/categoría disponible;
- estados abiertos/cerrados o activos/inactivos cuando el contrato los exponga;
- interacción disponible en la posición actual;
- nunca probabilidades ni contenido oculto de botín.

**NPC**

- descripción;
- facción;
- rol/roles;
- acciones de interacción actualmente disponibles;
- no se inventa Vida si la entidad no posee ese atributo.

## 7. Acciones desde el detalle de entidad

### 7.1 Atacar

El botón Atacar:

1. cierra el modal;
2. emite `ACTIVAR_ATAQUE_EN_CASILLA`;
3. solicita al combate canónico entrar en modo combate sobre esa coordenada;
4. el sistema valida alcance/objetivo y preselecciona si corresponde;
5. no ejecuta el golpe;
6. el jugador confirma luego mediante F, Atacar en barra o segundo clic/tap sobre la selección.

### 7.2 Interactuar

El botón de interacción sólo aparece si el sistema canónico informa una opción actualmente disponible para esa entidad. La acción vuelve al comando compartido y no ejecuta reglas dentro del modal.

## 8. Habilidades básicas

### 8.1 Atacar

- Categoría: Básicas.
- Grado: 1/1.
- Siempre disponible.
- Sin maestría, XP, requisito o gasto de puntos.
- Acción: misma intención canónica que F.
- Puede asignarse a cualquier ranura.
- Puede moverse o quitarse.
- No es obligatorio tenerla en barra para atacar.

### 8.2 Esperar

- Categoría: Básicas.
- Grado: 1/1.
- Siempre disponible.
- Sin maestría, XP, requisito o gasto de puntos.
- Acción: mismo comando `ESPERAR` que Espacio/Numpad 5.
- Puede asignarse a cualquier ranura.
- Puede moverse o quitarse.

### 8.3 Barra inicial

Sólo cuando no existe una configuración guardada de barra se propone:

- ranura `1`: Atacar;
- ranura `0`: Esperar.

Después, la configuración persistida por el jugador es la autoridad. No se reinsertan habilidades básicas removidas ni se fuerza su posición.

## 9. Icono contextual de Atacar

El icono es exclusivamente de presentación. La lógica de combate continúa en `ConfiguracionAtaque` y el sistema de combate.

Regla:

1. consultar la configuración canónica de ataque actual;
2. si no existe arma en ranura principal → puño;
3. si la configuración canónica indica ataque dual válido → icono dual;
4. si existe familia principal conocida → icono genérico de esa familia;
5. si la familia no tiene icono configurado → puño.

Familias actuales con representación: daga, espada, hacha, mandoble, lanza, arco, bastón y varita, más dual y puño.

Una arma sólo en secundaria no cambia el icono de puño si la ranura principal está vacía, por decisión de diseño aprobada.

## 10. Cámara multientrada

Controles actuales:

- `IJKL`: cámara libre;
- `+/-`: zoom;
- rueda: zoom alrededor del puntero en cámara libre;
- `H`: recentrar y reactivar seguimiento;
- doble clic: recentrar;
- doble tap: recentrar;
- botón central/derecho + arrastre: desplazamiento de cámara con mouse;
- mantener touch y arrastrar: desplazamiento de cámara táctil, incluso durante selección, sin alterar el selector.

Fuera de selección, el primer clic/tap se discrimina durante la ventana de doble puntero antes de convertirse en acción jugable. El doble gesto cancela esa acción y recentra. Durante una selección táctica no se aplica esa espera: la pulsación selecciona o confirma inmediatamente.

## 11. Ayuda integrada

El modal de Ayuda debe documentar tanto teclado como puntero/touch:

- movimiento de un paso hacia destino;
- inspección de entidades;
- confirmación mediante segunda pulsación;
- habilidades básicas opcionales en barra;
- doble clic/tap para recentrar;
- arrastre táctil de cámara.

La documentación debe expresar intenciones y alternativas de entrada, no presentar una tecla como si fuera la regla jugable.

## 12. Persistencia y compatibilidad

- No se modifica la persistencia del jugador ni se agregan migraciones de partida.
- La barra rápida conserva su persistencia existente.
- Las habilidades básicas son catálogo runtime siempre disponible; no se guardan como grados de progresión.
- Una barra nueva recibe una propuesta inicial; una barra ya guardada se respeta.
- No se agregan dependencias ni se modifica Phaser/Electron.

## 13. Primera etapa — alcance y pruebas

**Estado: CERRADA Y APROBADA.**

La primera etapa se considera implementada cuando se validan como mínimo:

1. movimiento hacia destinos en ocho direcciones y alrededor de obstáculos;
2. exactamente un paso por pulsación, sin cola;
3. bloqueo diagonal y terreno inválido conservados;
4. click sobre entidad abre detalle y no mueve;
5. enemigos no visibles no pueden inspeccionarse;
6. segunda pulsación confirma combate, habilidad e interacción;
7. doble clic/tap recentra sin disparar movimiento/inspección;
8. arrastre táctil mueve cámara y no ejecuta acción al soltar;
9. Atacar del modal prepara y preselecciona pero no golpea;
10. datos de enemigo/destructible/NPC se presentan sin recalcular reglas;
11. Atacar/Esperar pueden asignarse, moverse y quitarse de cualquier ranura;
12. Atacar conserva F aunque no esté en barra;
13. Esperar conserva Espacio/Numpad 5 aunque no esté en barra;
14. icono de ataque responde a familia, dual y fallback puño;
15. regresión de teclado, combate, interacciones, habilidades, IA y carga de configuraciones.

### 13.1 Cierre de la Etapa 1

Las validaciones automáticas de la entrega fueron completadas antes del incremental y las pruebas funcionales manuales fueron aprobadas posteriormente por el usuario el **19/08/2026**.

Con esa aprobación quedan cerrados los contratos de esta etapa:

- movimiento por clic/tap de un único paso hacia destino;
- selección y confirmación por segunda pulsación;
- inspección genérica de entidades;
- acciones contextuales desde el detalle;
- cámara con doble clic/doble tap y arrastre táctil;
- habilidades básicas Atacar y Esperar asignables libremente;
- icono contextual de Atacar con fallback de puño;
- ayuda multientrada;
- consolidación de `BuscadorCamino` como utilidad espacial compartida.

No quedan correcciones funcionales abiertas dentro de la Etapa 1. Cualquier ajuste posterior sobre estos contratos se tratará como una nueva corrección o como parte de una etapa explícitamente aprobada.

## 14. Segunda etapa — adaptación responsive móvil

**Estado: CERRADA Y APROBADA.**

La auditoría previa confirmó que la base desktop es válida y que los problemas principales aparecen en portrait, landscape de poca altura, safe areas, objetivos táctiles y ventanas que reservaban espacio innecesario al HUD. La solución aprobada es aditiva: desktop continúa siendo la referencia y la adaptación entra sólo por condiciones explícitas de viewport/orientación/capacidad táctil.

### 14.1 Decisiones aprobadas

1. Adoptar `100dvh` con respaldo `100vh` y `env(safe-area-inset-*)`.
2. Mantener una única interfaz con comportamientos visuales distintos; no crear un modo móvil paralelo en JavaScript.
3. Barra rápida: `5×2` en móvil portrait y `10×1` en landscape/escritorio.
4. HUD portrait: ocultar esferas laterales y presentar Vida/Maná como barras compactas, con Vida, Maná y Experiencia centradas arriba de la barra `5×2`.
5. HUD landscape bajo: conservar las esferas laterales y `10×1`, centrando Experiencia arriba de las habilidades.
6. Paneles superpuestos: en móvil ocupan prácticamente todo el viewport y el HUD se oculta mientras el panel captura entrada.
7. Personaje conserva todos sus datos y reorganiza lectura; no se ocultan estadísticas para "hacerlo entrar".
8. Inventario/Equipamiento conservan la solución responsive previa y sólo refinan grilla, scroll y área útil.
9. Árbol de habilidades no reduce nodos por debajo de un tamaño táctil legible; en poca altura usa scroll vertical.
10. Los modales existentes no se rediseñan sin necesidad: adoptan viewport dinámico, safe areas, scroll y targets táctiles.
11. En dispositivos táctiles pequeños, controles interactivos usan un mínimo aproximado de `44×44 px`.
12. Ninguna información jugable necesaria depende exclusivamente de `hover` o `title`; hover queda como feedback suplementario.
13. Creación de personaje y controles de cantidad permiten scroll adecuado frente al teclado virtual.
14. Responsive no puede resolver problemas ocultando información jugable.
15. Matriz mínima: 360×800, 390×844, 412×915, 667×375, 844×390, 768×1024, 1366×768 y 1920×1080; se agrega 2560×1440 como regresión desktop amplia.
16. **Regresión desktop obligatoria:** la adaptación no puede degradar ni alterar innecesariamente la presentación normal de PC. Desktop conserva barra `10×1`, paneles no-fullscreen, layouts y tamaños canónicos existentes.

### 14.2 Implementación E2.A — fundaciones y HUD

- `index.html` habilita `viewport-fit=cover`.
- `responsive.css` se carga al final del cascade como capa aditiva.
- `100dvh` y safe areas se aplican sin reemplazar los fallbacks desktop.
- portrait móvil oculta las esferas laterales, muestra barras compactas de Vida/Maná y centra Vida, Maná y Experiencia arriba de la barra `5×2`.
- landscape bajo conserva las esferas laterales y `10×1`, con Experiencia centrada arriba de las habilidades.
- menú principal y creación dejan de imponer alturas mínimas incompatibles con landscape bajo.

### 14.3 Implementación E2.B — paneles y habilidades

- `GestorPanelesPartidaDom` publica únicamente el estado visual genérico `panel-partida-abierto`; no conoce breakpoints.
- responsive decide si ese estado debe ocultar el HUD y convertir los paneles a fullscreen.
- Personaje conserva contenido completo con scroll real cuando corresponde.
- tablet mantiene composición intermedia y evita que Personaje exceda la capa disponible.
- el árbol de habilidades usa scroll en baja altura y mantiene nodos de aproximadamente 58 px.
- en landscape bajo la navegación de maestrías permanece lateral para no consumir altura vertical.

### 14.4 Implementación E2.C — modales y pulido táctil

- las hojas CSS cargadas dinámicamente se insertan antes de `responsive.css`, garantizando que la capa responsive siga siendo la última autoridad visual sin cambiar desktop.
- comercio, contenedor, curación, selección de mazmorra, detalles y habilidades adoptan `dvh`/safe areas en móvil.
- objetivos táctiles pequeños reciben mínimos de aproximadamente 44 px sólo bajo puntero `coarse` y viewport reducido.
- Aura/Maldición del HUD conserva `aria-label` y además permite foco/tap para mostrar nombre y turnos sin depender del tooltip nativo.
- creación y comercio incorporan `scroll-padding` para mantener controles útiles frente al teclado virtual.

## 15. Matriz de validación de Etapa 2

Antes del incremental se verifican automáticamente:

- sintaxis de JS modificado;
- estructura JSON completa del proyecto;
- `git diff --check`;
- existencia y prioridad de la hoja responsive;
- `5×2` en 360×800, 390×844 y 412×915;
- `10×1` en 667×375 y 844×390;
- `10×1` sin reglas móviles en 1366×768, 1920×1080 y 2560×1440;
- HUD oculto y panel fullscreen sólo en viewport móvil con panel activo;
- tablet 768×1024 sin desbordar la capa del panel;
- árbol desplazable con nodos táctiles legibles en landscape bajo;
- menú principal sin mínimo fijo de 720 px en poca altura;
- targets táctiles y lectura de estados mediante foco/tap.

La validación manual se concentró en percepción real del HUD, responsive, controles y composición. El usuario aprobó las pruebas el **19/08/2026**, incluyendo el correctivo final de HUD portrait/landscape.

## 16. Estado de decisiones

La **Etapa 1** permanece cerrada en SHA `fd601a248f5313ee6f704d85963c1b9ac660977f`.

Las 16 decisiones de responsive fueron aprobadas el **19/08/2026** y las pruebas manuales posteriores fueron superadas el mismo día. La **Etapa 2 queda CERRADA Y APROBADA**.

El ajuste final aprobado del HUD establece:

- portrait móvil: esferas ocultas; barras compactas de Vida y Maná + Experiencia centradas arriba de habilidades `5×2`;
- landscape móvil: esferas de Vida/Maná conservadas; Experiencia centrada arriba de habilidades `10×1`;
- desktop: composición previa intacta.

No quedan pendientes dentro del alcance de Etapa 2.
