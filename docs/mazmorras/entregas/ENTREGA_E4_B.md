# ENTREGA E4.B — ALCANTARILLA EXPANDIDA

## Estado de esta entrega

**E4.B — Implementada, pendiente de validación manual.**

La implementación técnica está completa para pruebas. El Plan Maestro conserva E4.B en estado `Pendiente` hasta recibir la validación manual del responsable del proyecto.

No se realizó commit ni push. No se instalaron ni actualizaron dependencias.

Electron no fue ejecutado porque E4.B no modifica su integración y la copia de trabajo no contiene `node_modules`; no se instalaron dependencias para forzar esa prueba.

## Base de trabajo

- Repositorio de trabajo: `/mnt/data/e4b_impl/Dark-Moon`
- Rama: `main`
- Commit base / HEAD previo al commit: `38f74d26c814785581b48277175a6d2915ae6437`
- E4.A se recibió cerrada.
- `git -c core.autocrlf=true status` fue verificado antes de implementar y contenía un árbol limpio.

## Objetivo implementado

Dar identidad jugable propia a la Alcantarilla mediante perfiles de habitación, contenido físico funcional, recipientes registrables/destructibles y ambiente integrado al terreno, utilizando contratos reutilizables por las mazmorras actuales y futuras.

E4.B no incorpora contenido funerario, doméstico, militar ni de mando perteneciente a E4.C–E4.F.

## Arquitectura resultante

### Principio aplicado

Los nombres visuales no determinan la lógica.

No se crearon clases productivas `CajaHumeda`, `BarricadaImprovisada`, `RestosAbandonados`, `SuministrosMantenimiento` ni equivalentes. Las variantes se describen mediante JSON y utilizan contratos comunes.

Flujo:

```text
configuración de mapa
→ perfiles de habitación
→ familias/variantes configuradas
→ población canónica + presupuesto
→ entidades reales
→ interacción/destrucción/botín canónicos
→ Phaser representa el resultado
```

No existe ninguna comprobación productiva por nombre de mazmorra para resolver estas entidades.

### Familias configurables iniciales

Se agregaron catálogos de datos para:

- `recipiente`;
- `obstaculo`;
- `decoracion` destructible.

Variantes consumidoras reales de E4.B:

- `barril_madera` — recipiente;
- `caja_humeda` — recipiente;
- `suministros_mantenimiento` — recipiente;
- `barricada_improvisada` — obstáculo;
- `restos_abandonados` — decoración destructible con recompensa configurada.

Los catálogos definen únicamente datos necesarios por consumidores actuales: recurso visual, Vida, Armadura, bloqueo y, cuando corresponde, capacidad/prioridad de interacción.

### Recipiente canónico: una sola recompensa real

Un recipiente físico puede ser interactuado y destruido, pero posee **un único contenido real**.

```text
crear recipiente
→ resolver contenido una sola vez
→ almacenar instancias reales
```

Camino de interacción:

```text
abrir
→ retirar uno o varios objetos
→ el recipiente conserva solamente lo restante
```

Camino de destrucción:

```text
destruir
→ extraer solamente el contenido que todavía existe
→ depositar esas mismas instancias en BotinSuelo
```

No se vuelve a tirar la tabla al destruir un recipiente. Si ya fue saqueado completamente, destruirlo no genera nuevamente su contenido.

### Destrucción canónica

`ResolutorDerrotasJugador` se generalizó a `ResolutorDestruccionesJugador`.

El mismo punto canónico resuelve ahora:

- derrota de enemigos;
- destrucción de recipientes;
- destrucción de obstáculos;
- destrucción de decoraciones físicas.

Los enemigos conservan su resolución previa de experiencia, progresión y botín. Los objetos físicos no reciben experiencia.

Para objetos físicos existen dos fuentes de recompensa diferentes y explícitas:

1. contenido ya existente dentro de un recipiente, que se deposita sin regenerarlo;
2. `tablaBotin` propia de una decoración/obstáculo, que utiliza el `SistemaBotin` canónico.

### Generalización de barriles

El contrato de población dejó de ser `interactuables.barriles` y pasó a `interactuables.destructibles`.

La generalización no está limitada a las cinco mazmorras actuales. Cualquier futura plantilla puede declarar variantes compatibles con los mismos contratos.

Cementerio, Casa del Guerrero, Fortaleza abandonada y Sala de guerra continúan permitiendo solamente `barril_madera` en esta etapa, por lo que E4.B no les agrega identidad temática anticipadamente.

### Perfil de habitación

`PlanificadorPoblacionMazmorra` asigna perfiles usando una secuencia derivada de la semilla del mapa. Phaser no decide perfiles.

Alcantarilla configura:

- `deposito`;
- `almacen`;
- `desague`;
- `camara_inundada`;
- `mantenimiento`;
- `desperdicios`;
- `guarida` para la habitación especial;
- `ambiental` para las reservas ambientales de E4.A.

No se agregó una regla artificial de “cantidad mínima de perfiles diferentes”. La variedad surge de pesos configurables y se valida por muestreo.

Cada perfil puede decidir:

- variantes físicas permitidas;
- pesos de variantes;
- multiplicador de contenido físico;
- decoración ambiental visual.

`desague` y `camara_inundada` usan actualmente multiplicador físico 0 para poder distinguirse principalmente mediante el terreno y evitar llenar todos los espacios con objetos.

### Ambiente integrado al terreno

`CompositorTerrenoPhaser` sigue siendo el compositor existente. No se creó un segundo sistema visual.

La lógica canónica entrega a la escena el perfil de cada habitación y Phaser utiliza esa información para variar de forma determinista:

- charcos;
- rejillas;
- escombros;
- manchas.

Los pesos cambian según el perfil. Esas marcas siguen siendo ambiente integrado al piso: no son entidades, no bloquean y no ofrecen interacciones falsas.

## Contenido de Alcantarilla

### Recipientes

`barril_madera` y `caja_humeda` pueden usar la tabla `basico` de la Alcantarilla.

`suministros_mantenimiento` usa la tabla `mantenimiento`.

El contenido se define en la configuración del mapa; la lógica de `Destructible` no conoce Alcantarilla ni tablas concretas.

### Obstáculo

`barricada_improvisada`:

- Vida 24;
- Armadura 5;
- bloquea movimiento mientras existe;
- al destruirse deja de bloquear por medio de `SistemaEspacial` sin excepción específica.

### Decoración destructible

`restos_abandonados` utiliza una tabla de recompensa configurada por Alcantarilla y resuelta por `SistemaBotin`.

Esto demuestra el contrato necesario para futuros contenidos como una silla que pueda dejar madera sin crear una clase `Silla` ni un motor de botín propio.

## Presupuesto y orden de población

Los perfiles y destructibles continúan utilizando el presupuesto canónico de E4.A.

En mapas que ya declaran perfiles, los destructibles físicos se colocan antes de los enemigos recurrentes para que la identidad física de la habitación reserve su ocupación real; los enemigos utilizan el presupuesto y posiciones restantes.

En mapas que todavía no tienen perfiles, se conserva el orden histórico de E4.A para no recalibrar prematuramente E4.C–E4.F.

Esta diferencia se determina por capacidad/configuración (`perfilesHabitacion`), no por nombre de mapa.

Cuando una habitación todavía dispone de presupuesto de amenaza pero no tiene una posición físicamente válida después del contenido compartido, la población registra esa omisión como `cantidadNoColocadaPorCapacidadFisica` en vez de tratarla como corrupción del mapa.

## Archivos modificados

- `src/aplicacion/Aplicacion.js`
- `src/aplicacion/ControladorPartida.js`
- `src/config/idiomas/en.json`
- `src/config/idiomas/es.json`
- `src/config/mapas/mapas.json`
- `src/entidad/destructible/Destructible.js`
- `src/herramientas/balance/AnalizadorBalanceJuego.js`
- `src/herramientas/balance/AnalizadorBalanceRegresion.js`
- `src/herramientas/balance/BalanceAplicacion.js`
- `src/herramientas/depuracion/DepuradorMagiaHabilidades.js`
- `src/herramientas/depuracion/ValidadorInfraestructuraEntidades.js`
- `src/herramientas/depuracion/ValidadorInteractuablesMazmorra.js`
- `src/herramientas/depuracion/ValidadorPoblacionMazmorra.js`
- `src/interfaz/graficos/AdaptadorEscenaJuego.js`
- `src/interfaz/graficos/phaser/CompositorTerrenoPhaser.js`
- `src/interfaz/interacciones/AdaptadorInteraccionesDom.js`
- `src/juego/Juego.js`
- `src/juego/botin/SistemaBotin.js`
- `src/juego/combate/SistemaCombateJugador.js`
- `src/juego/configuracion/CargadorConfiguracion.js`
- `src/juego/configuracion/ConfiguracionInicial.js`
- `src/juego/configuracion/ValidadorConfiguracionMapas.js`
- `src/juego/fabricas/FabricaDestructibles.js`
- `src/juego/fabricas/FabricaEntidadesMazmorra.js`
- `src/juego/generacion/GeneradorContenidoMapa.js`
- `src/juego/generacion/PlanificadorPoblacionMazmorra.js`
- `src/juego/generacion/PobladorEnemigosMazmorra.js`
- `src/juego/generacion/PobladorInteractuablesMazmorra.js`
- `src/objetos/ContenedorObjetos.js`
- `src/partida/GestorMapasPartida.js`

## Archivos agregados

- `src/config/entidades/mazmorra/Recipientes.json`
- `src/config/entidades/mazmorra/Obstaculos.json`
- `src/config/entidades/mazmorra/Decoraciones.json`
- `src/juego/configuracion/ValidadorConfiguracionEntidadesMazmorra.js`
- `src/juego/combate/ResolutorDestruccionesJugador.js`
- `assets/imagenes/destructibles/caja_humeda.png`
- `assets/imagenes/destructibles/barricada_improvisada.png`
- `assets/imagenes/destructibles/restos_abandonados.png`
- `assets/imagenes/destructibles/suministros_mantenimiento.png`
- `docs/mazmorras/entregas/ENTREGA_E4_B.md`

## Archivos eliminados

- `src/entidad/destructible/Barril.js` — la variante barril pasa a configuración del comportamiento común `Destructible`.
- `src/juego/combate/ResolutorDerrotasJugador.js` — reemplazado por el resolutor canónico general de destrucciones.

Las búsquedas de regresión no encontraron imports/referencias productivas restantes a esos contratos eliminados.

## Archivos relevantes que no se modificaron

- `src/juego/generacion/GeneradorTerreno.js`
- `src/juego/generacion/PlanoMazmorra.js`
- movimiento canónico;
- FOV/percepción;
- IA/pathfinding;
- cámara Phaser;
- persistencia del jugador;
- `package.json`;
- `package-lock.json`;
- Electron.

## Dependencias

**Ninguna nueva.**

No se instaló ni actualizó Phaser, Electron, Node, npm, librerías ni frameworks.

## Persistencia

No se modificó el contrato de persistencia.

Los perfiles y las entidades físicas forman parte de la expedición generada, igual que enemigos, cofres y barriles anteriores. No se creó un segundo estado persistente de mazmorra.

La validación manual todavía debe comprobar el flujo de guardar/cargar y volver a entrar a una mazmorra.

## Compatibilidad web y Electron

### Web

La arquitectura continúa siendo estática y relativa. Se verificaron mediante servidor HTTP local con respuesta 200:

- `/index.html`;
- `/game.js`;
- `mapas.json`;
- los tres catálogos nuevos de entidades;
- `ResolutorDestruccionesJugador.js`;
- los cuatro PNG nuevos.

No se agregó backend, CDN ni bundler.

### Electron

No se modificaron archivos de Electron ni dependencias.

No se ejecutó Electron en esta copia porque `node_modules` no está presente y la etapa no autoriza instalar dependencias para esa prueba. Se considera compatibilidad arquitectónica heredada, no una prueba ejecutada.

## Validaciones ejecutadas

### 1. Configuración y referencias cruzadas

Se parsearon y validaron:

- `mapas.json`;
- `Recipientes.json`;
- `Obstaculos.json`;
- `Decoraciones.json`;
- idiomas ES/EN.

El validador común comprueba además que las variantes declaradas por los mapas existan y que solamente los recipientes puedan recibir tablas de contenido.

**Estado:** Correcto.

### 2. Infraestructura genérica de entidades

`ValidadorInfraestructuraEntidades` comprueba:

- recursos visuales existentes;
- fábrica genérica de recipiente y obstáculo;
- entidades estructurales existentes (`puerta`, `cofre`) sin regresión;
- ID de variante desconocido rechazado;
- recipiente visible por el sistema de interacción como `ABRIR_CONTENEDOR`;
- destrucción de barricada libera realmente la casilla;
- decoración destructible resuelve su tabla mediante `SistemaBotin` una sola vez.

**Resultado:** `{ "valido": true }`.

### 3. Contenido único del recipiente

Se validaron tres casos:

1. destruir un recipiente lleno deposita exactamente las mismas instancias que ya contenía;
2. retirar una parte y destruir después deposita únicamente los objetos restantes;
3. saquearlo completamente y destruirlo después no produce una segunda recompensa.

La resolución repetida de la misma destrucción tampoco duplica el botín.

**Estado:** Correcto.

### 4. Generación real — 50 mapas

Se generaron 10 semillas reales por cada mazmorra utilizando el generador, planificador, pobladores y validadores productivos.

Resultado: **50/50 válidas; 0 errores**.

Métricas observadas:

| Mapa | Enemigos min/prom/max | Destructibles min/prom/max |
|---|---:|---:|
| Alcantarilla | 5 / 8,5 / 14 | 3 / 4,7 / 7 |
| Cementerio | 10 / 15,8 / 19 | 6 / 9,3 / 14 |
| Casa del Guerrero | 11 / 13,6 / 16 | 9 / 11,7 / 17 |
| Fortaleza abandonada | 13 / 15,8 / 19 | 15 / 20,4 / 25 |
| Sala de guerra | 22 / 28,7 / 37 | 14 / 17,2 / 20 |

### 5. Regresión contra E4.A de los otros cuatro mapas

Se extrajo una copia limpia del commit base E4.A y se compararon las mismas 10 semillas.

Cementerio, Casa del Guerrero, Fortaleza abandonada y Sala de guerra conservaron **exactamente los mismos rangos y promedios de enemigos y destructibles** que E4.A.

Por lo tanto, migrar el contrato `barriles → destructibles` no adelanta el balance temático de E4.C–E4.F.

### 6. Alcantarilla mínima, media y máxima

Se forzaron diez semillas para cada escala:

| Tamaño | Habitaciones | Enemigos min/prom/max | Destructibles min/prom/max | Perfiles distintos observados por mapa* |
|---|---:|---:|---:|---:|
| 48×30 | 8 | 2 / 6,0 / 11 | 2 / 3,2 / 5 | 4–5 |
| 54×34 | 10 | 5 / 8,6 / 12 | 1 / 4,5 / 7 | 6–7 |
| 60×38 | 11 | 5 / 9,7 / 14 | 2 / 5,4 / 8 | 6–7 |

\* Incluye `ambiental` y `guarida` cuando corresponden.

Las 30 generaciones respetaron dimensiones/habitaciones solicitadas, presupuesto y reserva ambiental.

El mínimo observado de dos enemigos en una semilla pequeña es válido estructuralmente; su sensación de densidad queda expresamente pendiente de la prueba manual.

### 7. Cobertura de perfiles y variantes

En 50 semillas adicionales de Alcantarilla aparecieron los ocho perfiles configurados al menos una vez:

- `almacen`: 57 habitaciones;
- `ambiental`: 77;
- `camara_inundada`: 32;
- `deposito`: 62;
- `desague`: 48;
- `desperdicios`: 34;
- `guarida`: 50;
- `mantenimiento`: 53.

También aparecieron todas las variantes físicas actuales:

- `barricada_improvisada`: 10;
- `barril_madera`: 62;
- `caja_humeda`: 77;
- `restos_abandonados`: 49;
- `suministros_mantenimiento`: 33.

Ninguna de esas 50 generaciones quedó sin contenido físico.

Esta prueba no se convierte en una regla artificial de variedad mínima; solamente comprueba que los pesos configurados permiten expresar toda la identidad prevista.

### 8. Reproducibilidad

Cinco semillas de Alcantarilla se generaron dos veces y se compararon:

- matriz del mapa;
- entrada/salida;
- perfiles;
- presupuestos;
- destructibles y sus posiciones;
- cantidades de contenido;
- enemigos.

Las firmas fueron idénticas para una misma semilla. Dos semillas distintas produjeron resultados distintos.

**Estado:** Correcto.

### 9. Sintaxis, imports e integridad

- `node --check` sobre todos los JavaScript modificados/agregados: Correcto.
- JSON modificados/agregados: Correcto.
- `git diff --check`: Correcto.
- módulos lógicos puros de Juego/balance: imports correctos.
- búsqueda de referencias productivas a `Barril`, `generarBarrilesProcedurales`, `interactuables.barriles` y `ResolutorDerrotasJugador`: sin referencias obsoletas.
- búsqueda de `E4.B`/nombres de etapa en código productivo: sin resultados.

`BalanceAplicacion.js` no puede importarse como prueba aislada de Node porque accede a `document` al cargarse; es una herramienta DOM preexistente y esa limitación no se interpreta como prueba del navegador.

### 10. Assets

Los cuatro PNG nuevos fueron comprobados como:

- 64×64;
- RGBA;
- fondo transparente;
- rutas válidas desde los catálogos y servidor HTTP.

**Estado:** Correcto técnicamente; calidad/lectura visual pendiente de validación dentro del juego.

## Pruebas manuales pendientes

Antes de cerrar E4.B debe validarse dentro del juego, como mínimo:

1. entrar varias veces a Alcantarilla y recorrer semillas distintas;
2. comprobar que depósito, almacén, desagüe, cámara inundada, mantenimiento, desperdicios, guarida y habitaciones ambientales se sientan diferenciables sin necesidad de conocer su ID;
3. comprobar que desagüe/cámara inundada no se sientan vacíos por error, sino ambientalmente distintos;
4. abrir un barril, caja húmeda o suministros y recoger contenido;
5. recoger solamente parte de un recipiente, cerrarlo, destruirlo y confirmar que aparece en suelo únicamente lo restante;
6. saquear completamente un recipiente, destruirlo y confirmar que no entrega contenido por segunda vez;
7. destruir una barricada y comprobar que la casilla queda transitable;
8. destruir restos abandonados y comprobar su recompensa;
9. comprobar lectura visual, selección/ataque, zoom y cámara con los nuevos sprites;
10. comprobar que ningún objeto bloquee entrada, puertas, corredores críticos o salida;
11. comprobar movimiento en ocho direcciones, FOV, percepción e IA;
12. transición Ciudad ↔ Alcantarilla;
13. guardar/cargar y volver a entrar;
14. redimensionamiento y pantalla completa;
15. revisar consola del navegador;
16. recorrer al menos una de las otras cuatro mazmorras para confirmar que continúan con su contenido heredado.

## Riesgos y puntos a observar en prueba manual

- Una Alcantarilla mínima puede generar una población hostil bastante ligera; la métrica es válida pero debe juzgarse jugando.
- `desague` y `camara_inundada` priorizan ambiente y actualmente no colocan destructibles físicos; verificar si la diferencia visual es suficiente.
- Los assets nuevos son funcionales pero su integración estética definitiva debe juzgarse en movimiento, con FOV, zoom y otros elementos superpuestos.
- El orden físico primero / enemigos después se activa por presencia de perfiles y será heredable por futuras mazmorras cuando comiencen sus propias etapas.

## Estado del Plan Maestro

`docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md` **no fue modificado**.

E4.B debe permanecer `Pendiente` hasta la aprobación manual. Al cerrar se actualizará únicamente su campo Estado, sin SHA ni bitácora Git.

## Conventional Commit

Pendiente de cierre manual.

El mensaje definitivo se propondrá después de la validación jugable y representará solamente lo implementado.

## ENLACE PARA LA SIGUIENTE ETAPA

Pendiente de cierre de E4.B. No se avanzó a E4.C.
