# Entrega — Modularización de reproducción de habilidades Phaser

## Estado

Implementación preparada para validación manual. No se realizó commit ni push.

- Base local verificada: `a212ddc071ed1322bd0e17faf5687e07a4ec035e`.
- Rama: `main`.
- GitHub `main` verificado en el mismo SHA antes de implementar.
- El ZIP de entrada presentaba 119 archivos marcados por Git debido únicamente a diferencias CRLF/LF; la implementación se realizó en una copia local limpia clonada desde el `.git` entregado.

## Objetivo

Separar las responsabilidades internas de `ReproductorHabilidadesPhaser` según los cinco patrones visuales canónicos ya existentes, sin cambiar el contrato exterior del dispatcher, reglas de habilidades, perfiles, timings, concurrencia, resultados ni cancelación.

El dispatcher continúa consumiendo únicamente:

```js
reproducirHabilidadResuelta(reproductor, evento, version)
```

No se crearon reproductores por habilidad concreta y no se modificó ningún motor de dominio.

## Arquitectura resultante

`ReproductorHabilidadesPhaser` queda como fachada estable de selección de secuencia y pasa de 1397 a 32 líneas.

Los patrones visuales se distribuyen así:

- `ReproductorHabilidadesProyectilPhaser`: patrón proyectil configurable.
- `ReproductorHabilidadesLineaPhaser`: patrón línea configurable.
- `ReproductorHabilidadesAreaPhaser`: patrón área instantánea configurable y agrupación por anillos propia del patrón.
- `ReproductorHabilidadesCadenaPhaser`: patrón cadena configurable.
- `ReproductorHabilidadesZonaPersistentePhaser`: conjuración inicial de una zona persistente.
- `GeometriaHabilidadesVisualesPhaser`: centros de actor/impacto y clave neutral de casilla compartidos entre patrones.

El ciclo de vida posterior de las zonas sigue perteneciendo a `ReproductorZonasTemporalesPhaser`; no se fusionaron responsabilidades de conjuración y zona activa.

`reproducirResultadoImpactoHabilidad` se trasladó a `ReproductorResultadosVisualesPhaser`, que ya es la autoridad de presentación de resultados resueltos. Con esto `ReproductorZonasTemporalesPhaser` deja de importar `ReproductorHabilidadesPhaser` solamente para representar una activación de zona.

## Archivos productivos

### Modificados

- `src/interfaz/graficos/phaser/reproductores/ReproductorHabilidadesPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorResultadosVisualesPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorZonasTemporalesPhaser.js`

### Nuevos

- `src/interfaz/graficos/phaser/GeometriaHabilidadesVisualesPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorHabilidadesProyectilPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorHabilidadesLineaPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorHabilidadesAreaPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorHabilidadesCadenaPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorHabilidadesZonaPersistentePhaser.js`

## Documentación

- `docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_REPRODUCCION_HABILIDADES_PHASER.md`

No se modificó `DISENO_MAESTRO_VISUAL_DARK_MOON.md` porque no se cambió ninguna decisión de estilo, lenguaje visual ni comportamiento gráfico intencional.

## Equivalencia automática

Se ejecutó la misma batería de dobles controlados sobre la base intacta y sobre la implementación nueva. Las trazas fueron idénticas para 10 escenarios:

1. proyectil básico;
2. proyectil avanzado con lectura visual de envenenamiento;
3. línea con recorrido e impactos por casilla;
4. área instantánea centrada en selección;
5. área instantánea centrada en actor;
6. cadena con varios saltos;
7. conjuración de zona persistente;
8. proyectil con efectos reducidos;
9. resultado compartido con daño, recuperación, evento de estado, muerte y botín;
10. activación posterior de zona temporal reutilizando el resultado compartido.

Las trazas compararon orden de llamadas, tweens, esperas, duraciones, `ease`, creación/destrucción de efectos, centros, escalas, resultados, actualización de vida y eventos visuales anidados.

Además se inyectó cancelación durante reproducción en los tweens 1, 3 y 6 y destrucción en los tweens 1 y 4. Base y nueva implementación produjeron trazas idénticas en los cinco casos.

La equivalencia mecánica confirmó que los cuerpos trasladados de línea, zona persistente, cadena, área, proyectil, adaptación de resultado y geometría conservan el código original; `crearClaveCasillaVisual` solamente ganó visibilidad de exportación al pasar a infraestructura compartida.

## Validación estructural

- 257 archivos JS bajo `src`: `node --check` sin errores.
- 258 módulos analizados incluyendo `game.js`.
- 0 imports relativos faltantes.
- 0 ciclos ES.
- `git diff --check`: correcto.
- El único consumidor productivo de `ReproductorHabilidadesPhaser` sigue siendo `DespachadorEventosVisualesPhaser`.
- `ReproductorZonasTemporalesPhaser` tiene 0 imports hacia `ReproductorHabilidadesPhaser`.
- 0 nombres de etapa/hito en los nuevos identificadores productivos.

## Dependencias, configuración y Electron

Sin dependencias nuevas y sin instalación de paquetes.

Comparados byte a byte contra la base y sin cambios:

- `package.json`;
- `package-lock.json`;
- `electron/main.js`;
- `src/interfaz/graficos/PatronesVisualesHabilidades.js`;
- `src/config/presentacion/PerfilesHabilidadesVisuales.json`.

`electron/main.js` pasa `node --check`. Electron no se ejecutó porque la copia no contiene `node_modules` y no se instalaron dependencias.

## Impacto funcional

No se modificaron:

- daño, resistencias, estados ni duraciones jugables;
- maná, maestrías, progresión o costes temporales;
- selección espacial, alcance, objetivos o LOS;
- configuración y perfiles de habilidades;
- combate, movimiento, IA, FOV o generación procedural;
- persistencia;
- Loading/precarga;
- composición del mundo;
- HUD/paneles/fullscreen.

## Validación manual solicitada

1. una habilidad de proyectil básica: Ascua, Chispa, Esquirla o Aguijón tóxico;
2. Explosión ígnea;
3. Nova escarcha;
4. Cadena de rayos;
5. Nube tóxica: conjuración inicial y posteriores pulsos/entradas;
6. Incinerar o Descarga fulminante;
7. Ráfaga glacial;
8. Plaga corrosiva;
9. una habilidad que mate y genere botín;
10. recuperación de Lythra si el flujo está disponible;
11. transición de mapa después de efectos;
12. consola sin errores.

## Cierre pendiente

Esta entrega se considera cerrada solamente después de la validación manual. Después corresponde realizar la reevaluación/regresión final del Bloque C antes de habilitar la Etapa 3.

Commit propuesto después de aprobar:

```text
refactor(ui): modularizar reproducción de habilidades Phaser
```
