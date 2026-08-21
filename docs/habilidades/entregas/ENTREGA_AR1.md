# Entrega AR1 — Habilidades activas de Arco

## Base

- Rama: `main`
- SHA base: `28aa6434941a04e90f14ce29707bbe8bdb27b57f`
- Etapa previa: UI-I1 cerrada.
- CD2 — Resistencias negativas y vulnerabilidades permanece pendiente y fuera de alcance.

## Objetivo

Incorporar cuatro habilidades activas para la maestría Arcos reutilizando los contratos canónicos de combate, preparación, modificadores, munición, estados tácticos, movimiento y presentación Phaser.

## Habilidades incorporadas

### Disparo múltiple

- Nivel de maestría inicial: 2.
- Grados I/II/III: 2/3/4 proyectiles.
- Daño por proyectil: 60% / 50% / 45% del daño de arma.
- Cada proyectil resuelve impacto y crítico independientemente mediante el combate canónico.
- Consume exactamente la cantidad de flechas correspondiente al grado al ejecutar, no al preparar.
- La reproducción Phaser se presenta como una ráfaga continua y no como ataques básicos separados.

### Disparo potente

- Nivel de maestría inicial: 5.
- Daño de arma: 160% / 185% / 210%.
- Multiplicador de preparación: 1.80 / 1.70 / 1.60.
- Consume una flecha al ejecutar.
- Usa perfil visual declarativo con estela tipo cometa sutil y feedback de impacto reforzado.

### Francotirador

- Nivel de maestría inicial: 7.
- Activa el estado táctico `Apuntando`.
- El estado táctico aporta modificadores al `SistemaModificadoresCombatiente` mediante un proveedor genérico.
- Mejora Precisión, probabilidad de crítico y Dispersión para disparos compatibles.
- La preparación/cambio de preparación no elimina `Apuntando`.
- Mover, esperar, realizar una acción incompatible o recibir daño hostil puede interrumpirlo según las políticas declarativas.
- Se consume al ejecutar un disparo compatible.
- Disparo múltiple no recibe el beneficio de Francotirador.

### Disparo evasivo

- Nivel de maestría inicial: 10.
- Daño de arma: 65% / 75% / 85%.
- Consume una flecha al ejecutar.
- Tras resolver el disparo intenta desplazarse hasta dos casillas en dirección opuesta al objetivo.
- El desplazamiento usa regla espacial paso a paso y forma visual `salto`.
- Si puede recorrer dos casillas, recorre dos; si solo una es válida, recorre una; si la primera está bloqueada, no se desplaza.
- El desplazamiento forma parte de la misma acción y no consume un segundo turno.

## Arquitectura incorporada

### Ataques de arma mediante habilidades

`MotorAtaqueArmaHabilidad` permite que una habilidad utilice la fuente real del arma equipada sin duplicar las ecuaciones físicas. El cálculo final continúa reutilizando `SistemaCombate` para impacto, crítico, Armadura, Penetración, Dispersión y resultados.

### Preparaciones reemplazables

La preparación de acciones se amplía para identificar la acción/habilidad preparada. Solo puede existir una preparación de acción simultánea. Preparar otra habilidad o el ataque básico reemplaza la anterior y vuelve a pagar el tiempo de preparación correspondiente, sin consumir munición por el reemplazo. La munición se consume únicamente al ejecutar.

La preparación de habilidades de Arco se representa en Estados tácticos mediante el icono configurado de la habilidad preparada. Los estados de concentración pueden coexistir con la preparación.

### Estados tácticos como fuente del SMC

Se incorpora `ProveedorModificadoresEstadosTacticos`. Los estados pueden declarar modificadores sin introducir casos por ID dentro del SMC. Un estado táctico sin modificadores continúa siendo válido.

### Desplazamiento táctico

`ResolutorDesplazamientoTactico` separa la semántica espacial de la forma visual del desplazamiento. El contrato permite representar, entre otros, movimiento, dash, salto o teletransporte sin convertir la animación en una regla de gameplay.

Disparo evasivo utiliza:

- regla espacial: `paso_a_paso`;
- forma visual: `salto`.

### Presentación Phaser

Se incorpora un reproductor específico para habilidades de arma a distancia. Phaser consume resultados ya resueltos y representa:

- ráfagas rápidas para múltiples proyectiles;
- estelas declarativas para disparos potentes;
- proyectiles físicos;
- desplazamientos con salto corto.

Phaser no decide impacto, daño, movimiento válido ni consumo de recursos.

## Atributos de habilidad promovidos

Se incorporan consumidores productivos para:

- `cantidadProyectiles`;
- `factorDanioArma`;
- `distanciaDesplazamiento`.

`maximoProyectilesSimultaneos` continúa reservado, sin consumidor artificial.

## Configuración y contenido

Se agregan las cuatro habilidades a `Habilidades.json`, traducciones ES/EN y perfiles visuales declarativos. Se mantienen sin cambios el daño base, la Dispersión natural y la Penetración natural de los arcos.

## Validaciones realizadas

- 291 archivos JavaScript validados sintácticamente con `node --check`.
- 39 archivos JSON de configuración parseados correctamente.
- Validación integrada previa de AR1: preparación, reemplazo sin consumo, Francotirador, Disparo potente, Disparo múltiple y desplazamiento 2/1/0.
- No se instalaron dependencias nuevas.
- No se realizó commit ni push.

## Pendientes fuera de alcance

- CD2 — Resistencias negativas y vulnerabilidades permanece como siguiente bloque de combate.
- Balance fino de los valores iniciales deberá ajustarse con pruebas de gameplay.
- Los recursos gráficos definitivos propios de cada habilidad pueden sustituirse posteriormente manteniendo las rutas/configuración sin modificar contratos de combate.

## Conventional Commit propuesto

`feat(habilidades): incorporar habilidades activas de arco`


## Addendum AR1.1

El cierre técnico posterior de AR1 se documenta en `docs/habilidades/entregas/ENTREGA_AR1_1.md`. AR1.1 no cambia el balance de las cuatro habilidades; completa el contrato independiente de munición, canoniza eventos tácticos, evita interrupciones por intentos fallidos, completa las formas visuales de desplazamiento, mejora la estela móvil de Disparo potente, internacionaliza los nuevos datos de UI y generaliza las relaciones de árbol para cualquier maestría.
