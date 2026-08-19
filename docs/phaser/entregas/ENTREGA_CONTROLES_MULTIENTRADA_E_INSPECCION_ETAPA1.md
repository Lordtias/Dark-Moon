# ENTREGA — Controles multientrada e inspección de entidades — Etapa 1

## Estado

- Estado de la etapa: **CERRADA**.
- Fecha de cierre: **19/08/2026**.
- Commit base verificado: `810cbc0a0814da90122baeedf3b523fa5967706d`.
- Pruebas funcionales manuales: **APROBADAS por el usuario**.
- Dependencias nuevas: ninguna.
- Commit realizado: no.
- Push realizado: no.

## Objetivo cerrado

La etapa incorporó una entrada multientrada coherente para teclado, mouse, touch, barra de habilidades y acciones contextuales sin crear motores paralelos por dispositivo.

El principio consolidado es:

`entrada → comando canónico → lógica existente → resultado → presentación`

Mouse, touch, barra y modales traducen intenciones; no resuelven por sí mismos movimiento, combate, interacción ni turnos.

## Alcance final aprobado

### Movimiento mediante puntero

- Clic/tap sobre una casilla caminable puede apuntar a cualquier destino visible del mapa.
- Se calcula el mejor camino disponible.
- Se ejecuta **solamente el siguiente paso**.
- El destino no queda almacenado y no existe una cola de movimiento.
- Cada nueva pulsación vuelve a calcular desde el estado actual.
- El paso final continúa atravesando `SistemaMovimientoJugador`.

### Pathfinding compartido

`BuscadorCamino` dejó de pertenecer conceptualmente a IA y pasó a `src/juego/espacio/BuscadorCamino.js`.

Ahora es una utilidad espacial compartida por:

- IA enemiga;
- movimiento del jugador solicitado por mouse/touch.

No se duplicaron reglas de terreno, entidades, diagonales ni zonas bloqueantes.

### Selección y confirmación

Durante combate, interacción o habilidad:

- pulsar otra casilla cambia la selección;
- pulsar nuevamente la casilla seleccionada confirma;
- la confirmación no depende de un doble clic rápido;
- teclado y puntero convergen en los mismos comandos.

### Cámara

Se mantienen y amplían las alternativas de entrada:

- `IJKL`: desplazamiento de cámara;
- `H`: recentrar;
- `+/-` y rueda: zoom;
- doble clic: recentrar;
- doble tap: recentrar;
- mouse central/derecho + arrastre: desplazar cámara;
- mantener touch + arrastrar: desplazar cámara sin ejecutar una acción jugable al soltar.

El gesto táctil de arrastre funciona también durante un selector sin confirmar accidentalmente la selección.

### Inspección genérica de entidades

Se incorporó un único detalle de entidad reutilizable.

La vista no contiene condicionales por clases concretas como Enemigo, NPC o Cofre. Recibe un contrato de presentación compuesto por:

- identidad;
- descripción;
- recurso visual;
- secciones;
- campos;
- listas;
- acciones disponibles.

Esto permite agregar nuevos tipos de entidad sin crear un modal nuevo ni modificar la vista por cada clase.

### Información de enemigos

La ficha puede presentar, según disponibilidad canónica:

- Vida;
- Armadura;
- Nivel;
- Variante;
- comportamiento configurado;
- estado actual de hostilidad/persecución;
- auras;
- maldiciones;
- otros efectos temporales;
- acción Atacar.

### Destructibles e interactuables

La ficha aprovecha los datos que cada contrato expone, como:

- Vida;
- Armadura;
- familia/categoría;
- estados abiertos/cerrados o activos/inactivos;
- interacciones disponibles.

No se muestran probabilidades ni contenido oculto de botín.

### NPC

La ficha puede presentar:

- descripción;
- facción;
- rol/roles;
- interacciones y servicios declarados.

No se inventan estadísticas que el NPC no posea.

### Atacar desde el modal

La acción Atacar:

1. cierra la ficha;
2. solicita iniciar combate sobre la entidad;
3. deja el objetivo preseleccionado si el combate canónico lo permite;
4. **no ejecuta el golpe automáticamente**;
5. requiere una confirmación posterior normal.

### Habilidades básicas

Se incorporaron dos acciones siempre disponibles en grado `1/1`:

- **Atacar**;
- **Esperar**.

No poseen:

- maestría;
- XP propia;
- gasto de puntos;
- progreso adicional.

Son accesos opcionales a acciones canónicas ya existentes.

La barra nueva propone inicialmente:

- `1 = Atacar`;
- `0 = Esperar`.

Esa posición **no está reservada**. El jugador puede moverlas, quitarlas o asignarlas a cualquier otra ranura. Aunque no estén en la barra:

- `F` continúa disponible para atacar/confirmar;
- Espacio y Numpad 5 continúan disponibles para esperar.

### Icono contextual de Atacar

Atacar modifica únicamente su presentación visual según el equipo actual.

Reglas cerradas:

- sin arma principal → puño;
- ataque dual canónico válido → icono dual;
- arma principal conocida → icono de su familia;
- familia sin icono → puño;
- arma solamente en secundaria con principal vacía → puño.

Familias actualmente representadas:

- daga;
- espada;
- hacha;
- mandoble;
- lanza;
- arco;
- bastón;
- varita;
- dual;
- puño.

El icono no altera alcance, daño, coste, recursos ni ninguna regla de combate.

### Ayuda

El modal de Ayuda fue actualizado para enseñar alternativas de:

- teclado;
- mouse;
- touch;
- barra de habilidades.

La documentación se expresa en términos de acciones e intenciones, no como si una tecla concreta fuera la regla jugable.

## Mejoras arquitectónicas consolidadas

### Un solo camino de movimiento

El movimiento solicitado por mouse/touch no implementa bloqueos propios. Calcula el próximo paso y vuelve al mismo `SistemaMovimientoJugador` utilizado por el resto del juego.

### Pathfinding fuera de IA

Se retiró `BuscadorCamino` de una carpeta específica de IA porque su responsabilidad es espacial y ahora posee más de un consumidor. Esto evita interpretar una utilidad general como una regla enemiga.

### Habilidades básicas como adaptadores de acción

Atacar y Esperar no duplican combate ni tiempo. La barra puede exponer acciones canónicas existentes como habilidades básicas para mejorar el uso en diferentes dispositivos.

### Presentación de entidades abierta a extensión

La ficha conoce secciones y datos, no clases concretas. Nuevas entidades o nuevos campos pueden incorporarse desde su presentador sin modificar el modal.

### Configuración antes que excepciones

Descripciones, familias e información visual se transportan mediante contratos/configuraciones estables. No se agregaron excepciones por nombres visibles.

## Validaciones automáticas realizadas antes de entrega

La implementación fue validada antes de generar el incremental funcional mediante:

- `node --check` sobre JavaScript afectado;
- parseo de todos los JSON de configuración;
- validaciones de infraestructura de entidades;
- configuraciones de enemigos y entidades de mazmorra;
- asignación, movimiento y eliminación de Atacar/Esperar en barra;
- convergencia de las habilidades básicas con acciones canónicas;
- resolución de iconos por familia, dual y fallback de puño;
- movimiento de un único paso por pathfinding;
- inspección y efectos de entidades;
- ausencia de exposición de botín oculto;
- selección y confirmación por puntero;
- doble clic/tap;
- arrastre táctil;
- `git diff --check`;
- disponibilidad HTTP de recursos relevantes;
- aplicación del incremental sobre otro worktree limpio del mismo SHA base y repetición de validaciones.

Resultado de las validaciones automáticas: **Correcto**.

## Validación manual del usuario

El usuario realizó las pruebas funcionales del incremental y confirmó:

> Pruebas superadas.

Con esa aprobación se considera cerrado el riesgo de validación manual pendiente de la Etapa 1.

## Persistencia

- No se agregaron migraciones de partidas.
- La persistencia de barra continúa usando el contrato existente.
- Atacar y Esperar no se guardan como progreso de maestría.
- Una barra previamente configurada por el jugador continúa siendo la autoridad.

## Compatibilidad

### Web

No se agregaron dependencias, servicios externos, bundlers ni APIs nuevas.

### Electron

No se modificó la infraestructura Electron ni sus dependencias.

### Phaser

Se conserva Phaser `4.2.1`; no se actualizó ni se reemplazó el vendor.

## Documentación consolidada

- `docs/phaser/PLAN_MAESTRO_CONTROLES_MULTIENTRADA_E_INTERFAZ_TACTIL_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_CONTROLES_MULTIENTRADA_E_INSPECCION_ETAPA1.md`

## Etapa siguiente prevista

La **Etapa 2 — Auditoría responsive móvil** permanece pendiente.

Su objetivo inicial será auditar la interfaz completa en resoluciones y orientaciones móviles antes de proponer modificaciones. No se consideran aprobados cambios responsive por el solo hecho de estar previstos en el Plan Maestro.

## Restricciones verificadas

- Sin commit.
- Sin push.
- Sin dependencias nuevas.
- Sin motor de movimiento paralelo.
- Sin cola de movimiento.
- Sin reglas de combate en Phaser/DOM.
- Sin reglas por dispositivo duplicadas.
- Sin excepciones por nombre visible de entidad.
- Sin exposición de contenido oculto de botín.
- Sin ranuras obligatorias para Atacar/Esperar.
- Sin cambios responsive adelantados de la Etapa 2.

## Conventional Commit propuesto

```text
feat(controles): integrar entrada multientrada e inspeccion

- permite avanzar un paso hacia destinos por mouse o touch reutilizando el pathfinding espacial canonico;
- unifica seleccion y confirmacion de combate, habilidades e interacciones entre teclado y puntero;
- agrega inspeccion generica de entidades y acciones contextuales sin logica por tipo en el modal;
- incorpora Atacar y Esperar como habilidades basicas opcionales con icono contextual de ataque;
- documenta controles, ayuda y cierre de la Etapa 1, dejando la auditoria responsive para la Etapa 2.
```
