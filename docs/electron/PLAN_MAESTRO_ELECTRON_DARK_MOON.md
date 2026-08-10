# PLAN MAESTRO — ELECTRON — DARK MOON

## 1. Propósito

Este documento es la fuente de verdad operativa para el hito de integración de Dark Moon con Electron.

No conserva la crónica detallada de P0–P7. Esa historia permanece disponible en Git. El objetivo de este archivo es mantener solamente:

- el estado técnico vigente del proyecto;
- las decisiones que condicionan Electron;
- la arquitectura que no debe romperse;
- el alcance de E0, E1, E2 y S1;
- los criterios de validación y cierre;
- los riesgos y decisiones pendientes que continúan vivos.

Cuando una etapa se cierre, su detalle reproducible se registrará en una entrega específica dentro de `docs/electron/entregas/` mientras resulte útil para el hito actual.

> **Actualización arquitectónica posterior:** Dark Moon retiró su renderizador Canvas 2D propio después de certificar la cobertura de Phaser. Phaser 4.2.1 es ahora el único renderizador mantenido por la aplicación y conserva `Phaser.AUTO` para elegir internamente WebGL o Canvas. Las referencias a Canvas 2D dentro de evidencias históricas de E0 describen el estado que existía cuando esas pruebas fueron realizadas, no la arquitectura vigente.

---

## 2. Estado de partida

### Base estable

- commit base validado: `43786cd50840988c1f4d647128a96abdb0bd2d50`;
- rama estable: `main`;
- rama de trabajo del hito: `feature/electron-e0`;
- candidato web: `0.7.0-beta.2`;
- P7: cerrada;
- E0: **cerrada técnicamente con clasificación 🟢 VIABLE**;
- próxima etapa elegible: **E1 — Beta Electron**, pendiente de aprobación explícita;
- SHA de cierre E0: **pendiente del commit final del usuario**.

### Estado web vigente

Dark Moon continúa siendo ejecutable como aplicación web.

La versión web debe seguir siendo un destino soportado durante este hito salvo decisión explícita posterior.

Características relevantes de la base actual:

- `index.html` continúa siendo la entrada web;
- `game.js` inicia la aplicación mediante módulos ES del navegador;
- Phaser 4.2.1 es el único renderizador gráfico canónico mantenido por Dark Moon;
- el parámetro histórico `render` ya no selecciona un backend alternativo;
- Phaser está incluido localmente en `assets/vendor/phaser/4.2.1/phaser.min.js`;
- no existe dependencia de CDN para ejecutar el juego;
- la publicación web utiliza rutas relativas compatibles con un subdirectorio como `/Dark-Moon/`;
- la persistencia actual utiliza `localStorage`;
- GitHub Pages continúa siendo útil para pruebas web y testers.

---

## 3. Objetivo general del hito Electron

Incorporar un destino de escritorio para Dark Moon sin crear una segunda versión del juego ni trasladar reglas canónicas a Electron o Node.js.

La arquitectura objetivo es:

```text
                 Dark Moon canónico
                        │
              lógica + datos + UI
                        │
             ┌──────────┴──────────┐
             │                     │
             ▼                     ▼
       Navegador web           Electron
       GitHub Pages          aplicación local
```

Ambos destinos deben reutilizar la misma aplicación y los mismos recursos siempre que sea razonable.

Electron debe actuar como **contenedor de escritorio e infraestructura**, no como nuevo motor del juego.

---

## 4. Principios obligatorios

1. Cada etapa debe ser autocontenida.
2. Antes de implementar una etapa se presenta análisis y se espera aprobación explícita.
3. No se avanza automáticamente a la etapa siguiente.
4. La lógica jugable canónica no se duplica en Electron.
5. Phaser continúa representando resultados; no resuelve reglas de juego.
6. Phaser continúa siendo una capa de presentación y no una autoridad de reglas; no se mantiene un segundo renderizador propio como fallback.
7. La versión web debe continuar funcionando después de los cambios de Electron.
8. Electron no debe recibir privilegios que Dark Moon no necesite.
9. No se agregan dependencias sin explicar previamente función, versión, impacto y alternativa.
10. Las dependencias se fijan con versión exacta; no se utiliza `latest` ni rangos flotantes.
11. `node_modules` nunca se versiona en Git.
12. Los archivos de bloqueo de dependencias que correspondan deben versionarse.
13. No se agrega telemetría ni comunicación externa sin aprobación.
14. No se introduce un servidor local permanente si el mismo objetivo puede resolverse de forma más simple.
15. No se modifica gameplay, balance o contenido para hacer funcionar Electron salvo incompatibilidad técnica demostrada y aprobada.
16. Toda etapa debe terminar con pruebas reproducibles, conclusión sencilla y Conventional Commit propuesto.
17. El usuario realiza los commits y pushes; no se hacen automáticamente.

---

## 5. Responsabilidades por tecnología

### 5.1 JavaScript canónico de Dark Moon

Continúa controlando, entre otros:

- movimiento y ocupación;
- tiempo e iniciativa;
- inteligencia artificial;
- combate;
- precisión, evasión, crítico, bloqueo y armadura;
- habilidades y maestrías;
- estados y zonas;
- inventario y equipamiento;
- progresión;
- generación;
- recompensas;
- persistencia funcional;
- datos JSON.

### 5.2 Phaser

Continúa siendo responsable de la representación visual del mundo, incluyendo:

- mapa y entidades;
- cámara y zoom;
- animaciones;
- proyectiles;
- efectos visuales;
- áreas y estados visuales;
- selección y resaltado.

Phaser consume contratos de presentación y comandos compartidos. No debe convertirse en dueño de las reglas.

### 5.3 HTML y CSS

Continúan controlando inicialmente la interfaz de aplicación:

- personaje;
- inventario;
- equipamiento;
- habilidades;
- maestrías;
- menús;
- modales;
- selección de personaje y mapa;
- configuración;
- ayuda y diagnóstico.

### 5.4 Electron

Electron podrá ser responsable de:

- ventana de escritorio;
- carga local de la misma aplicación web;
- empaquetado;
- ciclo de vida de la aplicación;
- pantalla completa cuando corresponda;
- ubicación de datos de aplicación;
- logs técnicos futuros;
- versión de aplicación;
- distribución portable o instalable futura;
- integración futura con Steam si se aprueba.

Electron **no** será responsable de movimiento, combate, IA, habilidades, mapas, inventario ni reglas de dominio.

---

## 6. Estrategia de ramas

E0 se desarrolla en:

`feature/electron-e0`

La rama parte de:

`43786cd50840988c1f4d647128a96abdb0bd2d50`

`main` se mantiene como referencia estable de P7.5 mientras E0 sea experimental.

La rama Electron es un laboratorio temporal, no una segunda línea permanente del producto.

Si E0 resulta viable, la intención será integrar el soporte Electron nuevamente en la línea principal para mantener una única base de Dark Moon con dos destinos de ejecución.

---

## 7. Política de versiones y dependencias

### 7.1 Phaser

Versión vigente:

- Phaser `4.2.1`;
- licencia MIT;
- recurso local versionado;
- sin CDN;
- sin actualización automática.

E0 no debe actualizar Phaser salvo incompatibilidad concreta demostrada y aprobada.

### 7.2 Herramientas validadas en E0

Versiones exactas utilizadas y validadas en Windows 10:

- Node.js `24.19.0` LTS — herramienta de desarrollo;
- npm `11.17.0` — gestor de paquetes utilizado durante E0;
- Electron `43.3.0` — runtime de escritorio, licencia MIT;
- `@electron/packager` `20.0.1` — empaquetado técnico Windows, licencia BSD-2-Clause.

Las versiones de Electron y Packager quedan fijadas exactamente en `package.json` y `package-lock.json`.

### 7.3 Decisión Forge → Packager

La propuesta inicial contemplaba `@electron-forge/cli` `7.11.2`.

Durante la instalación real, `npm audit` informó 21 vulnerabilidades en el árbol de tooling de Forge (3 low, 17 high y 1 critical), principalmente a través de dependencias transitivas de empaquetado y reconstrucción.

No se aplicó `npm audit fix --force`.

Se aprobó reemplazar Forge por `@electron/packager` `20.0.1`, porque E0 sólo necesitaba producir una carpeta Windows ejecutable y no requería makers, instalador, publicación ni actualización automática.

Después del reemplazo:

- Electron permaneció en `43.3.0`;
- `@electron/packager` quedó en `20.0.1`;
- Forge fue retirado del árbol;
- el `npm audit` ejecutado en la máquina Windows de validación informó `0 vulnerabilities`.

Forge podrá reevaluarse en E1/E2 si aporta una necesidad concreta y su árbol de dependencias resulta aceptable en ese momento.

### 7.4 Qué significa cada elemento

**Node.js**

Se instala solamente en la máquina de desarrollo para ejecutar herramientas de construcción. Los jugadores no deben instalar Node para utilizar una compilación final de Dark Moon.

**npm**

Es el gestor de paquetes utilizado para reproducir las dependencias declaradas por el proyecto.

**Electron**

Incluye Chromium y su propio runtime Node para ejecutar la aplicación empaquetada. E0 confirmó que Node no queda expuesto al renderer del juego.

**Electron Packager**

Genera la carpeta técnica ejecutable para Windows x64. E0 no requiere todavía instalador comercial, actualización automática ni firma.

### 7.5 Archivos incorporados por E0

E0 incorporó como mínimo:

- `package.json`;
- `package-lock.json`;
- `electron/main.js`;
- entradas nuevas en `.gitignore` para dependencias y salidas de construcción.

`node_modules/` será local y nunca deberá incluirse en Git.

La carpeta de salida de empaquetado tampoco deberá versionarse.

---

# 8. ETAPA E0 — Validación técnica temprana de Electron

## 8.1 Objetivo

Comprobar que Dark Moon puede ejecutarse como aplicación de escritorio sin exigir una reestructuración de gameplay, presentación o persistencia.

E0 es una etapa de **viabilidad técnica**, no de producto comercial.

---

## 8.2 Hipótesis de partida

La arquitectura actual parece compatible con un wrapper Electron pequeño porque:

- la entrada es HTML + JavaScript del navegador;
- los módulos son ES modules nativos;
- los recursos utilizan rutas relativas;
- JSON y catálogos se cargan mediante `fetch()`;
- Phaser está incluido localmente;
- la lógica no depende de un backend web;
- la persistencia está centralizada en `localStorage`;
- Electron puede proporcionar un entorno Chromium compatible con las APIs de navegador actuales.

Esta hipótesis quedó **validada en E0** mediante ejecución real, pruebas de persistencia/offline, auditoría de aislamiento, empaquetado Windows x64 y regresión web.

---

## 8.3 Arquitectura validada en E0

### Contenedor mínimo

Electron creará una `BrowserWindow` que cargará la misma aplicación existente.

No se creará una copia de `index.html`, `game.js`, `src/` ni `assets/` específica para Electron.

### Protocolo local estable

La aplicación no se cargará mediante `file://` como solución principal.

Se utilizará un protocolo interno estable, conceptualmente:

`darkmoon://app/`

Ejemplos:

```text
darkmoon://app/index.html
darkmoon://app/game.js
darkmoon://app/src/config/ConfiguracionPersonaje.json
darkmoon://app/assets/...
```

El protocolo será interno a Electron; no existe en Internet.

Debe:

- servir únicamente archivos pertenecientes a Dark Moon;
- admitir rutas relativas;
- permitir el uso de `fetch()`;
- conservar un origen estable para la persistencia del navegador;
- impedir traversal hacia archivos externos a la aplicación.

El nombre/origen seleccionado se debe considerar estable porque cambiarlo posteriormente puede separar el almacenamiento `localStorage`.

---

## 8.4 Seguridad mínima obligatoria

La `BrowserWindow` de E0 deberá declarar explícitamente:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `sandbox: true`;
- `webSecurity: true`.

Objetivo:

```text
Dark Moon renderer
HTML + CSS + JS + Phaser
        │
        │ sin acceso directo a Node
        ▼
Electron / sistema operativo
```

E0 no agregará `preload` ni IPC mientras no exista una necesidad concreta.

También deberá impedir navegación arbitraria fuera del origen local autorizado y evitar apertura de ventanas externas no solicitadas.

Nunca se desactivará `webSecurity` para resolver rutas o CORS.

### CSP

E0 incorporó una Content Security Policy aplicada desde el proceso principal de Electron, sin modificar `index.html` ni el destino web.

Política validada:

```text
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob:
connect-src 'self'
font-src 'self' data:
media-src 'self' data: blob:
object-src 'none'
frame-src 'none'
base-uri 'none'
```

La política fue probada con Phaser 4.2.1 y el juego representativo sin errores o advertencias CSP en DevTools.

`unsafe-inline` queda limitado a estilos por compatibilidad con la UI actual; no se habilitó `unsafe-inline` ni `unsafe-eval` para scripts.

---

## 8.5 Persistencia

E0 mantendrá la persistencia actual basada en `localStorage` salvo evidencia concreta de incompatibilidad.

No se migrarán partidas a archivos solamente para preparar una posibilidad futura.

Debe comprobarse que:

1. el usuario crea o carga una partida;
2. se genera persistencia;
3. se cierra completamente Electron;
4. se vuelve a abrir la aplicación;
5. **Continuar** recupera correctamente el estado durable actual.

También deberán comprobarse:

- preferencias de interfaz;
- barra de habilidades;
- cualquier otra información durable ya almacenada.

Una futura migración a archivos podrá reconsiderarse en E1/E2 si aporta valor concreto para:

- exportación/importación;
- backups;
- múltiples perfiles;
- Steam Cloud;
- recuperación de datos.

---

## 8.6 Alcance técnico mínimo

E0 debe:

- instalar y registrar las herramientas aprobadas;
- crear configuración npm mínima;
- crear el proceso principal Electron;
- cargar Dark Moon desde recursos locales;
- iniciar con Phaser predeterminado;
- conservar la separación entre Phaser y las reglas canónicas;
- validar módulos ES;
- validar `fetch()` de JSON y catálogos;
- validar imágenes y CSS;
- validar WebGL/Phaser;
- validar controles de teclado y ratón;
- validar cámara, zoom, resize y pantalla completa;
- validar persistencia;
- validar funcionamiento sin Internet;
- generar una compilación técnica Windows x64;
- comprobar que la versión web continúa funcionando;
- documentar pasos, resultados y riesgos.

---

## 8.7 Fuera de alcance de E0

E0 no incluye:

- gameplay nuevo;
- balance;
- rediseño de UI;
- migración general de persistencia;
- instalador comercial;
- auto-update;
- firma de código;
- Steam;
- Steamworks;
- Steam Cloud;
- logros;
- workshop;
- telemetría;
- marketing;
- publicación comercial.

---

## 8.8 Regresión obligatoria

La validación debe comprobar dos destinos.

### Electron

Como mínimo:

- apertura y cierre;
- carga de recursos;
- nueva partida;
- continuar partida;
- movimiento y espera;
- combate;
- una habilidad/estado representativo;
- IA;
- muerte, experiencia o botín representativo;
- inventario y equipamiento;
- transición de mapa representativa;
- configuración;
- persistencia tras cerrar y reabrir;
- Phaser;
- ejecución offline.

### Web

Después de incorporar Electron debe repetirse una regresión suficiente para confirmar que:

- `index.html` continúa arrancando;
- Phaser continúa siendo predeterminado;
- una URL histórica con `render` no altera el arranque Phaser;
- rutas relativas continúan válidas;
- GitHub Pages no depende de Electron, Node ni npm en tiempo de ejecución.

Electron no se considera exitoso si rompe el destino web actual.

---

## 8.9 Empaquetado Windows

E0 debe producir una compilación técnica **Windows x64** que pueda ejecutarse sin:

- Node instalado en el equipo del jugador;
- npm;
- Python;
- servidor HTTP manual;
- acceso a GitHub Pages;
- acceso a Internet para cargar recursos del juego.

La primera salida puede ser una carpeta portable ejecutable. E0 no exige todavía un instalador amigable.

El artefacto debe probarse también fuera de la carpeta fuente del repositorio para comprobar que no depende accidentalmente de rutas de desarrollo.

---

## 8.10 Evidencia de pruebas

Cada prueba relevante debe registrar:

- preparación;
- pasos;
- resultado esperado;
- resultado obtenido;
- estado;
- evidencia o nota técnica cuando corresponda.

Al cerrar E0 se creará:

`docs/electron/entregas/ENTREGA_E0.md`

No se creará la entrega final antes de tener evidencia real.

---

## 8.11 Criterio de cierre E0

E0 queda cerrada cuando exista evidencia suficiente de que Dark Moon:

- abre como aplicación Electron;
- carga módulos, JSON, CSS e imágenes;
- ejecuta Phaser/WebGL;
- permite jugar de forma representativa;
- guarda;
- cierra;
- vuelve a abrir;
- recupera persistencia;
- funciona offline;
- puede empaquetarse para Windows x64;
- no depende de GitHub Pages en escritorio;
- no expone Node directamente al renderer;
- conserva aislamiento de contexto, sandbox y seguridad web;
- no rompe el destino web.

---

## 8.12 Clasificación final E0

La etapa debe terminar con una sola clasificación:

### 🟢 VIABLE

Electron funciona con un wrapper/configuración acotados y no requiere reestructuración significativa de Dark Moon.

Acción recomendada: continuar con E1 cuando se apruebe.

### 🟡 VIABLE CON AJUSTES CONTENIDOS

Electron funciona, pero existen incompatibilidades delimitadas que conviene corregir antes de avanzar.

Acción recomendada: resolver los ajustes identificados y repetir las pruebas afectadas.

### 🔴 REQUIERE REPLANTEO

La aplicación necesita cambios arquitectónicos relevantes para ejecutarse o empaquetarse de manera segura.

Acción recomendada: no ampliar Electron hasta definir una etapa específica de compatibilidad.

---

## 8.13 Riesgos y deuda técnica vigentes

### Origen de persistencia

`localStorage` depende del origen. El protocolo interno de Electron debe definirse de forma estable y no cambiarse arbitrariamente en etapas posteriores.

### Tamaño de Electron

Electron incluye Chromium y Node, por lo que una aplicación empaquetada será considerablemente mayor que la versión web. Esto es esperado y no implica por sí mismo un problema estructural.

### Windows sin firma

Una compilación técnica no firmada puede generar advertencias de Windows. Firma y experiencia comercial quedan fuera de E0.

### Futuras APIs de sistema

Si E1/E2 requieren exportar archivos, logs avanzados, Steam u otras funciones nativas, podrán necesitar `preload` e IPC. Esas capacidades deberán diseñarse como APIs pequeñas y explícitas, no habilitando Node globalmente.

### Dependencias nativas futuras

Una futura integración Steam podría introducir módulos nativos y requisitos adicionales de empaquetado. No deben anticiparse en E0.

---

## 8.14 Resultado final de E0

Clasificación: **🟢 VIABLE**.

E0 demostró que Dark Moon puede ejecutarse y empaquetarse con Electron mediante un wrapper acotado sin reestructurar gameplay, Phaser, presentación web ni persistencia.

Quedó validado:

- `darkmoon://app/` como origen interno estable;
- módulos ES, `fetch()` de JSON/catálogos, CSS e imágenes locales;
- Phaser 4.2.1 / WebGL;
- persistencia `localStorage` entre cierres y reaperturas;
- ejecución offline;
- resize, maximizado y fullscreen;
- `nodeIntegration: false`;
- `contextIsolation: true`;
- `sandbox: true`;
- `webSecurity: true`;
- bloqueo de nuevas ventanas y navegación externa;
- CSP restrictiva compatible con el juego actual;
- `require` y `process` no expuestos al renderer;
- paquete Windows x64 ejecutable fuera del repositorio;
- continuidad del destino web con la arquitectura gráfica existente en ese momento. El fallback Canvas 2D fue retirado posteriormente tras certificar Phaser.

No se requiere migrar `localStorage` en esta etapa. No se requiere servidor local para el ejecutable. No se requiere Node/npm en el equipo del jugador.

Deuda/riesgos que continúan vivos para etapas posteriores:

- origen `darkmoon://app` debe mantenerse estable para no fragmentar `localStorage`;
- el tamaño de Electron debe medirse/optimizarse cuando la distribución sea relevante;
- la compilación no está firmada;
- E0 produce carpeta portable técnica, no instalador;
- E1 deberá decidir icono, metadatos, contenido final del paquete y política de datos/diagnóstico;
- cualquier futura API nativa o Steam deberá introducirse mediante superficies pequeñas y explícitas, no habilitando Node globalmente.

La evidencia detallada de cierre se registra en:

`docs/electron/entregas/ENTREGA_E0.md`

---

# 9. ETAPA E1 — Beta Electron

## Objetivo

Transformar la prueba técnica validada de E0 en una compilación cómoda para testers.

## Alcance orientativo

- portable Windows estable;
- nombre, versión e icono;
- ubicación estable de datos;
- exportación/importación si aporta valor;
- logs y diagnóstico;
- pantalla completa;
- cierre seguro;
- recuperación;
- instrucciones para testers;
- política simple de compatibilidad de guardados.

## No incluye automáticamente

- publicación comercial;
- actualizador obligatorio;
- Steamworks;
- firma de código.

## Criterio conceptual de cierre

Un tester puede recibir la compilación, abrirla, jugar, guardar, volver a abrirla y enviar información útil sobre errores sin preparar un entorno de desarrollo.

E1 sólo se inicia después del cierre y aprobación de E0.

---

# 10. ETAPA E2 — Empaquetado de producto

## Objetivo

Preparar una distribución de escritorio más cercana a un producto comercial.

## Alcance posible

- instalador;
- portable definitivo;
- compilación reproducible;
- licencias;
- iconografía definitiva;
- configuración;
- recuperación y migración de partidas si fueran necesarias;
- control de versiones;
- logs;
- firma de código si se decide;
- pruebas en distintos equipos;
- estrategia de actualización.

E2 no comienza por calendario; se inicia cuando exista una versión suficientemente estable y se apruebe su alcance.

---

# 11. ETAPA S1 — Prueba privada en Steam

## Objetivo

Comprobar una compilación privada de Dark Moon dentro del flujo real de Steam.

## Alcance posible

- configuración inicial de la aplicación;
- build privada;
- subida;
- ejecución desde Steam;
- cierre;
- guardado;
- overlay si se aprueba;
- Steam Cloud si se aprueba;
- logros si se aprueban;
- compatibilidad con actualizaciones.

## No incluye automáticamente

- publicación pública;
- precio;
- página definitiva;
- marketing;
- logros;
- Steam Cloud;
- Workshop.

Cada integración de Steam debe analizarse y aprobarse por separado.

---

# 12. Flujo de trabajo del hito

Para cada etapa:

1. verificar ZIP, `.git`, rama, HEAD y estado limpio;
2. analizar arquitectura y alcance;
3. presentar propuesta clara;
4. esperar aprobación explícita;
5. implementar solamente el alcance aprobado;
6. ejecutar pruebas técnicas y manuales;
7. comprobar regresiones web cuando corresponda;
8. documentar evidencia y conclusión;
9. proponer Conventional Commit;
10. el usuario realiza el commit;
11. registrar el SHA final como base de continuidad.

Las conclusiones deben indicar de forma sencilla:

- qué se analizó;
- por qué se analizó;
- qué resultado se obtuvo;
- cuál es la conclusión;
- cuál es la próxima acción recomendada.

---

# 13. Etapa operativa actual

## E0 — Validación técnica temprana de Electron

Estado: **CERRADA — 🟢 VIABLE**.

Base de inicio del hito Electron:

`43786cd50840988c1f4d647128a96abdb0bd2d50`

Commit documental inicial de la rama:

`ea8943aeab80deda8746692006eec0cdcd20b0b2`

Rama de validación:

`feature/electron-e0`

SHA de cierre E0:

**pendiente del commit final del usuario**.

Resultado:

- Electron funciona como segundo contenedor de la misma aplicación canónica;
- no fue necesario modificar gameplay ni migrar persistencia;
- se genera y ejecuta una carpeta Windows x64 portable técnica;
- el ejecutable funciona fuera del repositorio y sin Internet;
- la versión web continúa operativa;
- la configuración de seguridad mínima y CSP fueron validadas;
- E0 se clasifica **🟢 VIABLE**.

Próxima etapa elegible:

**E1 — Beta Electron**.

E1 no se inicia automáticamente. Requiere análisis de alcance y aprobación explícita antes de cualquier implementación.
