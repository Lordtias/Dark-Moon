# Phaser 4.2.1

Dependencia gráfica aprobada para el núcleo técnico de Phaser de Dark Moon.

## Archivo incorporado

`phaser.min.js`

Verificación de origen:

- repositorio oficial: `phaserjs/phaser`;
- etiqueta: `v4.2.1`;
- ruta oficial: `dist/phaser.min.js`;
- versión declarada: `4.2.1`;
- Git blob SHA: `8d3fda95e9bb975c523747a688a7abb99115c662`;
- SHA-256 de la copia incorporada: `66348b1b5141e49b7d5ebbe688cddcb502eab1cb00f21c538686a5b2c5abe4de`;
- licencia: MIT, conservada en `LICENSE.md`.

La dependencia se carga al abrir Dark Moon normalmente porque Phaser es el
backend visual predeterminado. Canvas 2D permanece disponible
como respaldo técnico explícito mediante `?render=canvas2d`, ruta que no
descarga ni evalúa Phaser.
