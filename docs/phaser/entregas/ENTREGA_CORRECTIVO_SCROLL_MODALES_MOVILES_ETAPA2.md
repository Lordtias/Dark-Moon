# Correctivo post-Etapa 2 — Scroll táctil en modales móviles

## Base

- SHA recibido: `12f9bb01e913fc94f2d7b90d10a429c064922afc`.
- Hallazgo reportado en dispositivo real: al **Revisar botín** el contenido no podía recorrerse verticalmente mediante swipe.

## Causa

La capa responsive convierte varios diálogos en ventanas de altura completa (`100dvh`).
Sin embargo, sus contenedores internos habían quedado con `max-height: none` pero sin una altura definida.
En ese escenario, filas `minmax(0, 1fr)` o hijos flex con `overflow-y: auto` podían crecer con su contenido en lugar de disponer de una altura real sobre la cual desplazarse.
El navegador móvil terminaba sin una superficie de scroll táctil fiable.

## Corrección

- Los contenedores internos de los modales fullscreen móviles reciben `height: 100%`, `max-height: none` y `min-height: 0`.
- El cuerpo del modal de botín pasa a ocupar explícitamente el espacio flexible restante.
- Las superficies que ya eran responsables canónicas del desplazamiento declaran de forma explícita:
  - `touch-action: pan-y`;
  - `overscroll-behavior-y: contain`;
  - `-webkit-overflow-scrolling: touch`.

No se crea un segundo sistema de scroll ni lógica JavaScript específica para móvil.

## Escaneo preventivo

Se revisaron los componentes con el mismo patrón de altura/overflow. El contrato correctivo cubre:

- Revisar botín / contenedores de objetos.
- Comercio.
- Curación.
- Selección de mazmorra.
- Detalle de entidad.
- Detalle y comparación de objeto.
- Ayuda.
- Árbol de habilidades.
- Paneles superpuestos de partida e Inventario/Equipamiento.

Los cuatro primeros compartían directamente el patrón más riesgoso de diálogo fullscreen + contenido interno sin altura definida. Los restantes ya tenían superficies desplazables, pero se reforzó explícitamente su comportamiento táctil para evitar la misma familia de regresiones.

## Alcance

El cambio es exclusivamente de presentación CSS. No modifica:

- generación ni transferencia de botín;
- inventario;
- comercio o precios;
- curación;
- selección de mazmorra;
- combate;
- controles de Phaser;
- persistencia.

## Pruebas recomendadas en celular real

1. Abrir **Revisar botín** con suficientes objetos/contenido y hacer swipe desde la lista y desde el detalle.
2. Confirmar que se llega a las acciones inferiores del modal.
3. Repetir en Comercio, Curación y Selección de mazmorra.
4. Abrir Detalle de objeto y Detalle de entidad con contenido largo.
5. Revisar Ayuda, Árbol de habilidades e Inventario/Equipamiento.
6. Probar portrait y landscape.
7. Confirmar que el mapa Phaser conserva sus gestos propios al cerrar los modales.

## Estado

**IMPLEMENTADO — PENDIENTE DE VALIDACIÓN MANUAL EN DISPOSITIVO REAL.**
