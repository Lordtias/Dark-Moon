# ENTREGA P5.R1C — PUERTAS SIMPLIFICADAS, OCLUSIÓN MEDIA Y OCUPACIÓN DE NPC

Fecha: 2 de agosto de 2026

Estado: implementada y pendiente de validación manual.

## Objetivo

Corregir tres incidencias observadas durante la validación de P5.R1B:

- la apertura animada de las puertas seguía sin integrarse de forma convincente con la perspectiva;
- las paredes situadas delante apenas cubrían los pies de las entidades;
- el jugador podía entrar en la misma casilla que un NPC.

## Decisiones aplicadas

### Puertas

- Una puerta cerrada muestra marco y hoja.
- Una puerta abierta muestra únicamente el marco y el hueco libre.
- Se retiran la animación y los cuadros generados en P5.R1B.
- No cambia la lógica canónica de abrir, cerrar, caminabilidad, coste temporal ni bloqueo de cierre por ocupación.

### Paredes inferiores

- La fachada sur utiliza una altura visual de 132 píxeles con casillas Phaser de 64.
- El solape de la base se mantiene en 18 píxeles.
- Con un jugador de 94 píxeles, una pared ubicada en la fila inmediatamente inferior comienza aproximadamente 48 píxeles por encima de sus pies: cerca de la mitad de la entidad.
- El cambio es exclusivamente visual y no altera ocupación, movimiento ni alcance.
- Esquinas y laterales continúan compartiendo la misma profundidad por línea de apoyo.

### Ocupación de NPC

- `NPC` declara `esSolida = true`.
- `Juego` centraliza la consulta de interactuables que bloquean una casilla.
- `SistemaMovimientoJugador` impide ocupar una casilla con un NPC u otro interactuable sólido.
- Las puertas cerradas bloquean y las abiertas dejan pasar.
- Botín y portales continúan siendo transitables porque no se declaran sólidos.
- Los objetivos y combatientes conservan su validación anterior.

## Validaciones automáticas realizadas

- sintaxis JavaScript completa;
- validez de todos los JSON;
- imports relativos existentes;
- puerta abierta: solo un objeto visual, correspondiente al marco;
- puerta cerrada: marco y hoja;
- ninguna ruta de cuadros de animación se precarga;
- NPC bloquea el movimiento;
- puerta cerrada bloquea;
- puerta abierta y botín no bloquean;
- cálculo geométrico de cobertura: 48 píxeles frente a una mitad de jugador de 47.

## Pruebas manuales pendientes

1. Entrar en Alcantarilla con `?render=phaser`.
2. Abrir una puerta y comprobar que desaparezca solamente la hoja.
3. Cerrar la puerta y comprobar que reaparezca la hoja dentro del marco.
4. Situar al jugador inmediatamente al norte de una pared inferior y verificar que quede cubierto aproximadamente hasta la cintura.
5. Comprobar las cuatro esquinas con la nueva altura.
6. Intentar caminar sobre Lythra, el mercader u otro NPC de Ciudad Inicial.
7. Confirmar que el botín todavía pueda compartir casilla con el jugador.
8. Confirmar que una puerta abierta pueda atravesarse y una cerrada no.
9. Validar movimiento, interacción, combate, cámara y Canvas 2D.

## Archivos principales

- `src/interfaz/graficos/phaser/CompositorPuertasPhaser.js`
- `src/interfaz/graficos/phaser/CompositorArquitecturaPhaser.js`
- `src/config/mapas/mapas.json`
- `src/entidad/interactuable/NPC.js`
- `src/juego/Juego.js`
- `src/juego/movimiento/SistemaMovimientoJugador.js`
