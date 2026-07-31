# ENTREGA P2 — CORTE VERTICAL VISUAL

Proyecto: Dark Moon  
Etapa: P2 — Corte vertical visual  
Estado: **Cerrada**  
Fecha: 31 de julio de 2026

## Actualización posterior al cierre

P2 fue commiteada y publicada en `2b572cf5e587c4ea1d85f2f9069255fb83938a85`. La copia local utilizada para iniciar P3 y el estado publicado en GitHub coincidían exactamente en ese SHA y presentaban un `git status` limpio.

La decisión D-023 del Plan Maestro autorizó posteriormente implementar P3 mientras E0 continúa pausada. Esa decisión reemplaza las referencias históricas de esta entrega que exigían completar E0 antes de P3. El resto del alcance, pruebas y decisiones de P2 se conserva sin cambios.

---

## 1. Estado de la copia de trabajo

### Ruta local

`/mnt/data/analysis_p2_current/Dark-Moon`

### Directorio `.git`

Presente y funcional.

### Rama

`main`

### Commit base y HEAD local

`fd3c9159d5e3c12a04412b27ae3bf4d779b623dc`

### Estado publicado consultado

Al comenzar P2, GitHub publicaba `Lordtias/Dark-Moon`, rama `main`, en el mismo
commit `fd3c9159d5e3c12a04412b27ae3bf4d779b623dc`.

### Estado Git de la entrega

La copia contiene los cambios completos de P2 sin commit. Los archivos están
recuperables y no se ejecutaron `git reset`, `git clean`, `git checkout`,
`git restore` masivo, commit ni push.

El usuario probó localmente la entrega, comunicó que las pruebas resultaron
correctas y aprobó expresamente el cierre de P2 el 31 de julio de 2026.

---

## 2. Alcance aprobado

1. Utilizar Alcantarilla como corte vertical real.
2. Incorporar imágenes ambientales nuevas dentro de `assets`.
3. Mantener Canvas 2D como backend predeterminado.
4. Permitir en Phaser lectura de casilla, zoom, desplazamiento y recentrado.
5. Mantener movimiento, combate, habilidades e interacción en la entrada
   canónica existente.
6. Separar carga de recursos, composición del mundo y cámara.
7. Dividir el trabajo internamente en P2.1 y P2.2 sin commits intermedios.
8. Mantener E0 pausada y no avanzar automáticamente a P3.
9. Exigir validación manual antes de cerrar P2.
10. Retirar el aura permanente de los interactuables.
11. Mantener la cámara centrada en el personaje durante toda selección táctica.
12. Incorporar una primera familia configurable de muros por vecinos para
    Alcantarilla sin adelantar la expansión de biomas prevista para P5.
13. Sustituir los recentrados por acción por un seguimiento general y persistente.
14. Apoyar sprites transparentes mediante sus píxeles visibles sin modificar PNG.

---

## 3. Resultado implementado

### P2.1 — Corte funcional

- carga local de recursos declarados por configuración;
- suelo y paredes con imágenes propias;
- entidades reales del juego;
- cámara con límites;
- seguimiento del personaje;
- zoom entre 80 % y 160 %;
- desplazamiento con botón derecho o central;
- doble clic izquierdo para recentrar;
- lectura visual de casilla bajo el puntero;
- fallback controlado cuando una imagen no puede cargarse;
- comprobación de que un clic Phaser no ejecuta una acción jugable.

### P2.2 — Acabado visual

- fondo y marco del mundo;
- variación determinista del terreno;
- decoración baja mediante humedad, rejillas, manchas y escombros;
- volumen y sombras discretas junto a muros;
- sombras suaves debajo de entidades;
- orden visual de entidades por su base vertical;
- aro cálido discreto para localizar al personaje;
- indicador visual para enemigos agresivos;
- iluminación ambiental fría sin aura permanente de interactuables;
- cuadrícula más visible en suelo que en paredes;
- selección de combate y habilidades conservada;
- adaptación exclusiva del modo Phaser para ventanas de poca altura;
- actualización de README y documentos maestros.

### Ajustes de cierre aprobados

- clasificación de muros aislados, extremos, rectos, esquinas, uniones en T,
  cruces e interiores mediante vecinos cardinales;
- selección de la variante y orientación desde datos configurables del mapa;
- fallback al recurso general cuando una variante no está disponible;
- recentrado exacto al iniciar ataque, interacción o habilidad;
- bloqueo del arrastre de cámara mientras existe una selección táctica;
- zoom durante selección conservando al personaje como centro;
- eliminación del aura permanente de portales e interactuables;
- reserva documental de una futura luminiscencia discreta para objetivos de
  misión marcados por el estado canónico;
- seguimiento centralizado desde la carga y después de espera, modal, zoom o
  redimensionamiento mientras la cámara no haya pasado voluntariamente a libre;
- observación genérica del atributo `open` de los diálogos, sin acoplarse a un
  modal concreto;
- análisis alfa de recursos transparentes para calcular centro y base visibles;
- sombras ajustadas al ancho visible de cada entidad sin recortar sus imágenes.

---

## 4. Arquitectura final de P2

```text
Juego
  → AdaptadorEscenaJuego
  → escena neutral
  → Renderizador
      ├─ Canvas 2D
      └─ Phaser
          ├─ GestorRecursosPhaser
          ├─ CompositorMundoPhaser
          └─ ControladorCamaraPhaser
```

### Contrato conservado

Phaser no recibe una instancia de `Juego` y no calcula:

- movimiento;
- tiempo;
- combate;
- inteligencia artificial;
- muerte;
- experiencia;
- botín;
- inventario;
- habilidades;
- persistencia.

El flujo continúa siendo:

```text
Entrada canónica
  → lógica de Dark Moon
  → resultado canónico
  → escena neutral
  → Phaser representa el resultado
```

---

## 5. Capas visuales

El compositor utiliza este orden:

1. fondo;
2. terreno;
3. decoración baja y volumen de muros;
4. zonas temporales;
5. sombras de entidades;
6. selección táctica;
7. entidades ordenadas por base vertical;
8. iluminación ambiental.

La cuadrícula lógica continúa siendo de 32 × 32 unidades. Las imágenes
ambientales son de 64 × 64 y se reducen visualmente a una casilla.

---

## 6. Recursos agregados

```text
assets/imagenes/mundo/alcantarilla/
├── estructura_pared_piedra.png
├── muros/
│   ├── muro_aislado.png
│   ├── muro_cruce.png
│   ├── muro_esquina.png
│   ├── muro_extremo.png
│   ├── muro_interior.png
│   ├── muro_recto.png
│   └── muro_union_t.png
├── terreno_piedra_humeda_01.png
└── terreno_piedra_humeda_02.png
```

Características:

- PNG;
- RGBA;
- 64 × 64;
- rutas locales;
- sin CDN;
- utilizables offline mediante servidor HTTP;
- declarados desde `src/config/mapas/mapas.json`.

La apariencia también declara parámetros de:

- cuadrícula;
- decoración;
- sombras;
- iluminación.

El compositor no contiene una excepción por el nombre visible
`"Alcantarilla"`.

---

## 7. Archivos modificados

- `README.md`
- `assets/estilos/phaser/phaser.css`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `src/config/mapas/mapas.json`
- `src/interfaz/graficos/phaser/ConfiguracionPhaser.js`
- `src/interfaz/graficos/phaser/EscenaArranquePhaser.js`
- `src/interfaz/graficos/phaser/RenderizadorPhaser.js`

## 8. Archivos agregados

- `assets/imagenes/mundo/alcantarilla/estructura_pared_piedra.png`
- `assets/imagenes/mundo/alcantarilla/muros/muro_aislado.png`
- `assets/imagenes/mundo/alcantarilla/muros/muro_cruce.png`
- `assets/imagenes/mundo/alcantarilla/muros/muro_esquina.png`
- `assets/imagenes/mundo/alcantarilla/muros/muro_extremo.png`
- `assets/imagenes/mundo/alcantarilla/muros/muro_interior.png`
- `assets/imagenes/mundo/alcantarilla/muros/muro_recto.png`
- `assets/imagenes/mundo/alcantarilla/muros/muro_union_t.png`
- `assets/imagenes/mundo/alcantarilla/terreno_piedra_humeda_01.png`
- `assets/imagenes/mundo/alcantarilla/terreno_piedra_humeda_02.png`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `src/interfaz/graficos/phaser/ControladorCamaraPhaser.js`
- `src/interfaz/graficos/phaser/GestorRecursosPhaser.js`
- `docs/phaser/entregas/ENTREGA_P2.md`

## 9. Archivos eliminados

Ninguno.

---

## 10. Dependencias

| Dependencia | Versión | Estado |
|---|---:|---|
| Phaser | 4.2.1 | Ya incorporada localmente en P1 |
| Node.js | — | No utilizado por el juego |
| npm | — | No utilizado |
| Electron | — | No incorporado |
| Librerías nuevas | — | Ninguna |

P2 no actualizó Phaser ni agregó rangos flotantes, CDN, empaquetador o
telemetría.

---

## 11. Validaciones automatizadas

| Prueba | Preparación y pasos | Resultado obtenido | Estado |
|---|---|---|---|
| Git inicial | Ruta, rama, HEAD y `git -c core.autocrlf=true status` | Copia válida, `main`, HEAD `fd3c915`, cambios de P2 recuperables | Correcto |
| JavaScript | Enumerar módulos propios, resolver imports y cargar el flujo Phaser en navegador | 160 archivos propios; módulos modificados cargados sin errores | Correcto |
| JSON | Interpretar todos los JSON del repositorio | 21 archivos válidos | Correcto |
| Imports | Resolver imports relativos | 356 imports, 0 ausentes | Correcto |
| Imágenes declaradas | Resolver rutas de imágenes en JSON | 106 referencias, 0 ausentes | Correcto |
| Higiene del diff | `git -c core.autocrlf=true diff --check` | Sin errores | Correcto |
| Inicio Phaser | Crear Guerrero en Alcantarilla determinista | Phaser 4.2.1, un canvas visible y canvas base oculto | Correcto |
| Clic Phaser | Clic izquierdo simple sobre el mundo | Posición y tiempo sin cambios | Correcto |
| Movimiento canónico | Presionar una tecla de movimiento válida | Una casilla y un único coste de 100 | Correcto |
| Canvas 2D | Repetir inicio y movimiento | Sin cargar Phaser; una casilla y un único coste | Correcto |
| Zoom | Rueda alrededor del puntero | Escala modificada sin error | Correcto |
| Cámara | Arrastre derecho y salida del canvas | Cámara libre y clase de arrastre liberada | Correcto |
| Recentrado | Doble clic izquierdo | Seguimiento restablecido | Correcto |
| Combate | Presionar `F` y luego `Escape` | Selector visible, modo activo y cancelación correcta | Correcto |
| Cámara táctica | Desplazar la cámara, presionar `F` y leer el centro del mundo | Seguimiento reactivado; centro de cámara y centro del personaje con diferencia 0 × 0 | Correcto |
| Arrastre en selección | Intentar arrastre derecho durante combate | La cámara permanece centrada y no entra en modo libre | Correcto |
| Muros por vecinos | Clasificar matriz real de Alcantarilla y cargar familia declarada | Variantes y orientaciones resueltas desde configuración; recursos disponibles | Correcto |
| Aura de interactuables | Revisar compositor y escena visual | Sin círculos de iluminación permanentes alrededor de interactuables | Correcto |
| Cámara inicial | Cargar Alcantarilla y comparar centro del jugador con centro de cámara | Diferencia 0 × 0 desde el primer cuadro comprobable | Correcto |
| Cámara inicial en Ciudad | Comenzar sin mapa forzado y comparar centros | Diferencia 0 × 0 con mapa 28 × 18 y jugador en 13,16 | Correcto |
| Espera y seguimiento | Desplazar artificialmente la vista, usar `Espacio` y `5` | Seguimiento recompuesto con diferencia 0 × 0 en ambos casos | Correcto |
| Modales y seguimiento | Desplazar artificialmente la vista y abrir/cerrar un `dialog` | Observador genérico resincroniza con diferencia 0 × 0 | Correcto |
| Zoom en seguimiento | Usar rueda lejos del personaje | Zoom cambia de 120 % a 130 % y el centro conserva diferencia 0 × 0 | Correcto |
| Anclaje transparente | Analizar alfa de rata, botín, barril y Guerrero | Bases visibles detectadas en Y 51, 43, 63 y 61 de 64; orígenes aplicados | Correcto |
| Ventana 900 × 700 | Redimensionar durante Phaser | Canvas visible de 602 × 377; proporción conservada | Correcto |
| Recurso ausente | Simular 404 de una baldosa | Fallback visual, advertencia controlada, escena visible | Correcto |
| Consola | Revisar eventos de página | Sin errores inesperados | Correcto |

### Navegador utilizado

Chromium real mediante Playwright. El entorno de ejecución seleccionó el
renderizador Canvas de Phaser. WebGL no pudo confirmarse aquí y queda pendiente
de la prueba del usuario en un navegador normal.

### Evidencias generadas fuera del repositorio

- `/mnt/data/p2_2_game_final.png`
- `/mnt/data/p2_2_zoom_detail.png`
- `/mnt/data/p2_2_combat_selection.png`
- `/mnt/data/p2_2_small_window.png`
- `/mnt/data/p2_1_browser_results.json`
- `/mnt/data/p2_2_extended_results.json`
- `/mnt/data/p2_3_game2.png`
- `/mnt/data/p2_3_combat.png`
- `/mnt/data/p2_final_regression.png`
- `/mnt/data/p2_final_regression.json`
- `/mnt/data/p2_city_canvas_results.json`

Estas evidencias no forman parte del commit propuesto.

---

## 12. Validación manual del usuario

El usuario aplicó los ZIP de archivos nuevos y modificados, realizó pruebas
locales y confirmó finalmente que P2 queda aprobada para cierre.

Durante la validación se detectaron y corrigieron antes del cierre:

- aura permanente de interactuables demasiado visible;
- pérdida de centrado de cámara al entrar en selección;
- repetición visual de muros;
- pérdida de centrado durante espera, modales y carga inicial de mapas;
- sensación de flotación causada por transparencia inferior en sprites.

Las correcciones finales fueron nuevamente entregadas para prueba. El 31 de
julio de 2026 el usuario confirmó: **P2 queda aprobada para el cierre**.

Estado: **Correcto**.

---

## 13. Compatibilidad

### Web

- conserva módulos ES y archivos estáticos;
- no requiere compilación;
- no utiliza rutas absolutas nuevas;
- mantiene Canvas 2D predeterminado;
- GitHub Pages queda pendiente de comprobación después de commit y push.

### Electron

Sin implementación ni prueba en P2. E0 sigue pausada y no se considera
completada. D-023 autorizó posteriormente P3 como excepción, sin modificar el
alcance pendiente de Electron.

### Persistencia

No se modificaron:

- claves de `localStorage`;
- versión del guardado;
- snapshot del jugador;
- inventario;
- equipo;
- oro;
- barra de habilidades.

Impacto esperado: ninguno. La etapa fue aprobada después de la validación
manual del usuario; no se modificó el contrato de persistencia.

---

## 14. Riesgos pendientes

1. WebGL no pudo verificarse de forma independiente en el entorno automatizado;
   la validación local del usuario fue aprobada.
2. GitHub Pages queda pendiente de comprobación después del commit y push de P2.
3. La adaptación de ventanas bajas utiliza desplazamiento vertical en lugar de
   reducir el mapa hasta volverlo ilegible.
4. La decoración de P2 es una referencia inicial y no reemplaza recursos
   ilustrados futuros de mayor variedad.
5. Animaciones definitivas y entrada jugable directa desde Phaser quedan fuera
   de P2.
6. La familia de muros de Alcantarilla es la base reutilizable; P5 debe ampliar
   recursos y casos complejos para el resto del mundo sin duplicar el
   clasificador.

---

## 15. Comprobación de restricciones

- no se creó ningún `.patch`;
- no se creó ningún `.mjs`;
- no se instaló ninguna dependencia;
- no se incorporó Node.js, npm o Electron;
- no se realizó commit;
- no se realizó push;
- no se modificó GitHub remotamente;
- no se duplicó lógica jugable;
- no se modificó `RenderizadorCanvas2D.js`;
- no se modificó persistencia;
- no se eliminó el renderizador anterior;
- no se avanzó a E0 ni P3.

---

## 16. Conventional Commit propuesto

```text
feat(phaser): completar corte vertical visual de alcantarilla

- incorporar recursos ambientales configurables para suelo y paredes;
- diferenciar muros por vecinos y orientar sus variantes visuales;
- separar carga de imágenes, composición del mundo y control de cámara;
- agregar decoración, profundidad, sombras e iluminación básica;
- centralizar el seguimiento de cámara y retirar auras permanentes;
- anclar sprites transparentes mediante su contenido visible;
- conservar Canvas 2D, entrada canónica y persistencia sin duplicaciones;
- validar movimiento, selección, zoom, redimensionamiento y recursos ausentes;
- actualizar README, Plan Maestro, Diseño Maestro y entrega de P2.
```

La aprobación manual fue recibida. El usuario puede realizar este commit
después de aplicar el ZIP final y revisar el estado local.

---

## 17. Enlace para la siguiente etapa

> Nota de trazabilidad: este enlace refleja la decisión vigente al cerrar P2. La autorización D-023 y el commit final `2b572cf5e587c4ea1d85f2f9069255fb83938a85` reemplazan sus referencias a realizar E0 antes de P3. No debe reutilizarse como estado actual del plan.

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
P2 — Corte vertical visual

ESTADO:
Cerrada

COMMIT BASE:
fd3c9159d5e3c12a04412b27ae3bf4d779b623dc

HEAD FINAL VERIFICADO:
fd3c9159d5e3c12a04412b27ae3bf4d779b623dc (P2 permanece sin commit por restricción; reemplazar por el SHA confirmado después del commit local)

GIT STATUS FINAL:
Rama main sobre origin/main, con los archivos completos de P2 modificados y nuevos sin commit; no se realizó push.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_P2.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Demostrar el valor visual de Phaser mediante un corte jugable de Alcantarilla con recursos ambientales, entidades reales, cámara, zoom, selección táctica, profundidad, sombras, iluminación y muros configurables.

ARQUITECTURA HEREDADA:
Phaser consume la escena neutral y representa resultados canónicos. No calcula movimiento, combate, IA, tiempo, muerte, experiencia, botín o persistencia. Canvas 2D continúa como backend predeterminado. La presentación Phaser se divide en GestorRecursosPhaser, CompositorMundoPhaser y ControladorCamaraPhaser.

ARCHIVOS CLAVE:
- src/interfaz/graficos/phaser/GestorRecursosPhaser.js: carga recursos, fallbacks y límites alfa visibles.
- src/interfaz/graficos/phaser/CompositorMundoPhaser.js: compone capas, entidades, sombras, iluminación y muros por vecinos.
- src/interfaz/graficos/phaser/ControladorCamaraPhaser.js: mantiene seguimiento, cámara libre, zoom y recentrado.
- src/config/mapas/mapas.json: declara la apariencia configurable de Alcantarilla.
- docs/phaser/entregas/ENTREGA_P2.md: registra alcance, pruebas, riesgos y cierre.

DEPENDENCIAS Y VERSIONES:
Phaser 4.2.1 local. Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- carga inicial, espera, modales, zoom y selección mantienen la cámara centrada durante seguimiento;
- movimiento y acciones continúan resolviéndose una sola vez mediante la entrada canónica;
- sprites transparentes y sombras se apoyan mediante el contenido visible;
- muros de Alcantarilla seleccionan variantes por vecinos cardinales;
- Canvas 2D, JSON, imports y recursos continúan correctos;
- validación manual aprobada por el usuario.

PROBLEMAS O RIESGOS PENDIENTES:
- comprobar GitHub Pages después de commit y push;
- E0 continúa pausada por las limitaciones del equipo actual;
- P5 debe ampliar el contrato visual de muros a los demás biomas;
- animaciones definitivas y controles jugables directos desde Phaser quedan fuera de P2.

DECISIONES APROBADAS:
- Alcantarilla es el corte vertical de referencia;
- Canvas 2D continúa como backend predeterminado;
- Phaser no emite todavía comandos jugables directos;
- cámara centralizada y anclaje por contenido visible son contratos generales;
- el aura queda reservada para futuros objetivos contextuales de misiones;
- P5 reutilizará el clasificador de muros sin crear otro paralelo.

DECISIONES QUE SIGUEN ABIERTAS:
- versión exacta y estrategia de Electron al reanudar E0;
- alcance detallado de controles jugables directos para P3.

SIGUIENTE ETAPA RECOMENDADA:
E0 — Prueba técnica temprana de Electron

OBJETIVO DE LA SIGUIENTE ETAPA:
Validar temprano que Dark Moon puede ejecutarse dentro de Electron sin romper la versión web, el modo offline, las rutas, la persistencia ni el aislamiento de contexto.

PRIMEROS ARCHIVOS A REVISAR:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/entregas/ENTREGA_P2.md
- index.html
- src/interfaz/graficos/phaser/CargadorPhaser.js
- src/interfaz/graficos/phaser/ConfiguracionPhaser.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- lógica canónica de movimiento, combate, IA, tiempo, muerte, experiencia y botín;
- contrato neutral consumido por Canvas 2D y Phaser;
- persistencia y formato de guardado;
- Phaser 4.2.1;
- secuencia P1 → P2 → E0 → P3.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Electron inicia el juego web existente de forma aislada y offline, conserva Canvas 2D y Phaser, carga recursos y JSON, mantiene persistencia, no expone Node al contenido y documenta versiones, comandos, tamaño, riesgos y alternativa.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(phaser): completar corte vertical visual de alcantarilla

- incorporar recursos ambientales configurables para suelo y paredes;
- diferenciar muros por vecinos y orientar sus variantes visuales;
- separar carga de imágenes, composición del mundo y control de cámara;
- agregar decoración, profundidad, sombras e iluminación básica;
- centralizar el seguimiento de cámara y retirar auras permanentes;
- anclar sprites transparentes mediante su contenido visible;
- conservar Canvas 2D, entrada canónica y persistencia sin duplicaciones;
- validar movimiento, selección, zoom, redimensionamiento y recursos ausentes;
- actualizar README, Plan Maestro, Diseño Maestro y entrega de P2.

----------------- FIN DEL ENLACE -----------------
