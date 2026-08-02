# ENTREGA P5.R1B — Profundidad unificada, esquinas y puertas animadas

Fecha: 2 de agosto de 2026

Estado: documento histórico; sustituido por `ENTREGA_P5_R1C.md`.

## Objetivo

Corregir los problemas visuales detectados en P5.R1A:

- solapamiento insuficiente entre paredes y entidades;
- entidades y props con escasa superposición;
- esquinas sin una pieza ordenable propia;
- puertas abiertas representadas como poses estáticas sin una bisagra convincente.

## Cambios técnicos

### Profundidad

- `OrdenadorProfundidadPhaser.js` establece un criterio común por línea de apoyo.
- Fachadas, laterales, esquinas, puertas, personajes, enemigos, destructibles y sombras se agregan directamente a la lista de representación de Phaser.
- Los contenedores se reservan para fondo, suelo, superficies sin oclusión, selectores, indicadores e iluminación.
- Se elimina la prioridad visual basada en el tipo de entidad como regla principal.

### Solapamiento

- La fachada sur invade visualmente 18 píxeles del suelo sin modificar ocupación.
- Los sprites conservan su proporción y aumentan su altura visible.
- El barril utiliza una altura visual de 84 píxeles y el jugador 94, permitiendo superposición entre filas vecinas.

### Esquinas

- El analizador detecta noroeste, noreste, suroeste y sureste.
- Cada esquina obtiene frente, remate y línea de apoyo propios.
- Los laterales expuestos se resuelven tanto al este como al oeste.

### Puertas

- Se agrega `CompositorPuertasPhaser.js`.
- La hoja usa cinco cuadros dibujados para cada apertura, en vez de una imagen comprimida o una rotación automática.
- Las aperturas norte, sur, este y oeste conservan una hoja completa.
- La animación permanece anclada a una bisagra.
- El contrato canónico incorpora `ladoBisagra` con valores `inicio` y `fin`.
- Las aperturas este y oeste utilizan una bisagra compatible para evitar que la hoja termine vista como una línea.
- El marco permanece fijo y la hoja conserva la lógica de abrir, cerrar, bloquear y consumir tiempo ya aprobada.

## Recursos

Las secuencias se encuentran en:

`assets/imagenes/interactuables/puertas/animaciones/`

Se incluyen 30 PNG transparentes de 192 × 192:

- norte: dos bisagras, cinco cuadros cada una;
- sur: dos bisagras, cinco cuadros cada una;
- este: una bisagra compatible, cinco cuadros;
- oeste: una bisagra compatible, cinco cuadros.

## Validaciones automáticas realizadas

- sintaxis de todos los archivos JavaScript;
- validez de todos los JSON;
- imports relativos existentes;
- detección de las cuatro orientaciones de esquina;
- detección de laterales este y oeste;
- 30 rutas de cuadros de puerta existentes;
- animación creada al cambiar de cerrada a abierta;
- bisagra compatible para aperturas este y oeste;
- relación de profundidad pared trasera < personaje < pared delantera;
- reglas canónicas de puerta sin modificaciones.

## Pruebas manuales pendientes

1. Entrar en Alcantarilla con `?render=phaser`.
2. Colocar al jugador inmediatamente al sur de una pared y comprobar que el cuerpo quede delante.
3. Colocarlo inmediatamente al norte de una pared y comprobar que la pared cubra aproximadamente 18 píxeles inferiores.
4. Recorrer las cuatro formas de esquina.
5. Colocar jugador y barril en filas vecinas y verificar el cambio de orden al rodearlo.
6. Abrir y cerrar puertas horizontales y verticales.
7. Confirmar que la bisagra permanezca fija durante la transición.
8. Confirmar que una puerta abierta no termine como una barra o un marco flotante.
9. Validar selección, cámara, movimiento, combate y Canvas 2D.

## Archivos principales

- `src/interfaz/graficos/phaser/OrdenadorProfundidadPhaser.js`
- `src/interfaz/graficos/phaser/CompositorPuertasPhaser.js`
- `src/interfaz/graficos/phaser/CompositorArquitecturaPhaser.js`
- `src/interfaz/graficos/phaser/AnalizadorArquitecturaVisualPhaser.js`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `src/entidad/interactuable/Puerta.js`
- `src/juego/generacion/GeneradorPuertasMapa.js`
- `src/config/mapas/mapas.json`
