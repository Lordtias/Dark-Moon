# ENTREGA P6.2D — CONSUMIBLES, RECUPERACIÓN Y CIERRE DE P6.2

Estado: cerrada, validada manualmente y publicada en `046a1d5391800ea827bdc71613eed5776d6f4dab`.
Etapa: P6.2D
Base obligatoria: `6a660e3d59af0bd22ee6073cabf56af1442d404c`

## 1. Objetivo

Representar recuperaciones explícitas sin recalcular reglas en Phaser, incorporar una poción de Maná provisional, canonizar la creación de sprites temporales desde recursos y agregar un feedback tenue de subida de nivel. La regeneración pasiva no emite eventos visuales y el efecto mágico de Lythra queda reservado para P6.3.

## 2. Contrato canónico de recuperación

`SistemaConsumibles` conserva el resultado real ya aplicado mediante `recursos_recuperados`:

- objetivo;
- origen;
- objeto exacto consumido con ID, nombre y ruta visual;
- recurso recuperado;
- cantidad aplicada;
- valor anterior, posterior y máximo;
- proporción real recuperada.

El evento se asocia a la ejecución de tipo `consumo`. `SistemaTiempo` sigue siendo la única autoridad para `costoFinal`, aplicando `factorTiempo` y `factorConsumo`. Phaser solo distribuye esa duración en preparación 20 %, uso 20 %, recuperación 45 % y retorno 15 %.

## 3. Presentación

- Vida: rojo dominante y blanco de apoyo, partículas ascendentes y texto `+N VIDA`.
- Maná: azul-violeta, pulso circular y texto `+N MANÁ`.
- El PNG exacto del consumible aparece brevemente junto al combatiente.
- La barra de Vida de un enemigo puede aumentar inmediatamente si en el futuro recibe una recuperación explícita.
- La regeneración pasiva no produce texto, partículas ni aura.

## 4. Poción de Maná

Se agregó `pocion_mana` con recuperación provisional de 10 puntos, coste de consumo 100, pila máxima 5 y disponibilidad fija de 5 unidades en Edran. El balance definitivo queda pendiente. El objeto utiliza `assets/imagenes/objetos/pocion_mana.png`.

## 5. Recursos visuales canónicos

`CreadorRecursosAtaquePhaser.js` fue renombrado a `CreadorRecursosVisualesPhaser.js`. El componente no conoce armas, municiones, consumibles ni inventarios: recibe una ruta ya resuelta y crea un sprite temporal con posición, escala, rotación, alpha y destrucción segura. Continúa siendo utilizado por flechas y lanzas y ahora también por consumibles.

## 6. Subida de nivel

`ResolutorDerrotasJugador` emite `nivel_aumentado` cuando una recompensa produce uno o más niveles. Phaser representa un único “holy bless” mediante un aura luminosa blanca tipo energía/ki, con destellos verticales y el texto del nivel final. Solo la entrada breve bloquea la cola visual; la permanencia y la salida continúan en paralelo. No consume tiempo ni modifica la agenda.

## 7. Decisiones de alcance

- Lythra continúa restaurando recursos sin una animación de consumible. Su presentación será una habilidad o servicio mágico en P6.3.
- Los efectos temporales persistentes de habilidades deberán tener representación visual durante toda su duración en P6.3.
- No se agregó feedback para regeneración pasiva.
- No se modificaron fórmulas de recuperación, atributos, frecuencia de regeneración, combate, IA, persistencia ni Canvas 2D.
- La aparición inmediata del botín continúa reservada para P6.4.

## 8. Archivos principales

Agregados:

- `assets/imagenes/objetos/pocion_mana.png`;
- `src/interfaz/graficos/phaser/ConfiguracionEfectosRecuperacionPhaser.js`;
- `src/interfaz/graficos/phaser/CreadorEfectosRecuperacionPhaser.js`;
- `src/interfaz/graficos/phaser/CreadorRecursosVisualesPhaser.js`;
- `docs/phaser/entregas/ENTREGA_P6_2_D.md`.

Renombrado:

- `CreadorRecursosAtaquePhaser.js` → `CreadorRecursosVisualesPhaser.js`.

Modificados:

- configuración de consumibles y comercio;
- `EventosAccion`;
- `SistemaConsumibles`;
- `ResolutorDerrotasJugador`;
- `Juego`;
- planificadores visuales;
- reproductor Phaser;
- README, Plan Maestro, Diseño Maestro y entrega P6.2C.2.

## 9. Validaciones manuales realizadas

La validación manual confirmó:

1. la poción de Vida muestra su imagen y recupera correctamente;
2. la poción de Maná se compra en Edran, muestra su recurso y recupera Maná;
3. el texto `+N VIDA` o `+N MANÁ` permanece visible aunque la acción de consumo sea rápida;
4. el texto, las partículas y el aura de recuperación completan una duración fija en paralelo con la cola;
5. la imagen del consumible continúa respetando el `costoFinal` canónico;
6. `nivel_aumentado` llega a presentación tanto en derrotas directas como en derrotas pendientes;
7. el aura de nivel aparece durante combate y muestra `NIVEL N`;
8. el aura de nivel utiliza una silueta luminosa tipo energía/ki y no un aro similar al de una poción;
9. solo la entrada del aura bloquea brevemente la cola; permanencia y salida continúan en paralelo sin sensación de traba;
10. combate, proyectiles, Canvas 2D y reglas canónicas permanecen sin cambios.

## 10. Validaciones técnicas

- consumo parcial de Vida conserva valores anterior y posterior;
- Maná máximo impide el consumo y conserva la pila;
- poción de Maná recupera 10 puntos provisionales;
- el evento conserva el objeto exacto y la cantidad aplicada;
- una ejecución con `factorTiempo 90` y `factorConsumo 75` produce `costoFinal 68`;
- ese `costoFinal` genera una duración visual total de 272 ms;
- comercio acepta tres entradas fijas y mantiene capacidad válida;
- JSON, JavaScript, imports relativos y `git diff --check` correctos;
- no se agregaron dependencias.

## 11. Cierre general de P6.2

P6.2 queda cerrada y validada manualmente con esta entrega:

- P6.2A: resultados por golpe;
- P6.2B.1: ritmo canónico y perfiles;
- P6.2B.2: cuerpo a cuerpo, hostilidad y derrotas;
- P6.2C.1: arcos, munición exacta y lanzas;
- P6.2C.2: varitas elementales y doble varita;
- P6.2D: consumibles, recuperación y nivel.

La etapa siguiente recomendada es P6.3: habilidades, estados, zonas y efectos visuales persistentes.

## 12. Estado de cierre y registro del commit

Base de implementación: `6a660e3d59af0bd22ee6073cabf56af1442d404c`.

La implementación, la validación manual y el registro del commit están cerrados.

```text
SHA final P6.2D / cierre P6.2: 046a1d5391800ea827bdc71613eed5776d6f4dab
```

El commit y el push fueron realizados posteriormente por el usuario; no se modificó GitHub durante P6.3A.

## Ajuste de validación posterior

La primera prueba manual detectó que el texto de recuperación y el holy bless comenzaban con baja opacidad y se desvanecían sin alcanzar una fase legible. Se corrigió separando dos relojes de presentación:

- la imagen del consumible continúa ligada al `costoFinal` canónico de la acción;
- texto, partículas y aura de recuperación usan una duración fija de `90 ms` de entrada, `280 ms` de lectura y `220 ms` de salida, y pueden completar su animación en paralelo con la siguiente acción;
- el holy bless utiliza `120 ms` de entrada, `320 ms` de permanencia y `260 ms` de salida, sin pasar por el conversor de velocidad ni consumir turno.

También se aumentó la fuente del feedback de recuperación a `12 px` y se elevó ligeramente su posición para mejorar la lectura.


## Corrección de propagación del evento de nivel

La validación manual posterior confirmó que el holy bless no se reproducía porque `nivel_aumentado` se generaba correctamente en `ResolutorDerrotasJugador`, pero podía perderse antes de llegar a presentación. Se corrigieron los dos caminos:

- una derrota directa ahora agrega `derrota.eventos` después de `ataque_resuelto`;
- `Juego.finalizarAccionJugador()` incorpora derrotas pendientes sobre la lista completa de eventos y entrega esa lista combinada al coordinador temporal.

La secuencia confirmada queda:

```text
ataque_resuelto
→ entidad_derrotada
→ nivel_aumentado
→ holy bless
```

No se modificaron experiencia, progresión, duración del holy bless, tiempo jugable ni agenda.


## Ajuste final de validación: aura de nivel

- el evento `nivel_aumentado` mantiene su duración fija, pero ahora solo bloquea la entrada breve; la permanencia y salida siguen en paralelo para evitar pausas artificiales;
- el holy bless abandona el aro/círculo similar al de recuperación y pasa a representarse como un aura luminosa blanca tipo energía/ki, con destellos verticales y texto más legible.


## Cierre aprobado

P6.2D queda aprobada y cerrada funcionalmente. Con su cierre también queda completada P6.2 — combate físico, proyectiles, feedback de impacto, consumibles y resultados meta básicos.

Decisiones finales consolidadas:

- la imagen del consumible utiliza la duración derivada del `costoFinal` canónico;
- texto, aura y partículas de recuperación tienen duración fija y no bloqueante;
- Vida se representa en rojo y Maná en azul-violeta;
- la regeneración pasiva no emite feedback visual;
- una recuperación explícita futura de enemigos podrá actualizar su barra;
- `nivel_aumentado` se transporta como evento real y no solo como mensaje;
- la subida de nivel utiliza un aura blanca tipo energía/ki;
- únicamente la entrada breve del aura espera en la cola, mientras permanencia y salida continúan en paralelo;
- Lythra y los efectos visuales persistentes de habilidades y estados quedan reservados para P6.3;
- el balance definitivo de la poción de Maná queda pendiente de una etapa de balance posterior.

Siguiente etapa prevista: `P6.3 — habilidades, estados, zonas y efectos visuales persistentes`.
