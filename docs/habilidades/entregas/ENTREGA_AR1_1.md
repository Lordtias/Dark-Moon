# Entrega AR1.1 — Cierre técnico de habilidades de Arco

## Base de verdad

- Fuente utilizada: `Dark-Moon-AR1.zip` entregado por el usuario.
- Rama: `main`.
- HEAD contenido en el ZIP: `28aa6434941a04e90f14ce29707bbe8bdb27b57f`.
- AR1 se encontraba como cambios funcionales no commiteados sobre ese HEAD; por eso el incremental AR1.1 se calcula contra el contenido exacto de `Dark-Moon-AR1.zip`, no contra `git HEAD`.
- CD2 — Resistencias negativas y vulnerabilidades continúa fuera de alcance.

## Objetivo

Cerrar las correcciones detectadas durante la auditoría de AR1 sin alterar el balance aprobado de Disparo múltiple, Disparo potente, Francotirador ni Disparo evasivo, y extender el diseño de nodos conectados a cualquier maestría mediante un contrato único de relaciones.

## Cambios realizados

### Munición independiente de proyectiles

Las habilidades de arma separan explícitamente:

- `requiereMunicion`: determina si la acción necesita un recurso de munición compatible;
- `consumeMunicion`: determina si ese recurso se descuenta al ejecutar;
- `cantidadMunicion`: cantidad validada/consumida en cada grado;
- `cantidadProyectiles`: número de resoluciones/proyectiles de la habilidad.

La preparación de una habilidad sin munición ya no puede ser invalidada posteriormente por las reglas del ataque básico del arco. Cuando existe munición requerida, se valida al preparar y nuevamente antes de ejecutar. Reemplazar una preparación continúa sin consumir flechas.

### Eventos tácticos canónicos

Se incorpora `TIPOS_EVENTO_ESTADO_TACTICO` y la validación correspondiente. Las políticas ya no aceptan silenciosamente strings desconocidos. Los eventos productivos son:

- `movimiento`;
- `espera`;
- `accion`;
- `consumo`;
- `danio_recibido`;
- `habilidad_ejecutada`;
- `accion_ejecutada`.

Los consumidores usan el registro canónico en lugar de literales repetidos.

### Francotirador y acciones fallidas

Una interrupción táctica por acción se procesa únicamente después de un resultado con `exito=true`. Intentar una interacción/acción inválida no elimina `Apuntando`, porque no ocurrió un hecho jugable que rompa la concentración. Movimiento real, espera, consumo, habilidades incompatibles y daño hostil continúan utilizando las políticas aprobadas.

### Desplazamiento táctico completo en presentación

El dominio mantiene separadas la regla espacial y la forma visual. Phaser dispone ahora de una representación explícita para:

- `movimiento`: desplazamiento normal;
- `dash`: movimiento continuo y rápido;
- `salto`: arco corto con comportamiento de sombra;
- `teletransporte`: desaparición, reposicionamiento canónico y reaparición.

La forma visual no modifica obstáculos ni permisos espaciales. Disparo evasivo continúa usando `paso_a_paso + salto` y conserva el resultado 2/1/0 casillas según disponibilidad.

### Disparo potente

`estela_cometa_sutil` deja de representarse como una sucesión estática de marcas en toda la trayectoria. La estela se crea adherida al proyectil, viaja con la flecha y se desvanece con ella. El efecto se mantiene breve y no elemental.

### UI e internacionalización

Los textos nuevos del detalle de habilidades de arma pasan a los catálogos ES/EN. También se traducen las formas visuales de desplazamiento y los tipos de interrupción de estados tácticos para no exponer identificadores internos en inglés.

### Árbol de habilidades universal

Se incorpora `ContratosArbolHabilidades.js` con dos tipos de relación:

- `modificacion`: relación directa donde una habilidad modifica a otra;
- `sinergia`: interacción relevante que no representa un requisito.

Cada habilidad puede declarar `relacionesArbol` sin importar si pertenece a magia, armas, armaduras o una maestría futura. El validador comprueba:

- tipo de relación conocido;
- destino existente;
- ausencia de autorrelación;
- ausencia de duplicados;
- misma maestría, salvo que en el futuro se apruebe explícitamente un contrato transversal.

`OrganizadorArbolHabilidades` combina las relaciones declaradas con las inferidas desde modificadores existentes. No contiene ramas por maestría ni casos por ID.

Arcos declara 14 relaciones reales: las cuatro pasivas de arma conectan con Disparo múltiple, Disparo potente y Disparo evasivo, mientras Francotirador declara sinergia únicamente con Disparo potente y Disparo evasivo. No se crea una conexión Francotirador → Disparo múltiple porque esa combinación fue aprobada como incompatible.

## Balance sin cambios

AR1.1 no modifica:

- 2/3/4 proyectiles y 60/50/45% de Disparo múltiple;
- 160/185/210% y preparación ×1,80/1,70/1,60 de Disparo potente;
- bonificaciones de Francotirador;
- 65/75/85% y retroceso de hasta dos casillas de Disparo evasivo;
- daño base, Dispersión o Penetración natural de los arcos;
- afijos existentes.

## Validaciones automáticas

- 292 JavaScript: sintaxis correcta.
- 40 JSON: parseo correcto.
- 0 imports relativos faltantes.
- 108 habilidades: progresión válida.
- 108 habilidades: ejecución válida.
- Árboles mágicos conservan relaciones existentes y Arcos genera 14 conexiones.
- Validaciones negativas de árbol: destino inexistente, cruce de maestría y tipo desconocido fallan explícitamente.
- Política de munición sin munición requerida: válida y sin obligación de quiver.
- `consumeMunicion=true` con `requiereMunicion=false`: rechazado.
- Evento táctico desconocido: rechazado.
- Acción fallida: no interrumpe; acción exitosa: sí procesa la interrupción configurada.
- Preparación y concentración: una preparación reemplaza a la anterior sin duplicarse y `Apuntando` puede coexistir/sobrevivir al reemplazo.
- Disparo evasivo: desplazamiento 2/1/0 comprobado con forma visual `salto`.
- Representación de `dash` y `teletransporte`: reproducción genérica comprobada con destino final y restauración de alpha.
- Estela `estela_cometa_sutil`: creación móvil adherida al proyectil comprobada con un mock de presentación.
- i18n ES/EN: nuevas claves y traducciones de formas/eventos comprobadas.
- Búsqueda de casos por ID en JavaScript para `disparo_multiple`, `disparo_potente`, `francotirador`, `disparo_evasivo` y `apuntando`: 0.
- Smoke web: `index.html`, `game.js`, JSON, módulos nuevos/corregidos y CSS responden HTTP 200.

## Pendientes fuera de alcance

- Los cuatro iconos definitivos propios de las habilidades continúan siendo contenido gráfico pendiente; la configuración sigue usando recursos temporales existentes.
- El balance fino se realizará mediante gameplay posterior.
- CD2 — Resistencias negativas y vulnerabilidades permanece como siguiente etapa de combate.

## Dependencias

No se agregan dependencias ni se modifica `package.json`.

## Persistencia

No se modifica la versión de guardado. Preparaciones y estados tácticos continúan siendo transitorios y no se persisten.

## Conventional Commit propuesto

`fix(habilidades): cerrar contratos y conexiones de AR1`
