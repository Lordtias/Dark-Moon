# ENTREGA E4.A — EXPANSIÓN ESTRUCTURAL Y PRESUPUESTO DE POBLACIÓN

## Estado de esta entrega

**Implementación lista para validación manual.**

E4.A todavía no se marca como Cerrada en el Plan Maestro porque quedan comprobaciones visuales y de flujo completo dentro del juego que deben ejecutarse en un navegador real: cámara/zoom, redimensionamiento, transición Ciudad ↔ Mazmorra y guardado/carga. Electron tampoco se ejecutó porque la copia de trabajo no contiene `node_modules` y la etapa no autoriza instalar dependencias.

## Base de trabajo

- Repositorio: `/mnt/data/darkmoon_e4a_work/Dark-Moon`
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

La comprobación manual guardar → cargar → nueva mazmorra queda pendiente antes de cerrar la etapa.

## Compatibilidad web

No se agregaron servidores, bundlers, CDNs ni dependencias. Las rutas estáticas principales respondieron correctamente mediante HTTP local.

Queda pendiente la regresión manual de juego completo en navegador.

## Compatibilidad Electron

No se modificó Electron.

La copia de trabajo no contiene `node_modules`. No se instalaron dependencias porque E4.A no lo autoriza. Por tanto, Electron no fue ejecutado en esta entrega.

## Pruebas manuales pendientes para cierre

1. Crear personaje y entrar en cada una de las cinco mazmorras varias veces.
2. Confirmar visualmente que el mapa es claramente mayor que la pantalla.
3. Recorrer habitaciones y verificar que existen pausas ambientales reales.
4. Confirmar que las habitaciones ambientales no contienen enemigos, cofres ni barriles de valor.
5. Probar movimiento en ocho direcciones alrededor de puertas, cofres, barriles y enemigos.
6. Probar cámara con I/J/K/L, arrastre, recentrado y seguimiento del jugador.
7. Probar zoom mínimo y máximo.
8. Redimensionar la ventana y alternar pantalla completa.
9. Comprobar FOV/descubrimiento mientras se recorre un mapa grande.
10. Provocar detección y persecución de varios enemigos.
11. Llegar a la salida y volver a Ciudad.
12. Guardar/cargar y volver a entrar a una mazmorra.
13. Repetir especialmente Sala de guerra para evaluar si 20–34 enemigos distribuidos en 13–17 habitaciones se siente razonable o requiere calibración.
14. Revisar consola por errores.

## Riesgos y pendientes

- Los rangos estructurales ya son técnicamente válidos, pero su ritmo jugable necesita validación manual antes de considerarlos definitivos.
- En algunas semillas de Alcantarilla el presupuesto compartido puede dejar cero barriles después de cofres y enemigos. Es válido para el contrato actual, pero conviene observar si visualmente deja demasiado poco contenido antes del cierre.
- La amenaza usa actualmente la XP del enemigo como primer indicador canónico. Puede enriquecerse en el futuro mediante nuevos componentes sin reemplazar la ecuación.
- El valor esperado usa `valorBase`; una futura valoración de rareza/afijos debe agregarse como extensión del mismo componente, no como cálculo paralelo.
- La prueba visual en navegador y la prueba Electron siguen pendientes.

## Documento maestro

Se actualizó `docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md` únicamente para reflejar decisiones canónicas aprobadas durante E4.A:

- reserva ambiental configurable entre 1 y 3;
- semántica de rango fijo como `2/2`;
- aplicabilidad a futuras mazmorras;
- ecuación canónica/extensible de presupuesto;
- máximos por habitación para impedir escalado indefinido.

El Estado de E4.A permanece **Pendiente** hasta superar la validación manual de cierre. No se agregó ningún SHA al Plan Maestro.

## Conventional Commit propuesto cuando la etapa quede validada

```text
feat(mapas): ampliar mazmorras y canonizar presupuesto por habitación

- ampliar los rangos estructurales de las cinco mazmorras y su cantidad de habitaciones;
- incorporar reservas ambientales configurables de 1 a 3 habitaciones y un planificador canónico reutilizable;
- integrar ocupación, amenaza y valor esperado de recompensa en un presupuesto compartido por habitación;
- limitar el escalado ciego de enemigos, cofres y destructibles manteniendo las densidades como intención;
- extender validadores, métricas de generación y documentación del plan maestro;
- validar múltiples semillas, tamaños mínimo/medio/máximo, reproducibilidad, FOV, pathfinding e IA en mapas ampliados.
```

No realizar el commit hasta completar y aprobar la validación manual.
