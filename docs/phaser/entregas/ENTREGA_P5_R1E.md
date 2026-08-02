# ENTREGA P5.R1E

## Corrección de zoom hacia afuera

Se corrigieron los dos controles que reducían el zoom:

- tecla menos del teclado principal y del teclado numérico;
- rueda del mouse hacia abajo sobre el canvas Phaser.

## Causa

El zoom utiliza pasos de `0,05`, pero el valor se redondeaba a un solo decimal.
En determinados niveles, reducir `0,05` devolvía el mismo valor y la operación se
cancelaba.

## Ajustes

- redondeo del zoom a dos decimales;
- compatibilidad con `Minus`, `NumpadSubtract`, `-`, `_` y `Subtract`;
- captura explícita del evento nativo de la rueda para evitar desplazamiento de
  la página mientras se usa el zoom.

No se modificaron cámara, límites, seguimiento, escala visual ni lógica jugable.
