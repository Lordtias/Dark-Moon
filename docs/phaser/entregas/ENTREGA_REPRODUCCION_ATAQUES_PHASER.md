# Entrega — Modularización de reproducción de ataques Phaser

## Estado

Implementación preparada para validación manual. No se realizó commit ni push.

- Base local verificada: `63b0b53d21648304c5a616e0ec9c60526c8d2596`.
- Rama: `main`.
- GitHub `main` verificado en el mismo SHA antes de implementar.
- El ZIP de entrada presentaba 119 archivos marcados por Git debido únicamente a diferencias CRLF/LF; la implementación se realizó en una copia local limpia clonada desde el `.git` entregado.

## Objetivo

Separar las responsabilidades internas de `ReproductorAtaquesPhaser` sin cambiar su contrato externo, reglas de combate, perfiles visuales, timings, concurrencia ni comportamiento de cancelación.

El dispatcher continúa consumiendo únicamente:

```js
reproducirAtaqueResuelto(reproductor, evento, version)
```

No se crearon reproductores por arma concreta y no se modificó ningún motor de dominio.

## Arquitectura resultante

`ReproductorAtaquesPhaser` queda como fachada de selección/orquestación general. Las responsabilidades internas se distribuyen así:

- `ContratoAtaquesVisualesPhaser`: clasificación de familias visuales, golpes, fuentes, perfiles, avance y decisión de marca de impacto genérica.
- `ReproductorAtaquesDistanciaPhaser`: arco, varitas, proyectiles y disparos múltiples.
- `ReproductorAtaquesCuerpoACuerpoPhaser`: ataque físico simple/dual y estocada.
- `SoporteReproduccionAtaquesPhaser`: fallback/provisional, movimiento gráfico compartido, animación de efecto y adaptación hacia `ReproductorResultadosVisualesPhaser`.

`ReproductorAtaquesPhaser` pasó de 955 a 65 líneas. La división se realizó por responsabilidad funcional; el comportamiento trasladado conserva sus cuerpos originales.

## Archivos productivos

### Modificado

- `src/interfaz/graficos/phaser/reproductores/ReproductorAtaquesPhaser.js`

### Nuevos

- `src/interfaz/graficos/phaser/reproductores/ContratoAtaquesVisualesPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/SoporteReproduccionAtaquesPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorAtaquesDistanciaPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorAtaquesCuerpoACuerpoPhaser.js`

## Documentación

- `docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_REPRODUCCION_ATAQUES_PHASER.md`

No se modificó `DISENO_MAESTRO_VISUAL_DARK_MOON.md` porque no se cambió ninguna decisión de diseño visual.

## Equivalencia automática

Se ejecutó la misma batería de dobles controlados sobre la base intacta y sobre la implementación nueva. Las trazas fueron idénticas para 12 escenarios:

1. ataque natural;
2. cuerpo a cuerpo dual;
3. estocada;
4. arco con impacto;
5. arco con fallo;
6. varita simple;
7. varita dual;
8. fallback/provisional;
9. ataque a casilla vacía;
10. origen visual oculto;
11. ataque enemigo con pausa posterior;
12. varita con efectos reducidos.

Las trazas compararon orden de llamadas, tweens, esperas, duraciones, `ease`, creación/destrucción de recursos, posiciones, resultados visuales y pausa de ataque enemigo.

Además se inyectó cancelación/destrucción durante reproducción en cinco puntos distintos (`cancelación` en los tweens 1, 3 y 6; `destrucción` en los tweens 1 y 4). Base y nueva implementación produjeron trazas idénticas en todos los casos.

Se comprobó también que 20 funciones trasladadas conservan exactamente el mismo cuerpo de función que en la base; únicamente cambiaron ubicación/imports.

## Validación estructural

- 251 archivos JS bajo `src`: `node --check` sin errores.
- 252 módulos analizados incluyendo `game.js`.
- 0 imports relativos faltantes.
- 0 ciclos ES.
- `git diff --check`: correcto.
- El único consumidor productivo de `ReproductorAtaquesPhaser` sigue siendo `DespachadorEventosVisualesPhaser`, importando exclusivamente `reproducirAtaqueResuelto`.
- 0 nombres de etapa/hito en los nuevos identificadores productivos.

## Smoke web

Servidor HTTP local: respuestas 200 para:

- `index.html`;
- `game.js`;
- `DespachadorEventosVisualesPhaser.js`;
- fachada de ataques;
- los cuatro módulos nuevos.

No se realizó una validación visual automatizada en navegador; la validación manual dentro del juego sigue siendo obligatoria.

## Dependencias, configuración y Electron

Sin dependencias nuevas y sin instalación de paquetes.

Comparados byte a byte contra la base y sin cambios:

- `package.json`;
- `package-lock.json`;
- `electron/main.js`;
- `src/config/presentacion/PerfilesAtaquePorFamilia.json`.

`electron/main.js` pasa `node --check`. Electron no se ejecutó porque la copia no contiene `node_modules` y no se instalaron dependencias.

## Impacto funcional

No se modificaron:

- precisión, evasión, daño, crítico o bloqueo;
- alcance y costes temporales;
- configuración de armas;
- resultados de combate;
- muerte o botín;
- movimiento, IA, FOV o LOS;
- habilidades o estados;
- persistencia;
- Loading/precarga;
- composición del mundo;
- HUD/paneles/fullscreen.

## Validación manual solicitada

1. ataque natural;
2. arma cuerpo a cuerpo simple;
3. dual wield;
4. lanza/estocada;
5. arco con impacto y con fallo;
6. varita simple y, si está disponible, dual;
7. crítico y bloqueo;
8. muerte con botín;
9. ataque a casilla vacía/fallback si el flujo lo permite;
10. enemigo atacando al jugador;
11. efectos reducidos si están habilitables;
12. transición de mapa después de animaciones y consola sin errores.

## Cierre pendiente

Esta entrega se considera cerrada solamente después de la validación manual. No se debe avanzar a la modularización de habilidades antes de esa aprobación.

Commit propuesto después de aprobar:

```text
refactor(ui): modularizar reproducción de ataques Phaser
```
