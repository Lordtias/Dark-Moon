# Correctivo post-cierre — Etapa 2 · Scroll táctil en creación de personaje

## Estado

- Base obligatoria: `7c7f57584e63bca91cd3923f60e15e33875985ad`.
- Fecha: 19/08/2026.
- Tipo: corrección post-cierre de la Etapa 2.
- Estado: **IMPLEMENTADO — PENDIENTE DE REVALIDACIÓN MANUAL EN CELULAR**.
- Alcance funcional: presentación responsive únicamente.

## Problema detectado

En un teléfono real, la pantalla inicial de creación de personaje permitía ver la zona superior de distribución de atributos, pero el gesto vertical de swipe no desplazaba el contenido hacia la parte inferior.

## Causa

La capa responsive de Etapa 2 volvía a limitar `.panel-creacion--ampliado` a la altura del viewport (`100dvh`) aunque la hoja específica de creación ya había decidido quitar ese límite para pantallas angostas.

Al conservar además `overflow-y: auto`, la creación terminaba utilizando un **scroll interno anidado**. Ese esquema funciona correctamente con rueda de mouse y en varias emulaciones de navegador, pero no resultó fiable para el gesto táctil del dispositivo real utilizado en las pruebas.

## Corrección

En viewport móvil o de poca altura:

1. `body` pasa a ser la superficie vertical desplazable de la pantalla de entrada;
2. se permite explícitamente `touch-action: pan-y`;
3. se conserva `-webkit-overflow-scrolling: touch` como compatibilidad para navegación táctil;
4. `.panel-creacion--ampliado` deja de imponer `max-height` y scroll interno;
5. el panel crece con su contenido (`height: auto`, `max-height: none`, `overflow: visible`).

Esto elimina la competencia entre el scroll del documento y un scroll interno de creación.

## Aislamiento respecto a la partida

La corrección no cambia Phaser ni sus gestos. El área Phaser conserva su regla propia `touch-action: none`, por lo que movimiento, selección, drag de cámara y demás controles de Etapa 1 siguen siendo administrados por el juego.

Tampoco se modifica:

- distribución o cálculo de atributos;
- creación del personaje;
- HUD;
- combate;
- habilidades;
- persistencia;
- comportamiento desktop normal.

## Validaciones realizadas

- base verificada en SHA `7c7f57584e63bca91cd3923f60e15e33875985ad`;
- `git diff --check`: OK;
- estructura CSS balanceada: 126 aperturas / 126 cierres;
- `tinycss2`: hoja parseada sin errores de sintaxis;
- revisión estática: el cambio queda restringido al media query móvil / baja altura.

No se declara superada la prueba táctil real: debe repetirse en el dispositivo que reveló la regresión.

## Pruebas manuales requeridas

1. Abrir **Nueva partida** en celular portrait.
2. Arrastrar hacia arriba comenzando sobre una zona vacía de la creación.
3. Repetir el gesto comenzando sobre las filas/botones de atributos.
4. Llegar hasta el final del formulario y verificar que la acción principal sea accesible.
5. Volver al inicio mediante swipe hacia abajo.
6. Rotar a landscape y repetir el recorrido completo.
7. Iniciar la partida y comprobar que los gestos Phaser siguen funcionando normalmente.
8. En PC, confirmar que la creación mantiene su comportamiento previo.
