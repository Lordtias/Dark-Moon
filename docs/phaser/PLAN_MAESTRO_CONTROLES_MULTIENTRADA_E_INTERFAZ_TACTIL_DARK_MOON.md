# Plan Maestro — Controles multientrada e interfaz táctil de Dark Moon

## Estado del plan

- **Etapa 1 — Controles multientrada e inspección:** CERRADA el 19/08/2026.
- **Validación manual:** APROBADA por el usuario.
- **Etapa 2 — Auditoría responsive móvil:** PENDIENTE DE ANÁLISIS.
- **Commit/push:** no realizados durante la entrega.


## 1. Propósito

Este plan define un único contrato de acciones jugables para teclado, mouse, touch, barra de habilidades y acciones contextuales. El objetivo no es crear motores paralelos por dispositivo, sino traducir entradas diferentes a los mismos comandos y sistemas canónicos de Dark Moon.

La primera etapa implementa controles multientrada, inspección de entidades, habilidades básicas Atacar/Esperar y ayuda actualizada. La segunda etapa queda reservada para una auditoría responsive integral de la interfaz móvil antes de aprobar cambios visuales globales.

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

## 14. Segunda etapa — auditoría responsive móvil

La segunda etapa no modifica de inmediato la UI. Primero debe generar un diagnóstico de cada componente y someter las adaptaciones a aprobación.

Auditar:

- creación de personaje;
- HUD y barra de habilidades;
- Personaje, Inventario y Equipamiento;
- panel/árbol de habilidades;
- comercio, botín y curación;
- ayuda y detalle de entidad;
- selectores y overlays;
- landscape y portrait;
- resoluciones pequeñas y zonas seguras;
- tamaños de objetivos táctiles;
- scroll necesario vs. accidental;
- dependencias de hover;
- fullscreen, zoom y cámara;
- teclado virtual cuando corresponda.

Para cada componente se decidirá si debe conservar tamaño, redimensionarse, reorganizar columnas/filas, ocupar casi toda la pantalla, permitir scroll o reducir información secundaria. Responsive no significa simplemente achicar ventanas.

## 15. Estado de decisiones

Todas las decisiones funcionales de la primera etapa fueron aprobadas antes de implementación y sus pruebas manuales fueron superadas. La **Etapa 1 queda cerrada**.

La auditoría responsive queda prevista como **Etapa 2 independiente y pendiente de análisis**. Su existencia en este plan no aprueba cambios visuales ni de layout por adelantado.
