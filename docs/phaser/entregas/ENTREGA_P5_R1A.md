# ENTREGA P5.R1A — CORRECCIÓN DE OCLUSIÓN Y PUERTAS

> **Documento histórico:** esta corrección fue sustituida por `ENTREGA_P5_R1B.md`. No utilizar sus poses estáticas como estado final.

Proyecto: Dark Moon  
Fecha: 2 de agosto de 2026  
Base: P5.R1 sin commit  
Estado: implementada; pendiente de validación manual

## Problemas corregidos

- Las fachadas ya no pertenecen a una capa fija situada siempre por delante.
- Las entidades ya no pertenecen a un único contenedor que impida intercalarlas con la arquitectura.
- El personaje aumenta su escala visual para desbordar la casilla desde el anclaje de los pies.
- Las fachadas se extienden lo suficiente para coincidir visualmente con personajes situados delante o detrás.
- La puerta abierta deja de representarse como una barra estrecha flotante.

## Nuevo criterio de profundidad

Cada elemento alto recibe una profundidad derivada de su línea inferior:

```text
profundidad visual = base del elemento en el eje Y
```

Esto permite:

- pared norte detrás del jugador;
- pared sur delante de sus pies;
- props y enemigos intercalados con el mismo criterio;
- selección e indicadores siempre legibles por encima.

## Recursos nuevos

Carpeta:

```text
assets/imagenes/interactuables/puertas/
```

Incluye seis PNG transparentes de 128 × 128:

- `puerta_cerrada_horizontal.png`;
- `puerta_cerrada_vertical.png`;
- `puerta_abierta_norte.png`;
- `puerta_abierta_sur.png`;
- `puerta_abierta_este.png`;
- `puerta_abierta_oeste.png`.

Las variantes abiertas conservan la hoja completa y la apoyan sobre la pared correspondiente.

## Archivos principales modificados

- `src/interfaz/graficos/phaser/ConfiguracionPhaser.js`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `src/interfaz/graficos/phaser/CompositorArquitecturaPhaser.js`
- `src/config/mapas/mapas.json`
- documentos maestros de Phaser y diseño visual.

## Validaciones realizadas

- sintaxis de todos los JavaScript;
- validez de todos los JSON;
- ausencia de rutas PNG faltantes;
- seis recursos de puerta RGBA de 128 × 128;
- simulación de profundidad con arquitectura delante y detrás del jugador;
- comprobación de pose vertical abierta hacia este;
- conservación del coste temporal: 100 × 1,10 × 1,20 = 132;
- apertura y cierre continúan modificando la matriz canónica.

## Prueba manual requerida

1. Entrar a Alcantarilla con Phaser.
2. Colocar al jugador inmediatamente al sur de una pared y confirmar que su cuerpo queda delante de ella.
3. Colocarlo inmediatamente al norte de una pared y confirmar que la pared cubre parcialmente sus pies.
4. Abrir una puerta vertical hacia este u oeste y confirmar que la hoja queda apoyada sobre la pared lateral.
5. Abrir una puerta horizontal hacia norte o sur y confirmar que la hoja queda apoyada sobre el muro correspondiente.
6. Confirmar que ninguna pose se convierte en una barra flotante.
7. Confirmar que selectores, recorridos y barras de vida permanecen visibles.
8. Verificar apertura, cierre, bloqueo por ocupación y coste temporal.
