# ENTREGA P5.2 — Soporte técnico para entidades cenitales

## 1. Estado

**Estado:** Cerrada con pendientes visuales.

P5.2 completa el soporte técnico para colocar entidades de forma cenital dentro de Phaser, pero no crea ni sustituye los PNG de jugador, enemigos, barril o botín.

El usuario decidió combinar P5.1 y P5.2 en un único commit. P5.3 se realizará después en un commit independiente.

## 2. Fuente de trabajo

- Copia local: `/mnt/data/Dark-Moon-P5-analysis/Dark-Moon`
- Directorio `.git`: presente y funcional
- Rama local: `main`
- Commit base: `d7f0bf618a0dba43fd55723a7260a33b4bdbc91f`
- HEAD local verificado: `d7f0bf618a0dba43fd55723a7260a33b4bdbc91f`
- Estado publicado consultado: GitHub continúa en el mismo commit base
- Commit realizado: no
- Push realizado: no

La copia conserva los cambios completos de P5.1 sin commit y agrega P5.2 sobre esa misma base.

## 3. Objetivo aprobado

Preparar Phaser para recibir PNG cenitales de entidades sin agregar decisiones visuales al dominio.

Reglas aprobadas:

- `recursoVisual` continúa siendo únicamente la ruta del PNG;
- no se agrega `aparienciaVisual` a las entidades;
- `Player`, `Enemigo`, `Barril` y `BotinSuelo` no conocen perspectiva, anclaje, escala ni sombra;
- Phaser es el único responsable de la presentación cenital;
- no se crean PNG de entidades durante P5.2;
- P5.1 y P5.2 compartirán un único commit;
- P5.3 tendrá un commit separado.

## 4. Alcance implementado

### Incluido

- configuración global de presentación de entidades dentro de Phaser;
- centro vertical visible de PNG transparentes;
- anclaje por centro visible completo;
- preservación del anclaje histórico por base como compatibilidad interna;
- conservación de la relación de aspecto del PNG;
- ajuste del lienzo completo dentro de una casilla de 32 × 32;
- sombra centrada y calculada desde el contenido alfa visible;
- respaldo gráfico centrado cuando falta un recurso;
- documentación de la responsabilidad exclusiva de Phaser;
- actualización del plan para P5.3.

### Fuera de alcance

- crear o editar sprites de jugador;
- crear o editar sprites de enemigos;
- crear o editar PNG de barril o botín;
- cambiar rutas actuales de entidades;
- ajustar escalas individuales por nombre;
- modificar clases jugables;
- modificar fábricas de enemigos;
- modificar generación procedural;
- modificar combate, movimiento, IA o sistema de tiempo;
- modificar persistencia;
- modificar Canvas 2D;
- migrar otros biomas.

## 5. Conclusión arquitectónica

La propuesta inicial de propagar `aparienciaVisual` por las entidades fue descartada.

La arquitectura final es:

```text
Entidad del dominio
- posición
- tipo
- recursoVisual

        ↓

AdaptadorEscenaJuego existente
- copia datos neutrales
- no agrega apariencia visual

        ↓

ConfiguracionEntidadesPhaser
- perspectiva cenital global
- tamaño del lienzo
- anclaje central
- reglas de sombra
- estilos de respaldo

        ↓

GestorRecursosPhaser
- analiza límites alfa
- calcula base visible
- calcula centro visible

        ↓

CompositorMundoPhaser
- centra imagen y sombra
- conserva relación de aspecto
- representa el resultado
```

No existe lógica por nombre de entidad ni por ruta del PNG.

## 6. Archivos agregados en P5.2

- `src/interfaz/graficos/phaser/ConfiguracionEntidadesPhaser.js`
- `docs/phaser/entregas/ENTREGA_P5_2.md`

## 7. Archivos modificados en P5.2

- `src/interfaz/graficos/phaser/GestorRecursosPhaser.js`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

## 8. Archivos revisados y no modificados

Se confirmó que no era necesario modificar:

- `src/interfaz/graficos/AdaptadorEscenaJuego.js`
- `src/interfaz/graficos/TiposEscena.js`
- `src/entidad/destructible/combatiente/Player.js`
- `src/entidad/destructible/combatiente/Enemigo.js`
- `src/entidad/destructible/Barril.js`
- `src/entidad/interactuable/BotinSuelo.js`
- fábricas de entidades;
- persistencia.

## 9. Funcionamiento técnico

### 9.1 Configuración global

`ConfiguracionEntidadesPhaser.js` define:

- `perspectiva: "cenital"`;
- anclaje por centro visible;
- lienzo máximo igual a la casilla de 32 × 32;
- opacidad de entidades muertas;
- proporciones y límites de sombra;
- estilos de respaldo por tipo visual.

Los estilos por tipo solo afectan colores del respaldo cuando falta el PNG. No agregan configuración a las entidades del dominio.

### 9.2 Centro visible

`GestorRecursosPhaser.js` ahora calcula:

- `centroX`;
- `centroY`;
- `baseY`;
- `anclajeBase`;
- `anclajeCentro`.

La propiedad histórica `anclaje` continúa apuntando al anclaje por base para no romper consumidores heredados.

### 9.3 Tamaño y relación de aspecto

El recurso se escala usando su lado mayor:

```text
escala = 32 / máximo(ancho, alto)
```

Así:

- un PNG cuadrado se dibuja a 32 × 32;
- un PNG vertical conserva su proporción;
- un PNG horizontal conserva su proporción;
- no se estira el recurso para forzarlo a un cuadrado.

### 9.4 Posición

Phaser coloca el centro visible del contenido alfa en el centro exacto de la casilla.

Ya no utiliza la base inferior del PNG para las entidades del mundo Phaser.

### 9.5 Sombras

La sombra:

- se centra bajo la entidad;
- usa el ancho y alto visibles como referencia;
- permanece limitada a la casilla;
- conserva el color y la opacidad ambiental definidos por el mapa;
- no afecta iluminación, línea de visión ni reglas jugables.

## 10. PNG revisados

P5.2 no modifica PNG.

No se detectó ningún recurso ambiental que necesitara un ajuste adicional para esta subetapa. Los recursos no pertenecientes a entidades incorporados en P5.1 se mantienen sin cambios.

Los sprites actuales de entidades todavía son frontales o de tres cuartos. Como Phaser ya utiliza colocación cenital global, su aspecto temporal no representa el resultado visual final. Deben sustituirse antes del cierre de P5.

## 11. Dependencias

- Phaser: `4.2.1` local
- Dependencias nuevas: ninguna
- npm: no utilizado
- Node.js: utilizado únicamente para verificaciones locales de sintaxis y módulos; no forma parte de la aplicación
- Electron: sin cambios

## 12. Validaciones ejecutadas

### 12.1 Estado Git inicial

**Preparación:** copia completa de P5.1 con `.git`.

**Resultado obtenido:**

- rama `main`;
- HEAD igual al commit base;
- cambios de P5.1 recuperables y sin commit;
- no se ejecutó limpieza, reset, checkout ni restauración masiva.

**Estado:** Correcto.

### 12.2 Sintaxis JavaScript

**Comando:**

```bash
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```

**Resultado obtenido:** todos los archivos JavaScript de `src` superaron la comprobación.

**Estado:** Correcto.

### 12.3 JSON

**Preparación:** parseo de todos los archivos JSON bajo `src`.

**Resultado obtenido:** todos los JSON son válidos.

**Estado:** Correcto.

### 12.4 Cálculo de presentación

Se probaron mediante módulo real:

- perspectiva global cenital;
- PNG cuadrado;
- PNG vertical;
- conservación de relación de aspecto;
- anclaje central;
- sombra limitada;
- respaldo centrado.

**Resultado obtenido:** todos los casos fueron correctos.

### 12.5 Compositor Phaser simulado

Se instanció `CompositorMundoPhaser` con una escena Phaser mínima simulada y una entidad con transparencia asimétrica.

Se verificó:

- centro de la entidad igual al centro de la casilla;
- origen igual al centro visible del PNG;
- tamaño 32 × 32 para un recurso cuadrado;
- sombra centrada un píxel por debajo del centro;
- sombra dentro de límites configurados.

**Resultado obtenido:** Correcto.

### 12.6 Separación de responsabilidades

**Comprobación:** búsqueda de `aparienciaVisual` dentro de `src`.

**Resultado obtenido:** no existe ninguna propiedad `aparienciaVisual` en el código de producción.

No se modificaron clases de dominio, fábricas ni persistencia.

**Estado:** Correcto.

### 12.7 Diferencias Git

**Comando:**

```bash
git diff --check
```

**Resultado obtenido:** sin errores de espacios o marcadores de conflicto.

**Estado:** Correcto.

### 12.8 Validación interactiva de navegador

Se intentó iniciar Chromium headless para repetir el flujo completo. El navegador del entorno aplicó una política organizacional que bloqueó direcciones locales, direcciones IP, dominios locales y enlaces `file:` antes de cargar el juego.

Esta limitación no proviene de Dark Moon y no fue ocultada mediante excepciones de código.

**Resultado obtenido:** no ejecutable en este entorno.

**Estado:** Pendiente de validación manual por el usuario.

## 13. Pruebas manuales recomendadas

Después de incorporar los PNG cenitales definitivos:

1. iniciar `?render=phaser`;
2. crear Guerrero, Rogue y Mago;
3. comprobar que el centro visible coincide con el centro de la casilla;
4. comprobar rata, cucaracha y encuentro especial;
5. comprobar barril y botín;
6. mover en ocho direcciones;
7. esperar un turno y observar IA;
8. iniciar combate e interacción;
9. comprobar indicadores de hostilidad y barras de vida;
10. probar zoom mínimo y máximo;
11. mover y recentrar cámara;
12. cambiar de mapa;
13. guardar y cargar;
14. repetir con `?render=canvas2d`.

## 14. Compatibilidad web

- módulos ES sin compilación;
- rutas relativas;
- sin dependencias nuevas;
- compatible con alojamiento estático;
- GitHub Pages no se modificó;
- la validación publicada deberá realizarse después del commit y push.

## 15. Compatibilidad Canvas 2D

Canvas 2D no fue modificado.

Continúa utilizando `recursoVisual` y su comportamiento histórico. La configuración cenital nueva existe únicamente dentro de Phaser.

## 16. Compatibilidad Electron

Sin cambios. Electron no es requisito para P5.2.

## 17. Persistencia

Sin cambios:

- misma clave;
- misma versión;
- mismos snapshots;
- ninguna migración;
- ninguna propiedad visual guardada.

## 18. Instalación y ejecución

No hay instalación de dependencias.

Servidor estático de ejemplo:

```bash
python -m http.server 8000
```

Phaser:

```text
http://localhost:8000/?render=phaser
```

Canvas 2D:

```text
http://localhost:8000/?render=canvas2d
```

## 19. Desinstalación

Para retirar únicamente P5.2 sin operaciones masivas:

1. eliminar `src/interfaz/graficos/phaser/ConfiguracionEntidadesPhaser.js`;
2. eliminar `docs/phaser/entregas/ENTREGA_P5_2.md`;
3. restaurar manualmente las versiones anteriores de:
   - `GestorRecursosPhaser.js`;
   - `CompositorMundoPhaser.js`;
   - README;
   - documentos maestros.

No utilizar `git reset`, `git clean` ni restauraciones masivas mientras P5.1 y P5.2 sigan sin commit.

## 20. Riesgos y pendientes

1. Los PNG definitivos todavía no están incorporados.
2. El espacio transparente de cada PNG influirá en el tamaño visible final.
3. Si un asset ocupa demasiado o demasiado poco dentro de su lienzo, debe corregirse primero el PNG y no agregar una excepción por nombre.
4. La validación visual completa queda pendiente.
5. P5 completa continúa abierta hasta P5.3.

## 21. Conventional Commit conjunto P5.1 + P5.2

```text
feat(phaser): preparar mundo y entidades para vista cenital

- incorporar autotiling reusable de ocho vecinos para paredes y suelos;
- representar Alcantarilla con masas continuas, bordes por bioma y sombra de contacto;
- centralizar en Phaser la presentación cenital de todas las entidades;
- centrar PNG transparentes por su contenido visible y conservar su relación de aspecto;
- calcular sombras centradas sin agregar propiedades visuales al dominio;
- conservar generación, movimiento, combate, persistencia y Canvas 2D sin cambios;
- validar sintaxis, JSON, autotiling, métricas y composición técnica;
- actualizar README, Plan Maestro, Diseño Maestro y entregas P5.1 y P5.2.
```

No realizar el commit hasta completar la sustitución de los PNG que el usuario decida incluir en el mismo commit.

## 22. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
P5.2 — Soporte técnico para entidades cenitales

ESTADO:
Cerrada con pendientes

COMMIT BASE:
d7f0bf618a0dba43fd55723a7260a33b4bdbc91f

HEAD FINAL VERIFICADO:
d7f0bf618a0dba43fd55723a7260a33b4bdbc91f

GIT STATUS FINAL:
Cambios locales acumulados de P5.1 y P5.2 sin commit ni push. La rama main continúa siguiendo origin/main en el commit base.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_P5_2.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Phaser dispone de una presentación cenital global para entidades. Los PNG se centran por el centro visible, conservan relación de aspecto y reciben sombras centradas. El dominio continúa transportando únicamente posición, tipo y recursoVisual.

ARQUITECTURA HEREDADA:
Las entidades no conocen Phaser. AdaptadorEscenaJuego conserva su contrato neutral. ConfiguracionEntidadesPhaser controla presentación; GestorRecursosPhaser analiza alfa; CompositorMundoPhaser representa el resultado. P5.1 aporta autotiling reusable y Alcantarilla cenital base.

ARCHIVOS CLAVE:
- src/interfaz/graficos/phaser/ConfiguracionEntidadesPhaser.js: configuración cenital global.
- src/interfaz/graficos/phaser/GestorRecursosPhaser.js: centro visible y anclajes.
- src/interfaz/graficos/phaser/CompositorMundoPhaser.js: posición, escala y sombras.
- src/interfaz/graficos/mapas/AnalizadorVecindadTerreno.js: vecindad reusable de P5.1.
- src/interfaz/graficos/mapas/ResolutorAutotilingParedes.js: resolución visual por bioma.

DEPENDENCIAS Y VERSIONES:
Phaser 4.2.1 local. Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- sintaxis completa de JavaScript y parseo de JSON;
- métricas cenitales para recursos cuadrados, verticales y ausentes;
- compositor simulado con centro visible, relación de aspecto y sombra;
- ausencia de aparienciaVisual y de cambios en dominio o persistencia;
- git diff --check.

PROBLEMAS O RIESGOS PENDIENTES:
- incorporar y aprobar los PNG cenitales definitivos;
- validación manual interactiva en navegador normal;
- extensión de recursos a todos los biomas;
- cierre completo de P5.

DECISIONES APROBADAS:
- recursoVisual continúa siendo únicamente una ruta;
- la presentación cenital pertenece solo a Phaser;
- no agregar aparienciaVisual a entidades;
- no crear PNG de entidades en P5.2;
- combinar P5.1 y P5.2 en un commit;
- realizar P5.3 en un segundo commit.

DECISIONES QUE SIGUEN ABIERTAS:
- composición final de los PNG cenitales;
- ajustes visuales derivados de la validación de esos recursos;
- configuración y assets del resto de biomas.

SIGUIENTE ETAPA RECOMENDADA:
P5.3 — Expansión a todos los mapas y cierre de P5

OBJETIVO DE LA SIGUIENTE ETAPA:
Incorporar los assets cenitales definitivos, aplicar el sistema de P5.1 y P5.2 a ciudad y todos los mapas existentes, y validar el flujo completo sin cambiar resultados canónicos.

PRIMEROS ARCHIVOS A REVISAR:
- docs/phaser/entregas/ENTREGA_P5_2.md
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
- src/config/mapas/mapas.json
- src/config/mapas/CiudadInicial.json
- src/interfaz/graficos/phaser/ConfiguracionEntidadesPhaser.js
- src/interfaz/graficos/phaser/CompositorMundoPhaser.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- generación procedural y conectividad;
- movimiento, combate, IA y sistema de tiempo;
- persistencia;
- Canvas 2D como backend predeterminado;
- Electron, Node.js o npm.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Ciudad, mapas normales y mapas especiales pueden jugarse mediante Phaser con terrenos, paredes, entidades y props cenitales; cámara, selección, transiciones, combate, habilidades, botín, guardado y Canvas 2D conservan resultados canónicos.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(phaser): preparar mundo y entidades para vista cenital

- incorporar autotiling reusable de ocho vecinos para paredes y suelos;
- representar Alcantarilla con masas continuas, bordes por bioma y sombra de contacto;
- centralizar en Phaser la presentación cenital de todas las entidades;
- centrar PNG transparentes por su contenido visible y conservar su relación de aspecto;
- calcular sombras centradas sin agregar propiedades visuales al dominio;
- conservar generación, movimiento, combate, persistencia y Canvas 2D sin cambios;
- validar sintaxis, JSON, autotiling, métricas y composición técnica;
- actualizar README, Plan Maestro, Diseño Maestro y entregas P5.1 y P5.2.

----------------- FIN DEL ENLACE -----------------
