# ENTREGA — RETIRO DEL RENDERIZADOR CANVAS 2D LEGACY

## Base

- Rama: `main`.
- SHA base: `cf72a5193921dea38bc59971edd8e7d18f4b5e02`.
- La copia de trabajo se extrajo del ZIP completo y se verificó contra Git antes de modificar. El `git status` inicial mostraba diferencias de finales de línea del ZIP, pero la comparación normalizada contra HEAD confirmó 0 cambios reales de contenido heredados.
- No se instalaron dependencias, no se hizo commit ni push.

## Decisión aplicada

La cobertura Phaser fue certificada técnicamente y aprobada manualmente antes de esta eliminación. A partir de esta entrega, Phaser 4.2.1 es el único renderizador gráfico mantenido por Dark Moon.

Esto no obliga a Phaser a utilizar WebGL: `Phaser.AUTO` conserva la capacidad interna del motor de elegir WebGL o Canvas según el entorno. Lo eliminado es la segunda implementación gráfica propia de Dark Moon.

## Cambios funcionales

- `game.js` carga Phaser siempre antes de construir la presentación.
- `PresentacionAplicacionDom` y `FabricaInterfazPartidaDom` dejan de recibir o resolver un tipo de renderizador.
- `index.html` deja de contener un canvas base y expone `gameMapPanel` como contenedor estable del mapa.
- `RenderizadorPhaser` crea y administra directamente su host y su canvas dentro de ese panel.
- `ControladorPartida` deja de transportar `TILE_SIZE`, que solo era necesario para Canvas 2D.
- `ConfiguracionInicial` deja de exportar `TILE_SIZE`.
- La selección de casillas de habilidades queda exclusivamente en `ControladorEntradaJugablePhaser`; se elimina el adaptador global DOM/Canvas legacy.
- Las URLs antiguas con `?render=...` ya no seleccionan backends. El parámetro queda ignorado por el arranque normal.

## Archivos eliminados

```text
src/interfaz/graficos/RenderizadorCanvas2D.js
src/interfaz/graficos/CargadorImagenes.js
src/interfaz/graficos/SelectorRenderizador.js
src/controles/ControladorPunteroHabilidades.js
```

## Infraestructura añadida para la preparación de mapas

```text
src/interfaz/dom/PresentadorCargaMapaDom.js
src/interfaz/graficos/phaser/RecursosMapaPhaser.js
```

`PresentadorCargaMapaDom` presenta Loading y su progreso sin decidir cuándo un mapa está listo. `RecursosMapaPhaser` reúne rutas visuales neutrales y deduplicadas; no conoce `Juego`, posiciones ocultas ni reglas de visibilidad.

## Archivos completos de la entrega

**Modificados:**

```text
README.md
assets/estilos/base/style.css
assets/estilos/phaser/phaser.css
docs/electron/PLAN_MAESTRO_ELECTRON_DARK_MOON.md
docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md
game.js
index.html
src/aplicacion/Aplicacion.js
src/aplicacion/ControladorPartida.js
src/config/idiomas/en.json
src/config/idiomas/es.json
src/entidad/destructible/Barril.js
src/interfaz/Renderizador.js
src/interfaz/dom/FabricaInterfazPartidaDom.js
src/interfaz/dom/PresentacionAplicacionDom.js
src/interfaz/dom/PresentacionMapaActivoDom.js
src/interfaz/graficos/AdaptadorEscenaJuego.js
src/interfaz/graficos/phaser/CargadorPhaser.js
src/interfaz/graficos/phaser/CompositorMundoPhaser.js
src/interfaz/graficos/phaser/EscenaArranquePhaser.js
src/interfaz/graficos/phaser/GestorRecursosPhaser.js
src/interfaz/graficos/phaser/RenderizadorPhaser.js
src/interfaz/habilidades/IntegracionHabilidadesDom.js
src/juego/configuracion/ConfiguracionInicial.js
```

**Añadidos:**

```text
docs/phaser/entregas/ENTREGA_RETIRO_CANVAS_2D.md
src/interfaz/dom/PresentadorCargaMapaDom.js
src/interfaz/graficos/phaser/RecursosMapaPhaser.js
```

**Eliminados:**

```text
src/controles/ControladorPunteroHabilidades.js
src/interfaz/graficos/CargadorImagenes.js
src/interfaz/graficos/RenderizadorCanvas2D.js
src/interfaz/graficos/SelectorRenderizador.js
```

## Documentación actualizada

- `README.md`.
- `docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md`.
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`.
- `docs/electron/PLAN_MAESTRO_ELECTRON_DARK_MOON.md`.

Las entregas y planes históricos conservan referencias al Canvas 2D cuando describen el estado real que existía en ese momento. Los documentos vigentes aclaran que ya no forma parte del runtime actual.

## Corrección incorporada durante la validación manual

La primera validación manual del retiro detectó que, al descubrir por primera vez una entidad oculta —por ejemplo una rata—, Phaser podía mostrar brevemente el fallback textual mientras terminaba de cargar su PNG. La corrección histórica de redibujado diferido seguía presente; la causa real era que el recurso de una entidad fuera del FOV todavía no se solicitaba hasta su primera aparición en la escena neutral.

Para cerrar el retiro del backend legacy se incorpora una preparación genérica de mapas:

- Loading global en toda activación de un mapa jugable: nueva partida, Continuar, ciudad/mazmorra, regreso a ciudad y transiciones futuras equivalentes;
- duración visual mínima de 1 segundo, sin alterar tiempo jugable;
- suspensión de la entrada anterior antes de preparar el mapa y activación de la nueva entrada solamente después de retirar el Loading;
- manifiesto contextual de recursos persistentes del mapa generado, incluyendo entidades todavía ocultas y estados gráficos previsibles de interactuables;
- precarga y espera de esos recursos antes de exponer la primera escena;
- FOV intacto: las entidades ocultas aportan rutas, no posiciones ni descubrimiento;
- los errores reales de imagen terminan la espera y conservan el fallback, evitando un Loading infinito;
- la primera escena se dibuja bajo el overlay para evitar capas de suelo o entidades apareciendo por etapas al iniciar o continuar una partida.

La preparación no precarga el catálogo completo del juego ni cambia RNG, IA, combate, tiempo, persistencia o reglas de mapa.

## Validación automática realizada

- 239 módulos JavaScript de `src`: sintaxis válida.
- 240 módulos analizados incluyendo `game.js`: 0 imports relativos faltantes y 0 ciclos ES.
- ES/EN: 1193 claves terminales en cada idioma, sin diferencias entre catálogos.
- 0 referencias runtime a `RenderizadorCanvas2D`, `CargadorImagenes`, `SelectorRenderizador`, `ControladorPunteroHabilidades`, `gameCanvas`, `TILE_SIZE` o `canvas2d`.
- La generación procedural se comparó contra el HEAD base en 15 combinaciones mapa/semilla: salida serializada idéntica.
- Se generaron ciudad y las cinco plantillas de mazmorra y se construyó su manifiesto de precarga: 0 rutas visuales faltantes en disco.
- Una mazmorra real confirmó que objetivos fuera del FOV permanecen ausentes de `escena.entidades` mientras sus rutas visuales sí están presentes en el manifiesto de precarga.
- Se verificaron 340 rutas declaradas por entidades generadas, incluidas 90 rutas de estados visuales alternativos; todas quedaron incluidas en el manifiesto correspondiente.
- `GestorRecursosPhaser.precargarYEsperar`: deduplicación, reutilización de caché, progreso monótono y finalización con error de imagen sin bloqueo.
- `PresentadorCargaMapaDom`: duración mínima observada de ~1001 ms y protección frente a una carga antigua que intenta ocultar una más nueva.
- Coordinación de preparación: Loading precede a generación, precarga precede al primer dibujo y la entrada se activa solamente después de ocultar Loading.
- Nueva partida y Continuar recorren el mismo contrato: Loading se muestra antes de exponer la pantalla de juego, luego precarga/dibujo y finalmente activación de entrada.
- Ciudad → mazmorra y mazmorra → ciudad recorren la misma preparación genérica.
- HTTP local: `index.html`, `game.js`, Loading, manifiesto Phaser, gestor de recursos, ES/EN, CSS, Phaser 4.2.1 y ciudad responden 200.
- `electron/main.js`: sintaxis válida. Electron no se ejecutó porque `node_modules` no está incluido y no se instalaron dependencias.

## Compatibilidad y riesgos

- Web/GitHub Pages: no se agregan dependencias ni rutas de servidor; los mismos recursos locales se solicitan anticipadamente mediante las rutas relativas existentes.
- Electron: el protocolo y `electron/main.js` no cambian. La sintaxis del proceso principal fue validada, pero no se ejecutó Electron porque `node_modules` no está incluido y no se instalaron dependencias.
- Persistencia: sin cambios de claves, versiones o snapshots. Nueva partida y Continuar cambian solamente su presentación durante la activación del mapa.
- Procedural: la precarga no consume RNG; la generación fue comparada contra la base y resultó idéntica.
- Riesgo documentado: si una preparación falla por una excepción inesperada después de desmontar el mapa anterior, la aplicación puede volver al menú en vez de reconstruir ese mapa. Los fallos normales de recursos gráficos no lanzan esa excepción: se contabilizan como error, terminan la precarga y permiten fallback.
- La caché de texturas de Phaser continúa siendo de sesión. No se introduce expulsión automática sin mediciones de memoria; se deja como punto de profiling futuro cuando aumente el catálogo visual.

## Limitaciones de esta validación

No se ejecutó Electron porque el ZIP no contiene `node_modules` y no se instalaron dependencias. La ejecución visual real posterior al retiro debe validarse manualmente en navegador y, cuando corresponda, en Electron.

## Prueba manual requerida

1. Con caché fría, crear una nueva partida: debe aparecer Loading durante al menos 1 segundo y la ciudad debe mostrarse ya compuesta, sin capas de piso apareciendo después.
2. Cerrar y usar **Continuar**: mismo contrato de Loading y ciudad completamente preparada al descubrirse.
3. Ciudad → mazmorra: Loading visible; al descubrir la primera rata u otro enemigo, debe aparecer directamente su sprite y nunca una letra transitoria.
4. Descubrir varios tipos/variantes de enemigos y comprobar que ninguno cargue visualmente por etapas.
5. Abrir/cerrar puertas y cofres y utilizar portales: los estados previsibles deben estar disponibles sin flash de fallback.
6. Mazmorra → ciudad y mazmorra → siguiente mazmorra: Loading en cada activación.
7. Probar un mapa grande y, si se desea, `sala_guerra` con `&enemigos=40`.
8. Pulsar teclado/clic repetidamente durante el Loading: no debe ejecutarse ninguna acción detrás del overlay.
9. Revalidar cámara, zoom, FOV, ataques, habilidades, estados, paneles y persistencia después de las transiciones.
10. Revisar consola durante todo el recorrido.

## Estado

Implementación de Canvas 2D + Loading/precarga contextual completada localmente. Pendiente de validación manual del flujo corregido antes de cerrar C.1B y continuar con la reevaluación de los grandes módulos Phaser.
