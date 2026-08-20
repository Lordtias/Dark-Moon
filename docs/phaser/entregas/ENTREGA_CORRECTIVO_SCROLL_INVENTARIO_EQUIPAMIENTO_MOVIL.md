# Correctivo post-Etapa 2 — Scroll móvil de Inventario y Equipamiento

## Base

Este correctivo se aplica sobre el incremental **Scroll único + rediseño móvil de Habilidades**, basado en el SHA `12f9bb01e913fc94f2d7b90d10a429c064922afc`.

## Problema detectado

En móvil, el cuerpo general de **Inventario y Equipamiento** era desplazable, pero iniciar el swipe sobre los subpaneles de Equipamiento o Inventario no desplazaba el cuerpo principal.

La causa fue una colisión de especificidad CSS: la regla desktop `.panel-superpuesto-partida .panel-inventario/.panel-equipamiento { overflow: auto; }` tenía mayor especificidad que el override móvil previo, por lo que los subpaneles seguían actuando como superficies de scroll propias.

## Solución

- El cuerpo `.panel-superpuesto-partida__contenido--objetos` queda como **único scroll vertical** en móvil.
- Inventario y Equipamiento fuerzan `overflow: visible` con selectores de especificidad suficiente.
- Las cuadrículas y slots permiten `touch-action: pan-y` para que el gesto iniciado sobre un objeto continúe perteneciendo al cuerpo unificado.
- No cambia la lógica de selección, equipamiento, inventario ni detalle de objetos.

## Escaneo relacionado

Se revisaron los otros paneles fullscreen de partida. Personaje y Registro ya tenían overrides móviles con especificidad suficiente. Las listas internas de pasivas/efectos también quedan neutralizadas en móvil. El conflicto específico pendiente estaba en Inventario/Equipamiento.

## Validaciones

- Aplicación sobre copia limpia del SHA base + correctivo anterior: OK.
- `git diff --check`: OK.
- Chromium móvil sintético 390x844: el único `overflow-y:auto` efectivo es el cuerpo de Objetos.
- Swipe táctil iniciado dentro de Equipamiento desplaza el cuerpo principal: OK.
- Swipe inverso iniciado dentro de Inventario vuelve a subir el mismo cuerpo: OK.

## Estado

Correctivo implementado — pendiente de validación manual en celular real.
