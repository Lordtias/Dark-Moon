# ENTREGA P5.1 — Alcantarilla cenital base

## 1. Estado de la entrega

**Estado técnico:** Correcto.

**Estado de la etapa:** Cerrada con pendientes.

Pendiente único para considerar aprobado el lenguaje visual: validación manual del usuario sobre la apariencia de las paredes, sus bordes y la sombra de contacto dentro del juego.

P5.1 no cierra P5 completa. El resto de mapas, personajes, enemigos y props queda fuera del alcance aprobado de esta subetapa.

---

## 2. Fuente de trabajo y Git

### Copia local obligatoria

`/mnt/data/Dark-Moon-P5-analysis/Dark-Moon`

### Directorio `.git`

Presente y utilizable.

### Rama local

`main`

### Commit base

`d7f0bf618a0dba43fd55723a7260a33b4bdbc91f`

### HEAD local verificado

`d7f0bf618a0dba43fd55723a7260a33b4bdbc91f`

No se realizó commit, por lo que HEAD continúa en el commit base.

### Estado publicado contrastado

El último commit publicado consultado para `origin/main` es:

`d7f0bf618a0dba43fd55723a7260a33b4bdbc91f`

Antes de implementar, la copia local coincidía con el estado publicado. Los cambios de P5.1 existen solamente en la copia local y no fueron enviados a GitHub.

### Estado local final esperado

Archivos modificados:

- `README.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `src/config/mapas/mapas.json`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`

Archivos y directorios nuevos:

- `assets/imagenes/mundo/alcantarilla/cenital/`
- `docs/phaser/entregas/ENTREGA_P5_1.md`
- `src/interfaz/graficos/mapas/`

---

## 3. Alcance aprobado

P5.1 se limitó a:

- Alcantarilla como único mapa de validación;
- piso cenital existente de Alcantarilla;
- nueva representación cenital de paredes;
- algoritmo genérico de autotiling reutilizable;
- detección de ocho vecinos;
- lados de pared que limitan con piso real;
- esquinas exteriores e interiores;
- borde configurable según el bioma;
- sombra de contacto opcional sobre el piso;
- conservación de cámara, zoom, selección y flujo canónico.

Fuera de alcance:

- otros mapas y biomas;
- sprites cenitales de jugador y enemigos;
- barril y botín cenitales;
- NPC;
- cambios de generación procedural;
- movimiento, combate, IA o tiempo;
- persistencia;
- Canvas 2D;
- Electron, npm y dependencias nuevas.

---

## 4. Resumen sencillo

Antes, cada casilla de pared seleccionaba una imagen según vecinos cardinales y podía verse como un bloque independiente.

Ahora, el sistema analiza ocho vecinos y separa dos responsabilidades:

1. determina qué lados y esquinas están expuestos al piso;
2. consulta al bioma cómo deben verse la masa, el borde y la sombra.

En Alcantarilla, las paredes se presentan como una masa oscura continua. Solo las caras que tocan una casilla real de piso reciben un borde húmedo de mampostería. El piso contiguo puede recibir una sombra de contacto corta.

---

## 5. Arquitectura anterior

```text
Mapa neutral
    ↓
CompositorMundoPhaser
    ↓
clasificación cardinal interna
    ↓
PNG de bloque orientado
```

Problemas:

- la clasificación estaba dentro del compositor;
- solo examinaba cuatro vecinos para el resultado principal;
- cada pared tendía a conservar lectura de bloque;
- el material y la geometría visual estaban demasiado unidos;
- la sombra solo contemplaba direcciones concretas.

---

## 6. Arquitectura final

```text
Mapa canónico ya generado
          ↓
AnalizadorVecindadTerreno
          ↓
Descripción neutral de ocho vecinos
          ↓
ResolutorAutotilingParedes
          ↓
Configuración del bioma
          ↓
CompositorMundoPhaser
```

### Principios conservados

- Phaser representa, pero no modifica reglas;
- la matriz del mapa sigue siendo la fuente real;
- no existe una condición por nombre de mapa;
- la Alcantarilla es solo la primera configuración;
- generación, conectividad y ocupación no se duplican;
- Canvas 2D continúa siendo el backend predeterminado.

---

## 7. Archivos agregados

### Código

#### `src/interfaz/graficos/mapas/AnalizadorVecindadTerreno.js`

Analiza una casilla respecto de:

- norte, este, sur y oeste;
- noroeste, noreste, sureste y suroeste;
- lados expuestos;
- esquinas exteriores;
- esquinas interiores;
- límites del mapa diferenciados de una casilla real de piso.

Exporta:

- `analizarVecindadPared(...)`;
- `analizarVecindadSuelo(...)`.

#### `src/interfaz/graficos/mapas/ResolutorAutotilingParedes.js`

Convierte el análisis neutral en instrucciones visuales:

- recurso base de masa;
- selección determinista de variantes;
- recurso y propiedades del borde;
- recurso de esquina interior;
- recurso y propiedades de la sombra de contacto;
- respaldos gráficos cuando falta un PNG.

### Recursos gráficos

Directorio:

`assets/imagenes/mundo/alcantarilla/cenital/`

Archivos:

- `masa_pared_humeda_01.png`
- `masa_pared_humeda_02.png`
- `masa_pared_humeda_03.png`
- `masa_pared_humeda_04.png`
- `borde_pared_humeda.png`
- `esquina_interior_pared_humeda.png`
- `sombra_contacto_pared.png`

Todos son recursos locales de 32 × 32 utilizados únicamente por la apariencia Phaser de Alcantarilla.

### Documento

- `docs/phaser/entregas/ENTREGA_P5_1.md`

---

## 8. Archivos modificados

### `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`

- consume el analizador y resolutor genéricos;
- precarga todos los recursos declarados por el bioma;
- compone la masa de pared;
- superpone bordes únicamente contra piso real;
- representa esquinas interiores;
- coloca sombra de contacto en el piso;
- conserva respaldos si un recurso falta;
- mantiene capas, cámara, selección, entidades e iluminación.

### `src/config/mapas/mapas.json`

Solo Alcantarilla incorpora:

- `estrategiaBase: "masa"`;
- lista de variantes de masa;
- configuración y recursos del borde;
- configuración de esquina interior;
- configuración y recurso de sombra de contacto.

No se modificaron los otros biomas.

### `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`

- fija la dirección cenital ortográfica;
- registra el contrato reusable de ocho vecinos;
- separa P5.1 de P5 completa;
- registra P5.2 como integración posterior de entidades y props cenitales de Alcantarilla;
- agrega criterio de cierre específico para P5.1.

### `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

- cierra la perspectiva del mundo como cenital ortográfica;
- define masa continua y borde por bioma;
- documenta la sombra de contacto;
- aclara que personajes y enemigos se iteran aparte, también en vista superior.

### `README.md`

Actualiza el estado real del corte visual y los nuevos módulos reutilizables.

---

## 9. Archivos eliminados

Ningún archivo versionado fue eliminado.

Las variantes de muro heredadas se conservan. No se borraron porque pueden servir como respaldo histórico mientras se valida el nuevo lenguaje visual y porque su eliminación no formaba parte del alcance aprobado.

---

## 10. Dependencias y versiones

- Phaser `4.2.1`, ya incluido localmente.
- Dependencias nuevas: ninguna.
- npm: no utilizado ni requerido.
- `package.json`: no creado.
- Electron: no incorporado.
- Servicios externos: ninguno.

Se utilizó `node --check` únicamente como verificador externo de sintaxis disponible en el entorno. Node.js no fue incorporado al juego, no se creó código de runtime para Node y la versión web continúa siendo estática.

---

## 11. Instalación y reemplazo

### Opción A — Repositorio completo

1. Descomprimir el ZIP completo de P5.1.
2. Abrir la carpeta `Dark-Moon` resultante.
3. Confirmar que contiene `.git`.
4. Ejecutar el juego desde esa carpeta mediante servidor estático.

### Opción B — Archivos completos

Copiar o reemplazar exactamente las rutas enumeradas en las secciones 7 y 8.

No se requiere instalar paquetes.

### Ejecución

Desde la raíz del repositorio puede utilizarse cualquier servidor estático. Ejemplo:

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

### Desinstalación

Para retirar P5.1 sin utilizar operaciones masivas de Git:

1. restaurar desde el ZIP base los cinco archivos modificados;
2. eliminar únicamente:
   - `src/interfaz/graficos/mapas/`;
   - `assets/imagenes/mundo/alcantarilla/cenital/`;
   - `docs/phaser/entregas/ENTREGA_P5_1.md`.

---

## 12. Validaciones realizadas

### 12.1 Sintaxis JavaScript

**Preparación:** copia local de P5.1.

**Pasos:** ejecutar verificación de sintaxis sobre todos los archivos `.js` del repositorio.

**Resultado esperado:** ningún error sintáctico.

**Resultado obtenido:** todos los archivos superaron la comprobación.

**Estado:** Correcto.

### 12.2 JSON

**Preparación:** configuraciones finales.

**Pasos:** cargar `mapas.json` y `CiudadInicial.json` con un parser JSON.

**Resultado esperado:** ambos archivos válidos.

**Resultado obtenido:** ambos cargaron correctamente.

**Estado:** Correcto.

### 12.3 Algoritmo de ocho vecinos

**Preparación:** matrices pequeñas con paredes, pisos, límites y huecos diagonales.

**Pasos:** comprobar lados expuestos, piso adyacente, esquina interior y estrategia de masa.

**Resultado esperado:** el exterior de la matriz no debe confundirse con piso; los bordes solo aparecen contra casillas reales y las esquinas interiores se detectan.

**Resultado obtenido:** límites, bordes reales, suelo, esquina interior y masa continua fueron resueltos correctamente.

**Incidencia de la prueba:** la primera matriz sintética no representaba realmente una esquina interior. Se corrigió únicamente el caso de prueba, se repitió la validación y el resultado fue correcto; no fue necesario modificar código de producción.

**Estado:** Correcto.

### 12.4 Inicio real con Phaser

**Preparación:** servidor HTTP local y navegador Chromium sin interfaz gráfica.

**Pasos:** abrir `?render=phaser`, iniciar una partida y entrar a Alcantarilla.

**Resultado esperado:** Phaser `4.2.1`, mapa Alcantarilla visible, recursos locales y guardado operativo.

**Resultado obtenido:** backend `phaser`, versión `4.2.1`, ubicación `mazmorra`, mapa `alcantarilla`, guardado presente y canvas visible.

**Estado:** Correcto.

### 12.5 Recursos cenitales

**Preparación:** Alcantarilla abierta en Phaser.

**Pasos:** revisar solicitudes de red de los siete PNG cenitales.

**Resultado esperado:** HTTP 200 para todos los recursos declarados.

**Resultado obtenido:** los siete recursos devolvieron HTTP 200.

**Estado:** Correcto.

### 12.6 Movimiento, espera de tiempo e IA

**Preparación:** personaje dentro de Alcantarilla.

**Pasos:** ejecutar un movimiento válido y observar posición, tiempo y respuesta enemiga.

**Resultado esperado:** movimiento resuelto por la lógica canónica y consumo de tiempo normal.

**Resultado obtenido:** el jugador cambió de `(6, 9)` a `(5, 9)`, el tiempo pasó de `0` a `100` y los enemigos reaccionaron mediante el flujo existente.

**Estado:** Correcto.

### 12.7 Cámara y zoom

**Preparación:** partida Phaser activa.

**Pasos:** probar zoom mínimo, máximo, desplazamiento manual y recentrado.

**Resultado esperado:** rango configurado, cámara libre al desplazarse y seguimiento restaurado al recentrar.

**Resultado obtenido:** zoom `0.8`–`1.6`; la cámara cambió a libre al desplazarse y volvió a seguimiento al recentrar.

**Estado:** Correcto.

### 12.8 Selección por clic

**Preparación:** modo de combate activo.

**Pasos:** hacer clic sobre una casilla atacable usando la conversión de pantalla a mundo.

**Resultado esperado:** mover el selector canónico sin ejecutar automáticamente el ataque.

**Resultado obtenido:** el selector cambió de `(6, 8)` a `(5, 8)`, mantuvo `esValido: true` y el modo continuó siendo `combate`.

**Estado:** Correcto.

### 12.9 Redimensionamiento

**Preparación:** partida Phaser activa.

**Pasos:** cambiar la ventana a `900 × 650` y regresar a `1365 × 900`.

**Resultado esperado:** canvas visible y con dimensiones positivas en ambos tamaños.

**Resultado obtenido:** el canvas permaneció visible en ambas resoluciones.

**Estado:** Correcto.

### 12.10 Transiciones y guardado

**Preparación:** personaje en Alcantarilla.

**Pasos:** transicionar de Alcantarilla a ciudad y regresar a Alcantarilla.

**Resultado esperado:** mismo backend Phaser, canvas conectado y guardado conservado.

**Resultado obtenido:** transición `alcantarilla → ciudad_inicial → alcantarilla`, canvas Phaser conservado y entrada de guardado presente en `localStorage`.

**Estado:** Correcto.

### 12.11 Recurso ausente y respaldo

**Preparación:** sustituir temporalmente en memoria las rutas de masa, borde y sombra por rutas inexistentes, sin guardar esos valores en el repositorio.

**Pasos:** invalidar y redibujar el terreno.

**Resultado esperado:** errores HTTP esperados, respaldo gráfico visible y ninguna excepción JavaScript inesperada.

**Resultado obtenido:** tres respuestas HTTP 404 esperadas; el canvas permaneció visible, no hubo errores inesperados y luego se restauró la escena original.

**Estado:** Correcto.

### 12.12 Regresión Canvas 2D

**Preparación:** abrir la versión sin Phaser.

**Pasos:** iniciar partida y entrar a Alcantarilla usando `?render=canvas2d`.

**Resultado esperado:** backend Canvas 2D, mapa operativo y sin cargar Phaser como renderizador activo.

**Resultado obtenido:** backend `canvas2d`, partida y Alcantarilla operativas, un canvas visible y sin errores de inicio ni recursos fallidos.

**Estado:** Correcto.

### 12.13 Diferencias y formato Git

**Pasos:** ejecutar `git diff --check` y `git -c core.autocrlf=true status`.

**Resultado esperado:** sin errores de espacios y listado exacto de cambios recuperables.

**Resultado obtenido:** sin errores de formato; cambios locales preservados y sin commit.

**Estado:** Correcto.

---

## 13. Pruebas pendientes o no aplicables

### Validación visual manual del usuario

**Estado:** Pendiente.

La ejecución real y la captura fueron verificadas, pero la aprobación artística del grosor del borde, continuidad y sombra corresponde al usuario.

### WebGL independiente

**Estado:** Pendiente.

El navegador automatizado utilizó el renderizador Canvas de Phaser. La lógica y carga de recursos quedaron verificadas, pero no se afirma una prueba WebGL independiente.

### GitHub Pages

**Estado:** Pendiente posterior al commit y push del usuario.

No se modificó GitHub ni se publicó la copia local.

### Electron

**Estado:** No aplicable a P5.1.

### Pantalla completa gestionada por navegador

**Estado:** Pendiente de prueba manual.

El entorno automatizado gestionado no permite usar esta prueba como evidencia concluyente.

---

## 14. Evidencias

Se generaron fuera del repositorio:

- captura Phaser de Alcantarilla cenital;
- captura de regresión Canvas 2D;
- resultado estructurado de cámara, zoom, selección, redimensionamiento, recursos y respaldo.

No se agregaron capturas ni archivos temporales al código del juego.

---

## 15. Compatibilidad e impactos

### Web

- mantiene módulos ES;
- mantiene publicación estática;
- conserva rutas relativas;
- no requiere compilación;
- no depende de internet durante la ejecución normal;
- conserva Phaser `4.2.1` local;
- GitHub Pages debe verificarse después de publicar el commit.

### Electron

Sin cambios. Electron no es requisito para P5.1.

### Persistencia

No se modificaron:

- claves de `localStorage`;
- versión del guardado;
- snapshot del jugador;
- inventario;
- equipo;
- mapa persistido;
- progreso.

Impacto esperado y comprobado en el flujo probado: ninguno.

### Contenido nuevo

La solución permite agregar biomas mediante datos y recursos. No se requiere modificar el algoritmo por nombre de mapa.

### Generación procedural

Sin cambios. El autotiling consume la matriz final ya generada.

### Canvas 2D

Sin modificaciones y con regresión correcta.

---

## 16. Riesgos y pendientes

1. El acabado visual requiere aprobación manual del usuario.
2. Jugador, enemigos, barril y botín todavía utilizan recursos heredados no cenitales.
3. Los otros biomas aún no declaran recursos cenitales; no deben migrarse antes de aprobar Alcantarilla.
4. Las antiguas variantes de pared permanecen en el repositorio hasta decidir su reutilización o eliminación segura.
5. WebGL y GitHub Pages requieren validación posterior en el entorno final.

---

## 17. Comprobación de restricciones

- no se creó ningún `.patch`;
- no se creó ningún `.mjs`;
- no se creó `package.json`;
- no se instaló ninguna dependencia;
- no se incorporó npm, Electron ni runtime Node al juego;
- no se realizó commit;
- no se realizó push;
- no se modificó GitHub remotamente;
- no se cambió generación procedural;
- no se cambió conectividad;
- no se cambió movimiento;
- no se cambió combate;
- no se cambió IA;
- no se cambió tiempo;
- no se cambió persistencia;
- no se modificó Canvas 2D;
- no se creó una excepción por nombre de mapa;
- no se avanzó automáticamente a otro bioma;
- los cambios continúan recuperables en la copia local.

---

## 18. Conventional Commit propuesto

```text
feat(mapas): incorporar autotiling cenital reutilizable

- analizar ocho vecinos para resolver bordes y esquinas de paredes;
- separar la geometría del muro de la apariencia configurable del bioma;
- representar Alcantarilla con masas continuas, bordes húmedos y sombra de contacto;
- conservar generación, movimiento, combate, persistencia y Canvas 2D sin cambios;
- validar inicio, recursos, movimiento, cámara, zoom, selección, transiciones y respaldos;
- actualizar README, Plan Maestro, Diseño Maestro y entrega de P5.1.
```

No se realizó el commit.

---

## 19. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
P5.1 — Alcantarilla cenital base

ESTADO:
Cerrada con pendientes

COMMIT BASE:
d7f0bf618a0dba43fd55723a7260a33b4bdbc91f

HEAD FINAL VERIFICADO:
d7f0bf618a0dba43fd55723a7260a33b4bdbc91f

GIT STATUS FINAL:
Cambios locales completos de P5.1 sin commit ni push. Cinco archivos versionados modificados y tres grupos de archivos nuevos; la rama continúa siguiendo origin/main en el commit base.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_P5_1.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Alcantarilla dispone de una base cenital para piso y paredes. Un algoritmo genérico analiza ocho vecinos, dibuja la pared como masa continua, aplica el borde definido por el bioma únicamente contra piso real y agrega una sombra de contacto opcional.

ARQUITECTURA HEREDADA:
El mapa canónico continúa siendo la única fuente de geometría y ocupación. AnalizadorVecindadTerreno describe vecinos sin conocer Phaser; ResolutorAutotilingParedes traduce esa descripción usando configuración del bioma; CompositorMundoPhaser solo representa el resultado. Phaser no ejecuta reglas jugables y Canvas 2D continúa como backend predeterminado.

ARCHIVOS CLAVE:
- src/interfaz/graficos/mapas/AnalizadorVecindadTerreno.js: análisis neutral de ocho vecinos.
- src/interfaz/graficos/mapas/ResolutorAutotilingParedes.js: resolución visual configurable por bioma.
- src/interfaz/graficos/phaser/CompositorMundoPhaser.js: composición de masa, bordes, esquinas y sombra.
- src/config/mapas/mapas.json: apariencia cenital declarativa de Alcantarilla.
- assets/imagenes/mundo/alcantarilla/cenital/: recursos del primer bioma validado.

DEPENDENCIAS Y VERSIONES:
Phaser 4.2.1 local. Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- análisis de ocho vecinos, límites y esquinas interiores;
- inicio real de Alcantarilla con Phaser y carga HTTP 200 de los siete recursos;
- movimiento, IA, cámara, zoom, selección por clic y redimensionamiento;
- transición Alcantarilla–ciudad–Alcantarilla y guardado;
- recurso ausente con respaldo controlado;
- regresión Canvas 2D.

PROBLEMAS O RIESGOS PENDIENTES:
- aprobación visual manual del usuario;
- prueba WebGL independiente y GitHub Pages después del commit/push;
- personajes, enemigos, barril y botín todavía no son cenitales.

DECISIONES APROBADAS:
- ignorar StoneShard y toda referencia externa;
- utilizar una vista cenital ortográfica;
- validar inicialmente solo Alcantarilla;
- hacer el autotiling reutilizable y no específico del mapa;
- definir el material del borde desde cada bioma;
- incluir sombra de contacto opcional en el piso;
- dejar personaje, enemigos, barril y botín fuera de P5.1.

DECISIONES QUE SIGUEN ABIERTAS:
- aprobar o ajustar visualmente el grosor, contraste y sombra de Alcantarilla;
- decidir cuándo retirar las variantes heredadas de muros;
- confirmar los assets cenitales definitivos antes de P5.2.

SIGUIENTE ETAPA RECOMENDADA:
P5.2 — Entidades y props cenitales de Alcantarilla

OBJETIVO DE LA SIGUIENTE ETAPA:
Integrar en Alcantarilla los assets cenitales aprobados de jugador, enemigos, barril y botín mediante rutas configurables, sin cambiar ocupación, reglas ni resultados canónicos.

PRIMEROS ARCHIVOS A REVISAR:
- docs/phaser/entregas/ENTREGA_P5_1.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
- src/interfaz/graficos/phaser/CompositorMundoPhaser.js
- src/interfaz/graficos/phaser/GestorRecursosPhaser.js
- src/config/entidades/Enemigos.json
- src/entidad/destructible/Barril.js
- src/entidad/interactuable/BotinSuelo.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- generación procedural y conectividad;
- ocupación, movimiento, combate, IA y sistema de tiempo;
- persistencia;
- Canvas 2D como backend predeterminado;
- otros biomas;
- Electron, Node.js o npm.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Jugador, enemigos, barril y botín de Alcantarilla se leen correctamente desde arriba, permanecen centrados en sus casillas y funcionan con movimiento, combate, selección, muerte, botín, cámara y zoom sin cambiar resultados canónicos ni romper Canvas 2D.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(mapas): incorporar autotiling cenital reutilizable

- analizar ocho vecinos para resolver bordes y esquinas de paredes;
- separar la geometría del muro de la apariencia configurable del bioma;
- representar Alcantarilla con masas continuas, bordes húmedos y sombra de contacto;
- conservar generación, movimiento, combate, persistencia y Canvas 2D sin cambios;
- validar inicio, recursos, movimiento, cámara, zoom, selección, transiciones y respaldos;
- actualizar README, Plan Maestro, Diseño Maestro y entrega de P5.1.

----------------- FIN DEL ENLACE -----------------
