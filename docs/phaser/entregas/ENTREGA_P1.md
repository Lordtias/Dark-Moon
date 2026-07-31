# ENTREGA P1 — NÚCLEO TÉCNICO DE PHASER

Proyecto: Dark Moon  
Plan: Integración progresiva de Phaser, beta y Electron  
Etapa: P1 — Núcleo técnico de Phaser  
Fecha: 31 de julio de 2026  
Estado: **Cerrada y commiteada; validación incluida en el commit confirmado por el usuario**

---

## 1. Conclusión sencilla

### Qué se analizó

Se revisó la copia completa obtenida del ZIP, incluido `.git`, y se comprobó:

- arranque de la aplicación;
- creación de personajes;
- fábrica de interfaz;
- backend Canvas 2D;
- adaptador de escena neutral;
- controles canónicos;
- carga de recursos;
- persistencia;
- publicación web estática;
- integración y ciclo de vida de Phaser.

También se verificó el archivo proporcionado por el usuario contra la versión y
el Git blob oficial de Phaser 4.2.1.

### Por qué se analizó

P1 debía demostrar que Phaser puede convivir con Dark Moon sin convertirse en
otro motor de movimiento, combate, IA, tiempo, muerte, experiencia, botín o
persistencia.

### Conclusión final

P1 quedó implementada y validada.

Phaser 4.2.1 funciona como backend visual técnico opcional, consume la misma
escena neutral que Canvas 2D, mantiene los paneles HTML/CSS y no modifica la
lógica canónica. Canvas 2D continúa siendo el modo predeterminado.

Durante la validación manual del usuario se detectó que WebGL podía iniciarse
mientras la pantalla de partida todavía estaba oculta y conservar un canvas de
2 × 2 píxeles hasta redimensionar la ventana. La incidencia fue reproducida y
corregida: el backend observa visibilidad y tamaño, refresca el Scale Manager al
mostrarse la partida y reintenta brevemente si Phaser todavía no está listo.

### Decisión o acción recomendada

El usuario confirmó `251b2037b6180848bb7a15610251b6fed0f492dc` como commit final de P1. La siguiente
acción es presentar la propuesta de P2 y esperar aprobación explícita antes de
implementarla. E0 permanece pausada temporalmente y deberá completarse después
de P2 y antes de P3.

---

## 2. Fuente principal y estado de Git

### ZIP utilizado

`Dark-Moon-P0(1).zip`

### Ruta local real

`/mnt/data/dark_moon_p1_work/Dark-Moon`

### Directorio `.git`

Presente y utilizable.

### Rama

`main`

### Commit base y HEAD verificado

`2d884b22f2d911a36d4b4e32539cba9dcb6f1dcc`

### Estado publicado consultado

GitHub publica `Lordtias/Dark-Moon`, rama `main`, en el mismo commit base.

### Diferencias iniciales entre local y GitHub

Ninguna. La copia inició limpia y alineada con `origin/main`.

### Commit final confirmado por el usuario

`251b2037b6180848bb7a15610251b6fed0f492dc`

El usuario confirmó que este commit contiene la implementación validada de P1 y
la corrección del ajuste inicial de resolución. Esta actualización documental
se prepara después de ese commit y deberá incorporarse al repositorio mediante
un commit documental separado o mediante el procedimiento Git que el usuario
considere apropiado.

---

## 3. Alcance aprobado y completado

1. Incorporar Phaser 4.2.1 exacto como archivo local.
2. Conservar su licencia MIT.
3. Utilizar `Phaser.AUTO`.
4. Utilizar `Phaser.Scale.FIT` y centrado en ambos ejes.
5. Usar 1024 × 640 solamente como referencia técnica inicial.
6. Conservar la casilla lógica de 32 × 32.
7. Mantener Canvas 2D como modo predeterminado.
8. Seleccionar el backend mediante `?render=canvas2d|phaser`.
9. No cambiar el backend en caliente.
10. Cargar Phaser solamente cuando se solicita ese backend.
11. No utilizar CDN, npm ni empaquetador.
12. Mantener una protección temporal de puntero sobre Phaser.
13. Conservar los paneles en HTML/CSS.
14. Entregar P1 como una sola etapa y un solo commit final.
15. Mantener P0 cerrada y commiteada, conservando su entrega histórica.

---

## 4. Arquitectura final

### Flujo Canvas 2D

```text
index.html
  → game.js
  → SelectorRenderizador: canvas2d
  → PresentacionAplicacionDom
  → FabricaInterfazPartidaDom
  → RenderizadorCanvas2D existente
```

### Flujo Phaser

```text
index.html?render=phaser
  → game.js
  → SelectorRenderizador: phaser
  → CargadorPhaser
  → Phaser 4.2.1 local
  → PresentacionAplicacionDom
  → FabricaInterfazPartidaDom
  → RenderizadorPhaser
  → host propio dentro del panel central
  → canvas creado por Phaser.AUTO
  → EscenaArranquePhaser
```

### Contrato conservado

```text
Juego
  → AdaptadorEscenaJuego
  → escena neutral
  → Renderizador
  → backend visual seleccionado
```

`RenderizadorPhaser` solamente implementa:

- `configurarDimensiones({ columnas, filas })`;
- `dibujar(escena)`;
- `destruir()`.

No recibe una instancia de `Juego` ni ejecuta reglas canónicas.

### Ajuste necesario para `Phaser.AUTO`

Phaser 4.2.1 no permite combinar `Phaser.AUTO` con un canvas externo ya creado.
Por esa razón:

- el canvas original `#gameCanvas` se conserva para Canvas 2D;
- en modo Phaser se oculta temporalmente;
- Phaser crea un canvas propio dentro de `host-phaser-dark-moon`;
- al destruir el backend se retira el host y se restaura el canvas original.

Esto mantiene un solo backend activo y conserva la elección automática entre
WebGL y Canvas según disponibilidad.

---

## 5. Dependencia incorporada

### Phaser

- versión: `4.2.1`;
- licencia: MIT;
- archivo: `assets/vendor/phaser/4.2.1/phaser.min.js`;
- Git blob SHA: `8d3fda95e9bb975c523747a688a7abb99115c662`;
- SHA-256: `66348b1b5141e49b7d5ebbe688cddcb502eab1cb00f21c538686a5b2c5abe4de`;
- forma de carga: script local condicional;
- carga en Canvas 2D: no;
- CDN: no;
- instalación: no requerida.

La licencia original se conserva en:

`assets/vendor/phaser/4.2.1/LICENSE.md`

---

## 6. Trabajo realizado

- selector de backend por URL;
- Canvas 2D como valor predeterminado;
- retorno seguro a Canvas 2D para valores inválidos;
- carga condicional de Phaser;
- validación estricta de la versión 4.2.1;
- error visible si la dependencia falta;
- configuración con `Phaser.AUTO` y `Phaser.Scale.FIT`;
- canvas propio para Phaser dentro del panel central;
- refresco automático de escala al pasar la pantalla de oculta a visible;
- observación de tamaño y reintentos controlados durante el arranque;
- entrada de teclado, ratón, toque y gamepad de Phaser deshabilitada en P1;
- backend gráfico compatible con el contrato existente;
- escena técnica basada exclusivamente en la escena neutral;
- cuadrícula técnica;
- representación de jugador, enemigos, destructibles e interactuables;
- información de versión, resolución y dimensiones del mapa;
- ventana visual centrada alrededor del jugador;
- redibujado al cambiar el estado canónico;
- protección temporal del puntero mediante CSS;
- documentación de uso, dependencia, pruebas y siguiente etapa.

---

## 7. Archivos modificados

- `README.md`
- `game.js`
- `index.html`
- `src/interfaz/dom/FabricaInterfazPartidaDom.js`
- `src/interfaz/dom/PresentacionAplicacionDom.js`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`

## 8. Archivos agregados

- `assets/estilos/phaser/phaser.css`
- `assets/vendor/phaser/4.2.1/phaser.min.js`
- `assets/vendor/phaser/4.2.1/LICENSE.md`
- `assets/vendor/phaser/4.2.1/README.md`
- `src/interfaz/graficos/SelectorRenderizador.js`
- `src/interfaz/graficos/phaser/CargadorPhaser.js`
- `src/interfaz/graficos/phaser/ConfiguracionPhaser.js`
- `src/interfaz/graficos/phaser/InicializadorPhaser.js`
- `src/interfaz/graficos/phaser/EscenaArranquePhaser.js`
- `src/interfaz/graficos/phaser/RenderizadorPhaser.js`
- `docs/phaser/entregas/ENTREGA_P1.md`

## 9. Archivos eliminados

Ninguno.

## 10. Sistemas no modificados

- `Juego` y reglas de dominio;
- movimiento;
- combate;
- IA;
- tiempo e iniciativa;
- muerte, experiencia y botín;
- habilidades y efectos;
- generación de mapas;
- JSON de contenido;
- inventario y equipamiento;
- persistencia y versión del guardado;
- implementación interna de `RenderizadorCanvas2D`;
- Documento Maestro de Diseño Visual;
- Electron y Steam.

---

## 11. Validaciones realizadas

| Prueba | Preparación y pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| Git inicial | Revisar ruta, rama, HEAD y estado | Copia válida y limpia | `main`, HEAD esperado y copia limpia al iniciar | Correcto |
| Contraste remoto | Comparar HEAD local con `origin/main` y GitHub | Estados alineados | Mismo SHA base | Correcto |
| Identidad de Phaser | Revisar versión, Git blob y SHA-256 | Archivo oficial 4.2.1 | Versión y Git blob coincidentes | Correcto |
| Sintaxis JavaScript | Ejecutar `node --check` | Ningún error | 156 archivos propios y el vendor válidos (157 en total) | Correcto |
| JSON | Parsear todos los archivos | Ningún JSON inválido | 21 válidos | Correcto |
| Imports relativos | Resolver imports JavaScript | Ningún destino ausente | 352 imports, 0 ausentes | Correcto |
| Referencias HTML | Resolver CSS y JS locales | Ninguna ruta ausente | 4 referencias válidas | Correcto |
| Referencias CSS | Resolver `url(...)` locales | Ningún recurso ausente | 2 referencias válidas | Correcto |
| Higiene del diff | Ejecutar `git -c core.whitespace=cr-at-eol diff --check` | Sin errores | Sin errores | Correcto |
| Identificadores de etapa | Buscar `P1` en producción | Ninguno | Ninguno encontrado | Correcto |
| HTTP estático | Servir el repositorio y solicitar recursos | HTTP 200 | HTML y `phaser.min.js` respondieron 200 | Correcto |
| Canvas 2D predeterminado | Abrir sin parámetro | Canvas 2D sin cargar Phaser | Backend `canvas2d`, sin script Phaser | Correcto |
| Canvas 2D explícito | Abrir `?render=canvas2d` | Mismo backend anterior | Guerrero, Rogue y Mago iniciaron sin errores | Correcto |
| Inicio Phaser | Abrir `?render=phaser` | Phaser 4.2.1 inicia | Dependencia cargada y escena visible | Correcto |
| Visibilidad inicial WebGL | Inicializar Phaser con la pantalla oculta y mostrarla sin redimensionar | Canvas mayor que 2 × 2 y Scale Manager actualizado | Canvas 802 × 502 y display 800 × 500 sin `resize` manual | Correcto |
| Profesiones en Phaser | Crear Guerrero, Rogue y Mago | Flujo completo | Las tres profesiones iniciaron sin errores | Correcto |
| Paneles compartidos | Revisar personaje, inventario y equipo | Continúan operativos | 12 ranuras de inventario y 10 de equipo renderizadas | Correcto |
| Movimiento canónico | Presionar flecha derecha | Cambia `Juego` y se redibuja | Jugador pasó de `(13,16)` a `(14,16)` | Correcto |
| Actualización de escena | Comparar canvas antes y después | Phaser refleja el cambio | El contenido gráfico cambió | Correcto |
| Adaptación | Reducir la ventana | Sin deformación ni desborde | Proporción aproximada 1.6 y sin overflow | Correcto |
| Protección de puntero | Pulsar el centro visual | No llega como clic de canvas | El objetivo fue el host y el jugador no cambió | Correcto |
| Parámetro inválido | Abrir `?render=invalido` | Advertencia y Canvas 2D | Retorno seguro sin cargar Phaser | Correcto |
| Dependencia ausente | Retirar temporalmente el vendor | Error claro | Mensaje explícito con versión y ruta | Correcto |
| Ejecución sin servicios externos | Servir todos los recursos desde la copia local | Ninguna dependencia remota | No se solicitaron recursos externos | Correcto |
| Persistencia cruzada | Guardar en Canvas 2D y leer desde modo Phaser | Mismo contrato durable | Nombre, profesión, nivel, vida y oro reconstruidos | Correcto |
| Consola | Revisar ambos backends | Sin errores inesperados | Sin errores ni recursos fallidos | Correcto |

### Evidencia de navegador

Las pruebas se ejecutaron en Chromium real mediante Playwright. La política del
entorno bloquea la navegación superior a `localhost`, por lo que los mismos
archivos estáticos locales fueron entregados al navegador mediante el enrutador
de recursos de Playwright. Esto permitió ejecutar módulos, `fetch`, Phaser,
Canvas y eventos reales sin utilizar internet.

El servidor HTTP local fue comprobado por separado con respuestas 200. La
navegación manual mediante `http://localhost` queda incluida en las instrucciones
de prueba para el usuario.

### Renderizadores elegidos por `Phaser.AUTO`

En Chromium headless, Phaser seleccionó Canvas como respaldo. El camino WebGL
también se ejecutó en Chromium con entorno gráfico virtual y SwiftShader,
confirmando el arranque, la escala inicial sin redimensionamiento manual y la
adaptación posterior de tamaño. La selección con la GPU final del usuario y el
entorno Electron se volverá a comprobar en E0.

---

## 12. Instrucciones de ejecución

No hay instalación.

Desde la raíz del repositorio:

```bash
python -m http.server 8000
```

Canvas 2D predeterminado:

```text
http://localhost:8000/index.html
```

Canvas 2D explícito:

```text
http://localhost:8000/index.html?render=canvas2d
```

Phaser técnico:

```text
http://localhost:8000/index.html?render=phaser
```

Comprobación desde la consola:

```js
darkMoonRenderizador
```

Resultado esperado para Phaser:

```js
{ tipo: "phaser", phaser: "4.2.1" }
```

---

## 13. Pruebas manuales recomendadas al usuario

1. Abrir la URL sin parámetro y crear un personaje.
2. Confirmar que el mapa Canvas 2D continúa igual.
3. Abrir `?render=phaser` y crear un personaje.
4. Confirmar que aparece inmediatamente la escena técnica con versión 4.2.1,
   sin achicar ni expandir la ventana.
5. Mover al personaje con flechas o WASD.
6. Redimensionar la ventana varias veces.
7. Confirmar que inventario, equipo y panel del personaje continúan activos.
8. Hacer clic sobre la escena Phaser y confirmar que no ejecuta acciones.
9. Desconectar internet manteniendo el servidor local y volver a abrir Phaser.
10. Revisar la consola del navegador.

---

## 14. Compatibilidad e impactos

### Web

- conserva publicación estática;
- conserva rutas relativas;
- no requiere compilación;
- no requiere CDN;
- Canvas 2D sigue siendo predeterminado;
- Phaser se carga únicamente por solicitud explícita.

La publicación final en GitHub Pages deberá comprobarse después del commit y
push del usuario.

### Electron

Electron no fue incorporado. P1 deja Phaser y sus recursos locales preparados
para la prueba E0.

### Persistencia

Sin cambios:

- misma clave de `localStorage`;
- misma versión del guardado;
- mismos datos persistidos;
- el backend no forma parte del snapshot.

### Contenido nuevo

Sin impacto directo. La escena Phaser consume tipos e identificadores genéricos
del adaptador neutral y no contiene excepciones por nombre visible.

---

## 15. Riesgos y pendientes

1. La escena es técnica y no representa el arte final.
2. La entrada de puntero seguirá protegida hasta definir cámara, zoom y
   conversión de coordenadas.
3. El camino WebGL debe repetirse con la GPU final del usuario y en Electron E0.
4. GitHub Pages debe validarse después del commit y push.
5. No debe eliminarse Canvas 2D todavía.

Ninguno de estos puntos impide cerrar el alcance técnico de P1.

---

## 16. Comprobación de restricciones

- sin commit;
- sin push;
- sin modificaciones remotas;
- sin npm;
- sin `package.json`;
- sin `node_modules`;
- sin bundler;
- sin CDN;
- sin archivos `.patch`;
- sin archivos `.mjs`;
- sin `node:test`;
- sin motores paralelos;
- sin cambios de persistencia;
- sin cambios de contenido;
- sin identificadores `P1` en código productivo;
- Canvas 2D conservado.

---

## 17. Commit final de P1 confirmado

```text
251b2037b6180848bb7a15610251b6fed0f492dc
```

El usuario confirmó que este commit incluye la validación de P1 y la corrección
del ajuste inicial de resolución. El mensaje propuesto durante la entrega queda
conservado en el historial de la conversación, pero el dato vinculante para la
documentación es el SHA confirmado.

---

## 18. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
P1 — Núcleo técnico de Phaser

ESTADO:
Cerrada y commiteada

COMMIT BASE DE P1:
2d884b22f2d911a36d4b4e32539cba9dcb6f1dcc

COMMIT FINAL CONFIRMADO POR EL USUARIO:
251b2037b6180848bb7a15610251b6fed0f492dc

ACLARACIÓN DE VERIFICACIÓN:
El SHA final fue informado y confirmado por el usuario. Esta actualización documental no ejecutó una comprobación remota ni conserva un `git status` posterior a ese commit.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_P1.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- Sin cambios en docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
- Sin cambios en docs/phaser/PROMPT_MAESTRO_ETAPAS_PHASER_ELECTRON.txt

OBJETIVO QUE SE COMPLETÓ:
Se incorporó Phaser 4.2.1 como backend técnico opcional, cargado localmente y activable por URL, sin duplicar reglas ni reemplazar Canvas 2D. La corrección final evita que WebGL conserve un canvas de 2 × 2 píxeles cuando la pantalla de partida se muestra después de inicializar Phaser.

ARQUITECTURA HEREDADA:
Canvas 2D continúa siendo el backend predeterminado. Phaser consume únicamente la escena neutral producida por AdaptadorEscenaJuego mediante configurarDimensiones, dibujar y destruir. Juego, comandos, resultados, paneles y persistencia siguen siendo canónicos y compartidos.

DEPENDENCIAS Y VERSIONES HEREDADAS:
Phaser 4.2.1, licencia MIT, incorporado localmente. No existen dependencias npm.

DECISIÓN DE SECUENCIA APROBADA:
E0 no fue descartada ni completada. Se pausa temporalmente por las limitaciones de conectividad, permisos de instalación y descarga del equipo actual.

Secuencia temporal aprobada:

P1 → P2 → E0 → P3

P2 puede analizarse y proponerse porque utiliza Phaser ya incorporado y no deberá agregar Node.js, npm, Electron ni nuevas dependencias. E0 deberá cerrarse antes de comenzar P3.

SIGUIENTE ETAPA A PROPONER:
P2 — Corte vertical visual

OBJETIVO DE LA SIGUIENTE ETAPA:
Demostrar el valor visual de Phaser mediante una escena pequeña pero representativa basada en un mapa o fragmento real, con suelo, paredes, obstáculos, personaje, entre dos y cinco enemigos, objetivo, decoración, profundidad, sombras, cuadrícula discreta, iluminación básica, selección, cámara, zoom y desplazamiento.

REGLA DE INICIO:
Primero presentar una propuesta clara de P2 y esperar la aprobación explícita del usuario. No comenzar la implementación por el solo hecho de que la secuencia haya sido autorizada.

PRIMEROS ARCHIVOS A REVISAR:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
- docs/phaser/entregas/ENTREGA_P1.md
- src/interfaz/graficos/phaser/RenderizadorPhaser.js
- src/interfaz/graficos/phaser/EscenaArranquePhaser.js
- src/interfaz/graficos/phaser/ConfiguracionPhaser.js
- AdaptadorEscenaJuego y los recursos visuales existentes que resulten relevantes para el corte elegido

NO MODIFICAR SIN NUEVA APROBACIÓN:
- lógica canónica de Juego, movimiento, combate, IA, muerte, experiencia y botín;
- persistencia y versión del guardado;
- contratos de AdaptadorEscenaJuego, Renderizador y EjecutorAccionesJugador;
- Canvas 2D como modo predeterminado durante la transición;
- protección temporal del puntero antes de definir cámara, zoom y coordenadas;
- Node.js, npm, Electron, herramienta de empaquetado o cualquier dependencia nueva;
- alcance completo de todos los mapas o combate, porque P2 es un corte vertical limitado.

CRITERIO DE DECISIÓN DE P2:
- la mejora visual debe ser clara;
- el estilo debe ser coherente con el Diseño Maestro;
- la cuadrícula debe seguir siendo legible;
- el rendimiento debe ser suficiente;
- la dirección artística debe resultar viable;
- debe decidirse si conviene continuar con la migración.

COMMIT DOCUMENTAL SUGERIDO PARA ESTA ACTUALIZACIÓN:
docs(phaser): reordenar P2 antes de E0

- registra el commit final confirmado de P1;
- pausa temporalmente E0 por limitaciones del equipo actual;
- establece P2 como siguiente etapa a proponer;
- exige completar E0 antes de comenzar P3.

----------------- FIN DEL ENLACE -----------------
