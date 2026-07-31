# ENTREGA P0 — REVALIDACIÓN Y CONTRATO DE ARQUITECTURA

Proyecto: Dark Moon
Plan: Integración progresiva de Phaser, beta y Electron
Etapa: P0 — Revalidación y contrato de arquitectura
Fecha: 30 de julio de 2026
Estado: Cerrada, pendiente de commit por el usuario

---

## 1. Conclusión sencilla

### Qué se analizó

Se revisó la copia completa del repositorio entregada mediante ZIP, incluido `.git`, para comprobar cómo se inicia el juego, cómo entran las órdenes del jugador, dónde vive la lógica, cómo se generan los resultados, cómo se representa el mapa y cómo se mantienen los paneles HTML/CSS.

### Por qué se analizó

Antes de incorporar Phaser era necesario confirmar si el proyecto necesitaba una refactorización adicional o si Phaser podía agregarse como una nueva forma de representar el mundo sin duplicar reglas.

### Conclusión final

Dark Moon ya posee separación suficiente para integrar Phaser progresivamente.

No es necesaria una ETAPA P0A.

La base actual ya contiene:

- comandos compartidos;
- una lógica canónica;
- un procesador común de resultados;
- un adaptador que crea una escena plana;
- un renderizador coordinador;
- un backend Canvas 2D intercambiable;
- paneles HTML/CSS separados del backend del mapa.

### Decisión o acción recomendada

Cerrar P0 y avanzar a P1 después de verificar y aprobar la versión exacta, licencia, ubicación y forma de carga de Phaser.

---

## 2. Fuente principal y contraste remoto

### Fuente principal obligatoria

Copia descomprimida desde:

`Dark-Moon-v0.zip`

Ruta técnica utilizada durante la etapa:

`/mnt/data/work_p0/Dark-Moon`

La copia contiene el directorio `.git` y fue utilizada para analizar, modificar y validar P0.

### Fuente complementaria

Repositorio conectado mediante GitHub:

`Lordtias/Dark-Moon`

GitHub se utilizó solamente para confirmar el repositorio publicado y contrastar el commit base.

### Resultado del contraste

- repositorio remoto: accesible;
- rama predeterminada remota: `main`;
- commit publicado consultado: `a4fa4da7c12408f4c99a7f6c31672de09742984d`;
- mensaje: `docs(phaser): agregar plan maestro y diseño visual`;
- el commit remoto coincide con el commit base incluido en el ZIP.

---

## 3. Estado de Git

### Ruta

`/mnt/data/work_p0/Dark-Moon`

### Rama

`main`

### Commit base

`a4fa4da7c12408f4c99a7f6c31672de09742984d`

### HEAD inicial verificado

`a4fa4da7c12408f4c99a7f6c31672de09742984d`

### Relación con el remoto

`main...origin/main`

### Estado inicial real

El ZIP fue creado desde un entorno Windows y contiene muchos archivos de trabajo con finales de línea CRLF, mientras los objetos de Git conservan LF.

En el entorno Linux de análisis, `git status` sin la configuración global de Windows mostró 148 archivos modificados, pero todos esos cambios eran conversiones completas LF/CRLF:

- 54.015 inserciones;
- 54.015 eliminaciones;
- contenido idéntico después de normalizar finales de línea.

Con el tratamiento equivalente al entorno de origen:

```bash
git -c core.autocrlf=true status --short --branch
```

el estado inicial fue:

```text
## main...origin/main
```

No se encontraron cambios funcionales recuperables, archivos no versionados ni archivos ignorados que interfirieran con la etapa.

No se utilizaron `git reset`, `git clean`, `git checkout` ni `git restore`.

---

## 4. Decisiones aprobadas

1. No crear P0A.
2. Mantener P0 exclusivamente documental.
3. Adoptar 32 × 32 como tamaño lógico de casilla.
4. Adoptar 1024 × 640 como referencia inicial, sin limitar el tamaño futuro del mapa.
5. Usar cámara en Phaser en lugar de achicar todo el mapa.
6. Utilizar temporalmente `?render=canvas2d|phaser`.
7. Mantener paneles, menús y modales densos en HTML/CSS durante este hito; una mejora posterior podrá evaluarse después del hito.
8. Exigir obligatoriamente estado neutral y comandos compartidos.
9. No modificar lógica, persistencia, datos ni Canvas 2D durante P0.
10. Modificar solamente los documentos maestros y agregar esta entrega.
11. Utilizar el ZIP completo con `.git` como fuente principal y GitHub como fuente complementaria.

---

## 5. Estado funcional heredado

Dark Moon continúa siendo una aplicación web sin dependencias instaladas ni empaquetador.

Flujo de inicio:

```text
index.html
  → game.js
  → PresentacionAplicacionDom
  → Aplicacion.iniciar()
  → carga paralela de configuraciones JSON
  → creación de personaje
  → ControladorPartida
  → ciudad o mazmorra
```

La aplicación requiere servidor HTTP porque utiliza:

- módulos ES;
- `fetch()` para JSON;
- rutas relativas para CSS, imágenes y JavaScript.

La persistencia durable utiliza `localStorage` y conserva principalmente:

- progresión;
- atributos;
- recursos;
- oro;
- progreso mágico;
- inventario;
- equipamiento.

No se modificó ese contrato.

---

## 6. Arquitectura real encontrada

### 6.1 Entrada

`src/controles/ControladorTeclado.js` transforma teclas en comandos de `TIPOS_COMANDO_JUGADOR`.

`src/controles/ControladorPunteroHabilidades.js` transforma clics en coordenadas de casilla y emite un comando compartido para fijar el selector de habilidad.

Ni el teclado ni el puntero calculan daño, IA o tiempo.

### 6.2 Coordinación

`src/aplicacion/ControladorPartida.js` mantiene el punto común:

```javascript
ejecutarComandoJugador(comando)
```

Ese punto es utilizado por teclado, barra, puntero y podrá ser utilizado por Phaser.

### 6.3 Ejecución canónica

`src/aplicacion/EjecutorAccionesJugador.js` decide qué operación canónica corresponde a cada comando.

`src/juego/Juego.js` conserva las reglas y coordina los sistemas de dominio.

### 6.4 Resultado

`src/aplicacion/ProcesadorResultadoAccion.js` normaliza el resultado, muestra mensajes, solicita redibujado y notifica la derrota cuando corresponde.

### 6.5 Presentación neutral

`src/interfaz/graficos/AdaptadorEscenaJuego.js` convierte la instancia de `Juego` en una escena plana con:

- mapa y apariencia;
- zonas temporales;
- modo de selección;
- casillas seleccionables;
- áreas afectadas;
- recorridos;
- objetivos afectados;
- entidades visuales.

### 6.6 Backend gráfico

`src/interfaz/Renderizador.js` crea la escena plana y la entrega a `renderizadorMapa`.

El backend actual es:

`src/interfaz/graficos/RenderizadorCanvas2D.js`

Su contrato mínimo ya incluye:

```text
configurarDimensiones({ columnas, filas })
dibujar(escena)
destruir()
```

### 6.7 Paneles

El mismo `Renderizador` continúa actualizando:

- panel de personaje;
- inventario;
- equipamiento;
- registro de eventos.

Estos componentes permanecen en HTML/CSS y son independientes del dibujo del mapa.

---

## 7. Flujo arquitectónico aprobado

```text
Teclado, ratón o Phaser
          │
          ▼
  Comando compartido
          │
          ▼
 ControladorPartida
          │
          ▼
EjecutorAccionesJugador
          │
          ▼
 Juego y sistemas canónicos
          │
          ▼
   Resultado canónico
          │
          ▼
ProcesadorResultadoAccion
          │
          ▼
 AdaptadorEscenaJuego
          │
          ▼
 Estado neutral visual
          │
     ┌────┴────┐
     ▼         ▼
 Canvas 2D   Phaser
          │
          ▼
Paneles HTML/CSS independientes
```

Regla obligatoria:

> Phaser representa resultados y produce comandos. No resuelve reglas del juego.

---

## 8. Contrato neutral aprobado

### Entrada

Phaser deberá emitir los mismos tipos de comando existentes o extensiones genéricas aprobadas.

Ejemplos conceptuales:

```javascript
{ tipo: "mover", movimientoX: 1, movimientoY: 0 }
{ tipo: "esperar" }
{ tipo: "confirmar" }
{ tipo: "fijarSelectorHabilidad", x: 6, y: 4 }
```

Los nombres exactos deberán reutilizar las constantes reales de `TIPOS_COMANDO_JUGADOR`.

### Salida visual

Phaser recibirá una escena preparada, no una copia libre de toda la instancia de `Juego`.

La escena deberá transportar datos suficientes para representar:

- mapa;
- bioma o apariencia;
- entidades;
- posiciones;
- recursos visuales;
- vida visible;
- hostilidad;
- selecciones;
- áreas;
- trayectorias;
- zonas temporales.

### Prohibiciones

Phaser no podrá:

- cambiar directamente `x` o `y` de una entidad;
- calcular daño;
- resolver muerte;
- entregar experiencia;
- entregar botín;
- decidir turnos enemigos;
- modificar la agenda temporal;
- guardar la partida;
- identificar contenido por nombre mostrado.

---

## 9. Casilla, resolución y escalado

### Casilla lógica

Valor aprobado:

`32 × 32`

Esta medida corresponde al mundo lógico y coincide con `TILE_SIZE = 32` en:

`src/juego/configuracion/ConfiguracionInicial.js`

Una imagen de 64, 128 o más píxeles puede representar una entidad de una casilla. La resolución del archivo no altera la ocupación lógica.

### Resolución inicial de referencia

Valor aprobado:

`1024 × 640`

Equivale inicialmente a:

- 32 casillas de ancho;
- 20 casillas de alto.

No es:

- tamaño máximo de mapa;
- tamaño fijo de ventana;
- obligación para pantalla completa;
- límite para futuras expansiones.

### Mapas grandes

Los mapas futuros podrán ser mayores. Phaser deberá utilizar:

- cámara;
- límites;
- desplazamiento;
- zoom;
- recentrado.

No deberá reducir todo el mapa hasta volver pequeñas o ilegibles las casillas.

---

## 10. Selector temporal de renderizador

Formato aprobado:

```text
?render=canvas2d
?render=phaser
```

Comportamiento previsto:

- sin parámetro: Canvas 2D;
- `canvas2d`: renderizador anterior;
- `phaser`: backend Phaser;
- valor desconocido: advertencia y recuperación con Canvas 2D;
- Phaser no se guardará dentro del estado del jugador;
- el selector será inicialmente una herramienta de desarrollo, no una opción visible del menú.

La selección se realizará al iniciar la aplicación. No se requiere cambiar de backend en caliente durante P1.

---

## 11. Acoplamientos y riesgos encontrados

### 11.1 Conversión de clic a casilla

`ControladorPunteroHabilidades` calcula la casilla suponiendo que todo el canvas representa todo el mapa.

Con cámara y zoom esa suposición deja de ser válida.

Acción futura:

- el backend gráfico deberá traducir coordenadas de pantalla a coordenadas del mundo;
- el controlador de entrada no deberá reconstruir por sí mismo la cámara.

No bloquea P1 porque P1 no incluye selección real ni movimiento real.

### 11.2 Canvas 2D encoge el mapa completo

`RenderizadorCanvas2D.ajustarTamanoVisual()` elige una escala que hace entrar todo el mapa dentro del panel.

Consecuencia:

- cuanto mayor es el mapa, menores se ven las casillas.

Acción futura:

- conservar ese comportamiento en Canvas 2D durante la transición;
- usar cámara real en Phaser.

### 11.3 Nombre del bloque `combate`

La escena neutral utiliza el bloque `combate` para combate, interacción y habilidades.

No duplica reglas, pero el nombre es más estrecho que su responsabilidad actual.

Acción recomendada:

- no romper el contrato durante P1;
- evaluar una evolución compatible hacia `seleccion` o `superposiciones` cuando exista una necesidad real.

### 11.4 Renderizador coordinador con DOM

`Renderizador` es neutral respecto del backend del mapa, pero también escribe el registro HTML y actualiza paneles.

Conclusión:

- no es un bloqueo;
- el backend de mapa ya es intercambiable;
- no conviene separar más componentes solo para introducir Phaser.

### 11.5 Carga de imágenes

`CargadorImagenes` utiliza `Image` y pertenece al backend Canvas 2D.

Phaser deberá utilizar su propio cargador y caché, consumiendo las mismas rutas configurables.

No se debe compartir una caché de objetos `Image` a la fuerza.

### 11.6 Ejecución HTTP

Los JSON se cargan mediante `fetch()` y el juego no funciona directamente con `file://`.

No bloquea P1 ni GitHub Pages.

Debe revalidarse en E0 para garantizar ejecución offline dentro de Electron mediante la estrategia aprobada.

### 11.7 Filtrado visual

Canvas 2D mantiene `image-rendering: pixelated` y desactiva suavizado.

El Documento Visual ya descartó pixel art estricto como dirección principal.

Acción futura:

- no cambiar el renderizador anterior durante P0;
- Phaser definirá el filtrado adecuado para la dirección ilustrada.

### 11.8 Ciclo de vida

Canvas 2D dispone de `destruir()`, aunque actualmente la interfaz persistente se crea una vez por partida.

El selector de P1 se resolverá al arranque, evitando la complejidad de cambiar renderizador en caliente.

---

## 12. Implementaciones duplicadas y temporales

Resultado:

- una clase `Juego`;
- un ejecutor central de acciones;
- un controlador de teclado;
- un controlador de puntero de habilidades;
- un adaptador de escena;
- un renderizador coordinador;
- un backend Canvas 2D;
- ninguna implementación Phaser existente;
- ningún archivo `.patch`;
- ningún archivo `.mjs`;
- ningún `.orig`, `.rej`, `.tmp`, `.bak` ni archivo terminado en `~`.

No se encontraron implementaciones paralelas que deban eliminarse antes de P1.

---

## 13. Validaciones realizadas

| Validación | Resultado obtenido | Estado |
|---|---|---|
| Ruta del repositorio | `/mnt/data/work_p0/Dark-Moon` | Correcto |
| Rama | `main` | Correcto |
| HEAD | `a4fa4da7c12408f4c99a7f6c31672de09742984d` | Correcto |
| Relación remota | `main...origin/main` | Correcto |
| Commit publicado en GitHub | Coincide con el base | Correcto |
| Cambios recuperables iniciales | Ninguno; solo CRLF del ZIP | Correcto |
| Archivos JS revisados automáticamente | 150 | Correcto |
| Imports relativos revisados | 241 | Correcto |
| Imports relativos ausentes | 0 | Correcto |
| JSON revisados | 21 | Correcto |
| JSON inválidos | 0 | Correcto |
| HTML principales revisados | 2 | Correcto |
| Referencias locales HTML ausentes | 0 | Correcto |
| Archivos temporales interferentes | 0 | Correcto |
| Inicio de servidor HTTP | `index.html` respondió HTTP 200 | Correcto |
| Ejecución completa en navegador | Chromium headless no finalizó dentro del límite del entorno | Pendiente |
| Creación de personaje y flujo jugable | No ejecutado en P0 | Pendiente |
| GitHub Pages real | No ejecutado en P0 | Pendiente |

### Aclaración sobre Chromium

Se intentó una carga automatizada con Chromium headless. El proceso mantuvo listeners activos y no terminó dentro del límite del entorno, por lo que no se utiliza esa ejecución como evidencia funcional.

No se afirma que el juego completo haya sido probado en navegador durante P0.

P0 no modificó código productivo, por lo que la validación funcional profunda corresponde a las etapas que incorporen cambios ejecutables.

---

## 14. Matriz de regresión para P1

| Área | Canvas 2D | Phaser | Criterio de P1 |
|---|---|---|---|
| Inicio de aplicación | Debe continuar | Debe iniciar escena mínima | Sin errores de consola |
| Creación de personaje | Debe continuar | Debe continuar | No depende del backend |
| Panel del personaje | Debe continuar | Debe continuar | HTML/CSS intacto |
| Inventario | Debe continuar | Debe continuar | HTML/CSS intacto |
| Equipamiento | Debe continuar | Debe continuar | HTML/CSS intacto |
| Barra de habilidades | Debe continuar | Debe continuar | Sin migración funcional |
| Registro | Debe continuar | Debe continuar | Mensajes visibles |
| Canvas/área central | Mapa actual | Escena técnica mínima | Selector por URL |
| Redimensionamiento | Comportamiento heredado | Adaptación al panel | Sin deformación |
| Resolución diagnóstica | No obligatoria | 1024 × 640 de referencia | Visible en modo diagnóstico |
| Lógica real | Sin cambios | Sin uso todavía | No duplicada |
| Persistencia | Sin cambios | Sin cambios | Misma clave y versión |
| Carga offline | HTTP local | Recursos locales Phaser | Sin CDN obligatorio |
| GitHub Pages | Debe continuar | Debe cargar modo Phaser | Rutas relativas válidas |

---

## 15. Archivos de P0

### Modificados

- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

### Agregados

- `docs/phaser/entregas/ENTREGA_P0.md`

### Eliminados

Ninguno.

### Código productivo modificado

Ninguno.

### Dependencias instaladas

Ninguna.

---

## 16. Archivos previstos para P1

La lista deberá revalidarse antes de implementar, pero constituye el alcance técnico inicial aprobado.

### Revisar obligatoriamente

- `index.html`
- `game.js`
- `assets/estilos/base/style.css`
- `src/interfaz/dom/PresentacionAplicacionDom.js`
- `src/interfaz/dom/FabricaInterfazPartidaDom.js`
- `src/interfaz/Renderizador.js`
- `src/interfaz/graficos/AdaptadorEscenaJuego.js`
- `src/interfaz/graficos/RenderizadorCanvas2D.js`
- `src/controles/ControladorPunteroHabilidades.js`

### Modificar probablemente

- `index.html`
- `assets/estilos/base/style.css`
- `src/interfaz/dom/FabricaInterfazPartidaDom.js`

`game.js` y `Renderizador.js` solo se modificarán si la implementación real lo exige y la propuesta de P1 lo explica.

### Agregar propuesto

- `assets/estilos/phaser/phaser.css`
- `assets/vendor/phaser/phaser.min.js`
- `src/interfaz/graficos/SelectorRenderizador.js`
- `src/interfaz/graficos/phaser/ConfiguracionPhaser.js`
- `src/interfaz/graficos/phaser/InicializadorPhaser.js`
- `src/interfaz/graficos/phaser/EscenaArranquePhaser.js`
- `src/interfaz/graficos/phaser/RenderizadorPhaser.js`
- `docs/licencias/PHASER.md`
- `docs/phaser/entregas/ENTREGA_P1.md`

La ruta y el nombre exacto del archivo oficial de Phaser deberán confirmarse en P1 junto con la versión estable y la licencia. No se autoriza todavía descargar ni agregar Phaser.

### No modificar en P1 sin nueva aprobación

- `src/juego/Juego.js`
- `src/juego/movimiento/**`
- `src/juego/combate/**`
- `src/juego/ia/**`
- `src/juego/tiempo/**`
- `src/juego/habilidades/**`
- `src/partida/PersistenciaJugador.js`
- `src/config/**`
- JSON de contenido
- lógica de generación
- reglas de botín

---

## 17. Dependencias y versiones

P0 no incorpora dependencias.

Phaser continúa siendo una dependencia candidata para P1.

La mención previa de Phaser 4.2.1 no equivale a aprobación de instalación. P1 deberá verificar en una fuente oficial:

- versión estable vigente;
- archivo de distribución;
- licencia;
- APIs públicas utilizadas;
- funcionamiento local y offline.

No se utilizará `latest` ni un rango flotante.

---

## 18. Impactos

### Web

Ningún impacto funcional en P0.

### Electron

Ningún impacto funcional en P0.

### Persistencia

Ninguno.

### Contenido nuevo

Ninguno.

El contrato aprobado exige que el contenido futuro se represente mediante identificadores, rutas y estados configurables, sin excepciones por nombre visible.

---

## 19. Comprobación de restricciones

- no se instaló Phaser;
- no se instaló ninguna dependencia;
- no se utilizó npm;
- no se creó ningún `.mjs`;
- no se creó ningún `.patch`;
- no se realizó commit;
- no se realizó push;
- no se modificó código productivo;
- no se alteró persistencia;
- no se eliminó Canvas 2D;
- no se avanzó automáticamente a P1;
- no se utilizaron comandos destructivos de Git.

---

## 20. Conventional Commit propuesto

```text
docs(phaser): cerrar contrato arquitectónico de P0

- documentar la arquitectura real y el flujo canónico de comandos;
- fijar casilla lógica, resolución de referencia y política de cámara;
- registrar el selector temporal y la convivencia entre Canvas 2D y Phaser;
- confirmar que P0A no es necesaria y preparar el alcance de P1;
- agregar la entrega, riesgos, validaciones y matriz de regresión de P0.
```

No se realizó el commit.

---

## 21. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
ETAPA P0 — Revalidación y contrato de arquitectura

ESTADO:
Cerrada

COMMIT BASE:
a4fa4da7c12408f4c99a7f6c31672de09742984d

HEAD FINAL VERIFICADO:
a4fa4da7c12408f4c99a7f6c31672de09742984d

GIT STATUS FINAL:
Tres cambios documentales previstos sin commit: modificados `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md` y `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`; agregado `docs/phaser/entregas/ENTREGA_P0.md`. La copia Windows contiene CRLF y en Linux debe consultarse con `git -c core.autocrlf=true status` para evitar falsos positivos de finales de línea.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_P0.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Se revalidó la arquitectura real, se confirmó que Phaser puede incorporarse como backend visual sin duplicar la lógica y se definieron el contrato neutral, la escala y la estrategia reversible de integración.

ARQUITECTURA HEREDADA:
Entrada neutral mediante comandos; `ControladorPartida` como punto común; `EjecutorAccionesJugador` y `Juego` como lógica canónica; `ProcesadorResultadoAccion` para resultados; `AdaptadorEscenaJuego` para estado visual plano; `Renderizador` como coordinador; Canvas 2D y futuro Phaser como backends; paneles densos en HTML/CSS durante el hito.

ARCHIVOS CLAVE:
- src/aplicacion/ControladorPartida.js: punto común de ejecución y activación de mapas.
- src/aplicacion/EjecutorAccionesJugador.js: contrato de comandos del jugador.
- src/interfaz/Renderizador.js: coordinador de paneles y backend del mapa.
- src/interfaz/graficos/AdaptadorEscenaJuego.js: contrato neutral de escena.
- src/interfaz/graficos/RenderizadorCanvas2D.js: backend actual que debe conservarse.
- src/interfaz/dom/FabricaInterfazPartidaDom.js: lugar actual donde se elige y construye el backend del mapa.

DEPENDENCIAS Y VERSIONES:
Ninguna incorporada. Phaser debe revalidarse oficialmente en P1 y fijarse en una versión exacta.

PRUEBAS CLAVE SUPERADAS:
- rama `main`, HEAD y commit remoto contrastados;
- 241 imports relativos verificados sin rutas ausentes;
- 21 JSON validados correctamente;
- referencias locales de los dos HTML verificadas;
- servidor HTTP local respondió correctamente para `index.html`;
- ausencia de archivos temporales e implementaciones gráficas paralelas.

PROBLEMAS O RIESGOS PENDIENTES:
- el puntero actual calcula casillas suponiendo que el canvas representa el mapa completo;
- Canvas 2D reduce todo el mapa para hacerlo entrar;
- el bloque visual llamado `combate` también representa interacción y habilidades;
- debe validarse el flujo completo en navegador durante P1;
- debe revalidarse la versión estable oficial de Phaser.

DECISIONES APROBADAS:
- P0A no es necesaria;
- P0 es exclusivamente documental;
- casilla lógica de 32 × 32;
- resolución 1024 × 640 como referencia inicial, no límite;
- cámara para mapas grandes;
- selector `?render=canvas2d|phaser`, con Canvas 2D predeterminado;
- paneles HTML/CSS durante este hito, con posible evaluación posterior;
- estado neutral y comandos compartidos obligatorios;
- ZIP completo con `.git` como fuente principal y GitHub como complemento.

DECISIONES QUE SIGUEN ABIERTAS:
- versión exacta y distribución oficial de Phaser;
- ubicación final del archivo local de Phaser;
- filtrado visual definitivo en Phaser;
- detalles de la escena técnica de P1;
- perspectiva y orientación definitiva de sprites, reservadas para P2;
- controles concretos de cámara, reservados para P3.

SIGUIENTE ETAPA RECOMENDADA:
ETAPA P1 — Núcleo técnico de Phaser

OBJETIVO DE LA SIGUIENTE ETAPA:
Incorporar Phaser de manera mínima, reversible y sin migrar todavía la lógica real, manteniendo Canvas 2D y los paneles HTML/CSS operativos.

PRIMEROS ARCHIVOS A REVISAR:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
- docs/phaser/entregas/ENTREGA_P0.md
- src/interfaz/dom/FabricaInterfazPartidaDom.js
- src/interfaz/Renderizador.js
- src/interfaz/graficos/RenderizadorCanvas2D.js
- index.html
- assets/estilos/base/style.css

NO MODIFICAR SIN NUEVA APROBACIÓN:
- lógica canónica de `Juego` y sus sistemas;
- movimiento, combate, IA y tiempo;
- persistencia y versión del guardado;
- datos JSON y contenido;
- eliminación o reemplazo definitivo de Canvas 2D;
- migración de paneles densos a Phaser;
- instalación de Phaser antes de aprobar versión, licencia y forma de carga.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Phaser inicia desde recursos locales dentro del área central mediante el selector aprobado, muestra una escena técnica adaptable, mantiene operativos los paneles HTML/CSS y Canvas 2D, no duplica reglas y funciona sin servicios externos.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
docs(phaser): cerrar contrato arquitectónico de P0

- documentar la arquitectura real y el flujo canónico de comandos;
- fijar casilla lógica, resolución de referencia y política de cámara;
- registrar el selector temporal y la convivencia entre Canvas 2D y Phaser;
- confirmar que P0A no es necesaria y preparar el alcance de P1;
- agregar la entrega, riesgos, validaciones y matriz de regresión de P0.

----------------- FIN DEL ENLACE -----------------
