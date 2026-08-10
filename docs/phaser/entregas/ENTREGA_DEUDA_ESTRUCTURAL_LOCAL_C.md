# ENTREGA — Deuda estructural local C

## Base verificada

- Copia local: `/mnt/data/dm_deuda_c/Dark-Moon`
- `.git`: presente
- Rama: `main`
- HEAD base: `39ee92e6d5bbb36c22fb27e8b4d2bb202b452afa`
- GitHub `main` consultado durante la entrega: mismo SHA
- El ZIP presenta conversiones CRLF/LF en archivos versionados; antes de implementar se comprobó que no existían diferencias reales de contenido respecto de HEAD.

## Alcance aprobado

Última entrega de deuda estructural local:

1. consolidar infraestructura neutral de carga JSON y almacenamiento JSON;
2. separar parámetros y recursos de prueba de la configuración canónica de mapas;
3. conservar comportamiento, reproducibilidad, persistencia y compatibilidad web/Electron.

No entra la retirada de Canvas 2D ni ningún refactor grande de presentación.

## Cambios realizados

### Carga JSON

Se agregó `src/utilidades/CargadorJson.js` como única primitiva de `fetch` + control HTTP + parseo JSON.

La utilizan:

- `CargadorConfiguracion`;
- `ContextoProgresoMagico`;
- `CargadorIdiomas`;
- `PreferenciasInterfaz`;
- `BalanceAplicacion`;
- `DepuradorMagiaHabilidades`.

Cada consumidor continúa validando su propio contenido.

### Almacenamiento JSON

Se agregó `src/utilidades/AlmacenamientoJson.js` para operaciones técnicas de clave/valor JSON.

La utilizan:

- `PersistenciaJugador`;
- `PersistenciaBarraHabilidades`;
- `PersistenciaPreferenciasInterfaz`.

Las claves, versiones y reglas de validación permanecen en sus módulos de dominio/presentación correspondientes.

### Soporte de pruebas de mapas

`ParametrosPruebaMapa.js` se movió desde `src/juego/configuracion/` a `src/herramientas/depuracion/`.

Se agregó `src/herramientas/depuracion/RecursosPruebaMapa.js`, que fabrica el botín y portal de prueba fuera de `ConfiguracionInicial`.

`ConfiguracionInicial` ya no contiene:

- definiciones del botín de prueba;
- creación de `BotinSuelo` de prueba;
- creación del `PortalMapa` de prueba;
- búsqueda de posiciones para esos recursos;
- el campo temporal `cantidadPrueba` dentro de `plantilla.enemigos`.

La cantidad controlada de enemigos se transmite ahora como un override explícito de generación (`cantidadEnemigosRecurrentes`) sin modificar la plantilla canónica.

## Compatibilidad

- No se agregaron dependencias.
- Phaser continúa en 4.2.1.
- Electron y `darkmoon://` no fueron modificados.
- No se modificaron claves ni versiones persistidas.
- Los parámetros `mapa`, `nivel`, `semilla`, `botin`, `portal` y `enemigos` continúan disponibles.
- Canvas 2D permanece intacto en esta entrega.

## Validación automática realizada

### Sintaxis e imports

- 242 archivos JS bajo `src/` y `electron/`: sintaxis correcta.
- 244 módulos JS analizados para imports: 0 imports relativos faltantes.
- ciclos ES detectados: 0.
- importación real de 16 módulos principales modificados: correcta.

### Reproducibilidad procedural

Se comparó la generación anterior y posterior sobre cinco semillas normales y cantidades forzadas de 5, 10, 15 y 40 enemigos recurrentes. Para 40 se utilizó una semilla de `sala_guerra` con capacidad suficiente.

Resultado: mismo mapa, posiciones, enemigos, variantes, interactuables procedurales y resúmenes funcionales. La única diferencia estructural intencional es la eliminación del campo diagnóstico legacy `cantidadForzadaPrueba`.

### Recursos de prueba

Se comparó una mazmorra con botín y portal de prueba antes y después del refactor.

Resultado: mismos tipos, nombres, posiciones, contenido de botín y solicitud de transición del portal.

### Parámetros de URL

Se compararon URLs válidas e inválidas antes/después.

Resultado: mismas entradas normalizadas y mismos errores de validación.

### Persistencia

Se compararon guardar/leer/eliminar para:

- jugador;
- barra de habilidades;
- preferencias de interfaz.

Resultado: contratos y datos equivalentes antes/después.

### Configuración e idiomas

Se cargaron mediante la nueva utilidad los catálogos generales, magia, idiomas y preferencias usando un transporte controlado equivalente a `fetch`.

Resultado: carga y validación correctas.


### Servido web estático

Se verificó por HTTP la carga de `index.html`, `balance.html`, las dos utilidades nuevas y los dos módulos de depuración movidos/agregados: todos respondieron HTTP 200.

Un primer intento utilizó el puerto 8765, que ya estaba ocupado por otro servidor y por eso no era una prueba válida de esta copia. Se repitió en el puerto 8877 desde la ruta correcta y la comprobación resultó satisfactoria.

## Pruebas manuales pendientes

1. iniciar partida normal sin parámetros;
2. continuar una partida guardada;
3. iniciar con `?mapa=...&nivel=...&semilla=...`;
4. probar `&botin=1` y comprobar el botín de prueba;
5. probar `&portal=1`, atravesarlo y comprobar que aparece otro portal de prueba;
6. probar `&enemigos=15` y una cantidad alta que el mapa pueda alojar;
7. modificar preferencias, recargar y verificar persistencia;
8. guardar/cargar progreso y barra de habilidades;
9. abrir `balance.html`;
10. revisar consola durante el recorrido.

## Riesgos pendientes

El principal riesgo es de integración manual: los recursos de prueba ahora se anexan después de crear la configuración canónica de la mazmorra. Las comparaciones automáticas verifican equivalencia, pero debe comprobarse en el navegador el recorrido real del portal y la interacción con el botín.

## Criterio de cierre

La entrega queda pendiente de aprobación manual. Una vez aprobada y commiteada, el bloque de deuda estructural local puede cerrarse y el siguiente trabajo es la validación de cobertura Phaser previa a retirar Canvas 2D.
