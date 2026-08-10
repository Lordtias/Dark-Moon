# Entrega — Coordinación de eventos visuales Phaser

## Base y alcance

- Base local y remota verificada: `3c3bd183ddf4d4073b4f5b81da9894b497173543`.
- Rama: `main`.
- Alcance: separar coordinación, infraestructura común y despacho de eventos visuales sin cambiar secuencias, duraciones ni reglas jugables.
- Sin commit, push, dependencias nuevas ni cambios directos en GitHub.

## Problema arquitectónico

`ReproductorEventosVisualesPhaser` seguía concentrando tres niveles diferentes de responsabilidad: la cola y el orden de actualizaciones; la infraestructura común de ejecución (velocidad, tweens, temporizadores, creadores y cancelación); y una superficie extensa de métodos puente que reenviaban llamadas a reproductores especializados.

La extracción funcional previa había creado reproductores de movimiento, ataques, habilidades, estados y zonas, pero éstos todavía regresaban al coordinador para invocar helpers de su propia familia. También consultaban infraestructura interna del coordinador y, en el caso del movimiento rápido, accedían directamente a la cola.

## Arquitectura resultante

`ReproductorEventosVisualesPhaser` conserva únicamente la autoridad que le corresponde en esta entrega:

- cola de actualizaciones y preservación de orden;
- estado de reproducción e inactividad;
- cancelación de una actualización y reconciliación final;
- aplicación de la escena final de cada actualización;
- resultados y recuperaciones que todavía se extraerán en la siguiente entrega.

Se añaden tres contratos funcionales permanentes:

- `TiposEventosVisuales.js`: propietario neutral de `TIPOS_EVENTO_VISUAL`; el planificador mantiene un re-export compatible, pero deja de ser la autoridad del contrato compartido;
- `ContextoReproduccionVisualPhaser`: concentra escena, compositor, recursos, creadores visuales, velocidad, efectos reducidos, cálculo de duración, tweens, temporizadores y versión de cancelación;
- `DespachadorEventosVisualesPhaser`: traduce cada uno de los 20 tipos visuales actuales al reproductor funcional correspondiente, sin administrar cola ni reglas de dominio.

Los reproductores especializados llaman directamente a helpers de su misma familia. Movimiento deja de leer `cola`: consulta al contexto una racha ya calculada por la autoridad de coordinación. Las pocas llamadas a resultados/recuperaciones todavía residentes en el coordinador pasan por servicios explícitos del contexto y constituyen el límite deliberadamente pendiente para la siguiente entrega.

## Archivos añadidos

```text
src/interfaz/graficos/TiposEventosVisuales.js
src/interfaz/graficos/phaser/ContextoReproduccionVisualPhaser.js
src/interfaz/graficos/phaser/DespachadorEventosVisualesPhaser.js
docs/phaser/entregas/ENTREGA_COORDINACION_EVENTOS_VISUALES_PHASER.md
```

## Archivos modificados

```text
src/interfaz/graficos/PlanificadorEventosVisuales.js
src/interfaz/graficos/FiltradorEventosVisualesPorVisibilidad.js
src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js
src/interfaz/graficos/phaser/reproductores/ReproductorAtaquesPhaser.js
src/interfaz/graficos/phaser/reproductores/ReproductorEstadosTemporalesPhaser.js
src/interfaz/graficos/phaser/reproductores/ReproductorHabilidadesPhaser.js
src/interfaz/graficos/phaser/reproductores/ReproductorMovimientoPhaser.js
src/interfaz/graficos/phaser/reproductores/ReproductorZonasTemporalesPhaser.js
docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md
docs/phaser/entregas/ENTREGA_COMPOSICION_MUNDO_PHASER.md
```

No se modificaron dominio, generación procedural, IA, FOV lógico, combate resuelto, habilidades de dominio, tiempo, inventario, persistencia, Loading/precarga, composición del mundo, Electron, contenido ni dependencias.

## Conservación de contratos

La API usada por `EscenaArranquePhaser` permanece intacta: `configurar`, `encolar`, `estaActivo`, `esperarInactividad`, `cancelar` y `destruir` conservan su responsabilidad externa.

`TIPOS_EVENTO_VISUAL` mantiene exactamente las mismas 20 claves y valores. `PlanificadorEventosVisuales.js` lo re-exporta para compatibilidad, mientras todos los consumidores internos migrados dependen del nuevo contrato neutral.

El coordinador pasó de 83 métodos declarados antes de la intervención a 25, sin trasladar lógica de dominio al nuevo contexto ni al despachador.

## Validación automática

- 247 archivos JavaScript no-vendor: 0 errores de sintaxis con `node --check`.
- Grafo estático: 0 imports relativos faltantes y 0 ciclos ES.
- Importación dinámica correcta del contrato, planificador, filtrador, contexto, despachador y coordinador.
- `TIPOS_EVENTO_VISUAL`: igualdad exacta contra la base; 20 tipos, 20 casos de despacho, sin faltantes, extras ni duplicados.
- 0 reproductores especializados importan `TIPOS_EVENTO_VISUAL` desde el planificador.
- 0 accesos `reproductor.cola` dentro de reproductores especializados.
- 0 métodos `*Delegado` o wrappers equivalentes permanecen en `ReproductorEventosVisualesPhaser`.
- Comparación controlada base/nueva para velocidad, aceleración por cola, cálculo de duración, racha de movimientos del jugador, orden de eventos, aplicación de escenas finales y cancelación: resultados idénticos.
- Cancelación del contexto comprobada con tween y temporizador activos: ambos finalizan, los registros quedan vacíos y la versión se invalida.
- Destrucción durante un `await` pendiente comprobada sin acceso nulo ni aplicación tardía de escena.
- Los 20 caminos del despachador se ejecutaron con dobles controlados sin error.
- Los métodos de resultados/recuperaciones que permanecen en el coordinador conservaron su cuerpo funcional; solamente consumen la infraestructura trasladada al contexto.
- Los cambios en reproductores especializados alteran rutas de llamada, no constantes de duración, perfiles, `ease`, escalas ni reglas visuales.
- `git diff --check`: correcto.

## Compatibilidad web y Electron

No se agregan rutas de servidor, bibliotecas ni APIs nuevas. Los nuevos módulos son ES modules estáticos con imports relativos y se sirven igual que el resto del frontend en GitHub Pages y bajo el protocolo local de Electron.

Electron no requiere cambios. No se ejecutó la aplicación Electron porque el ZIP no contiene `node_modules` y no se instalaron dependencias.

## Persistencia, contenido y reglas

Sin cambios de RNG, generación, FOV, IA, turnos, daño, críticos, bloqueo, estados, zonas, XP, botín lógico, persistencia ni contenido. La entrega reorganiza exclusivamente la ejecución de hechos visuales ya resueltos.

## Riesgo residual y validación manual

El principal riesgo está en el orden/cancelación de secuencias visuales al pasar por el nuevo dispatcher y contexto. Aunque la equivalencia de coordinación y los contratos internos se comprobaron automáticamente, se requiere regresión manual antes de extraer resultados y recuperaciones.

Validar al menos:

1. movimiento continuo del jugador y movimiento de enemigos, incluyendo colas rápidas;
2. ataques cuerpo a cuerpo, arco y varita;
3. habilidades lineales, de área, cadena y zona;
4. aplicación, actualización, tick, resistencia y retirada de estados temporales;
5. daño periódico y zonas temporales;
6. muerte y aparición/actualización de botín;
7. curaciones, recuperación de recursos y subida de nivel;
8. transición de mapa y Loading después de acciones visuales;
9. cámara/seguimiento del jugador durante movimiento;
10. consola sin errores.

## Estado

Implementación y regresión automática completadas. Pendiente de aprobación manual. La extracción de resultados/recuperaciones y la división interna de ataques/habilidades quedan fuera de esta entrega.
