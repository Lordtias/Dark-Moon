# ENTREGA E4.A — EXPANSIÓN ESTRUCTURAL Y PRESUPUESTO DE POBLACIÓN

## Estado de esta entrega

**E4.A — Cerrada.**

La implementación técnica fue validada mediante las comprobaciones automatizadas documentadas en esta entrega y la validación manual del juego fue reportada como satisfactoria por el responsable del proyecto el 11 de agosto de 2026. Con esa aprobación se cumple el criterio específico de cierre definido en el Plan Maestro.

Electron no fue ejecutado porque E4.A no modifica su integración y la copia de trabajo no contiene `node_modules`; no se instalaron dependencias.

## Base de trabajo

- Repositorio de trabajo verificado al cierre: `/mnt/data/e4_done/Dark-Moon`
- Rama: `main`
- Commit base verificado: `f79e670e81ebb597a54fdddc84666177fc1f7e3c`
- No se realizó commit ni push.

## Alcance implementado

### Escala estructural transversal

Se ampliaron los rangos configurables de las cinco mazmorras sin crear un generador paralelo ni modificar `GeneradorTerreno.js`.

| Mapa | Tamaño anterior | Tamaño propuesto | Habitaciones anteriores | Habitaciones propuestas |
|---|---:|---:|---:|---:|
| Alcantarilla | 38–46 × 24–30 | 48–60 × 30–38 | 6–8 | 8–11 |
| Cementerio | 38–46 × 24–30 | 50–62 × 32–40 | 7–9 | 9–12 |
| Casa del Guerrero | 36–44 × 24–30 | 48–60 × 30–38 | 7–9 | 9–12 |
| Fortaleza abandonada | 44–54 × 28–36 | 58–72 × 38–48 | 9–12 | 12–16 |
| Sala de guerra | 48–58 × 30–38 | 64–80 × 42–52 | 9–12 | 13–17 |

Los valores se fijaron después de probar generaciones estructurales y población real sobre rangos candidatos. No son una multiplicación uniforme entre mapas.

### Reserva ambiental canónica

Cada plantilla de mapa dispone ahora de:

```text
poblacion.habitacionesAmbientales.minimo
poblacion.habitacionesAmbientales.maximo
```

Reglas:

- mínimo permitido: 1;
- máximo permitido: 3;
- si mínimo y máximo coinciden, la cantidad es obligatoria;
- `2/2` produce exactamente dos habitaciones ambientales;
- entrada y habitación especial nunca pueden ser ambientales;
- la selección es reproducible a partir de la semilla;
- las habitaciones ambientales no consumen presupuesto ni reciben enemigos, cofres moderados o destructibles procedurales de valor.

Configuración actual:

- Alcantarilla: 1–2;
- Cementerio: 1–2;
- Casa del Guerrero: 1–2;
- Fortaleza abandonada: 2–3;
- Sala de guerra: 2–3.

### Presupuesto canónico por habitación

Se agregó `PlanificadorPoblacionMazmorra.js` como contrato común de población para las mazmorras actuales y futuras.

No genera geometría. Recibe el plano ya creado por `GeneradorTerreno` y clasifica el uso de sus habitaciones.

Dimensiones actuales del presupuesto:

- ocupación;
- amenaza;
- valor/recompensa.

La capacidad de cada dimensión se deriva de:

```text
capacidad por tamaño
→ aplicar mínimo
→ aplicar máximo de habitación
→ aplicar multiplicador de habitación especial cuando corresponde
```

El máximo evita que una habitación muy grande multiplique indefinidamente su contenido por superficie.

### Ecuación extensible de coste

Todo contenido expresa componentes reutilizables y `calcularCostoPoblacion()` los suma sobre el mismo vector canónico:

```text
ocupación + amenaza + valor/recompensa
```

Un componente futuro puede aportar a una o varias dimensiones sin crear una ecuación paralela.

Componentes utilizados actualmente:

- presencia física;
- amenaza de enemigo;
- botín esperado.

La amenaza inicial de un enemigo reutiliza su experiencia canónica final como indicador cuantitativo inicial de peligrosidad. No modifica combate ni experiencia real.

### Valor esperado de drops

El presupuesto de recompensa estima el valor esperado de una tabla de botín mediante:

```text
probabilidad × cantidad esperada × valorBase del objeto
```

No se ejecuta una tirada de botín y no se reemplaza `SistemaBotin`.

La estimación actual usa `valorBase`; rareza y afijos no agregan todavía una valoración económica adicional al presupuesto. Si se incorpora en el futuro deberá extender el mismo componente canónico.

### Integración con población existente

- Las densidades de enemigos y barriles continúan expresando una intención de cantidad.
- El presupuesto de cada habitación decide cuánto contenido puede colocarse realmente.
- Enemigos recurrentes, enemigos únicos, cofres y destructibles comparten el mismo saldo de habitación.
- Los pobladores no conocen excepciones por nombre de mapa.
- La habitación especial usa el mismo contrato con un multiplicador configurable para poder alojar contenido obligatorio.

## Arquitectura preservada

No se modificaron:

- `src/juego/generacion/GeneradorTerreno.js`;
- `src/juego/generacion/PlanoMazmorra.js`;
- movimiento;
- combate;
- resolución de muerte;
- experiencia;
- botín real;
- FOV/percepción;
- IA;
- cámara Phaser;
- persistencia del jugador;
- Electron;
- dependencias.

El flujo queda:

```text
JSON de mapa
→ GeneradorTerreno
→ PlanoMazmorra
→ PlanificadorPoblacionMazmorra
→ pobladores canónicos
→ estado/entidades reales
→ Phaser/HTML representa
```

## Archivos modificados

- `src/config/mapas/mapas.json`
- `src/herramientas/balance/AnalizadorBalanceProgresion.js`
- `src/herramientas/depuracion/ValidadorInteractuablesMazmorra.js`
- `src/herramientas/depuracion/ValidadorPoblacionMazmorra.js`
- `src/juego/configuracion/ConfiguracionInicial.js`
- `src/juego/configuracion/ValidadorConfiguracionMapas.js`
- `src/juego/generacion/GeneradorContenidoMapa.js`
- `src/juego/generacion/PobladorEnemigosMazmorra.js`
- `src/juego/generacion/PobladorInteractuablesMazmorra.js`
- `docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md`

## Archivos agregados

- `src/juego/generacion/PlanificadorPoblacionMazmorra.js`
- `docs/mazmorras/entregas/ENTREGA_E4_A.md`

## Archivos eliminados

Ninguno.

## Dependencias

Ninguna nueva.

No se instaló ni actualizó ninguna dependencia.

## Validaciones ejecutadas

### 1. Configuración de mapas

**Preparación:** cargar `mapas.json` mediante el validador real.

**Resultado esperado:** rangos estructurales y presupuestos válidos.

**Resultado obtenido:** Correcto.

También se comprobaron configuraciones inválidas:

- reserva `0/2`: rechazada;
- reserva `1/4`: rechazada;
- reserva `3/2`: rechazada.

### 2. Semántica exacta 2/2

**Preparación:** forzar temporalmente Alcantarilla a `2/2` en un arnés de diagnóstico sin modificar el JSON productivo.

**Prueba:** cinco semillas.

**Resultado obtenido:** las cinco reservaron exactamente dos habitaciones.

**Estado:** Correcto.

### 3. Ecuación extensible

Se agregó a la prueba un componente artificial futuro que aportó simultáneamente ocupación, amenaza y recompensa.

La ecuación común sumó correctamente sus contribuciones sin modificar ningún poblador.

**Estado:** Correcto.

### 4. Generación real y validadores — 50 mapas

Se generaron 10 semillas por cada una de las cinco mazmorras utilizando:

- `GeneradorTerreno` real;
- `GeneradorContenidoMapa` real;
- configuraciones reales de enemigos, objetos, rarezas y afijos;
- `ValidadorMazmorrasProcedurales`;
- `ValidadorPoblacionMazmorra`;
- `ValidadorInteractuablesMazmorra`.

Resultado:

| Mapa | Generaciones válidas | Ambientales observadas | Enemigos observados | Barriles observados | Tiempo diagnóstico medio* |
|---|---:|---:|---:|---:|---:|
| Alcantarilla | 10/10 | 1–2 | 8–14 | 0–4 | 13.95 ms |
| Cementerio | 10/10 | 1–2 | 10–22 | 5–12 | 14.92 ms |
| Casa del Guerrero | 10/10 | 1–2 | 11–19 | 9–16 | 19.12 ms |
| Fortaleza abandonada | 10/10 | 2–3 | 14–25 | 15–23 | 32.05 ms |
| Sala de guerra | 10/10 | 2–3 | 20–34 | 13–23 | 53.29 ms |

\* Son tiempos de generación lógica en Node dentro del entorno de diagnóstico, no tiempos de frame del navegador.

**Estado:** Correcto.

### 5. Tamaños mínimo, medio y máximo

Se probaron explícitamente configuraciones exactas mínima, media y máxima de las cinco mazmorras.

Todos los casos pasaron estructura, conectividad, población y validación de interactuables.

Ejemplos máximos comprobados:

- Alcantarilla: 60×38, 11 habitaciones;
- Cementerio: 62×40, 12 habitaciones;
- Casa del Guerrero: 60×38, 12 habitaciones;
- Fortaleza abandonada: 72×48, 16 habitaciones;
- Sala de guerra: 80×52, 17 habitaciones.

**Estado:** Correcto.

### 6. Reproducibilidad

Para las cinco mazmorras se generó dos veces la misma semilla y se compararon:

- celdas;
- clasificación ambiental;
- presupuestos;
- detalle de enemigos;
- destructibles;
- resumen de interactuables.

**Resultado:** mismo resultado para la misma semilla y versión.

**Estado:** Correcto.

### 7. FOV y acceso a salida en mapas máximos

Se probaron tres semillas máximas por mapa.

- FOV con Percepción 10 quedó siempre dentro de los límites reales del mapa.
- El pathfinding canónico encontró ruta desde la entrada hasta la casilla de acceso de salida en las 15 pruebas.

Los tiempos observados de FOV estuvieron por debajo de 4 ms en el arnés y el pathfinding por debajo de 7 ms en esas muestras.

**Estado:** Correcto como prueba lógica.

### 8. IA real en mapas máximos

Para cada una de las cinco mazmorras se creó un enemigo real permitido por la plantilla, dentro de su percepción y fuera de su alcance de ataque.

`SistemaAccionesEnemigos` realizó:

- detección;
- cambio a agresivo;
- pathfinding;
- movimiento hacia el jugador.

**Estado:** Correcto.

### 9. Carga web estática

Servidor HTTP local:

- `/index.html`: 200;
- `/game.js`: 200;
- `/src/config/mapas/mapas.json`: 200;
- `/assets/vendor/phaser/4.2.1/phaser.min.js`: 200;
- CSS principal de interfaz: 200.

**Estado:** Correcto para rutas/carga estática.

El Chromium headless disponible en el contenedor no consiguió completar una sesión navegable y no llegó a solicitar la página antes del timeout. No se considera una prueba del juego y no se afirma que la regresión visual haya sido ejecutada.

### 10. Sintaxis e integridad

- `node --check` sobre todos los JavaScript modificados/agregados: Correcto.
- `mapas.json` parseado correctamente: Correcto.
- `git diff --check`: Correcto.

## Medición del impacto de escala

Comparando 12 semillas de la configuración base con los rangos ampliados, la superficie media aumenta aproximadamente:

- Alcantarilla: +62 %;
- Cementerio: +80 %;
- Casa del Guerrero: +69 %;
- Fortaleza abandonada: +80 %;
- Sala de guerra: +85 %.

La densidad global, utilizada sola, habría intentado escalar también el contenido. El caso más claro es Sala de guerra: el objetivo bruto de barriles pasaría aproximadamente de 46 a 76 de media. Con el presupuesto canónico, las 10 generaciones reales observadas quedaron entre 13 y 23 barriles.

Esto confirma que el aumento de superficie ya no implica una multiplicación ciega del contenido.

## Persistencia

No se modificó el contrato de `PersistenciaJugador`.

La persistencia continúa guardando el estado durable del personaje y excluye la simulación del mapa. `planPoblacion` se mantiene como metainformación del mapa actual dentro de `generacionActual` y no introduce una migración del guardado.

La regresión manual de guardado/carga incluida en la validación jugable de cierre fue reportada como satisfactoria por el responsable del proyecto.

## Compatibilidad web

No se agregaron servidores, bundlers, CDNs ni dependencias. Las rutas estáticas principales respondieron correctamente mediante HTTP local.

La regresión manual del juego en navegador fue reportada como satisfactoria por el responsable del proyecto.

## Compatibilidad Electron

No se modificó Electron.

La copia de trabajo no contiene `node_modules`. No se instalaron dependencias porque E4.A no lo autoriza. Por tanto, Electron no fue ejecutado en esta entrega.

## Validación manual de cierre

El responsable del proyecto ejecutó las pruebas jugables solicitadas sobre la entrega de E4.A y confirmó el 11 de agosto de 2026 que **las pruebas fueron satisfactorias**.

La validación solicitada cubría el flujo afectado por la etapa, incluyendo las cinco mazmorras ampliadas, recorrido, habitaciones ambientales, movimiento, cámara y zoom, FOV/descubrimiento, IA/persecución, transición de salida, guardado/carga, redimensionamiento/pantalla completa y revisión general de errores.

No se registraron incidencias bloqueantes ni solicitudes de recalibración posteriores a esa validación.

**Estado:** Correcto — validación manual aprobada por el responsable del proyecto.

## Riesgos y pendientes

No quedan pendientes bloqueantes para E4.A.

Observaciones no bloqueantes para evolución futura:

- La amenaza usa actualmente la XP del enemigo como primer indicador canónico. Puede enriquecerse mediante nuevos componentes sin reemplazar la ecuación.
- El valor esperado usa `valorBase`; una futura valoración de rareza/afijos debe agregarse como extensión del mismo componente, no como cálculo paralelo.
- Electron no fue ejecutado en E4.A porque la etapa no modifica su integración ni autoriza instalar las dependencias ausentes en esta copia.

## Documento maestro

Se actualizó `docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md` únicamente para reflejar decisiones canónicas aprobadas durante E4.A:

- reserva ambiental configurable entre 1 y 3;
- semántica de rango fijo como `2/2`;
- aplicabilidad a futuras mazmorras;
- ecuación canónica/extensible de presupuesto;
- máximos por habitación para impedir escalado indefinido.

Con la validación manual satisfactoria, el Estado de E4.A se actualizó a **Cerrada**. No se agregó ningún SHA al Plan Maestro.

## Conventional Commit propuesto

```text
feat(mapas): ampliar mazmorras y canonizar presupuesto por habitación

- ampliar los rangos estructurales de las cinco mazmorras y su cantidad de habitaciones;
- incorporar reservas ambientales configurables de 1 a 3 habitaciones y un planificador canónico reutilizable;
- integrar ocupación, amenaza y valor esperado de recompensa en un presupuesto compartido por habitación;
- limitar el escalado ciego de enemigos, cofres y destructibles manteniendo las densidades como intención;
- extender validadores, métricas de generación y documentación del plan maestro;
- validar múltiples semillas, tamaños mínimo/medio/máximo, reproducibilidad, FOV, pathfinding, IA y regresión manual de juego.
```

No se realizó el commit.

## ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Mazmorras Expandidas y Contenido Ambiental Jugable de Dark Moon.

ETAPA CERRADA:
E4.A — Expansión estructural y presupuesto de población

ESTADO:
Cerrada

COMMIT BASE:
f79e670e81ebb597a54fdddc84666177fc1f7e3c

HEAD FINAL VERIFICADO:
f79e670e81ebb597a54fdddc84666177fc1f7e3c

GIT STATUS FINAL:
Rama main con únicamente los cambios implementados y documentales de E4.A sin commit; no se detectaron archivos ajenos al alcance.

DOCUMENTO DE ENTREGA:
docs/mazmorras/entregas/ENTREGA_E4_A.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md: Sin cambios
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md: no existe en la arquitectura documental vigente; sin restauración ni cambios

OBJETIVO QUE SE COMPLETÓ:
Ampliar transversalmente la escala de las cinco mazmorras y canonizar una infraestructura reutilizable de reserva ambiental y presupuesto de población por habitación, manteniendo el generador estructural como única fuente de geometría procedural.

ARQUITECTURA HEREDADA:
GeneradorTerreno sigue siendo la única fuente canónica de geometría; las habitaciones conservan IDs estables; PlanificadorPoblacionMazmorra aplica reservas ambientales y presupuesto extensible de ocupación, amenaza y valor/recompensa; las densidades expresan intención y el presupuesto limita la población efectiva; el botín real sigue perteneciendo exclusivamente a SistemaBotin; cámara, FOV, IA, movimiento, combate y persistencia permanecen canónicos y sin motores paralelos.

ARCHIVOS CLAVE:
- src/juego/generacion/PlanificadorPoblacionMazmorra.js: contrato canónico reutilizable de reserva ambiental y presupuesto por habitación
- src/config/mapas/mapas.json: rangos estructurales, reservas ambientales y configuración de presupuesto de las mazmorras
- src/juego/generacion/GeneradorContenidoMapa.js: integración del plan de población con los pobladores canónicos

DEPENDENCIAS Y VERSIONES:
Ninguna nueva.

PRUEBAS CLAVE SUPERADAS:
- 50 generaciones reales: 10 semillas por cada una de las cinco mazmorras, con validadores estructurales, de población e interactuables
- tamaños mínimo, medio y máximo, reproducibilidad, FOV, acceso a salida, pathfinding e IA sobre mapas ampliados
- validación manual jugable satisfactoria confirmada por el responsable del proyecto el 11 de agosto de 2026

PROBLEMAS O RIESGOS PENDIENTES:
- Ninguno bloqueante para E4.A
- La amenaza y la valoración esperada pueden enriquecerse en el futuro extendiendo la ecuación canónica existente, sin crear cálculos paralelos

DECISIONES APROBADAS:
- el planificador y presupuesto de población son infraestructura canónica reutilizable también por futuras mazmorras
- cada mapa configura entre 1 y 3 habitaciones ambientales; un rango fijo como 2/2 obliga exactamente a dos
- el presupuesto canónico y extensible contempla ocupación, amenaza y valor/recompensa, incluyendo valor esperado de drops sin resolver el botín real
- las densidades se conservan como intención pero no controlan por sí solas la cantidad final
- cámara, FOV e IA no se modifican preventivamente y los tamaños se calibran mediante medición real

DECISIONES QUE SIGUEN ABIERTAS:
Ninguna correspondiente a E4.A. Las decisiones temáticas de cada mazmorra corresponden a sus etapas posteriores.

SIGUIENTE ETAPA RECOMENDADA:
E4.B — Alcantarilla expandida

OBJETIVO DE LA SIGUIENTE ETAPA:
Dar identidad jugable propia a la Alcantarilla utilizando perfiles de habitación, destructibles, registrables, interactuables y ambiente integrado al terreno.

PRIMEROS ARCHIVOS A REVISAR:
- docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md
- src/config/mapas/mapas.json
- src/juego/generacion/PlanificadorPoblacionMazmorra.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- GeneradorTerreno como única fuente canónica de geometría procedural
- ecuación canónica y extensible de presupuesto de población mediante cálculos paralelos o excepciones por mapa
- movimiento, combate, FOV, IA, botín real y persistencia canónicos

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
La etapa puede marcarse Cerrada cuando la Alcantarilla posea perfiles reconocibles, contenido jugable coherente con su ambientación, destructibles/interactuables funcionales, presupuesto respetado, habitaciones ambientales reservadas y una regresión satisfactoria del flujo completo del mapa.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(mapas): ampliar mazmorras y canonizar presupuesto por habitación

- ampliar los rangos estructurales de las cinco mazmorras y su cantidad de habitaciones;
- incorporar reservas ambientales configurables de 1 a 3 habitaciones y un planificador canónico reutilizable;
- integrar ocupación, amenaza y valor esperado de recompensa en un presupuesto compartido por habitación;
- limitar el escalado ciego de enemigos, cofres y destructibles manteniendo las densidades como intención;
- extender validadores, métricas de generación y documentación del plan maestro;
- validar múltiples semillas, tamaños mínimo/medio/máximo, reproducibilidad, FOV, pathfinding, IA y regresión manual de juego.

----------------- FIN DEL ENLACE -----------------
