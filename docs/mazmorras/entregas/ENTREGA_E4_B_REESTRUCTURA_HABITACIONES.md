# ENTREGA E4.B.ReestructuraHabitaciones — Composición dirigida de habitaciones y modularización de mapas

**Estado:** Cerrada — validación jugable manual satisfactoria

## 1. Base verificada

- Repositorio local de trabajo: `/mnt/data/e4_reestructura/Dark-Moon`
- Rama: `main`
- Commit base / HEAD antes de implementar: `3c4ca4651455e6646a451c39ae90d73ac503ec76`
- Estado inicial: limpio con `git -c core.autocrlf=true status`
- Commit realizado durante esta entrega: ninguno
- Push realizado: ninguno
- Dependencias instaladas o actualizadas: ninguna

E4.B estaba funcionalmente cerrada y commiteada en el SHA anterior. Durante esta etapa se corrigió también la documentación de cierre de E4.B que había quedado desactualizada en el ZIP confirmado.

## 2. Objetivo aprobado

Reestructurar la configuración y población interior de las mazmorras para combinar:

- generación procedural de la geometría;
- diseño humano controlado de la composición interior;
- perfiles asignados por cupos mínimo/máximo;
- presupuesto canónico por habitación;
- población hostil posterior al contenido físico;
- un único contrato reutilizable por las mazmorras actuales y futuras.

La etapa no modifica la geometría canónica, combate, movimiento, FOV, IA, botín, persistencia ni Phaser.

## 3. Resultado implementado

### 3.1 Configuración de mapas modularizada

El archivo monolítico `src/config/mapas/mapas.json` se reemplazó por:

- `src/config/mapas/Alcantarilla.json`
- `src/config/mapas/Cementerio.json`
- `src/config/mapas/CasaGuerrero.json`
- `src/config/mapas/FortalezaAbandonada.json`
- `src/config/mapas/SalaGuerra.json`

`CargadorConfiguracion.js` recompone en memoria el mismo contrato heredado:

```text
configuracionMapas.plantillas
├── alcantarilla
├── cementerio
├── casa_guerrero
├── fortaleza_abandonada
└── sala_guerra
```

Los consumidores no dependen de cómo están físicamente divididos los JSON.

Las otras cuatro mazmorras conservaron su configuración funcional previa. Solamente se trasladó su reserva ambiental desde `poblacion.habitacionesAmbientales` a la sección canónica `habitaciones.ambientales`.

### 3.2 Sección canónica `habitaciones`

Cada mapa posee ahora una sección `habitaciones` independiente de `generacion.habitaciones`:

- `generacion.habitaciones` continúa describiendo dimensiones geométricas;
- `habitaciones` describe uso, perfiles y composición interior.

Alcantarilla es el primer consumidor completo del nuevo contrato.

### 3.3 Perfiles por cupos

Alcantarilla dejó de decidir todos sus perfiles normales exclusivamente mediante probabilidad.

Cupos configurados:

| Perfil | Mínimo | Máximo |
|---|---:|---:|
| depósito | 1 | 2 |
| mantenimiento | 1 | 2 |
| desagüe | 1 | 2 |
| desperdicios | 1 | 2 |
| almacén | 0 | 1 |
| cámara inundada | 0 | 1 |

El planificador:

1. reserva entrada, especial y ambientales;
2. satisface los mínimos de perfiles normales;
3. distribuye las habitaciones sobrantes por peso entre perfiles que aún no alcanzaron su máximo.

El validador comprueba que los mínimos y máximos puedan cubrir matemáticamente todos los tamaños posibles de la plantilla.

### 3.4 Composiciones humanas de grilla

Cada perfil migrado dispone como mínimo de:

- una composición horizontal;
- una composición vertical.

La grilla utiliza:

- `.` para casilla libre;
- símbolos definidos en `leyenda` para entidades obligatorias;
- `?` para slots opcionales.

Las relaciones espaciales se expresan directamente dibujando los elementos en la grilla. No se introdujo una abstracción específica para relaciones como mesa+sillas.

### 3.5 Slots opcionales `?`

Los slots `?` permiten variación sin debilitar la identidad mínima de la composición.

Pueden omitirse por:

- tirada configurada;
- presupuesto insuficiente;
- posición no disponible;
- restricciones de conectividad.

La parte obligatoria de la composición no depende del slot opcional.

### 3.6 Posiciones contra pared

Una composición puede marcar celdas locales mediante `contraPared`.

El aplicador solamente acepta esas posiciones si la casilla real queda adyacente cardinalmente a una pared exterior de la habitación.

Esta regla pertenece a la colocación de la composición y no a la lógica de la entidad.

### 3.7 Aplicador canónico de composiciones

Se agregó:

`src/juego/generacion/AplicadorComposicionesHabitacion.js`

Responsabilidad única:

> traducir una composición humana configurada a posiciones reales válidas dentro de una habitación ya generada.

No crea habitaciones, paredes, pasillos ni entidades.

La composición obligatoria es atómica:

- si puede aplicarse completa, se propone;
- si no puede aplicarse completa, se descarta esa aplicación;
- nunca se degrada silenciosamente eliminando elementos obligatorios.

### 3.8 Presupuesto canónico conservado

Las entidades de la composición utilizan los costos ya canonizados en E4.A:

- ocupación;
- amenaza;
- valor/recompensa.

La suma obligatoria debe caber en el presupuesto de la habitación antes de materializarse.

No se creó una segunda ecuación de capacidad.

### 3.9 Orden de población

Para mapas migrados a composiciones, el orden queda:

1. geometría existente;
2. plan de habitaciones/perfiles;
3. portal, puertas y contenido estructural obligatorio;
4. composición física dirigida;
5. cofres moderados opcionales;
6. enemigos únicos y recurrentes utilizando presupuesto y espacio restantes.

La identidad diseñada de una habitación tiene prioridad sobre contenido opcional.

### 3.10 Compatibilidad temporal

Cementerio, Casa del Guerrero, Fortaleza abandonada y Sala de guerra conservan temporalmente la estrategia histórica de población hasta E4.C–E4.F.

Esta compatibilidad está identificada como deuda temporal controlada. El Plan Maestro exige que al cerrar E4.F se audite y elimine cualquier código, configuración o comentario productivo restante de la estrategia antigua.

## 4. Archivos agregados

- `src/config/mapas/Alcantarilla.json`
- `src/config/mapas/Cementerio.json`
- `src/config/mapas/CasaGuerrero.json`
- `src/config/mapas/FortalezaAbandonada.json`
- `src/config/mapas/SalaGuerra.json`
- `src/juego/generacion/AplicadorComposicionesHabitacion.js`
- `docs/mazmorras/entregas/ENTREGA_E4_B_REESTRUCTURA_HABITACIONES.md`

## 5. Archivos modificados

- `README.md`
- `docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md`
- `docs/mazmorras/entregas/ENTREGA_E4_B.md`
- `docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md`
- `src/herramientas/depuracion/ValidadorInteractuablesMazmorra.js`
- `src/herramientas/depuracion/ValidadorPoblacionMazmorra.js`
- `src/juego/configuracion/CargadorConfiguracion.js`
- `src/juego/configuracion/SelectorMapa.js`
- `src/juego/configuracion/ValidadorConfiguracionMapas.js`
- `src/juego/generacion/GeneradorContenidoMapa.js`
- `src/juego/generacion/PlanificadorPoblacionMazmorra.js`
- `src/juego/generacion/PobladorInteractuablesMazmorra.js`

## 6. Archivo eliminado

- `src/config/mapas/mapas.json`

No debe conservarse una copia productiva del archivo monolítico.

## 7. Sistemas deliberadamente no modificados

- `GeneradorTerreno.js`
- `PlanoMazmorra.js`
- movimiento;
- combate;
- resolución de destrucciones;
- botín;
- FOV y percepción;
- IA;
- persistencia;
- cámara y zoom Phaser;
- familias/configuración de entidades de mazmorra;
- Electron;
- dependencias npm.

No se agregaron assets ni contenido de Cementerio.

## 8. Validaciones ejecutadas

### 8.1 Configuración combinada

**Preparación:** cargar los cinco JSON y recomponer `{ plantillas }`.

**Resultado esperado:** cinco plantillas válidas bajo el contrato heredado.

**Resultado obtenido:** `OK mapas 5`.

**Estado:** Correcto.

### 8.2 Cargador real mediante HTTP

Se ejecutó un servidor HTTP local y se llamó al `cargarConfiguracionMapas()` productivo, redirigiendo únicamente el transporte `fetch` al servidor de prueba.

Resultado:

```text
alcantarilla,cementerio,casa_guerrero,fortaleza_abandonada,sala_guerra
```

**Estado:** Correcto.

### 8.3 Equivalencia de las cuatro mazmorras todavía no migradas

Se comparó su configuración contra `mapas.json` del commit base, normalizando únicamente el traslado de la reserva ambiental a `habitaciones.ambientales`.

Resultado:

```text
cementerio EQUIVALENTE
casa_guerrero EQUIVALENTE
fortaleza_abandonada EQUIVALENTE
sala_guerra EQUIVALENTE
```

**Estado:** Correcto.

### 8.4 Generación integral — 100 mapas

20 semillas reales por cada una de las cinco mazmorras, utilizando generador, población y validadores productivos.

Resultado:

- Alcantarilla: 20/20
- Cementerio: 20/20
- Casa del Guerrero: 20/20
- Fortaleza abandonada: 20/20
- Sala de guerra: 20/20
- Total: **100/100 correctas**

Las advertencias históricas de densidad versus capacidad de las cuatro mazmorras aún no migradas continúan siendo las heredadas; no son fallos del nuevo modelo y serán retiradas junto con su estrategia temporal al migrar cada mapa.

### 8.5 Alcantarilla mínima, media y máxima

Se forzaron dimensiones y cantidad de habitaciones de los tres extremos/escala media y se generaron 10 semillas por escala.

Resultado:

- mínimo `48×30`: 10/10
- medio `54×34`: 10/10
- máximo `60×38`: 10/10
- total: **30/30 correctas**

**Estado:** Correcto.

### 8.6 Cupos de perfiles

Sobre 100 planes reales se observaron exactamente los rangos configurados:

| Perfil | Observado | Configurado |
|---|---:|---:|
| depósito | 1–2 | 1–2 |
| mantenimiento | 1–2 | 1–2 |
| desagüe | 1–2 | 1–2 |
| desperdicios | 1–2 | 1–2 |
| almacén | 0–1 | 0–1 |
| cámara inundada | 0–1 | 0–1 |

**Estado:** Correcto.

### 8.7 Composición completa y contra pared

Sobre 30 semillas de Alcantarilla:

- 247 habitaciones con composición verificadas;
- cada entidad obligatoria esperada apareció exactamente en la posición indicada por su composición;
- 197 posiciones configuradas `contraPared` fueron verificadas contra la matriz real del mapa.

**Estado:** Correcto.

### 8.8 Slots opcionales y orientaciones

Sobre 50 semillas:

- 619 colocaciones obligatorias;
- 148 colocaciones procedentes de slots opcionales;
- se utilizaron orientaciones horizontal y vertical.

Esto verifica que `?` introduce variación real y no se comporta como contenido obligatorio.

**Estado:** Correcto.

### 8.9 Reproducibilidad

10 semillas se generaron dos veces desde cero comparando:

- matriz estructural;
- habitaciones;
- perfiles;
- composiciones;
- orígenes;
- destructibles;
- enemigos relevantes para la población.

Resultado: **10/10 idénticas para la misma semilla**.

**Estado:** Correcto.

### 8.10 Casos inválidos

El validador rechazó correctamente:

- cupos matemáticamente imposibles;
- perfil sin composición vertical;
- composición que no cabe ni en la habitación máxima;
- slot `?` sin configuración opcional.

Resultado: **4/4 fallos detectados**.

### 8.11 Rutas web

Con servidor HTTP local:

- `index.html`: 200
- `game.js`: 200
- los cinco JSON nuevos: 200
- antiguo `src/config/mapas/mapas.json`: 404 esperado

**Estado:** Correcto.

### 8.12 Sintaxis y Git

- sintaxis de todos los JavaScript modificados: correcta;
- `git diff --check`: correcto.

**Estado:** Correcto.

## 9. Pruebas no afirmadas

No se ejecutó Electron porque esta etapa no necesita instalar dependencias y la copia no incluye `node_modules`.

El responsable del proyecto aprobó las pruebas jugables el **12 de agosto de 2026**. La validación manual se registra como **satisfactoria** y no se reportaron regresiones bloqueantes. No se atribuyen resultados individuales que no hayan sido informados explícitamente.

## 10. Validación manual de cierre

El responsable del proyecto dio por **aprobadas las pruebas** de E4.B.ReestructuraHabitaciones el **12 de agosto de 2026**.

La aceptación manual valida el resultado jugable global de la reestructuración. No se reportaron fallos bloqueantes sobre identidad de habitaciones, composiciones, circulación ni regresiones del flujo afectado.

No se inventan resultados manuales individuales: la evidencia disponible para el cierre es la aprobación global comunicada por el responsable del proyecto.

Con esta validación se satisface el criterio de cierre definido en el Plan Maestro.

## 11. Compatibilidad

### Web / GitHub Pages

La arquitectura continúa siendo estática. La modularización aumenta el número de JSON cargados, pero conserva rutas relativas y el contrato en memoria.

**Estado técnico:** compatible; rutas HTTP verificadas.

### Electron

No se modificó Electron ni se introdujo dependencia de Node en el juego.

**Estado arquitectónico:** compatible; ejecución Electron no realizada en esta entrega.

## 12. Persistencia

Sin cambios de contrato.

Las composiciones y perfiles pertenecen a la expedición generada, igual que la población actual. No se modificó la versión de guardado ni se creó persistencia paralela.

## 13. Riesgos y deuda controlada

- Las composiciones iniciales de Alcantarilla son deliberadamente simples; el nuevo contrato permite enriquecerlas sin crear clases o motores nuevos.
- La estrategia histórica sigue presente temporalmente para las cuatro mazmorras aún no migradas.
- Al cerrar E4.F debe auditarse y eliminarse por completo esa ruta histórica productiva.
- El modelo de composiciones debe seguir siendo interior a habitaciones existentes; no debe evolucionar hacia un generador geométrico paralelo.

## 14. Plan Maestro

Se actualizó el Plan Maestro porque la estrategia aprobada cambió formalmente:

- E4.B figura `Cerrada`;
- se agregó `E4.B.ReestructuraHabitaciones` como etapa intermedia;
- se documentaron cupos, composiciones H/V, slots `?`, posiciones contra pared y deuda temporal;
- se agregó la auditoría obligatoria de la estrategia histórica al cierre de E4.F.

Con la aprobación manual, `E4.B.ReestructuraHabitaciones` queda con Estado `Cerrada`. El Plan Maestro no registra SHA ni historial de commits.

## 15. Conventional Commit propuesto

No realizar automáticamente:

```text
refactor(mapas): dirigir composición de habitaciones por cupos

- modularizar las cinco configuraciones de mazmorra en JSON canónicos independientes;
- asignar perfiles de Alcantarilla mediante cupos reproducibles y composición humana controlada;
- incorporar composiciones horizontales y verticales con slots opcionales y posiciones contra pared;
- aplicar la identidad física antes de cofres opcionales y enemigos conservando el presupuesto canónico;
- mantener temporalmente la población histórica de los mapas aún no migrados y exigir su auditoría final en E4.F;
- validar configuración, reproducibilidad, tamaños, conectividad, regresión transversal y rutas web;
- actualizar documentación y Plan Maestro para la etapa intermedia aprobada.
```

## 16. Siguiente etapa

La siguiente etapa recomendada es **E4.C — Cementerio expandido**. No se implementó contenido de E4.C durante esta entrega.

El Cementerio deberá adoptar el contrato dirigido heredado: JSON canónico propio, perfiles por cupos, composiciones humanas de grilla, presupuesto canónico y población hostil posterior.

## 17. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Mazmorras Expandidas y Contenido Ambiental Jugable de Dark Moon.

ETAPA CERRADA:
E4.B.ReestructuraHabitaciones — Composición dirigida de habitaciones y modularización de mapas

ESTADO:
Cerrada

COMMIT BASE:
3c4ca4651455e6646a451c39ae90d73ac503ec76

HEAD FINAL VERIFICADO:
3c4ca4651455e6646a451c39ae90d73ac503ec76

GIT STATUS FINAL:
Cambios de E4.B.ReestructuraHabitaciones presentes y sin commit; no existen cambios ajenos conocidos. Verificación final realizada con `git -c core.autocrlf=true status`.

DOCUMENTO DE ENTREGA:
docs/mazmorras/entregas/ENTREGA_E4_B_REESTRUCTURA_HABITACIONES.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md — se incorpora la etapa intermedia, el modelo dirigido y su Estado Cerrada
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md — Sin cambios
- docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md — actualizado para reflejar un JSON canónico por mazmorra

OBJETIVO QUE SE COMPLETÓ:
Reestructurar la configuración y la población interior para combinar geometría procedural con diseño humano controlado mediante cupos de perfiles y composiciones completas de grilla, manteniendo el presupuesto y la conectividad canónicos.

ARQUITECTURA HEREDADA:
- `GeneradorTerreno` continúa como única fuente canónica de geometría procedural.
- Cada mazmorra posee un JSON canónico específico y `CargadorConfiguracion` recompone el contrato único `configuracionMapas.plantillas`.
- `PlanificadorPoblacionMazmorra` asigna perfiles mediante cupos mínimo/máximo y usa ponderación solo para habitaciones sobrantes.
- Las composiciones humanas se aplican únicamente al interior de habitaciones existentes y deben colocarse completas.
- Cada perfil migrado debe disponer como mínimo de una composición horizontal y una vertical.
- Los slots `?` son opcionales y las posiciones `contraPared` son restricciones de colocación, no lógica de entidad.
- Las composiciones consumen el presupuesto canónico antes de cofres opcionales y enemigos.
- La población histórica permanece temporalmente solo para mapas todavía no migrados y debe eliminarse totalmente al cierre de E4.F.

ARCHIVOS CLAVE:
- src/config/mapas/Cementerio.json: configuración canónica que E4.C deberá ampliar con perfiles y composiciones funerarias.
- src/juego/generacion/PlanificadorPoblacionMazmorra.js: contrato canónico de cupos, perfiles y presupuesto.
- src/juego/generacion/AplicadorComposicionesHabitacion.js: aplicación canónica de composiciones humanas sobre habitaciones existentes.
- src/juego/generacion/GeneradorContenidoMapa.js: orden canónico composición física → contenido opcional → enemigos.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser 4.2.1, Electron 43.3.0 y @electron/packager 20.0.1 se mantienen sin cambios.

PRUEBAS CLAVE SUPERADAS:
- 100/100 generaciones reales: 20 semillas por cada una de las cinco mazmorras.
- 30/30 Alcantarillas en tamaños mínimo, medio y máximo.
- cupos, composiciones H/V, slots `?`, posiciones contra pared y reproducibilidad validados.
- carga de los cinco JSON y regresión funcional de las cuatro mazmorras aún no migradas.
- validación jugable manual aprobada por el responsable del proyecto.

PROBLEMAS O RIESGOS PENDIENTES:
- La ruta histórica de población continúa temporalmente para Cementerio, Casa del Guerrero, Fortaleza abandonada y Sala de guerra. Debe auditarse y eliminarse completamente al cerrar E4.F.
- El modelo de composición debe mantenerse dentro de habitaciones generadas y no evolucionar hacia un segundo generador geométrico.

DECISIONES APROBADAS:
- un JSON canónico por mazmorra;
- generación procedural macro + diseño humano controlado micro;
- perfiles por cupos mínimo/máximo;
- composiciones obligatorias completas, con orientación horizontal y vertical;
- slots opcionales `?` y posiciones `contraPared`;
- relaciones espaciales simples representadas directamente en la grilla;
- presupuesto canónico consumido antes de la población hostil.

DECISIONES QUE SIGUEN ABIERTAS:
- Ninguna bloqueante para iniciar E4.C. La eliminación definitiva de la ruta histórica se auditará obligatoriamente al cerrar E4.F.

SIGUIENTE ETAPA RECOMENDADA:
E4.C — Cementerio expandido

OBJETIVO DE LA SIGUIENTE ETAPA:
Dar identidad jugable propia al Cementerio mediante contenido funerario funcional y perfiles de habitación diferenciados, migrándolo al modelo dirigido de cupos y composiciones.

PRIMEROS ARCHIVOS A REVISAR:
- src/config/mapas/Cementerio.json
- src/juego/generacion/PlanificadorPoblacionMazmorra.js
- src/juego/generacion/AplicadorComposicionesHabitacion.js
- src/juego/generacion/PobladorInteractuablesMazmorra.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- GeneradorTerreno como única fuente canónica de geometría procedural.
- presupuesto canónico de ocupación, amenaza y valor/recompensa.
- movimiento, combate, FOV, IA, botín y persistencia canónicos.
- contrato de composición dirigida mediante un motor geométrico paralelo.
- contenido de E4.D–E4.F antes de sus etapas.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
E4.C puede cerrarse cuando el Cementerio posea identidad jugable propia, perfiles diferenciados, contenido funerario funcional, presupuesto respetado, habitaciones ambientales reservadas y una regresión satisfactoria del mapa.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
refactor(mapas): dirigir composición de habitaciones por cupos

- modularizar las cinco configuraciones de mazmorra en JSON canónicos independientes;
- asignar perfiles de Alcantarilla mediante cupos reproducibles y composición humana controlada;
- incorporar composiciones horizontales y verticales con slots opcionales y posiciones contra pared;
- aplicar la identidad física antes de cofres opcionales y enemigos conservando el presupuesto canónico;
- mantener temporalmente la población histórica de los mapas aún no migrados y exigir su auditoría final en E4.F;
- validar configuración, reproducibilidad, tamaños, conectividad, regresión transversal, rutas web y pruebas jugables;
- actualizar documentación y Plan Maestro para cerrar la etapa intermedia aprobada.

----------------- FIN DEL ENLACE -----------------
