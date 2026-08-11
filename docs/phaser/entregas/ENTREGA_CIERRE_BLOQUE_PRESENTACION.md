# Entrega — certificación final del bloque de presentación

## Base verificada

- Copia de trabajo: `/mnt/data/dm_blockc_close_clean/Dark-Moon`.
- La copia fue clonada desde el `.git` contenido en el ZIP entregado, sin sustituir la fuente local por GitHub.
- Rama: `main`.
- HEAD base: `26309e265068c55d0c84dc989c5d09c0762e0000`.
- Estado inicial de la copia limpia: sin cambios.
- El ZIP original presentaba 119 archivos marcados por Git debido exclusivamente a CRLF/LF; normalizando finales de línea hubo 0 diferencias reales de contenido.
- GitHub `main` fue contrastado y apuntaba al mismo SHA base al iniciar y cerrar la certificación.

## Alcance

Esta entrega no introduce refactors ni cambios productivos. Su objetivo es certificar conjuntamente las separaciones de presentación ya validadas antes de la futura interfaz fullscreen.

Archivos productivos modificados: **ninguno**.

Documentación actualizada:

- `README.md`.
- `docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md`.
- este documento de entrega.

`docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md` no se modifica porque no se tomó una nueva decisión visual.

## Arquitectura certificada

La presentación mantiene las siguientes fronteras:

- Phaser es el único renderizador gráfico propio de Dark Moon; `Phaser.AUTO` conserva la elección interna WebGL/Canvas del motor.
- `CompositorMundoPhaser` actúa como fachada y delega terreno, entidades y selección en compositores funcionales.
- `ReproductorEventosVisualesPhaser` conserva cola, orden, cancelación, inactividad y aplicación de escena final.
- `DespachadorEventosVisualesPhaser` enruta los tipos visuales y `ContextoReproduccionVisualPhaser` aporta infraestructura temporal compartida.
- resultados y recuperaciones visuales son representaciones de valores ya resueltos, no motores de reglas.
- ataques se reproducen por responsabilidades de distancia/cuerpo a cuerpo detrás de una fachada estable.
- habilidades se reproducen por los cinco patrones visuales canónicos detrás de una fachada estable.
- Phaser no importa directamente motores canónicos de combate, habilidades, IA, tiempo, inventario ni persistencia para recalcular reglas.

La reevaluación de módulos grandes restantes no encontró otra mezcla de responsabilidades que justifique refactor previo al fullscreen. `PlanificadorEventosVisuales`, `CreadorEfectosHabilidadesPhaser`, los compositores especializados, `ControladorCamaraPhaser` y `ReproductorResultadosVisualesPhaser` permanecen cohesionados por responsabilidad.

## Regresión automática

### 1. Sintaxis, configuración y grafo de módulos

Resultado:

- 257 JavaScript bajo `src`: sintaxis correcta.
- `game.js`: sintaxis correcta.
- `electron/main.js`: sintaxis correcta.
- 258 módulos ES analizados incluyendo `game.js`.
- imports relativos faltantes: 0.
- ciclos ES: 0.
- 28 JSON de configuración: válidos.
- `git diff --check`: correcto.

### 2. Idiomas y restricciones estructurales

Resultado:

- ES: 1193 claves terminales.
- EN: 1193 claves terminales.
- claves sólo ES: 0.
- claves sólo EN: 0.
- referencias runtime a `RenderizadorCanvas2D`, `SelectorRenderizador`, `CargadorImagenes` y `ControladorPunteroHabilidades`: 0.
- identificadores de etapas/hitos detectados bajo `src`: 0.
- imports directos desde Phaser hacia motores de combate/habilidades/IA/tiempo/inventario o persistencia: 0.

### 3. Configuración e infraestructura de entidades

Se cargaron y validaron las configuraciones reales mediante el mismo contrato usado por la aplicación.

Resultado representativo:

- profesiones: 3.
- plantillas de enemigos: 11.
- variantes: 3.
- objetos: 63.
- mapas: 5.
- rarezas: 4.
- `validarInfraestructuraEntidades()`: válido.

### 4. Generación procedural y reproducibilidad

Se generaron las cinco plantillas con semillas 1 a 5, dos veces cada una: 25 casos y 25 comparaciones de reproducibilidad.

Plantillas:

- `alcantarilla`;
- `cementerio`;
- `casa_guerrero`;
- `fortaleza_abandonada`;
- `sala_guerra`.

Para cada caso se validaron terreno, estructura, población, interactuables, salida, recursos visuales y existencia en disco de todas las rutas del manifiesto. Terreno, contenido y manifiesto fueron idénticos al repetir la misma semilla.

Resultado: **25/25 correctos, 0 recursos faltantes**.

### 5. FOV y precarga contextual

Sobre una alcantarilla real con 9 enemigos se construyó una escena cuya visibilidad sólo incluía al jugador.

Resultado:

- enemigos totales del mapa: 9;
- enemigos visibles en la escena neutral: 0;
- las rutas visuales distintas de enemigos ocultos estaban incluidas en el manifiesto contextual: 2/2.

Conclusión: la precarga conoce recursos necesarios, pero no expone posiciones de entidades ocultas ni sustituye la autoridad del FOV.

### 6. Espacio canónico y pathfinding

Matriz validada:

- suelo + suelo: diagonal permitida;
- pared + suelo: permitida;
- pared + pared: bloqueada;
- enemigo + pared: permitida;
- enemigo + enemigo: permitida;
- NPC + pared: permitida;
- barril + pared: bloqueada;
- cofre + pared: bloqueada;
- puerta abierta + pared: permitida;
- puerta cerrada + pared: bloqueada.

El pathfinding comparte la misma autoridad: actor + pared pudo tomar la diagonal libre y dos paredes no permitieron cortar la esquina.

### 7. Persistencia

Con `localStorage` simulado y objetos reales de persistencia:

- jugador: guardar, leer, reconstruir y eliminar, correctos;
- barra de habilidades: guardar, leer y eliminar, correctos;
- preferencias visuales: guardar, leer y eliminar, correctos;
- claves/versiones existentes se conservaron.

No se modificó el formato durable.

### 8. Cola visual y cancelación

Con `ReproductorEventosVisualesPhaser` real y dobles controlados de Phaser:

- FIFO de dos actualizaciones: correcto;
- escenas finales aplicadas en el orden esperado;
- cancelación durante tween: no aplicó escena obsoleta y resolvió esperadores;
- cancelación durante temporizador: resolvió la espera y limpió temporizadores;
- destrucción durante espera: finalizó sin acceso nulo ni escena tardía.

El contrato de despacho conserva exactamente 20 tipos y 20 rutas, sin faltantes ni duplicados.

### 9. Pipeline visual representativo actual

Se ejecutaron directamente los reproductores actuales en modo de efectos reducidos con un contexto controlado para verificar integración después de todas las modularizaciones.

Casos superados:

- habilidad proyectil;
- área centrada en selección;
- área centrada en actor;
- línea;
- cadena;
- conjuración de zona persistente;
- ataque con origen visual oculto y resultado ya resuelto;
- estado temporal aplicado, actualizado y retirado;
- zona temporal creada, pulso, entrada, activación y vencimiento;
- daño periódico con transición de barra de vida;
- muerte y retirada visual;
- botín nuevo y botín existente actualizado;
- recuperación de recursos;
- subida de nivel.

La primera ejecución de este harness temporal se detuvo porque el doble de `creadorEfectos` no implementaba `crearTextoFlotante`; se completó el doble de prueba y la segunda ejecución finalizó correctamente. Esto fue un defecto del harness externo, no del código productivo.

Además, los módulos de planificación visual no tuvieron cambios desde su validación en la separación de coordinación; los compositores no tuvieron cambios desde su validación de composición; y la preparación Loading/recursos no tuvo cambios desde su validación correspondiente.

### 10. Web, offline y Electron estructural

HTTP local devolvió 200 para `index.html`, `game.js`, Phaser local, compositores, coordinador visual, fachadas de ataques/habilidades, mapas e idiomas.

Phaser se sirve desde `assets/vendor/phaser/4.2.1/phaser.min.js`. No se detectó dependencia runtime a CDN o servicios externos. Las únicas cadenas `http` runtime ajenas al vendor fueron el namespace SVG dentro de data URI/CSS y una URL localhost del soporte de prueba de mapas.

El ZIP no contiene `node_modules`; por metodología no se instalaron dependencias. Electron no se ejecutó, pero `electron/main.js` pasa sintaxis y `package.json`/`package-lock.json` no fueron alterados por esta entrega.

## Resultado

La regresión automática integral no encontró defectos de producción ni una nueva deuda arquitectónica que justifique otro refactor grande antes del fullscreen.

El Bloque C **todavía no se declara cerrado**: queda pendiente una pasada manual integral en navegador sobre esta entrega documental. Si esa pasada es satisfactoria, podrá certificarse formalmente el cierre y habilitarse el análisis de la siguiente etapa del Plan Maestro.

## Validación manual solicitada

1. Nueva partida y creación de personaje.
2. Ciudad: movimiento, cámara, zoom y paneo.
3. Inventario/equipamiento y un consumible.
4. Comercio/NPC si está accesible.
5. Entrada a mazmorra y Loading.
6. FOV y primera aparición de enemigos sin fallback textual transitorio.
7. Movimiento ortogonal/diagonal, incluido rodear enemigo junto a pared.
8. Ataque melee y, cuando sea práctico, arco/varita.
9. Una muestra de habilidades que cubra los patrones principales.
10. Estado temporal y daño periódico.
11. Zona persistente con entrada/pulso.
12. Muerte, XP y botín.
13. Cofre, barril, puerta y salida/portal.
14. Transición de mapa.
15. Guardar/recargar/Continuar.
16. Redimensionar y revisar cámara/mapa.
17. Cambiar ES/EN y revisar textos principales.
18. Entradas rápidas mientras hay animaciones.
19. Consola sin errores.

## Restricciones verificadas

- sin commit;
- sin push;
- sin instalación de dependencias;
- sin archivos `.patch` ni `.mjs` agregados;
- sin código productivo nuevo;
- sin motores paralelos;
- sin cambios de contratos jugables;
- sin nombres de etapa/hito en producción;
- sin cambios de balance o contenido.
