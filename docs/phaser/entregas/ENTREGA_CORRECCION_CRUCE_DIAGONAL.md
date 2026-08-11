# Entrega — Corrección canónica del cruce diagonal

## Base

- Rama local: `main`.
- SHA base: `eaa5eff179f2fcba37c9a5bed55835a63d8b3920`.
- GitHub `main` verificado en el mismo SHA antes de implementar.
- No se realizó commit ni push.

## Problema observado

Una casilla lateral ocupada por un actor y la otra lateral bloqueada por una pared eran interpretadas como dos obstáculos sólidos durante un movimiento diagonal. El destino diagonal podía estar libre y, aun así, `SistemaEspacial.bloqueaPasoDiagonal()` devolvía bloqueo porque consultaba `bloqueaMovimiento` en ambos laterales.

La deuda era previa a los refactors de presentación y pertenecía al contrato espacial canónico.

## Corrección

Se separan dos conceptos que antes estaban acoplados:

- `bloqueaMovimiento`: impide ocupar la propia casilla.
- `bloqueaCruceDiagonal`: indica que la presencia lateral sella físicamente una esquina.

`SistemaEspacial.bloqueaPasoDiagonal()` continúa siendo la única regla compartida por jugador y pathfinding, pero ahora consulta `bloqueaCruceDiagonal` en los dos laterales. La casilla destino continúa validándose independientemente mediante `bloqueaMovimiento`.

### Semántica resultante

| Elemento | bloqueaMovimiento | bloqueaVision | bloqueaCruceDiagonal |
|---|---:|---:|---:|
| Pared | sí | sí | sí |
| Combatiente | sí | no | no |
| NPC | sí | no | no |
| Barril | sí | no | sí |
| Cofre | sí | no | sí |
| Puerta cerrada | sí | sí | sí |
| Puerta abierta | no | no | no |
| Botín/portal | no | no | no |

No existen excepciones por nombre visible, enemigo concreto, mapa o etapa de desarrollo.

## Archivos productivos modificados

- `src/juego/espacio/SistemaEspacial.js`
- `src/entidad/Entidad.js`
- `src/entidad/destructible/Destructible.js`
- `src/entidad/destructible/combatiente/Combatiente.js`
- `src/entidad/interactuable/NPC.js`
- `src/entidad/interactuable/Cofre.js`
- `src/entidad/interactuable/Puerta.js`

## Fuera de alcance

No se modifican movimiento del jugador, BFS, IA, combate, habilidades, FOV, LOS, generación procedural, RNG, tiempo, persistencia, interfaz, Phaser, Loading, Electron ni configuración de contenido.

## Validación automática

Se valida como mínimo:

- suelo + suelo: permite diagonal;
- pared + suelo: permite diagonal;
- pared + pared: bloquea;
- enemigo + pared: permite;
- pared + enemigo: permite;
- enemigo + enemigo: permite;
- NPC + pared: permite;
- barril + pared: bloquea;
- cofre + pared: bloquea;
- puerta cerrada + pared: bloquea;
- puerta abierta + pared: permite;
- movimiento real del jugador en el caso enemigo + pared hacia destino diagonal libre;
- desplazamiento directo sobre un combatiente conserva la entrada a combate;
- BFS puede tomar la diagonal actor + pared;
- BFS continúa sin cortar una esquina cerrada por dos paredes;
- validadores existentes de infraestructura de entidades;
- sintaxis JS, imports relativos, ciclos ES y `git diff --check`.

## Validación manual pendiente

Reproducir la geometría observada en juego y confirmar que el jugador puede rodear diagonalmente al enemigo hacia ambas casillas libres, sin poder ocupar la casilla del enemigo y sin atravesar esquinas estructurales cerradas.

## Commit propuesto tras aprobación manual

`fix(movement): distinguir ocupación de bloqueo diagonal`
