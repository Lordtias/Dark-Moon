# ENTREGA P4 — ENTRADA E INTENCIONES JUGABLES DESDE PHASER

Proyecto: Dark Moon  
Etapa: P4 — Entrada e intenciones jugables desde Phaser  
Estado: **En validación manual**  
Fecha: 31 de julio de 2026

---

## 1. Conclusión sencilla

P4 incorpora el clic izquierdo sobre el mapa Phaser como una nueva entrada para mover el selector activo.

El clic no ataca, no ejecuta habilidades, no interactúa y no mueve al personaje. Solamente indica una casilla. La confirmación continúa realizándose con `F` para combate o habilidades y con `R` para interacciones.

Phaser no contiene reglas jugables. Cámara, zoom y coordenadas permanecen en la presentación; alcance, objetivos y validaciones continúan dentro de los sistemas canónicos.

La implementación y las pruebas automatizadas están completas. El cierre definitivo queda pendiente de la validación manual del usuario.

---

## 2. Estado de la copia local

### Ruta real

`/mnt/data/dark_moon_p4_work/Dark-Moon`

### Directorio `.git`

Presente y funcional.

### Rama local

`main`

### Commit base y HEAD verificado

`5c47a48aaf45c637172930afeff3c3dac5ef8120`

### Estado publicado consultado

GitHub publicaba `Lordtias/Dark-Moon`, rama `main`, en el mismo commit base.

### Diferencias local / GitHub

La copia comenzó limpia y alineada con `origin/main`. Después de implementar P4 contiene solamente los archivos detallados en esta entrega. No se realizó commit ni push.

Para evitar falsos positivos por CRLF se utilizó:

```bash
git -c core.autocrlf=true status
```

---

## 3. Decisiones aprobadas

1. `ControladorTeclado` continúa siendo el único adaptador global de teclado jugable.
2. Los controles de cámara permanecen separados porque no consumen turnos ni modifican el estado jugable.
3. Phaser captura únicamente el puntero de su propio canvas.
4. El clic solo selecciona una casilla y nunca confirma automáticamente.
5. `F` confirma combate o habilidad y `R` confirma interacción.
6. No se agrega movimiento mediante clic en P4.
7. No se agrega todavía inspección de entidades.
8. Todas las entradas utilizan el comando neutral `SELECCIONAR_CASILLA`.
9. Combate, interacción y habilidades conservan sus propias reglas.
10. Canvas 2D continúa operativo.
11. Una futura pantalla de controles deberá alimentar teclado jugable y cámara desde una única configuración central de acciones y teclas.
12. El Documento Maestro deja de mantener una tabla histórica de estados y SHA por etapa. El SHA final se heredará mediante el prompt siguiente.

---

## 4. Arquitectura implementada

```text
Teclado jugable DOM ───────────────┐
Puntero DOM / Canvas 2D ───────────┼─> comando compartido
Puntero del mapa Phaser ───────────┘           ↓
                                      ControladorPartida
                                              ↓
                                  EjecutorAccionesJugador
                                              ↓
                         habilidad / interacción / combate
                                              ↓
                                      ResultadoAccion
                                              ↓
                                       escena neutral
                                        ┌─────┴─────┐
                                   Canvas 2D     Phaser
```

### Flujo del clic Phaser

```text
pointerdown izquierdo
        ↓
ControladorEntradaJugablePhaser
        ↓
ConversorCoordenadasPhaser
        ↓
SELECCIONAR_CASILLA { x, y }
        ↓
EjecutorAccionesJugador
        ↓
selector canónico activo
        ↓
ResultadoAccion
        ↓
Phaser redibuja
```

### Prioridad canónica

1. habilidad activa;
2. interacción activa;
3. combate activo;
4. sin modo de selección: no se ejecuta acción.

---

## 5. Resultado implementado

### Selección de combate

- `F` continúa activando el modo combate;
- un clic Phaser cambia el selector a la casilla señalada;
- el sistema de combate valida pared, alcance y posibilidad de ataque;
- `F` confirma mediante el flujo histórico.

### Selección de interacción

- `R` continúa resolviendo o activando las interacciones;
- cuando existen varias opciones, el clic selecciona la entidad de esa casilla;
- `R` confirma la opción canónica.

### Selección de habilidad

- las ranuras `1–0` continúan activándose desde el teclado o la barra HTML;
- el clic Phaser fija el selector utilizando las reglas de la habilidad;
- `F` confirma;
- el controlador DOM de habilidades ignora el canvas Phaser para evitar que el mismo clic se procese dos veces.

### Cámara

- el doble clic reciente al personaje solamente fuera de una selección;
- durante una selección, el clic pertenece al selector;
- rueda y `+`/`-` conservan el zoom;
- el arrastre y `IJKL` continúan bloqueados durante la selección.

### Doble entrada

- cada backend posee un único adaptador de puntero;
- un doble clic inmediato sobre la misma casilla produce una sola intención de selección;
- los listeners se desconectan antes de destruir el mapa activo.

---

## 6. Archivos agregados

### `src/interfaz/graficos/phaser/ControladorEntradaJugablePhaser.js`

Adapta el clic izquierdo del canvas Phaser, consulta el modo de selección, convierte pantalla a casilla y emite el comando neutral. No conoce reglas de combate, habilidades o interacción.

### `docs/phaser/entregas/ENTREGA_P4.md`

Registra alcance, arquitectura, validaciones, riesgos, prueba manual y enlace de continuidad.

---

## 7. Archivos modificados

### Aplicación y comandos

- `src/aplicacion/EjecutorAccionesJugador.js`
  - incorpora `SELECCIONAR_CASILLA`;
  - deriva al selector activo.
- `src/aplicacion/ControladorPartida.js`
  - conserva el procesamiento especial de habilidad únicamente cuando una habilidad está activa.

### Sistemas canónicos

- `src/juego/Juego.js`
  - expone fachadas de selección absoluta para combate e interacción.
- `src/juego/combate/SistemaCombateJugador.js`
  - centraliza selección relativa y absoluta sin duplicar validaciones.
- `src/juego/interacciones/SistemaInteraccionJugador.js`
  - selecciona una opción por coordenadas y reutiliza el mismo cambio de selector.

### Entrada DOM

- `src/controles/ControladorPunteroHabilidades.js`
  - utiliza el comando neutral;
  - conserva Canvas 2D;
  - excluye expresamente el canvas Phaser.

### Presentación y ciclo de vida

- `src/interfaz/Renderizador.js`
  - ofrece una conexión opcional de entrada al backend gráfico.
- `src/interfaz/dom/PresentacionMapaActivoDom.js`
  - conecta el callback del mapa activo y lo retira antes de destruirlo.
- `src/interfaz/graficos/phaser/RenderizadorPhaser.js`
  - conserva y sincroniza el callback con la escena Phaser.
- `src/interfaz/graficos/phaser/EscenaArranquePhaser.js`
  - crea y destruye el controlador de entrada;
  - actualiza la ayuda visual.
- `src/interfaz/graficos/phaser/ControladorCamaraPhaser.js`
  - cede el clic izquierdo al selector durante un modo de selección.

### Documentación

- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P3.md`

---

## 8. Archivos eliminados

Ninguno.

---

## 9. Dependencias

| Dependencia | Versión | Cambio en P4 |
|---|---:|---|
| Phaser | 4.2.1 | Ninguno |
| Node.js | — | No utilizado |
| npm | — | No utilizado |
| Electron | — | No utilizado |

No se instalaron librerías ni servicios externos.

---

## 10. Validaciones realizadas

### 10.1 Verificaciones de módulos aislados

| Prueba | Resultado obtenido | Estado |
|---|---|---|
| Prioridad del comando | habilidad → interacción → combate | Correcto |
| Sin modo activo | resultado sin acción | Correcto |
| Botón derecho | no emite comando jugable | Correcto |
| Casilla fuera del mapa | no emite comando | Correcto |
| Doble clic inmediato | una sola intención | Correcto |
| Destrucción del controlador | listener retirado | Correcto |
| Canvas Phaser frente al puntero DOM | ignorado por DOM | Correcto |
| Canvas 2D frente al puntero DOM | conserva una intención | Correcto |
| Errores de página | ninguno | Correcto |

### 10.2 Navegador completo con Phaser 4.2.1

Configuración determinista:

- mapa: Alcantarilla;
- nivel: 1;
- semilla: `p4-entrada`;
- botín y portal de prueba;
- profesión Mago para la validación de habilidades.

| Prueba | Preparación y pasos | Resultado obtenido | Estado |
|---|---|---|---|
| Arranque Phaser | Crear personaje e iniciar mapa forzado | Phaser 4.2.1, escena y entrada activas | Correcto |
| Interacción | `R`, clic sobre Portal inestable | selector pasó de Botín `(12,5)` a Portal `(13,6)` | Correcto |
| Unicidad en interacción | Contar comandos del clic | exactamente 1 | Correcto |
| Habilidad | preparar Ascua, `1`, clic en otra casilla | selector pasó de `(8,5)` a `(8,2)` | Correcto |
| Unicidad en habilidad | DOM y Phaser activos | exactamente 1 comando Phaser | Correcto |
| Combate | dos enemigos adyacentes, `F`, clic en segundo | selector pasó de `(11,6)` a `(12,7)` | Correcto |
| Confirmación | `F` después del clic | tiempo pasó de 0 a 100 una sola vez | Correcto |
| Sin selección | clic sobre el jugador | 0 comandos jugables | Correcto |
| Cambio de mapa | confirmar Portal inestable y crear un nuevo mapa | presentación y controlador anteriores destruidos; controlador nuevo activo | Correcto |
| Entrada después de transición | activar combate y seleccionar con el controlador nuevo | exactamente 1 comando | Correcto |
| Consola | revisar errores | ninguno | Correcto |

### 10.3 Zoom, doble clic y redimensionamiento

| Prueba | Resultado obtenido | Estado |
|---|---|---|
| Zoom mínimo 80 % | casilla `(13,6)` seleccionada correctamente | Correcto |
| Doble clic durante selección | 1 comando y 0 recentrados | Correcto |
| Ventana 900 × 650 | conversión recalculada | Correcto |
| Zoom máximo 160 % | casilla `(13,6)` seleccionada correctamente | Correcto |
| Errores de página o consola | ninguno | Correcto |

### 10.4 Regresión Canvas 2D

| Prueba | Resultado obtenido | Estado |
|---|---|---|
| Arranque predeterminado | `canvas2d`, sin cargar Phaser | Correcto |
| Interacción con `R` | selector histórico activo | Correcto |
| Habilidad Ascua | selector pasó de `(12,9)` a `(9,6)` | Correcto |
| Comando del puntero Canvas 2D | exactamente 1 con origen `puntero` | Correcto |
| Errores de página o consola | ninguno | Correcto |

### 10.5 Comprobaciones estáticas finales

Se deben repetir después de cualquier corrección manual:

```bash
git -c core.autocrlf=true status
git diff --check
```

---

## 11. Validación manual solicitada

### Preparación

1. iniciar un servidor HTTP desde la raíz;
2. abrir `index.html?render=phaser`;
3. crear una partida;
4. entrar en una mazmorra con varios enemigos e interactuables;
5. mantener abierta la consola del navegador.

### Combate

1. acercarse a un enemigo;
2. presionar `F`;
3. hacer clic sobre una casilla del rango;
4. comprobar que solo se mueve el selector;
5. presionar `F`;
6. comprobar que el ataque ocurre una sola vez.

### Interacción

1. ubicarse junto a dos interactuables;
2. presionar `R`;
3. hacer clic sobre cada opción;
4. comprobar que cambia el selector;
5. presionar `R` para confirmar.

### Habilidad

1. elegir una habilidad de la barra;
2. hacer clic en varias casillas del rango;
3. comprobar que el selector coincide con la casilla;
4. presionar `F`;
5. comprobar un único consumo de Maná y tiempo.

### Cámara y límites

1. probar zoom 80 % y 160 %;
2. redimensionar la ventana;
3. probar doble clic fuera de selección;
4. probar doble clic durante selección;
5. comprobar que durante selección no se desplaza la cámara.

### Regresión Canvas 2D

Abrir sin parámetro o con `?render=canvas2d` y repetir movimiento, `F`, `R`, habilidad y guardado/carga.

---

## 12. Compatibilidad

### Web y GitHub Pages

La implementación conserva módulos ES, rutas relativas, Phaser local y carga estática. No cambia el mecanismo de publicación. GitHub Pages deberá comprobarse después del futuro commit y push.

### Canvas 2D

Continúa siendo el backend predeterminado. No necesita implementar la conexión de entrada Phaser y conserva su controlador de puntero histórico.

### Electron

Sin implementación ni prueba. E0 continúa pausada.

### Persistencia

Sin cambios de formato, claves, inventario, progreso, barra de habilidades ni guardados.

### Contenido futuro

El comando utiliza coordenadas y el modo canónico activo. No depende de nombres visibles de habilidades, enemigos, mapas o interactuables.

---

## 13. Riesgos y pendientes

1. Validación manual del usuario pendiente.
2. GitHub Pages pendiente después de commit y push.
3. El clic para caminar no forma parte de P4.
4. La inspección de entidades no forma parte de P4.
5. La pantalla para remapear controles sigue siendo futura; deberá usar una única fuente de configuración.
6. E0 continúa pausada.
7. P5 no está autorizada automáticamente hasta cerrar P4 y resolver el Punto de decisión A.

---

## 14. Comprobación de restricciones

- no se realizó commit;
- no se realizó push;
- no se modificó GitHub mediante la conexión remota;
- no se instalaron dependencias;
- no se utilizaron Node.js, npm, Electron, `.mjs`, `node:test` ni `.patch`;
- no se duplicó el teclado jugable;
- no se agregaron reglas a Phaser;
- no se modificaron IA, tiempo, daño, muerte, experiencia, botín o persistencia;
- no se eliminó Canvas 2D;
- no se agregó contenido fuera del alcance.

---

## 15. Conventional Commit propuesto

```text
feat(controles): integrar selección de casillas desde Phaser

- agregar un adaptador de puntero Phaser basado en cámara y zoom;
- centralizar la selección mediante un comando compartido por casilla;
- reutilizar las validaciones canónicas de combate, interacción y habilidades;
- evitar la doble captura entre el puntero DOM y el canvas Phaser;
- conservar el teclado jugable, la cámara y Canvas 2D sin reglas duplicadas;
- simplificar el seguimiento documental de etapas y actualizar P4;
- validar Phaser 4.2.1, zoom, redimensionamiento y regresión Canvas 2D.
```

No se realizó el commit.

---

## 16. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
P4 — Entrada e intenciones jugables desde Phaser (implementación completa; cierre manual pendiente)

ESTADO:
Pausada

COMMIT BASE:
5c47a48aaf45c637172930afeff3c3dac5ef8120

HEAD FINAL VERIFICADO:
5c47a48aaf45c637172930afeff3c3dac5ef8120

GIT STATUS FINAL:
Rama main alineada con origin/main en el commit base, con cambios locales completos de P4 sin commit ni push. La validación automatizada es correcta y la validación manual está pendiente.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_P4.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Phaser puede convertir un clic sobre su mapa en el mismo comando de selección por casilla utilizado por la lógica canónica, sin confirmar acciones ni duplicar reglas.

ARQUITECTURA HEREDADA:
ControladorTeclado continúa como único teclado jugable. ControladorCamaraPhaser administra solamente navegación visual. ControladorEntradaJugablePhaser convierte pantalla a casilla y emite SELECCIONAR_CASILLA. EjecutorAccionesJugador deriva al selector canónico de habilidad, interacción o combate. F y R confirman. Canvas 2D continúa predeterminado.

ARCHIVOS CLAVE:
- src/interfaz/graficos/phaser/ControladorEntradaJugablePhaser.js: adapta el clic Phaser sin conocer reglas.
- src/interfaz/graficos/phaser/ConversorCoordenadasPhaser.js: contrato único de pantalla, mundo y casilla.
- src/aplicacion/EjecutorAccionesJugador.js: resuelve el comando compartido sobre el modo activo.
- src/juego/combate/SistemaCombateJugador.js: valida y actualiza el selector de combate.
- src/juego/interacciones/SistemaInteraccionJugador.js: valida y actualiza el selector de interacción.
- docs/phaser/entregas/ENTREGA_P4.md: pruebas, riesgos y validación manual.

DEPENDENCIAS Y VERSIONES:
Phaser 4.2.1 local. Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- clic de combate mueve selector y F confirma una sola acción;
- clic de interacción selecciona la entidad correcta;
- clic de habilidad produce un único comando pese al controlador DOM;
- zoom 80 % y 160 %, doble clic y redimensionamiento;
- regresión completa del puntero Canvas 2D;
- sin errores de página o consola en pruebas automatizadas.

PROBLEMAS O RIESGOS PENDIENTES:
- validación manual del usuario;
- comprobación de GitHub Pages después de commit y push;
- E0 continúa pausada;
- movimiento por clic e inspección de entidades quedan fuera de P4.

DECISIONES APROBADAS:
- el clic selecciona y F/R confirman;
- no existe un segundo teclado jugable dentro de Phaser;
- cámara y teclado permanecen especializados y compartirán una futura configuración central;
- el Documento Maestro no registra SHA históricos ni una tabla mutable de estados.

DECISIONES QUE SIGUEN ABIERTAS:
- cierre manual de P4;
- resultado del Punto de decisión A;
- autorización de P5 o reanudación de E0.

SIGUIENTE ETAPA RECOMENDADA:
P5 — Mundo jugable y mapas grandes, solamente después de cerrar manualmente P4 y aprobar el Punto de decisión A.

OBJETIVO DE LA SIGUIENTE ETAPA:
Extender el backend Phaser al conjunto de mapas jugables y preparar mundos mayores sin duplicar generación, ocupación, transiciones o reglas.

PRIMEROS ARCHIVOS A REVISAR:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/entregas/ENTREGA_P4.md
- src/interfaz/graficos/phaser/CompositorMundoPhaser.js
- src/interfaz/graficos/phaser/GestorRecursosPhaser.js
- src/interfaz/graficos/AdaptadorEscenaJuego.js
- src/config/mapas/mapas.json

NO MODIFICAR SIN NUEVA APROBACIÓN:
- reglas de generación y conectividad;
- movimiento por clic;
- reglas de combate, habilidades, IA y tiempo;
- persistencia;
- Canvas 2D;
- Electron, Node.js y npm.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Los mapas aprobados deben representarse correctamente en Phaser, incluidos mapas mayores que la pantalla, reutilizando el estado canónico y conservando Canvas 2D, transiciones, contenido y rendimiento.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(controles): integrar selección de casillas desde Phaser

- agregar un adaptador de puntero Phaser basado en cámara y zoom;
- centralizar la selección mediante un comando compartido por casilla;
- reutilizar las validaciones canónicas de combate, interacción y habilidades;
- evitar la doble captura entre el puntero DOM y el canvas Phaser;
- conservar el teclado jugable, la cámara y Canvas 2D sin reglas duplicadas;
- simplificar el seguimiento documental de etapas y actualizar P4;
- validar Phaser 4.2.1, zoom, redimensionamiento y regresión Canvas 2D.

----------------- FIN DEL ENLACE -----------------
