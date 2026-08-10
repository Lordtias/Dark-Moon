# Entrega — Deuda estructural local A: contratos y espacio

## Base de trabajo

- Repositorio local: `/mnt/data/dm_deuda_local/Dark-Moon`
- Rama: `main`
- Commit base / HEAD inicial: `04a4f3de83bf8805badc8ae9d73103d34cf36fbb`
- El ZIP contiene `.git`.
- GitHub `main` coincidía con el commit base al iniciar el trabajo.
- El `git status` inicial mostraba diferencias CRLF/LF propias del ZIP; al normalizar finales de línea no existían cambios reales de contenido.

## Alcance aprobado

Esta entrega implementa únicamente el primer bloque de Deuda estructural local:

1. eliminar la adaptación dinámica de `Juego` usada por habilidades;
2. centralizar distancia de cuadrícula y línea de visión en el dominio espacial;
3. establecer una única autoridad funcional para la barra de habilidades.

No incluye persistencia desde aplicación, compuerta de entrada, utilidades comunes de JSON/localStorage, soporte de pruebas, retiro de Canvas 2D ni refactors visuales posteriores.

## Cambios realizados

### Contrato real de Juego

`SistemaHabilidadesJugador` utiliza directamente `player`, `map` y `modoInteraccionActivo`. `IntegracionHabilidadesDom` ya no agrega propiedades mediante `Object.defineProperty`, y el analizador de balance dejó de reproducir ese parche.

### Geometría de cuadrícula

Se agregó `src/juego/espacio/GeometriaCuadricula.js` como autoridad compartida para:

- distancia Chebyshev;
- resolución geométrica de línea de visión;
- motivos espaciales neutrales, sin mensajes de interfaz ni reglas de daño.

Combate conserva la traducción de una obstrucción espacial a mensajes de ataque. IA, FOV, habilidades y población procedural consumen la geometría desde el dominio espacial.

### Barra de habilidades

Se agregó `src/juego/habilidades/ContratoBarraHabilidades.js` como autoridad para:

- cantidad de ranuras;
- creación de barra vacía;
- normalización de IDs;
- validación contra habilidades aprendidas;
- validación de índices.

`PersistenciaBarraHabilidades` queda limitada a serializar/deserializar el snapshot durable.

## Dependencias

No se agregó ni instaló ninguna dependencia.

## Persistencia

No cambia la clave ni la versión de la barra de habilidades:

- clave: `dark-moon:barra-habilidades:v1`
- versión: `1`

La compatibilidad del alias persistido `prision_glacial -> rafaga_glacial` se conserva.

## Validaciones automáticas realizadas

### Sintaxis e imports

- 237 módulos JavaScript bajo `src/` revisados.
- 0 errores de sintaxis.
- 0 imports relativos faltantes.
- 0 ciclos de módulos ES detectados.
- 16 módulos clave importados realmente en Node sin errores.

### Equivalencia antes/después

Se generó una copia temporal del commit base mediante `git archive` exclusivamente para comparación, sin sustituir la copia local de trabajo.

Se compararon automáticamente base y refactor para:

- ataques con patrones adyacente, lineal y libre;
- distancia de cuadrícula;
- línea de visión con paredes y entidades bloqueantes;
- campo visible y descubrimiento;
- áreas, líneas y cadenas de habilidades;
- estado de barra y selección de habilidad.

Resultado: salida serializada idéntica antes y después.

También se comparó la persistencia de barra, incluyendo datos válidos, alias histórico y errores de estructura. Resultado: comportamiento equivalente.

### Contrato de Juego

Se comprobó que `SistemaHabilidadesJugador` funciona con `player` y `map` sin crear los aliases `jugador`, `mapa`, `modoCombate` ni `modoInteraccion`.

### Carga HTTP

Servidor HTTP local:

- `index.html`: 200
- `game.js`: 200
- `GeometriaCuadricula.js`: 200
- `ContratoBarraHabilidades.js`: 200
- `SistemaHabilidadesJugador.js`: 200
- Phaser 4.2.1 local: 200

## Pruebas manuales pendientes

Antes de cerrar esta entrega se recomienda comprobar en el navegador:

1. iniciar nueva partida y cargar partida existente;
2. abrir Habilidades/Maestrías;
3. asignar, desasignar y persistir habilidades en las diez ranuras;
4. seleccionar y cancelar habilidades con teclado y mouse;
5. lanzar habilidades con y sin línea de visión;
6. atacar a través de pasillos, esquinas y puertas abiertas/cerradas;
7. confirmar detección enemiga y FOV junto a puertas y paredes;
8. cambiar de mapa y comprobar que la barra persiste igual que antes;
9. revisar consola por errores.

## Riesgos pendientes

La entrega cambia ubicación y dependencias de contratos, pero las comparaciones automáticas no detectaron diferencias funcionales. La validación manual sigue siendo necesaria porque la integración DOM y Phaser no puede darse por cerrada únicamente con pruebas de módulo.

## Estado

Implementación automática: completada.

Validación manual del usuario: pendiente.

No realizar commit ni avanzar a la siguiente entrega hasta aprobar las pruebas manuales.
