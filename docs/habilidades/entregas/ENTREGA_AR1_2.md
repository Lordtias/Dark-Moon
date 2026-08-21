# Entrega AR1.2 — Alcance canónico y composición del árbol de habilidades

## Estado de la entrega

- Implementación: completa según el alcance aprobado.
- Estado de cierre: **Pausada a la espera de validación manual dentro del juego**.
- Motivo: el entorno permitió validar lógica, configuración, sintaxis, rutas HTTP y una maqueta estructural de CSS, pero el navegador automatizado bloqueó por política administrativa la navegación a `localhost`. No se declara una prueba visual real dentro de Dark Moon que no pudo ejecutarse.
- CD2 — Resistencias negativas permanece pendiente y no fue iniciado.

## Base de verdad

- Fuente utilizada: `Dark-Moon-AR1-1(1).zip` entregado por el usuario.
- Ruta de trabajo verificada: `/mnt/data/ar1_2_work/Dark-Moon`.
- Rama: `main`.
- Commit base: `658555f724d9459207de120250761d57d22abae4`.
- HEAD verificado antes y después de implementar: `658555f724d9459207de120250761d57d22abae4`.
- No se realizó commit ni push.

### Estado Git heredado

La extracción original del ZIP mostraba 179 archivos modificados. Antes de interpretar ese estado como trabajo real se comprobó una copia limpia del mismo ZIP:

- `git status --short`: 179 archivos modificados;
- `git diff --ignore-space-at-eol --quiet`: código de salida 0;
- conclusión: las 179 diferencias heredadas son exclusivamente conversión de finales de línea del empaquetado, no cambios funcionales recuperables.

No se utilizó `git reset`, `git clean`, `git checkout` ni `git restore` masivo.

## Alcance aprobado

AR1.2 corrige dos defectos de AR1.1 y ajusta el contrato visual del árbol sin reabrir CD1 ni cambiar el balance de las habilidades de Arco:

1. las habilidades de arma que declaran `ataqueArma.usaAlcanceArma=true` deben consumir el alcance canónico ya resuelto de `Combatiente.alcanceAtaque`;
2. `ATRIBUTO_HABILIDAD.ALCANCE` queda reservado para habilidades que realmente poseen un alcance interno propio;
3. una relación `modificacion`/línea continua representa una modificación específica de la habilidad destino;
4. una relación `sinergia`/línea punteada representa un beneficio mediante una estadística, estado o contexto compartido;
5. Arcos reclasifica como sinergias las doce relaciones de sus cuatro pasivas generales con los tres disparos ofensivos;
6. `Aura de Precisión` agrega tres sinergias con `Disparo múltiple`, `Disparo potente` y `Disparo evasivo`;
7. `Francotirador` conserva sus dos sinergias con `Disparo potente` y `Disparo evasivo`;
8. el grafo de Arcos queda con 17 relaciones reales, todas punteadas con el contenido actual;
9. `requisitoNivelMaestria` continúa siendo el único eje vertical del árbol;
10. la conectividad real del grafo distribuye horizontalmente los nodos sin casos por maestría, nombre o ID;
11. las conexiones SVG parten y llegan al borde de los nodos y se recalculan con `ResizeObserver` cuando cambia la geometría;
12. si el árbol excede la altura disponible, se desplaza verticalmente en lugar de recortarse;
13. se auditó la misma regla de acceso al contenido en los otros paneles principales; no se aplicaron cambios indiscriminados donde ya existía una superficie canónica de scroll.

## Fuera de alcance

- iconos definitivos de las cuatro habilidades activas de Arco; el usuario indicó que los incorporará por separado;
- cambios de daño, preparación, Dispersión, Penetración de Armadura, munición o desplazamiento táctico;
- CD2 — Resistencias negativas;
- nuevas dependencias, librerías o frameworks;
- cambios de Phaser, Electron, Node.js o npm;
- migraciones de persistencia.

## Problema 1 — Alcance de habilidades de Arco

### Estado anterior

`ConfiguracionHabilidadEfectiva` intentaba leer:

```text
lanzador.estadisticasDerivadas.alcanceAtaque
```

pero `estadisticasDerivadas` no expone ese atributo. El fallback terminaba llevando `Disparo múltiple`, `Disparo potente` y `Disparo evasivo` a alcance 1 aunque el arco equipado tuviera alcance 6 o 7.

### Estado final

Para una habilidad con `usaAlcanceArma=true` el flujo queda:

```text
arma equipada
→ ConfiguracionAtaqueActual
→ Combatiente.alcanceAtaque
→ OBJETIVOS_MODIFICADOR.ALCANCE_ATAQUE
→ ConfiguracionHabilidadEfectiva
→ geometría / selector / ejecución
```

No se vuelve a resolver ese mismo valor mediante `ATRIBUTO_HABILIDAD.ALCANCE`.

Las habilidades con alcance propio conservan el flujo:

```text
alcance configurado de la habilidad
→ OBJETIVOS_MODIFICADOR.ATRIBUTO_HABILIDAD
→ atributoHabilidad = alcance
→ ConfiguracionHabilidadEfectiva
```

Esto conserva la diferencia aprobada entre una estadística general del combatiente/ataque y un atributo interno específico de una habilidad.

## Problema 2 — Grafo de Arcos

### Estado anterior

AR1.1 poseía 14 relaciones, pero cada nivel de Arcos contenía un único nodo y el organizador centraba cada fila. Las conexiones se dibujaban después de la posición y por eso las líneas quedaban prácticamente superpuestas en una única columna vertical. Además, en escritorio el contenedor tenía `overflow: hidden`, por lo que un árbol más alto que el espacio disponible podía quedar cortado.

### Estado final

El organizador trabaja para cualquier maestría con dos reglas independientes:

- eje vertical: exclusivamente `requisitoNivelMaestria`;
- eje horizontal: conectividad entrante/saliente del grafo real.

El algoritmo no consulta `arcos`, magia, armadura ni IDs de habilidades. Las fuentes puras, destinos puros, nodos mixtos y nodos aislados reciben carriles relativos distintos; si varios nodos comparten nivel, se busca un carril libre cercano de forma determinista.

Las conexiones siguen siendo datos reales, no requisitos inventados. No se crean troncos visuales falsos para reducir el número de líneas.

## Semántica final de las relaciones

### `modificacion` — línea continua

El efecto está dirigido específicamente a la habilidad destino. Ejemplos existentes en árboles mágicos incluyen modificadores cuya condición identifica una habilidad concreta o un atributo interno de esa habilidad.

### `sinergia` — línea punteada

La habilidad destino se beneficia de una estadística, estado o contexto compartido, pero el modificador no pertenece internamente a esa habilidad.

En Arcos, el contenido actual queda así:

- `Tiro estable` → los tres disparos: Precisión general de Arco;
- `Tensión controlada` → los tres disparos: multiplicador general de daño de fuente para Arco;
- `Tiro letal` → los tres disparos: probabilidad de crítico general para Arco;
- `Ojo de halcón` → los tres disparos: alcance de ataque general para Arco;
- `Aura de Precisión` → los tres disparos: Precisión compartida por Aura bajo la condición de Arco;
- `Francotirador` → `Disparo potente` y `Disparo evasivo`: estado `Apuntando` consumido por contexto compatible.

Total actual: **17 sinergias**.

## Regla de scroll auditada

La decisión aprobada no se implementó como un reemplazo global de todos los `overflow: hidden`, porque algunos son parte legítima de la composición interna. Se revisaron las superficies principales relacionadas:

- Árbol de habilidades: corregido; ahora posee `overflow-y:auto` y el lienzo puede crecer por encima del alto visible.
- Panel superpuesto de partida: ya utiliza una superficie de contenido desplazable.
- Personaje: ya posee scroll canónico en su contenido interior.
- Inventario/Equipamiento: ya poseen scroll canónico en escritorio y el responsive móvil unifica el gesto en la superficie principal.
- Botín/Comercio/Curación/Selección/Detalles/Ayuda en móvil: ya existe la corrección de scroll principal único en `responsive.css`.

Por ese motivo AR1.2 no modifica `responsive.css` ni otros paneles que ya cumplen el principio aprobado.

## Archivos modificados

1. `src/juego/habilidades/ConfiguracionHabilidadEfectiva.js`
   - usa `lanzador.alcanceAtaque` cuando `usaAlcanceArma=true`;
   - conserva `ATRIBUTOS_HABILIDAD.ALCANCE` para alcance interno de habilidad.

2. `src/config/habilidades/Habilidades.json`
   - versión 11 → 12;
   - reclasifica doce enlaces de Arcos como `sinergia`;
   - agrega tres relaciones de `Aura de Precisión`;
   - conserva las dos sinergias de `Francotirador`.

3. `src/interfaz/habilidades/OrganizadorArbolHabilidades.js`
   - calcula relaciones antes de posicionar;
   - asigna posiciones horizontales genéricas desde conectividad;
   - conserva el nivel de maestría como única coordenada vertical.

4. `src/interfaz/habilidades/PanelHabilidadesMaestrias.js`
   - aplica la posición horizontal relativa a cada nodo;
   - conecta bordes de nodos en vez de sus centros;
   - redibuja SVG mediante `ResizeObserver` con debounce por `requestAnimationFrame`;
   - desconecta observadores al rerenderizar/destruir el panel.

5. `assets/estilos/paneles/habilidades-maestrias.css`
   - permite scroll vertical del árbol;
   - deja que el lienzo crezca naturalmente;
   - ubica nodos mediante posición horizontal relativa sin reglas por contenido.

6. `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
   - documenta semántica `modificacion`/`sinergia`;
   - documenta las 17 relaciones de Arcos;
   - documenta alcance de arma frente a atributo específico de habilidad;
   - documenta el organizador topológico genérico.

7. `docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md`
   - fija la cadena canónica del alcance en habilidades basadas en arma;
   - mantiene CD2 como siguiente bloque de combate.

8. `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
   - actualiza V-039 para grafo genérico, semántica de líneas, conexiones por bordes y resize;
   - amplía la regla de scroll para impedir recorte de información jugable.

## Archivo agregado

- `docs/habilidades/entregas/ENTREGA_AR1_2.md`.

## Archivos eliminados

- Ninguno.

## Archivos revisados pero no modificados por esta corrección

Entre otros:

- `src/entidad/destructible/combatiente/Combatiente.js`: ya contiene el getter canónico `alcanceAtaque` y no necesitó cambio;
- `src/config/objetos/Armas.json`: los alcances de los arcos ya eran correctos;
- `src/juego/habilidades/GeometriaHabilidades.js`: ya consume la configuración efectiva y no necesitó regla especial;
- `src/juego/modificadores/SistemaModificadoresCombatiente.js`: no se cambia el resolutor;
- `src/juego/combate/SistemaCombate.js`: no se cambia el motor de combate;
- `assets/estilos/pantallas/responsive.css`: auditado; la política móvil de scroll ya cubre el caso y no requiere duplicación;
- `package.json` y `package-lock.json`: sin cambios;
- Electron/Phaser vendor: sin cambios.

## Arquitectura antes y después

### Antes — alcance

```text
arma con alcance 6/7
→ Combatiente.alcanceAtaque correcto
→ ConfiguracionHabilidadEfectiva lee una propiedad inexistente de estadisticasDerivadas
→ fallback 1
→ habilidad con alcance 1
```

### Después — alcance

```text
arma con alcance 6/7
→ Combatiente.alcanceAtaque
→ SMC aplica modificadores generales como Ojo de halcón
→ ConfiguracionHabilidadEfectiva consume ese valor
→ selector y ejecución usan el alcance correcto
```

### Antes — árbol

```text
nivel de maestría
→ fila
→ nodo único centrado
→ relaciones dibujadas después
→ múltiples conexiones superpuestas
```

### Después — árbol

```text
relaciones reales
→ mapa de conectividad
→ posición horizontal relativa
+
nivel de maestría
→ posición vertical
→ nodos y conexiones legibles mediante el mismo organizador genérico
```

## Dependencias y versiones

### Nuevas dependencias

- Ninguna.

### Dependencias existentes no modificadas

- Phaser 4.2.1, copia local del proyecto;
- Electron 43.3.0 declarado como dependencia de desarrollo existente;
- `@electron/packager` 20.0.1 declarado como dependencia de desarrollo existente.

AR1.2 no instala, actualiza ni requiere ninguna de ellas para aplicar el incremental. `ResizeObserver` es API nativa del navegador.

## Instalación / aplicación del incremental

No hay instalación de dependencias.

Reemplazar por las versiones incluidas en el ZIP incremental:

```text
assets/estilos/paneles/habilidades-maestrias.css
src/config/habilidades/Habilidades.json
src/interfaz/habilidades/OrganizadorArbolHabilidades.js
src/interfaz/habilidades/PanelHabilidadesMaestrias.js
src/juego/habilidades/ConfiguracionHabilidadEfectiva.js
docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md
docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
```

Agregar:

```text
docs/habilidades/entregas/ENTREGA_AR1_2.md
```

Eliminar:

```text
Ningún archivo.
```

## Ejecución

La versión web conserva el mecanismo actual:

```bash
python3 -m http.server 8000
```

Abrir:

```text
http://localhost:8000/index.html
```

No se modifica el arranque de Electron.

## Desinstalación

No corresponde: no se instalaron paquetes, servicios ni herramientas. Para revertir AR1.2 debe restaurarse únicamente la versión anterior de los ocho archivos reemplazados y eliminarse este documento de entrega.

## Validaciones realizadas

### 1. Verificación Git inicial

- Preparación: extracción nueva de `Dark-Moon-AR1-1(1).zip`.
- Pasos: comprobar rama, HEAD, `git status` y `git diff --ignore-space-at-eol --quiet`.
- Esperado: `main`, HEAD aprobado y confirmar si la gran cantidad de cambios era real o de empaquetado.
- Obtenido: `main`; HEAD `658555f724d9459207de120250761d57d22abae4`; 179 archivos marcados, pero diferencia funcional nula ignorando finales de línea.
- Estado: **Correcto**.
- Evidencia: código de salida 0 de `git diff --ignore-space-at-eol --quiet` sobre una extracción nueva.

### 2. Sintaxis JavaScript completa

- Preparación: repositorio con AR1.2 aplicado.
- Pasos: ejecutar `node --check` sobre todos los `.js` del repositorio.
- Esperado: cero errores sintácticos.
- Obtenido: **295 archivos JavaScript correctos**.
- Estado: **Correcto**.

### 3. JSON completo

- Preparación: repositorio con AR1.2 aplicado.
- Pasos: parsear todos los `.json` del repositorio.
- Esperado: cero errores.
- Obtenido: **42 JSON correctos, 0 errores**.
- Estado: **Correcto**.

### 4. Imports relativos

- Preparación: repositorio con AR1.2 aplicado.
- Pasos: resolver imports/exports relativos detectados en los módulos JavaScript.
- Esperado: ningún destino faltante.
- Obtenido: **841 referencias relativas verificadas, 0 faltantes**.
- Estado: **Correcto**.

### 5. Validadores canónicos de habilidades

- Preparación: cargar `Maestrias.json`, `Habilidades.json` y `Efectos.json` y ejecutar los validadores productivos.
- Pasos: `validarConfiguracionProgresoHabilidades` y `validarConfiguracionEjecucionHabilidades`.
- Esperado: versión de habilidades 12 válida y sin errores de contrato.
- Obtenido: validación correcta; versión efectiva 12.
- Estado: **Correcto**.

### 6. Relaciones del árbol

- Preparación: usar `OrganizadorArbolHabilidades` con las configuraciones ya validadas.
- Pasos: organizar Arcos, Fuego, Frío, Rayo y Veneno y contar tipos de relación.
- Esperado:
  - Arcos: 17 `sinergia`, 0 `modificacion` con el contenido actual;
  - maestrías mágicas: conservar relaciones continuas específicas y punteadas de afinidad.
- Obtenido:
  - Arcos: 17 `sinergia`;
  - Fuego: 3 `sinergia` + 3 `modificacion`;
  - Frío: 3 `sinergia` + 3 `modificacion`;
  - Rayo: 3 `sinergia` + 3 `modificacion`;
  - Veneno: 3 `sinergia` + 3 `modificacion`.
- Estado: **Correcto**.

### 7. Posición horizontal genérica

- Preparación: misma organización anterior.
- Pasos: inspeccionar `posicionHorizontal` calculada por el organizador.
- Esperado: Arcos no queda en una única columna y no existen coordenadas por ID/maestría.
- Obtenido: los nodos emisores de Arcos se ubicaron en una columna relativa aproximada 0,333 y los destinos ofensivos en 0,667; los nodos aislados de árboles mágicos conservan centro 0,5. No se encontraron nombres ni IDs de Arcos dentro del organizador o panel.
- Estado: **Correcto** para la estructura lógica; la apreciación visual final dentro del juego queda pendiente de prueba manual.

### 8. Alcance efectivo de habilidades de Arco

- Preparación: configuración validada y lanzador de prueba con `alcanceAtaque=7`.
- Pasos: resolver `Disparo múltiple`, `Disparo potente` y `Disparo evasivo` mediante `crearConfiguracionHabilidadEfectiva` y contar resoluciones de `atributoHabilidad=alcance`.
- Esperado: las tres habilidades deben devolver 7 y no pasar por el atributo específico de habilidad.
- Obtenido:
  - `disparo_multiple`: 7;
  - `disparo_potente`: 7;
  - `disparo_evasivo`: 7;
  - resoluciones `atributoHabilidad.alcance`: 0.
- Estado: **Correcto**.

### 9. Regresión de alcance específico de magia

- Preparación: misma prueba, habilidad `Ascua` grado 1.
- Pasos: resolver configuración efectiva.
- Esperado: alcance propio 4 y una resolución mediante `atributoHabilidad.alcance`.
- Obtenido: alcance 4; una resolución del atributo específico.
- Estado: **Correcto**.

### 10. Getter canónico `Combatiente.alcanceAtaque`

- Preparación: invocar el getter real con configuraciones de ataque de Arco y un modificador de prueba `alcanceAtaque +1`.
- Pasos: probar alcances base 6, 7 y 7.
- Esperado: 7, 8 y 8, conservando `familiaArma=arco` en contexto.
- Obtenido: 7, 8 y 8.
- Estado: **Correcto**.

### 11. Carga HTTP de recursos afectados

- Preparación: `python3 -m http.server 8766` en la raíz del repositorio.
- Pasos: solicitar `index.html`, `game.js`, módulos modificados, CSS y `Habilidades.json`.
- Esperado: HTTP 200.
- Obtenido: HTTP 200 para todos los recursos consultados.
- Estado: **Correcto**.

### 12. Composición estructural responsive del árbol

- Preparación: Chromium headless sobre una maqueta DOM que usa el CSS real de Habilidades y `responsive.css`, con nueve filas equivalentes al árbol de Arcos.
- Pasos: medir overflow y separación de nodos en 1366×768, 1920×1080, 2560×1440, 390×844 y 844×390.
- Esperado: sin overflow horizontal; scroll vertical cuando el alto no alcance; posiciones horizontales separadas.
- Obtenido:
  - 1366×768 / 1920×1080 / 2560×1440: contenido de 824 px dentro de superficie de 600 px, `overflow-y:auto`, sin overflow horizontal;
  - 390×844: sin overflow horizontal y nodos compactados por responsive;
  - 844×390: contenido de 511 px dentro de superficie de 310 px, `overflow-y:auto`, sin overflow horizontal;
  - en todos los casos los nodos fuente y destino quedaron separados horizontalmente.
- Estado: **Correcto como prueba estructural aislada**.
- Límite: no sustituye una sesión real dentro del juego.

### 13. Navegación automatizada del juego real

- Preparación: servidor HTTP local activo y Chromium headless disponible.
- Pasos: navegar a `http://127.0.0.1:8766/index.html`.
- Esperado: cargar Dark Moon y realizar prueba visual/interactiva.
- Obtenido: Chromium devolvió `net::ERR_BLOCKED_BY_ADMINISTRATOR` al intentar acceder a localhost desde este entorno.
- Estado: **Pendiente por restricción del entorno**.
- Interpretación: el servidor y los recursos sí responden HTTP 200 por `curl`; no se considera un fallo del juego, pero impide afirmar que la prueba visual real fue ejecutada.

### 14. Prueba manual dentro del juego

- Preparación requerida: navegador normal del usuario con servidor HTTP local.
- Pasos requeridos:
  1. equipar Arco corto y verificar rango de los tres disparos;
  2. equipar Arco recurvo y Arco compuesto;
  3. aprender `Ojo de halcón` y verificar incremento canónico;
  4. abrir Arcos y recorrer las 17 conexiones;
  5. redimensionar la ventana con el panel abierto;
  6. probar 1366×768, 1920×1080 y una vista móvil;
  7. revisar Fuego/Frío/Rayo/Veneno para regresión visual.
- Esperado: alcance 6/7/7 según arma antes de modificadores, incremento de Ojo de halcón, 17 relaciones punteadas legibles, scroll cuando corresponda y árboles mágicos conservados.
- Obtenido: no ejecutado en el entorno de entrega.
- Estado: **Pendiente**.

### 15. Electron

- Preparación requerida: dependencias ya instaladas en una copia apta para Electron.
- Pasos: iniciar el empaquetado/ejecución existente y abrir el panel.
- Esperado: mismo comportamiento HTML/CSS/JS que web.
- Obtenido: no ejecutado; el ZIP de entrada no contiene `node_modules` y la etapa prohíbe instalar dependencias nuevas.
- Estado: **Pendiente / no necesario para validar un cambio sin contrato Electron**, pero debe formar parte de una regresión futura cuando se disponga del entorno.

## Comprobación de restricciones

- No se creó un segundo motor de alcance.
- No se modificó `SistemaCombate` ni el SMC para resolver este defecto.
- No se creó lógica por nombre visible, ID o tipo de maestría en el organizador/panel.
- No se introdujo `AR1.2`, `AR1`, `CD1`, `CD2` o `UI-I1` en identificadores productivos de `src/`/CSS.
- No se instalaron dependencias.
- No se modificó Phaser ni Electron.
- No se creó `.patch` ni `.mjs` productivo.
- Los scripts temporales de validación fueron eliminados.
- No se realizó commit ni push.
- No se utilizó reset/clean/restore masivo.
- No se avanzó a CD2.
- No se modificaron los iconos pendientes.

## Compatibilidad web

No cambian puntos de entrada, rutas de módulos ni mecanismo de publicación. Los recursos afectados responden HTTP 200. La prueba de navegación real del navegador queda pendiente únicamente porque el entorno bloquea localhost para Chromium automatizado.

## Compatibilidad Electron

No cambia ningún contrato Electron, preload, aislamiento, Node ni empaquetado. El cambio continúa siendo HTML/CSS/JavaScript del juego. No se ejecutó Electron por ausencia de dependencias instaladas en el ZIP y por la prohibición de instalarlas durante esta etapa.

## Impacto sobre persistencia

- Ningún cambio de esquema.
- Ninguna migración.
- No se persiste `posicionHorizontal`.
- No se persiste alcance derivado.
- Se siguen persistiendo únicamente las fuentes canónicas ya existentes.
- La versión 12 de `Habilidades.json` es versión de configuración, no una nueva versión de guardado.

## Impacto sobre contenido nuevo

El beneficio es genérico:

- cualquier habilidad de arma futura puede optar por `usaAlcanceArma` sin duplicar el alcance como atributo interno;
- cualquier maestría puede declarar más relaciones y el mismo organizador intentará separarlas horizontalmente;
- una futura propiedad realmente interna de habilidad debe registrarse como atributo específico en lugar de reutilizar una estadística general existente.

## Riesgos y pendientes

1. Falta la validación visual/interactiva real dentro de Dark Moon por restricción del entorno de navegador.
2. Debe comprobarse en gameplay que Arco corto/recurvo/compuesto exponen 6/7/7 y que `Ojo de halcón` incrementa ese alcance en selector y ejecución, no solo en el resolutor aislado.
3. Con 17 relaciones, el grafo de Arcos es deliberadamente más denso que los árboles mágicos. La organización ya deja de colapsarlo en una columna, pero la legibilidad final debe aprobarse visualmente dentro del juego.
4. Los cuatro iconos definitivos quedan fuera de AR1.2 por decisión del usuario.
5. CD2 continúa pendiente y no debe iniciarse hasta cerrar esta validación.
6. El ZIP fuente conserva la anomalía de finales de línea; al aplicar el incremental sobre una copia Git normal debe revisarse el diff ignorando cambios de EOL antes de commitear.

## Criterio pendiente para cerrar AR1.2

La implementación queda lista para prueba. Para cambiar el estado de `Pausada` a `Cerrada` deben comprobarse manualmente como mínimo:

- Arco corto: alcance 6 en Disparo múltiple, potente y evasivo;
- Arco recurvo: alcance 7;
- Arco compuesto: alcance 7;
- `Ojo de halcón`: modifica esos alcances mediante el contrato general;
- preview y ejecución aceptan el mismo rango;
- Arcos muestra las 17 sinergias como líneas punteadas legibles;
- ningún nivel queda inaccesible por recorte;
- resize redibuja las conexiones;
- Fuego, Frío, Rayo y Veneno conservan sus líneas continuas/punteadas correctas;
- no aparecen errores nuevos de consola.

## Conventional Commit propuesto

```text
fix(habilidades): corregir alcance y grafo de arcos

- usar el alcance canónico del arma en habilidades compatibles;
- reclasificar sinergias de Arcos e incorporar Aura de Precisión;
- distribuir el grafo por conectividad, habilitar scroll y redibujar conexiones;
- validar contratos, configuración, sintaxis, imports y carga HTTP;
- actualizar planes maestros y diseño visual.
```

## ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Sistema de habilidades/modificadores y combate a distancia de Dark Moon

ETAPA CERRADA:
AR1.2 — Alcance canónico y composición del árbol de habilidades

ESTADO:
Pausada

COMMIT BASE:
658555f724d9459207de120250761d57d22abae4

HEAD FINAL VERIFICADO:
658555f724d9459207de120250761d57d22abae4

GIT STATUS FINAL:
`git status --short` muestra 187 archivos tracked modificados y 1 archivo untracked. De esos 187, 179 corresponden a las diferencias CRLF heredadas del ZIP y 8 contienen el diff funcional aprobado de AR1.2. El archivo untracked es `docs/habilidades/entregas/ENTREGA_AR1_2.md`. No hay archivos eliminados. El diff funcional se verificó con `git diff --ignore-space-at-eol --numstat`.

DOCUMENTO DE ENTREGA:
docs/habilidades/entregas/ENTREGA_AR1_2.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Corregir la fuente de alcance de las habilidades de Arco y convertir el árbol en un grafo genérico legible que conserva niveles verticales y utiliza relaciones reales para la distribución horizontal.

ARQUITECTURA HEREDADA:
Las habilidades con `usaAlcanceArma=true` consumen `Combatiente.alcanceAtaque`; las habilidades con alcance interno usan `ATRIBUTO_HABILIDAD.ALCANCE`. `modificacion` es relación específica de habilidad y línea continua; `sinergia` es interacción por estadística/estado/contexto compartido y línea punteada. El árbol usa nivel solo para Y y conectividad para X, sin casos por maestría o ID.

ARCHIVOS CLAVE:
- src/juego/habilidades/ConfiguracionHabilidadEfectiva.js: decide si el alcance viene del arma o de un atributo interno de habilidad.
- src/interfaz/habilidades/OrganizadorArbolHabilidades.js: organiza el grafo genéricamente.
- src/interfaz/habilidades/PanelHabilidadesMaestrias.js: representa nodos, relaciones y redibujado.
- src/config/habilidades/Habilidades.json: contiene las 17 relaciones actuales de Arcos.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser 4.2.1, Electron 43.3.0 y @electron/packager 20.0.1 permanecen sin cambios.

PRUEBAS CLAVE SUPERADAS:
- 295 JavaScript con sintaxis válida, 42 JSON válidos y 841 imports relativos sin faltantes.
- Validadores canónicos aceptan Habilidades v12; Arcos produce 17 sinergias y los cuatro árboles mágicos conservan 3 sinergias + 3 modificaciones cada uno.
- Disparo múltiple, potente y evasivo toman alcance 7 del arma sin resolver `atributoHabilidad.alcance`; Ascua conserva alcance interno 4 y sí usa ese atributo.
- Recursos afectados responden HTTP 200 y la maqueta estructural responsive no presenta recorte horizontal ni pérdida vertical de contenido.

PROBLEMAS O RIESGOS PENDIENTES:
- Falta validación visual/interactiva dentro del juego porque Chromium automatizado bloqueó localhost por política administrativa.
- Los cuatro iconos definitivos de Arco quedan fuera de AR1.2 y serán incorporados por el usuario.
- Debe aprobarse manualmente la legibilidad final de las 17 conexiones y el rango real 6/7/7 más Ojo de halcón.

DECISIONES APROBADAS:
- AR1.2 se corrige antes de CD2.
- Alcance de arma y alcance específico de habilidad son conceptos distintos y no se resuelven dos veces.
- El nivel determina únicamente el eje vertical; la conectividad real determina la distribución horizontal.
- Los paneles no pueden ocultar información por falta de altura; debe existir una superficie de scroll adecuada.
- Las conexiones se redibujan con una solución nativa sin dependencia.
- Los iconos quedan como ajuste visual separado.
- Aura de Precisión agrega tres sinergias, llevando Arcos a 17 relaciones.

DECISIONES QUE SIGUEN ABIERTAS:
- Aprobación final de las pruebas manuales de AR1.2 dentro del juego.

SIGUIENTE ETAPA RECOMENDADA:
CD2 — Resistencias negativas

OBJETIVO DE LA SIGUIENTE ETAPA:
Generalizar de forma controlada resistencias elementales y de efectos por debajo de cero, definiendo límites y vulnerabilidad y comprobando regresión de Maldiciones/estados, solo después de cerrar AR1.2.

PRIMEROS ARCHIVOS A REVISAR:
- docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md
- src/juego/modificadores/SistemaModificadoresCombatiente.js
- src/juego/combate/SistemaCombate.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- contrato `usaAlcanceArma` y separación de alcance general/específico;
- semántica `modificacion` continua / `sinergia` punteada;
- organización genérica del árbol sin casos por maestría o ID.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Resistencias negativas resueltas por una única ecuación canónica, límites documentados, vulnerabilidad comprobada en daño/efectos y regresión completa de resistencias, Maldiciones, estados, web y persistencia sin introducir excepciones por contenido.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
fix(habilidades): corregir alcance y grafo de arcos

- usar el alcance canónico del arma en habilidades compatibles;
- reclasificar sinergias de Arcos e incorporar Aura de Precisión;
- distribuir el grafo por conectividad, habilitar scroll y redibujar conexiones;
- validar contratos, configuración, sintaxis, imports y carga HTTP;
- actualizar planes maestros y diseño visual.

----------------- FIN DEL ENLACE -----------------
