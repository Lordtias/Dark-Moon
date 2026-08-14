# Entrega — Corrección de navegación del selector de combate físico

## Estado

Corrección implementada sobre la base `43e5651ab26000282c9226e8c490a1180cc5ccfd`.

No se realizó commit ni push.

## Objetivo aprobado

Corregir la navegación por teclado del selector de combate físico cuando existen casillas seleccionables separadas por una casilla que no pertenece al selector, como la posición del propio jugador en un pasillo de una sola casilla de ancho.

La corrección debía:

- conservar la lógica canónica de combate;
- no crear tiles ficticios;
- no convertir la casilla del jugador en un objetivo seleccionable;
- conservar la selección directa por clic;
- reutilizar la geometría direccional ya empleada por Interacciones;
- no modificar el comportamiento del selector de habilidades.

## Causa encontrada

`SistemaCombateJugador.moverSelector()` intentaba mover el selector exactamente una coordenada por pulsación y delegaba esa coordenada en `seleccionarCasilla()`.

En un pasillo, al intentar pasar desde una casilla situada a un lado del jugador hacia la casilla del lado contrario, la primera pulsación apuntaba a la propia casilla del jugador. Esa posición queda fuera del selector de combate por tener distancia `0`, por lo que la navegación se detenía aunque existiera una casilla seleccionable más adelante en la misma dirección.

El clic no sufría el problema porque fija directamente la coordenada final.

## Solución implementada

Se agregó una primitiva espacial neutral para navegación entre posiciones discretas:

`src/juego/espacio/SelectorDireccionalCuadricula.js`

La primitiva selecciona la mejor posición situada en la dirección solicitada usando este orden:

1. mayor alineación con la dirección;
2. menor distancia;
3. orden determinista.

### Combate físico

`SistemaCombateJugador` construye las posiciones que ya admite su selector canónico:

- terreno seleccionable;
- distancia mínima `1` respecto del jugador;
- dentro del alcance actual del ataque.

Al mover el selector se busca la siguiente posición disponible en la dirección indicada. No se exige continuidad física entre posiciones del selector.

Esto permite, por ejemplo:

`casilla izquierda <- jugador -> casilla derecha`

pasar de derecha a izquierda con una sola pulsación hacia la izquierda y realizar el movimiento inverso con una sola pulsación hacia la derecha.

La selección final continúa pasando por `seleccionarCasilla()`, por lo que no se duplican reglas de alcance, evaluación de ataque, mensajes ni estado.

Cuando no existe otra posición seleccionable en la dirección solicitada se conserva el feedback histórico de la casilla contigua, por ejemplo pared o fuera de alcance.

### Interacciones

`SelectorInteracciones.js` conserva su contrato público y sus validaciones de opciones, pero delega la geometría direccional en la nueva primitiva compartida.

No se modificó el flujo de `SistemaInteraccionJugador`.

### Habilidades

No se modificó `SistemaHabilidadesJugador`.

Su selector continúa siendo un cursor libre por casillas para habilidades que no son de objetivo propio. Puede atravesar posiciones inválidas para conservar la previsualización y el feedback de alcance, área y validez.

Las habilidades de objetivo propio continúan centrando el selector en el jugador.

## Archivos modificados

- `src/juego/combate/SistemaCombateJugador.js`
- `src/juego/interacciones/SelectorInteracciones.js`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

## Archivos agregados

- `src/juego/espacio/SelectorDireccionalCuadricula.js`
- `docs/phaser/entregas/ENTREGA_CORRECCION_NAVEGACION_SELECTOR_COMBATE.md`

## Archivos eliminados

Ninguno.

## Dependencias

Ninguna nueva.

No se modificaron versiones ni archivos de dependencias.

Versiones presentes en la base y sin cambios:

- Phaser `4.2.1`;
- Electron `43.3.0`;
- `@electron/packager` `20.0.1`.

## Persistencia

Sin impacto.

No se modifican snapshots, guardado, carga ni `localStorage`. El selector continúa siendo estado temporal de la sesión.

## Compatibilidad web

La corrección utiliza módulos JavaScript ya existentes en la arquitectura web y no agrega servicios, CDN, bundlers ni rutas externas.

Se comprobó mediante servidor HTTP local que respondieron con estado `200`:

- `index.html`;
- `src/juego/combate/SistemaCombateJugador.js`;
- `src/juego/interacciones/SelectorInteracciones.js`;
- `src/juego/espacio/SelectorDireccionalCuadricula.js`;
- `assets/vendor/phaser/4.2.1/phaser.min.js`.

No se realizó una prueba visual completa en navegador dentro de este entorno.

## Compatibilidad Electron

No se modificó la integración Electron.

`electron/main.js` superó `node --check`.

El ZIP recibido no contiene `node_modules`, por lo que no se instaló ninguna dependencia y no se ejecutó Electron.

## Validaciones realizadas

### 1. Sintaxis de los archivos afectados

Comandos:

```bash
node --check src/juego/espacio/SelectorDireccionalCuadricula.js
node --check src/juego/interacciones/SelectorInteracciones.js
node --check src/juego/combate/SistemaCombateJugador.js
node --check src/juego/habilidades/SistemaHabilidadesJugador.js
node --check electron/main.js
```

Resultado: Correcto.

### 2. Regresión del selector de interacciones

Se comparó el algoritmo anterior obtenido directamente desde `HEAD` contra la implementación nueva delegada a la primitiva compartida.

Se ejecutaron `12.800` combinaciones de opciones, posición actual y ocho direcciones.

Resultado: todas las selecciones fueron equivalentes.

Estado: Correcto.

### 3. Caso del pasillo reportado

Preparación:

- jugador en el centro de un pasillo horizontal;
- alcance físico `1`;
- única casilla seleccionable a cada lado;
- paredes arriba y abajo.

Prueba:

- selector a la derecha;
- movimiento hacia la izquierda;
- luego movimiento hacia la derecha.

Resultado obtenido:

- derecha -> izquierda: correcto;
- izquierda -> derecha: correcto.

Estado: Correcto.

### 4. Prioridad direccional

Se comprobó que una posición exactamente alineada con la dirección es prioritaria frente a posiciones diagonales más cercanas.

Estado: Correcto.

### 5. Recursos web

Se sirvió la copia mediante HTTP local y se verificaron los recursos relevantes indicados en Compatibilidad web.

Estado: Correcto para disponibilidad de rutas.

### 6. Selector de habilidades

Se verificó por sintaxis y por diff que `SistemaHabilidadesJugador.js` no fue modificado.

La prueba jugable visual del cursor libre queda para validación manual del usuario.

Estado: Pendiente de prueba manual dentro del juego.

## Pruebas manuales recomendadas

1. Entrar en combate físico en un pasillo de una casilla de ancho con una casilla seleccionable a cada lado del jugador.
2. Situar el selector a la derecha.
3. Pulsar `←`, `A` y `Numpad4` en pruebas separadas.
4. Confirmar que el selector pasa directamente a la casilla izquierda.
5. Repetir en sentido inverso con `→`, `D` y `Numpad6`.
6. Probar las ocho direcciones en una sala abierta.
7. Probar alcance `1` y alcances superiores.
8. Probar patrones de ataque adyacente, lineal y libre.
9. Verificar que una casilla seleccionable pero no atacable continúa mostrando su feedback canónico.
10. Confirmar con `F` que se ataca la casilla realmente seleccionada.
11. Cancelar con `Escape`.
12. Confirmar que mover el selector no consume turno.
13. Verificar la orientación visual del jugador al cambiar de objetivo de un lado al contrario.
14. Probar selección con clic y confirmar que continúa siendo directa.
15. Probar múltiples interactuables y confirmar que la navegación no cambió.
16. Activar una habilidad no propia y confirmar que su selector sigue avanzando una casilla por pulsación incluso sobre posiciones inválidas.
17. Probar una habilidad de objetivo propio y confirmar que permanece centrada en el jugador.
18. Probar zoom y redimensionamiento.

## Riesgos pendientes

El comportamiento visual completo debe validarse dentro del juego, especialmente con combinaciones de alcance alto y muchas casillas seleccionables.

La elección es determinista y prioriza alineación antes que distancia, por lo que una casilla exactamente alineada puede ser elegida por encima de una diagonal más cercana. Esto reproduce el criterio ya utilizado por Interacciones y es una decisión aprobada para esta corrección.

## Restricciones verificadas

- no se realizó commit;
- no se realizó push;
- no se instalaron dependencias;
- no se creó `.patch`;
- no se creó `.mjs` dentro del repositorio;
- no se creó un motor paralelo;
- no se modificaron reglas de daño ni resolución de combate;
- no se modificó persistencia;
- no se modificó el selector de habilidades;
- no se agregaron excepciones por nombre visible;
- no se modificó Phaser ni Electron.

## Conventional Commit propuesto

```text
fix(combate): corregir navegación direccional del selector físico

- permite saltar posiciones no pertenecientes al selector al navegar por teclado;
- centraliza la geometría direccional reutilizada por combate e interacciones;
- conserva el cursor libre del selector de habilidades y la selección directa por clic;
- valida el caso de pasillo y la regresión del selector de interacciones;
- documenta el contrato de navegación en el diseño maestro.
```

## ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
Corrección particular — navegación direccional del selector de combate físico

ESTADO:
Cerrada con prueba manual pendiente

COMMIT BASE:
43e5651ab26000282c9226e8c490a1180cc5ccfd

HEAD FINAL VERIFICADO:
43e5651ab26000282c9226e8c490a1180cc5ccfd

GIT STATUS FINAL:
Cambios de trabajo sin commit correspondientes únicamente a la corrección y su documentación.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_CORRECCION_NAVEGACION_SELECTOR_COMBATE.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- Sin cambios de Plan Maestro
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Permitir que el selector de combate físico navegue por teclado entre casillas seleccionables aunque exista una posición no seleccionable intermedia, como la casilla del propio jugador.

ARQUITECTURA HEREDADA:
Combate mantiene sus reglas canónicas y la selección final sigue pasando por SistemaCombateJugador.seleccionarCasilla(). Interacciones reutiliza una primitiva espacial neutral para navegación direccional. Habilidades conserva su cursor libre independiente.

ARCHIVOS CLAVE:
- src/juego/combate/SistemaCombateJugador.js: administra el selector físico y su validación final.
- src/juego/espacio/SelectorDireccionalCuadricula.js: resuelve navegación espacial entre posiciones discretas.
- src/juego/interacciones/SelectorInteracciones.js: reutiliza la misma geometría direccional sin cambiar su contrato.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser 4.2.1, Electron 43.3.0 y @electron/packager 20.0.1 permanecen sin cambios.

PRUEBAS CLAVE SUPERADAS:
- navegación bidireccional en el caso de pasillo reportado;
- 12.800 comparaciones de regresión del selector de interacciones;
- sintaxis de módulos afectados y disponibilidad HTTP de rutas relevantes.

PROBLEMAS O RIESGOS PENDIENTES:
- validación manual visual dentro del juego y en Electron.

DECISIONES APROBADAS:
- navegación discreta para combate físico reutilizando la geometría direccional de Interacciones;
- selector de habilidades sin cambios y conservando cursor libre.

DECISIONES QUE SIGUEN ABIERTAS:
Ninguna para esta corrección.

SIGUIENTE ETAPA RECOMENDADA:
No aplica: corrección particular sin Plan Maestro asociado.

OBJETIVO DE LA SIGUIENTE ETAPA:
No aplica.

PRIMEROS ARCHIVOS A REVISAR:
- src/juego/combate/SistemaCombateJugador.js
- src/juego/espacio/SelectorDireccionalCuadricula.js
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

NO MODIFICAR SIN NUEVA APROBACIÓN:
- reglas canónicas de alcance y resolución de combate;
- comportamiento de cursor libre del selector de habilidades;
- persistencia y contratos fundamentales de entrada.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
No aplica.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
fix(combate): corregir navegación direccional del selector físico

- permite saltar posiciones no pertenecientes al selector al navegar por teclado;
- centraliza la geometría direccional reutilizada por combate e interacciones;
- conserva el cursor libre del selector de habilidades y la selección directa por clic;
- valida el caso de pasillo y la regresión del selector de interacciones;
- documenta el contrato de navegación en el diseño maestro.

----------------- FIN DEL ENLACE -----------------
