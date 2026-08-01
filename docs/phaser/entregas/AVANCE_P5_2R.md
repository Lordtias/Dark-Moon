# AVANCE P5.2R — Reorientación visual base inspirada en Stoneshard

## Objetivo

Acercar el render Phaser al lenguaje visual buscado: menos tablero visible, muros más arquitectónicos, pisos menos dominados por la grilla y una atmósfera más oscura.

## Cambios aplicados

- Los muros ya no se dibujan como cuadrados completos de 32×32 vistos desde arriba.
- La superficie superior del muro se comprime visualmente para leerse como **tope** del muro.
- La altura visible del muro sigue renderizándose con las fachadas verticales ya creadas.
- Se mantuvo la lógica de casillas, colisiones, cámara, combate y persistencia.
- Se redujo fuertemente la opacidad de la grilla para acercarse a una lectura más tipo escenario y menos tipo tablero.
- Se reforzó el sombreado ambiental del mapa y el oscurecimiento de bordes.
- Se suavizó el marco del mapa para que no robe atención.

## Archivos modificados en esta iteración

- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `src/config/mapas/mapas.json`
- `src/config/mapas/CiudadInicial.json`

## Validación esperada

Probar en `?render=phaser`:

1. Alcantarilla.
2. Cementerio.
3. Casa del Guerrero.
4. Fortaleza abandonada.
5. Sala de guerra.
6. Ciudad inicial.

Comprobar especialmente:

- si los muros ya se perciben con más altura y menos aspecto de baldosa cuadrada;
- si la grilla dejó de dominar la imagen;
- si las fachadas no tapan demasiado al jugador ni a enemigos;
- si la atmósfera se siente más cercana al objetivo visual;
- si no hay cambios en movimiento, combate ni transiciones.
