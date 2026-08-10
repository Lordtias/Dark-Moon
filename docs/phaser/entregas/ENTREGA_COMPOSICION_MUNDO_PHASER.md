# Entrega — Composición modular del mundo Phaser

## Base y alcance

- Base local y remota verificada: `a233242d6fb6c19b3491bb00877573e76591d490`.
- Rama: `main`.
- Alcance: separar responsabilidades internas de composición del mundo sin cambiar la API pública de `CompositorMundoPhaser` ni reglas jugables.
- Sin commit, push, dependencias nuevas ni cambios directos en GitHub.

## Problema arquitectónico

`CompositorMundoPhaser` concentraba en una sola clase la coordinación general de capas junto con tres responsabilidades suficientemente independientes:

- construcción persistente de terreno, paredes, autotiling, decoración y sombras de contacto;
- representación persistente de entidades, sombras, indicadores, barras de vida y estados temporales;
- feedback táctico de selección, rango, área, recorrido, objetivos y puntero.

El tamaño del archivo no fue el criterio de intervención. La separación se realizó porque esos grupos cambian por razones distintas y pueden mantenerse detrás de la fachada existente sin alterar consumidores.

## Arquitectura resultante

`CompositorMundoPhaser` continúa siendo la única fachada utilizada por `EscenaArranquePhaser`, cámara y reproductores. Conserva geometría general, capas, visibilidad final, zonas temporales, iluminación, efectos transitorios y coordinación del redibujado.

Delega internamente en:

- `CompositorTerrenoPhaser`: terreno, autotiling, paredes, decoración, fondo, marco y sombras de contacto;
- `CompositorEntidadesPhaser`: nodos de entidades, sombras, sprites/fallback, hostilidad, variantes, barras de vida y estados temporales persistentes;
- `CompositorSeleccionPhaser`: rango, área, recorrido, selector, objetivos y casilla bajo puntero.

La API histórica de métodos de `CompositorMundoPhaser` se conserva mediante delegación. También se conserva la referencia `nodosEntidades` sobre el mapa administrado por el compositor de entidades.

## Archivos

### Añadidos

```text
src/interfaz/graficos/phaser/CompositorTerrenoPhaser.js
src/interfaz/graficos/phaser/CompositorEntidadesPhaser.js
src/interfaz/graficos/phaser/CompositorSeleccionPhaser.js
docs/phaser/entregas/ENTREGA_COMPOSICION_MUNDO_PHASER.md
```

### Modificados

```text
src/interfaz/graficos/phaser/CompositorMundoPhaser.js
docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md
docs/phaser/entregas/ENTREGA_RETIRO_CANVAS_2D.md
```

No se modificaron dominio, generación procedural, IA, FOV lógico, combate, habilidades, tiempo, inventario, persistencia, Loading/precarga, Electron, configuración de contenido ni dependencias.

## Compatibilidad de API

Se comparó la superficie de métodos de `CompositorMundoPhaser` contra la base y se conservaron los mismos 54 métodos declarados en la clase. Los consumidores existentes continúan invocando la misma fachada.

## Validación automática

- 244 archivos JavaScript no-vendor: 0 errores de sintaxis con `node --check`.
- 243 módulos analizados incluyendo `game.js`: 0 imports relativos faltantes y 0 ciclos ES.
- Importación dinámica correcta de los cuatro módulos de composición con Node en modo ES module.
- Comparación de trazas de dibujo contra el compositor anterior usando una escena Phaser controlada:
  - escenario con terreno de respaldo, jugador, enemigo agresivo con variante, interactuable, estado temporal y selección de habilidad: 624 operaciones, idénticas;
  - escenario con recursos de textura de terreno/pared/bordes/sombras: 634 operaciones, idénticas;
  - escenario con destructible y fallback de entidad: 640 operaciones, idénticas;
  - destrucción completa del compositor: 634 operaciones totales, idénticas respecto de la base.
- El objeto de geometría retornado por `actualizar()` fue idéntico en las comparaciones.
- La superficie de métodos de la fachada no perdió ni agregó métodos respecto de la base.
- HTTP local: `index.html`, `game.js`, Phaser 4.2.1 y los cuatro módulos de composición respondieron 200.
- Revisión de cambios reales normalizando CRLF/LF: fuera de esta entrega, los cambios reportados por Git corresponden a finales de línea heredados del ZIP.
- No existen nombres de producción ligados a etapas o hitos en los nuevos módulos.

## Compatibilidad web y Electron

No se agregan rutas de servidor, librerías ni APIs exclusivas de navegador fuera de las ya utilizadas por Phaser. La entrada web permanece igual y los módulos nuevos se resuelven mediante imports relativos estáticos.

Electron no requiere cambios. No se ejecutó la aplicación Electron porque el ZIP no contiene `node_modules` y no se instalaron dependencias.

## Persistencia, contenido y reglas

Sin cambios de formato, claves o versiones de persistencia. Sin cambios de RNG, generación, posiciones, FOV, turnos, daño, estados, botín o recursos declarados. La intervención es exclusivamente estructural dentro de la presentación Phaser.

## Riesgo residual y validación manual

El riesgo principal es visual: orden de capas, tamaños, posiciones, indicadores o selección podrían verse distintos aunque la traza estructural sea equivalente. Por eso la entrega requiere validación manual antes de continuar con la coordinación de eventos visuales.

Validar al menos:

1. nueva partida/Continuar y Loading;
2. ciudad y una mazmorra, incluyendo primera aparición de enemigos;
3. FOV, puertas, cofres, barriles y portales;
4. cámara, paneo y zoom;
5. selección de ataque y de habilidades, rango, área, recorridos y objetivos;
6. enemigos normales y variantes, barras de vida y hostilidad;
7. estados temporales y zonas;
8. ataques/habilidades representativos;
9. muerte/botín y transición de mapa;
10. consola sin errores.

## Estado

Implementación y regresión automática aprobadas manualmente. La entrega quedó cerrada y commiteada en `3c3bd183ddf4d4073b4f5b81da9894b497173543`. La siguiente responsabilidad autorizada es la coordinación de eventos visuales, con análisis e implementación separados.
