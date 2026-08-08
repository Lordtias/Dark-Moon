# ENTREGA E0 — VALIDACIÓN TÉCNICA TEMPRANA DE ELECTRON

## 1. Identificación

- Proyecto: **Dark Moon**
- Etapa: **E0 — Validación técnica temprana de Electron**
- Rama: `feature/electron-e0`
- Base web validada: `43786cd50840988c1f4d647128a96abdb0bd2d50`
- Commit documental inicial del hito: `ea8943aeab80deda8746692006eec0cdcd20b0b2`
- Candidato web de partida: `0.7.0-beta.2`
- Plataforma de validación manual: **Windows 10 x64**
- SHA de cierre E0: **pendiente del commit final del usuario**
- Clasificación final: **🟢 VIABLE**

---

## 2. Objetivo de E0

Determinar, con evidencia real y antes de avanzar a una beta de escritorio, si Dark Moon podía ejecutarse y empaquetarse con Electron sin exigir una reestructuración tardía de:

- gameplay;
- Phaser;
- interfaz web;
- carga de recursos;
- persistencia;
- arquitectura canónica del juego.

E0 debía responder una pregunta concreta:

> ¿La arquitectura actual de Dark Moon es compatible con un destino Electron seguro, local, offline y empaquetable para Windows, manteniendo además la versión web?

Respuesta final: **sí**.

---

## 3. Qué se analizó y por qué

### 3.1 Fuente de verdad y Git

Se trabajó desde la rama:

`feature/electron-e0`

La rama nació desde el cierre validado de P7.5:

`43786cd50840988c1f4d647128a96abdb0bd2d50`

El primer commit del nuevo hito fue exclusivamente documental:

`ea8943aeab80deda8746692006eec0cdcd20b0b2`

Objetivo de esta separación:

- mantener `main` congelada como referencia web estable mientras E0 fuera experimental;
- permitir descartar o integrar Electron sin mantener dos Dark Moon permanentes;
- aislar claramente documentación y cambios técnicos del nuevo hito.

### 3.2 Arquitectura web existente

Se revisaron especialmente:

- `index.html`;
- `game.js`;
- imports ES del navegador;
- rutas relativas;
- carga de JSON mediante `fetch()`;
- catálogos de idioma;
- CSS e imágenes;
- Phaser local `4.2.1`;
- APIs de navegador usadas por el juego;
- persistencia basada en `localStorage`;
- selector Phaser / Canvas 2D.

La arquitectura no mostró una dependencia estructural de GitHub Pages o de un backend web. Esto permitió probar un wrapper Electron pequeño en vez de crear una variante del juego.

---

## 4. Herramientas y versiones utilizadas

### Máquina de desarrollo Windows validada

- Node.js: `24.19.0` LTS
- npm: `11.17.0`

Node/npm son herramientas de desarrollo. No son requisitos del jugador.

### Dependencias del proyecto

- Electron: `43.3.0` — licencia MIT
- `@electron/packager`: `20.0.1` — licencia BSD-2-Clause

Ambas versiones quedan fijadas exactamente en:

- `package.json`;
- `package-lock.json`.

No se utilizan rangos `^`, `~` ni `latest` para estas dependencias.

---

## 5. Decisión de tooling: Forge descartado en E0

La propuesta inicial utilizaba:

`@electron-forge/cli 7.11.2`

Después de instalar Forge, la ejecución real de:

```bash
npm audit
```

informó:

- 21 vulnerabilidades totales;
- 3 low;
- 17 high;
- 1 critical.

Las alertas provenían del árbol transitivo del tooling de Forge, incluyendo componentes de empaquetado/reconstrucción como `tar`, `tmp`, `@electron/node-gyp` y `@electron/rebuild`.

No se ejecutó `npm audit fix --force`.

Se aprobó reemplazar Forge por una herramienta de menor alcance para E0:

`@electron/packager 20.0.1`

Después del cambio:

```text
Electron               43.3.0
@electron/packager      20.0.1
Electron Forge          retirado
npm audit               0 vulnerabilities
```

Conclusión:

Para la necesidad de E0 —producir una carpeta Windows x64 ejecutable— Packager resultó suficiente y redujo el árbol de tooling. Forge queda como opción futura a reevaluar si E1/E2 necesitan makers, instalador u otras capacidades.

---

## 6. Archivos incorporados

### `package.json`

Define:

- identidad técnica del proyecto npm;
- versión `0.7.0-beta.2`;
- entrada Electron `electron/main.js`;
- comando de desarrollo `npm start`;
- comando de empaquetado Windows x64 `npm run package`;
- dependencias exactas de desarrollo.

Comandos vigentes:

```bash
npm start
npm run package
```

### `package-lock.json`

Registra el árbol exacto de dependencias npm.

Auditoría estática del ZIP de cierre:

- `lockfileVersion`: `3`;
- Electron bloqueado en `43.3.0`;
- Packager bloqueado en `20.0.1`;
- no existen referencias a Electron Forge.

### `electron/main.js`

Implementa exclusivamente infraestructura de escritorio:

- registro del protocolo local `darkmoon://`;
- servicio de archivos pertenecientes a la aplicación;
- protección contra rutas fuera de la raíz de Dark Moon;
- `BrowserWindow`;
- política de seguridad;
- CSP;
- bloqueo de nuevas ventanas;
- restricción de navegación;
- ciclo de vida de la aplicación;
- eliminación del menú nativo `File / Edit / View / Window`.

No contiene gameplay.

### `.gitignore`

Se mantienen las reglas previas y se agregan:

```text
/node_modules/
/out/
```

`node_modules/` y `out/` son reconstruibles y no deben versionarse.

---

## 7. Arquitectura Electron validada

### 7.1 Protocolo interno

Entrada Electron:

```text
darkmoon://app/index.html
```

El protocolo es interno a la aplicación. No es una dirección de Internet.

Objetivos cumplidos:

- conservar rutas relativas;
- permitir módulos ES;
- permitir `fetch()` de recursos locales;
- mantener un origen estable para `localStorage`;
- evitar dependencia de `file://`;
- impedir acceso por traversal a archivos externos a Dark Moon.

### 7.2 Una sola aplicación canónica

No se creó una copia Electron de:

- `index.html`;
- `game.js`;
- `src/`;
- `assets/`;
- configuraciones JSON;
- Phaser.

La misma aplicación continúa alimentando ambos destinos:

```text
Dark Moon canónico
      │
      ├── navegador web
      └── Electron
```

---

## 8. Seguridad implementada y validada

### 8.1 BrowserWindow

Configuración explícita:

```text
nodeIntegration: false
contextIsolation: true
sandbox: true
webSecurity: true
```

No se incorporaron:

- `preload`;
- IPC;
- acceso general del renderer al filesystem;
- desactivación de `webSecurity`;
- servidor HTTP interno.

### 8.2 Navegación

Se validó una política de contención:

- nuevas ventanas: denegadas;
- navegación fuera de `darkmoon://app`: bloqueada.

### 8.3 Aislamiento real del renderer

Con DevTools abiertas temporalmente durante la prueba se ejecutó:

```js
typeof require
```

Resultado:

```text
'undefined'
```

Se ejecutó:

```js
typeof process
```

Resultado:

```text
'undefined'
```

Se ejecutó:

```js
location.href
```

Resultado:

```text
'darkmoon://app/index.html'
```

Conclusión:

El renderer del juego no recibió acceso directo a Node y la aplicación se ejecutó desde el origen interno esperado.

La apertura automática de DevTools utilizada para esta comprobación fue retirada antes del cierre.

### 8.4 Content Security Policy

Se implementó una CSP desde Electron sin modificar el destino web:

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

Resultado manual:

- Dark Moon continuó funcionando normalmente;
- Phaser cargó correctamente;
- no aparecieron errores CSP;
- desapareció la advertencia de CSP insegura de Electron;
- no se habilitó `unsafe-inline` ni `unsafe-eval` para scripts.

`unsafe-inline` se mantiene únicamente en `style-src` por compatibilidad con la UI actual.

---

## 9. Persistencia

La persistencia existente basada en `localStorage` fue mantenida.

No se migraron partidas a archivos.

Prueba realizada:

1. abrir Dark Moon mediante Electron;
2. jugar/modificar estado reconocible;
3. verificar partida, preferencias y barra de habilidades;
4. cerrar completamente Electron;
5. volver a ejecutar;
6. utilizar **Continuar**.

Resultado:

**satisfactorio**.

La partida y demás información durable sobrevivieron al cierre y reapertura.

La prueba se repitió sobre la aplicación empaquetada y también fue satisfactoria.

Conclusión:

`localStorage` es suficiente para E0. Una migración futura sólo deberá considerarse si E1/E2 obtiene un beneficio concreto, por ejemplo exportación, backups, perfiles o Steam Cloud.

Restricción importante:

El origen `darkmoon://app` debe considerarse estable. Cambiarlo arbitrariamente en etapas futuras puede crear un almacenamiento web distinto y hacer que partidas previas parezcan ausentes.

---

## 10. Pruebas funcionales Electron

### 10.1 Arranque y recursos

Preparación:

```bash
npm start
```

Resultado:

- ventana Electron abre correctamente;
- pantalla inicial carga;
- CSS carga;
- imágenes cargan;
- módulos ES cargan;
- JSON/catálogos cargan;
- Phaser 4.2.1 inicia correctamente.

Estado: **PASS**.

### 10.2 Gameplay representativo

Se verificaron de forma manual y representativa:

- movimiento;
- teclado y mouse;
- UI;
- inventario/equipamiento;
- habilidad/combate;
- continuidad de la partida.

Resultado: **satisfactorio**.

Estado: **PASS**.

### 10.3 Resize y fullscreen

Se probaron:

- maximizar;
- restaurar;
- resize manual;
- volver a maximizar;
- entrar a fullscreen;
- salir de fullscreen;
- continuidad de teclado/mouse.

Resultado: **satisfactorio**.

Estado: **PASS**.

### 10.4 Offline en modo desarrollo

Se ejecutó Dark Moon sin conexión a Internet.

Se comprobó:

- arranque;
- recursos;
- Phaser;
- Continuar;
- juego representativo.

Resultado: **satisfactorio**.

Estado: **PASS**.

---

## 11. Empaquetado Windows x64

Comando:

```bash
npm run package
```

Salida informada por Packager:

```text
Packaging app for platform win32 x64 using electron v43.3.0
Wrote new app to: out\Dark Moon-win32-x64
```

Resultado esperado:

```text
out/
└── Dark Moon-win32-x64/
    ├── Dark Moon.exe
    └── archivos de runtime Electron
```

Resultado obtenido:

**correcto**.

Estado: **PASS**.

### 11.1 Ejecución fuera del repositorio

Se copió la carpeta `Dark Moon-win32-x64` fuera del repositorio y se ejecutó directamente `Dark Moon.exe`.

Resultado:

- aplicación abrió correctamente;
- no dependió de `C:\Repos\Dark-Moon`;
- gameplay representativo funcionó.

Estado: **PASS**.

### 11.2 Persistencia desde el EXE empaquetado

Se modificó un estado reconocible, se cerró el EXE y se volvió a abrir.

**Continuar** recuperó correctamente el estado.

Estado: **PASS**.

### 11.3 EXE empaquetado offline

Se ejecutó el paquete fuera del repositorio y sin conexión a Internet.

El juego abrió, cargó recursos y permitió continuar/jugar.

Estado: **PASS**.

Conclusión:

La compilación técnica no depende de GitHub Pages, CDN, servidor HTTP manual, Node ni npm en el equipo del jugador.

---

## 12. Regresión web

Después de incorporar Electron se volvió a ejecutar la aplicación web de la misma rama.

Se verificó:

- entrada web normal;
- Phaser como backend predeterminado;
- gameplay representativo;
- `?render=canvas2d` como fallback.

Resultado informado: **todo funciona correctamente**.

Estado: **PASS**.

Auditoría adicional sobre el ZIP de cierre mediante servidor HTTP estático confirmó respuesta `200` para recursos representativos:

```text
index.html
 game.js
assets/estilos/base/style.css
assets/vendor/phaser/4.2.1/phaser.min.js
src/config/ConfiguracionPersonaje.json
src/config/idiomas/es.json
```

La integración Electron no modificó `index.html`, `game.js`, `src/` ni `assets/` durante E0.

---

## 13. Auditoría final del ZIP de cierre

ZIP recibido para auditoría:

`DarkMoon-E0.zip`

### Git

- rama: `feature/electron-e0`;
- HEAD: `ea8943aeab80deda8746692006eec0cdcd20b0b2`;
- upstream: `origin/feature/electron-e0`;
- `main` del ZIP: `43786cd50840988c1f4d647128a96abdb0bd2d50`;
- cambios sin commit antes del cierre: `.gitignore`, `electron/`, `package.json`, `package-lock.json`.

### Higiene

- `node_modules/`: ausente del ZIP — correcto;
- `out/`: ausente del ZIP — correcto;
- Forge: sin referencias en configuración/lock — correcto;
- `openDevTools`: ausente — correcto;
- preload/IPC: ausentes — correcto;
- flags de seguridad debilitados: no detectados — correcto;
- `git diff --check`: sin errores.

### Corrección realizada durante auditoría

Se detectó que la edición manual de `.gitignore` había reemplazado accidentalmente la regla previa:

```text
PROMPT_MAESTRO_ETAPAS_PHASER_ELECTRON.txt
```

La regla fue restaurada y se conservaron además:

```text
/node_modules/
/out/
```

No se detectaron otros cambios ajenos al alcance.

### Limitación de la auditoría independiente

El `npm audit` final de seguridad fue ejecutado satisfactoriamente en la máquina Windows del usuario y reportó `0 vulnerabilities` después de adoptar Packager.

El entorno de revisión utilizado para inspeccionar el ZIP no pudo repetir el endpoint de `npm audit` por una limitación de su registro npm interno. Por lo tanto, la evidencia de `0 vulnerabilities` registrada en esta entrega corresponde a la ejecución real mostrada por el usuario en Windows, mientras que la auditoría del ZIP confirmó estáticamente las versiones y la ausencia de Forge.

---

## 14. Qué no fue necesario cambiar

E0 no necesitó modificar:

- gameplay;
- balance;
- clases/personajes;
- enemigos;
- IA;
- habilidades;
- maestrías;
- mapas;
- inventario/equipamiento;
- configuraciones canónicas;
- Phaser;
- renderer Canvas 2D;
- `index.html`;
- `game.js`;
- persistencia funcional existente.

Este punto es central para la decisión de viabilidad: Electron se integró como contenedor, no como reescritura.

---

## 15. Riesgos y deuda técnica que permanecen

### 15.1 Origen de persistencia

`darkmoon://app` debe mantenerse estable mientras se quiera conservar continuidad automática del `localStorage` actual.

### 15.2 Tamaño

Electron incluye Chromium y su runtime. El tamaño final de distribución deberá medirse y optimizarse cuando sea relevante para testers/producto.

### 15.3 Firma de Windows

La compilación E0 no está firmada. Advertencias de reputación/firma de Windows pertenecen a una etapa posterior.

### 15.4 Producto vs paquete técnico

E0 genera una carpeta portable técnica. No genera todavía:

- instalador;
- actualización automática;
- experiencia de instalación/desinstalación;
- distribución comercial.

### 15.5 Contenido del paquete

E1 deberá revisar qué archivos del repositorio deben formar parte de la distribución final, si conviene usar ASAR y qué metadatos/iconos debe llevar el ejecutable.

### 15.6 Futuras funciones nativas

Exportación de archivos, Steam, logs avanzados u otras APIs nativas pueden requerir `preload`/IPC en el futuro. Si ocurre, deberán exponerse APIs pequeñas y explícitas; no se debe habilitar Node globalmente en el renderer.

---

## 16. Clasificación final

# 🟢 VIABLE

Electron funciona con la arquitectura actual mediante cambios pequeños y contenidos de infraestructura.

No se identificó ninguna incompatibilidad que exija reestructurar Dark Moon antes de continuar.

La integración mantiene:

- una sola base canónica;
- destino web;
- destino Electron;
- Phaser predeterminado;
- Canvas 2D fallback;
- persistencia actual;
- aislamiento de seguridad;
- funcionamiento offline.

---

## 17. Conclusión sencilla

### Qué se analizó

Si el Dark Moon web actual podía convertirse en una aplicación Electron segura y empaquetable para Windows sin rehacer el juego.

### Por qué se analizó

Para descubrir ahora —antes de avanzar a distribución de escritorio/Steam— cualquier incompatibilidad estructural que pudiera obligar a una migración costosa más adelante.

### Qué se obtuvo

Una aplicación Electron funcional, segura dentro del alcance de E0, persistente, offline y empaquetable para Windows x64, manteniendo intacto el destino web.

### Conclusión

**Electron es técnicamente viable para Dark Moon con la arquitectura actual.**

### Acción siguiente

E0 debe cerrarse con commit del usuario.

Después del commit, E1 queda **habilitada para análisis**, pero no debe comenzar automáticamente. Su alcance debe proponerse y aprobarse explícitamente.

---

## 18. Conventional Commit propuesto

```text
feat(electron): validar wrapper y empaquetado tecnico de E0
```

El commit y push corresponden al usuario.
