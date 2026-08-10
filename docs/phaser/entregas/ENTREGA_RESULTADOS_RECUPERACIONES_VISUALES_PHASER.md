# Entrega — Resultados y recuperaciones visuales Phaser

## Base

- Rama local: `main`.
- Commit base: `26d7f59423f9e181ea0842f50eea6eb7830b2deb`.
- GitHub `main` verificado en el mismo commit antes de implementar.
- La copia ZIP original presentaba diferencias CRLF/LF sin cambios reales de contenido; la implementación se realizó en una copia local limpia con `.git` y el mismo HEAD.
- Sin commit ni push realizados por esta entrega.

## Objetivo

Completar la separación iniciada en la coordinación de eventos visuales, retirando de `ReproductorEventosVisualesPhaser` las consecuencias visuales ya resueltas y las recuperaciones, sin modificar reglas de juego, orden temporal ni comportamiento visual.

## Arquitectura resultante

`ReproductorEventosVisualesPhaser` conserva únicamente cola, orden, inactividad, cancelación y aplicación de la escena final.

`DespachadorEventosVisualesPhaser` deriva directamente cada tipo de evento hacia reproductores funcionales. Los eventos de daño periódico, derrota y botín utilizan `ReproductorResultadosVisualesPhaser`; recuperación de recursos y subida de nivel utilizan `ReproductorRecuperacionesPhaser`.

`ContextoReproduccionVisualPhaser` vuelve a ser infraestructura común de ejecución: Phaser, compositor, recursos, creadores visuales, velocidad, duraciones, tweens, temporizadores, cancelación y despacho de eventos anidados. Se elimina el localizador temporal `serviciosResultados`.

Ataques y habilidades reutilizan `ReproductorResultadosVisualesPhaser` para representar fallo, daño, crítico, bloqueo, cambio de vida e impacto. Las habilidades ya no importan `ReproductorAtaquesPhaser` para reproducir resultados. Las recuperaciones de habilidad se delegan directamente a `ReproductorRecuperacionesPhaser`.

`GeometriaVisualPhaser` concentra la normalización de direcciones y la obtención del centro visual de una entidad/casilla para evitar duplicar geometría entre familias.

## Archivos nuevos

- `src/interfaz/graficos/phaser/reproductores/ReproductorResultadosVisualesPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorRecuperacionesPhaser.js`

## Archivos modificados

- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`
- `src/interfaz/graficos/phaser/ContextoReproduccionVisualPhaser.js`
- `src/interfaz/graficos/phaser/DespachadorEventosVisualesPhaser.js`
- `src/interfaz/graficos/phaser/GeometriaVisualPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorAtaquesPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorHabilidadesPhaser.js`
- `docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md`

## Comportamiento preservado

No se recalculan daño, críticos, bloqueo, muerte, botín, curación, recursos ni nivel. Los nuevos reproductores reciben esos resultados ya resueltos.

Se preservan las mismas duraciones, `ease`, escalas, alpha, desplazamientos, concurrencia `Promise.all`, decorativos no esperados y política de cancelación. La decisión de mostrar marca de impacto genérica sigue perteneciendo a la familia de ataque; el reproductor de resultados únicamente ejecuta la decisión recibida. Las habilidades mantienen la marca genérica deshabilitada como antes.

## Validación automática

- Todos los JavaScript no-vendor pasan `node --check`.
- Grafo de imports relativos sin faltantes ni ciclos ES.
- Comparación controlada base/nueva de fallo, daño, crítico, bloqueo, impacto de habilidad, daño periódico, muerte, botín nuevo y actualizado, recuperación de recursos, recuperación por habilidad, subida de nivel y efectos reducidos: trazas equivalentes.
- Ataque resuelto integrado y resultado de impacto de habilidad integrado: trazas equivalentes a la base.
- Cancelación de tween y temporizador pendiente mantiene resolución, limpieza e invalidación de versión.
- Destrucción del coordinador durante una espera pendiente no aplica una escena tardía ni produce acceso nulo.
- Sin `serviciosResultados`, `reproductoresLocales`, accesos `contexto.reproducirCambioVida/Bloqueo/TextoResultado/...` ni import `ReproductorHabilidadesPhaser → ReproductorAtaquesPhaser` para resultados.
- `normalizarDireccionImpacto` deja de estar duplicada; la operación común reside en `GeometriaVisualPhaser`.
- Sin cambios en `package.json` ni `package-lock.json`.
- Electron no se ejecutó porque la copia no incluye `node_modules`; `electron/main.js` se mantiene sin cambios y con sintaxis válida.

## Validación manual solicitada

1. Ataque que falle.
2. Ataque con daño normal.
3. Crítico y bloqueo.
4. Arco y varita.
5. Habilidad con daño.
6. Habilidad que recupere vida o maná.
7. Daño periódico por quemado o veneno.
8. Muerte de enemigo y aparición de botín.
9. Actualización de un botín ya existente.
10. Consumible de vida/maná.
11. Subida de nivel.
12. Cambio de mapa después de una animación y Loading normal.
13. Consola sin errores.

## Estado de cierre

Implementación y regresión automática completadas. Pendiente de validación manual. La división interna de ataques y habilidades queda expresamente fuera de esta entrega y se reevaluará después de aprobar este resultado.
