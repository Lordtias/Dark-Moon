# PLAN MAESTRO — INTEGRACIÓN PROGRESIVA DE PHASER, BETA Y ELECTRON

Proyecto: Dark Moon  
Repositorio: https://github.com/Lordtias/Dark-Moon.git  
Rama principal: main  
Versión del documento: 2.0
Fecha inicial: 30 de julio de 2026  
Última actualización: 1 de agosto de 2026
Etapa operativa actual: P5 — Mundo jugable y mapas grandes

---

## 1. Propósito del documento

Este documento es la referencia principal para incorporar Phaser a Dark Moon sin perder la versión jugable actual ni forzar una reescritura completa.

Debe utilizarse para:

- recordar el objetivo general;
- mantener la secuencia de etapas;
- evitar cambios que no correspondan a la etapa activa;
- registrar decisiones e imprevistos;
- definir cuándo conviene continuar con Phaser;
- definir cuándo conviene detener la migración y priorizar Electron;
- preparar una beta visualmente presentable;
- conservar una ruta futura hacia Steam.

Este documento puede modificarse si aparece información nueva. Toda modificación importante debe registrarse en la sección **Historial de decisiones**.

---

## 2. Situación inicial

Dark Moon ya posee una versión mínima jugable en navegador.

Actualmente existen, entre otros sistemas:

- creación de personaje;
- profesiones;
- movimiento por casillas;
- sistema temporal;
- combate físico y mágico;
- enemigos e inteligencia artificial;
- mapas normales y especiales;
- inventario;
- equipamiento;
- objetos y afijos;
- habilidades y maestrías;
- progresión;
- persistencia;
- interfaz HTML y CSS;
- publicación mediante GitHub Pages.

El problema principal no es la ausencia de jugabilidad básica. El problema es que la presentación visual todavía no resulta suficientemente atractiva para invitar a testers externos y obtener una primera impresión representativa del producto deseado.

---

## 3. Objetivo general

Transformar progresivamente Dark Moon en una beta visualmente atractiva mediante Phaser, conservando la lógica existente y verificando tempranamente que el proyecto pueda empaquetarse como aplicación de escritorio.

El destino futuro deseado es Steam, pero no existe una fecha comercial obligatoria. El desarrollo continúa siendo personal y orientado a la diversión.

La estrategia debe permitir:

1. seguir publicando una versión web;
2. compartir el juego rápidamente con amigos;
3. mejorar la presentación visual;
4. mantener el contenido y la lógica existente;
5. probar Electron antes de que la arquitectura sea difícil de cambiar;
6. detener la migración a Phaser cuando ya no aporte valor suficiente;
7. continuar agregando contenido aunque la migración visual no esté terminada;
8. preparar una futura distribución comercial sin convertirla todavía en prioridad.

---

## 4. Decisiones estratégicas vigentes

### 4.1 Distribución

Se mantendrán dos posibles destinos:

- **Web:** GitHub Pages para pruebas rápidas y acceso sin instalación.
- **Escritorio:** Electron para una versión portable o instalable y una futura ruta hacia Steam.

La web continúa siendo el medio principal durante el desarrollo inicial.

Electron debe probarse temprano, pero no se convertirá todavía en el entorno obligatorio de desarrollo.

### 4.2 Cámara

Los mapas podrán ser mayores que el área visible.

La referencia inicial del área del mundo será de **1024 × 640 unidades lógicas**, equivalente a 32 × 20 casillas cuando se utilice la casilla lógica de 32 × 32. Esta medida sirve para diseño, diagnóstico y pruebas; no limita el tamaño futuro de los mapas ni obliga a que la ventana mantenga esa resolución.

La integración con Phaser deberá mostrar una parte del mapa mediante cámara. No deberá reducir progresivamente todo el mapa para hacerlo entrar en el panel.

La cámara deberá permitir:

- seguimiento del personaje;
- desplazamiento manual;
- zoom;
- límites del mapa;
- recentrado rápido;
- funcionamiento mediante teclado y ratón.

### 4.3 Controles

El control principal será el teclado.

El ratón se utilizará especialmente para:

- inspeccionar personajes y enemigos;
- seleccionar objetivos;
- ver detalles;
- abrir modales;
- utilizar menús;
- mover o ampliar la cámara cuando corresponda.

### 4.4 Estilo visual objetivo

El estilo objetivo se define como:

> Fantasía medieval 2D ilustrada, estilizada y luminosa, con vista superior o tres cuartos y lectura táctica clara por casillas.

No se busca:

- pixel art estricto;
- fotorrealismo;
- oscuridad visual que impida leer el tablero;
- una migración total de todos los paneles a Phaser;
- animaciones costosas antes de comprobar el valor de la integración.

Los detalles completos se encuentran en:

`docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

### 4.5 Arquitectura híbrida

La arquitectura objetivo inicial es:

```text
Entrada de teclado, ratón o Phaser
                │
                ▼
        Comando compartido
                │
                ▼
       Lógica canónica actual
                │
                ▼
        Resultado canónico
                │
                ▼
 Estado neutral de presentación
                │
        ┌───────┴────────┐
        ▼                ▼
 Canvas 2D o Phaser    HTML/CSS
     Mundo             Interfaz
        │                │
        └───────┬────────┘
                ▼
         Navegador o Electron
```

La revisión de P0 confirmó que la base actual ya se aproxima a este contrato:

- `ControladorTeclado` produce comandos compartidos;
- `ControladorPartida` ofrece un punto común para ejecutar comandos;
- `EjecutorAccionesJugador` conecta comandos con la lógica canónica;
- `ProcesadorResultadoAccion` normaliza y presenta resultados;
- `AdaptadorEscenaJuego` crea una escena plana;
- `Renderizador` delega el mapa a un backend gráfico intercambiable;
- `RenderizadorCanvas2D` representa la escena sin resolver reglas.

El backend gráfico mínimo debe aceptar:

- `configurarDimensiones({ columnas, filas })`;
- `dibujar(escena)`;
- un mecanismo de destrucción cuando el ciclo de vida lo requiera.

Phaser deberá consumir la escena neutral y emitir los mismos comandos utilizados por las entradas actuales. No podrá mover entidades, calcular daño, ejecutar IA ni alterar el tiempo directamente.

Phaser no debe reemplazar reglas que ya funcionan solamente para aumentar su presencia en el proyecto.

### 4.6 Fuente principal de cada etapa

A partir de P0, la fuente principal y obligatoria será la copia descomprimida del ZIP completo proporcionado para la etapa, incluido su directorio `.git`.

La conexión de GitHub se utilizará como fuente complementaria para:

- confirmar el repositorio publicado;
- contrastar commits y archivos;
- revisar el estado remoto cuando resulte útil.

Si la copia del ZIP y GitHub difieren, no se reemplazará automáticamente la copia local. La diferencia deberá explicarse antes de modificar arquitectura o contenido.

---

## 5. Responsabilidades por tecnología

### 5.1 Phaser

Phaser podrá controlar progresivamente:

- renderizado del mapa;
- suelo, paredes y decoración;
- personajes y enemigos;
- cámara;
- zoom;
- desplazamiento;
- animaciones visuales;
- selección y resaltado;
- proyectiles;
- áreas de habilidades;
- partículas;
- iluminación;
- números de daño;
- transiciones del mundo;
- audio del mundo, si se aprueba.

### 5.2 JavaScript actual de Dark Moon

La lógica existente continuará controlando:

- reglas de movimiento;
- ocupación de casillas;
- conectividad;
- sistema temporal;
- iniciativa;
- inteligencia artificial;
- precisión y evasión;
- daño;
- críticos;
- bloqueo;
- armadura;
- habilidades;
- maestrías;
- estados;
- inventario;
- equipamiento;
- progresión;
- generación;
- recompensas;
- persistencia;
- datos JSON.

### 5.3 HTML y CSS

HTML y CSS continuarán controlando inicialmente:

- personaje;
- inventario;
- equipamiento;
- habilidades;
- maestrías;
- detalles;
- menús;
- modales;
- selección de personaje;
- selección de mapa;
- configuración.

La migración de estas interfaces a Phaser será opcional y deberá demostrar un beneficio real.

### 5.4 Electron

Electron será responsable de:

- ventana de escritorio;
- carga local;
- empaquetado;
- pantalla completa;
- directorio de guardado;
- logs;
- versión de aplicación;
- distribución portable o instalable;
- integración futura con Steam, si se aprueba.

Electron no debe convertirse en dueño de la lógica del juego.

---

## 6. Política de versiones

### 6.1 Phaser

P1 revalidó y aprobó Phaser 4.2.1 como versión exacta para la integración técnica inicial.

Decisiones vigentes:

- versión exacta: `4.2.1`;
- licencia: MIT;
- distribución aprobada: `dist/phaser.min.js` oficial;
- ubicación local: `assets/vendor/phaser/4.2.1/phaser.min.js`;
- carga condicional únicamente cuando se solicita `?render=phaser`;
- Canvas 2D continúa siendo el modo predeterminado;
- no se utiliza `latest` ni un rango flotante;
- no se utiliza CDN durante la ejecución;
- no se actualiza Phaser automáticamente;
- solo se cambiará de versión ante una necesidad concreta y aprobada.

El archivo oficial quedó incorporado y verificado mediante su versión, Git blob
SHA y SHA-256. La carga es completamente local y fue validada sin solicitar
servicios externos.

### 6.2 Electron

La versión de Electron se elegirá al iniciar E0.

No debe fijarse ahora porque Electron requiere una política de soporte más activa.

En E0 se debe:

- elegir una versión estable soportada;
- documentar Node y Chromium incluidos;
- registrar la herramienta de empaquetado;
- fijar versiones exactas;
- evitar actualizaciones automáticas no revisadas.

### 6.3 Excepción controlada a las restricciones históricas

Las etapas normales de Dark Moon mantienen la preferencia de no instalar dependencias ni utilizar Node.js.

Sin embargo:

- Phaser podrá incorporarse únicamente en la etapa aprobada para ello.
- Electron, Node.js, npm y una herramienta de empaquetado podrán utilizarse únicamente en etapas E0, E1, E2 o S1.
- Esas herramientas se limitarán a infraestructura de escritorio, construcción y empaquetado.
- No se trasladará la lógica del juego a Node.js.
- No se instalará ninguna dependencia sin explicar antes su función, versión, archivos afectados y alternativa.
- No se utilizará `node:test` salvo aprobación específica.
- No se agregará telemetría ni comunicación externa sin aprobación.

---

## 7. Principios obligatorios del plan

1. Cada etapa debe ser autocontenida.
2. Cada etapa debe tener un resultado visible o técnico comprobable.
3. El juego debe seguir ejecutándose al finalizar cada etapa.
4. No se debe avanzar automáticamente a la etapa siguiente.
5. Antes de implementar se debe presentar un análisis y esperar aprobación explícita.
6. El renderizado anterior no se eliminará antes de validar su reemplazo.
7. No se debe duplicar la lógica del juego dentro de Phaser.
8. Phaser debe representar resultados, no inventar reglas.
9. La versión web debe seguir funcionando mientras sea razonable.
10. Los cambios de arquitectura deben justificarse.
11. Los documentos deben actualizarse cuando una decisión cambie.
12. Cada etapa debe generar una entrega documental.
13. Cada etapa debe finalizar con un Conventional Commit propuesto.
14. Cada etapa debe producir un bloque de enlace para la etapa siguiente.
15. Las conclusiones deben explicar de forma sencilla:
    - qué se analizó;
    - por qué se analizó;
    - cuál es la conclusión;
    - qué decisión o acción corresponde.

---

## 8. Estructura documental recomendada

```text
docs/
└── phaser/
    ├── PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
    ├── DISENO_MAESTRO_VISUAL_DARK_MOON.md
    ├── PROMPT_MAESTRO_ETAPAS_PHASER_ELECTRON.txt
    └── entregas/
        ├── ENTREGA_P0.md
        ├── ENTREGA_P1.md
        ├── ENTREGA_E0.md
        └── ...
```

Cada archivo `ENTREGA_*.md` debe registrar:

- commit base;
- HEAD verificado;
- alcance aprobado;
- archivos modificados;
- decisiones;
- pruebas;
- riesgos;
- pendientes;
- commit propuesto;
- enlace para la etapa siguiente.

---

# 9. PLAN DE ETAPAS

---

## ETAPA P0 — Revalidación y contrato de arquitectura

### Objetivo

Analizar el repositorio real y definir cómo se conectará Phaser sin alterar todavía el juego.

### Alcance mínimo

- verificar ruta, rama, HEAD y estado de Git;
- revisar el historial reciente;
- identificar el punto de inicio del juego;
- localizar la creación y actualización del mapa;
- localizar la entrada de teclado y ratón;
- localizar movimiento, selección, ataques y cambios de mapa;
- localizar persistencia y carga de recursos;
- identificar dependencias entre lógica, DOM y CSS;
- clasificar cada responsabilidad;
- detectar acoplamientos que dificulten Phaser;
- proponer un contrato neutral de presentación;
- definir tamaño lógico de casilla;
- definir resolución base;
- definir política de escalado;
- definir selector temporal de renderizador;
- preparar una matriz de regresión.

### No incluye

- instalar Phaser;
- modificar el renderizado;
- cambiar el diseño visual;
- empaquetar Electron;
- migrar lógica;
- agregar contenido.

### Entregables

- `docs/phaser/entregas/ENTREGA_P0.md`;
- mapa simple de módulos y flujo;
- propuesta de arquitectura;
- lista exacta de archivos a modificar en P1;
- riesgos encontrados;
- criterios de aprobación de P1;
- Conventional Commit sugerido;
- enlace completo para P1.

### Criterio de cierre

P0 termina cuando existe una arquitectura aprobada basada en el repositorio real.

### Punto de decisión

Si el repositorio está demasiado acoplado, puede agregarse una etapa P0A de desacoplamiento mínimo antes de incorporar Phaser.

### Resultado de P0

P0 determinó que **no es necesaria una etapa P0A**.

La arquitectura ya contiene un camino común de comandos, una lógica canónica, un procesador de resultados, un adaptador de escena y un backend Canvas 2D intercambiable. Los acoplamientos encontrados son controlables y pueden tratarse de forma progresiva sin una reescritura previa.

Decisiones cerradas:

- P0 es exclusivamente documental;
- la casilla lógica queda fijada en 32 × 32;
- 1024 × 640 es una referencia inicial, no un límite del mapa;
- los mapas grandes serán recorridos mediante cámara;
- el selector temporal será `?render=canvas2d|phaser`;
- sin parámetro se utilizará Canvas 2D durante la transición;
- los paneles densos continúan en HTML/CSS durante este hito;
- una revisión o migración posterior de esos paneles podrá evaluarse después del hito;
- Phaser deberá usar estado neutral y comandos compartidos obligatoriamente;
- Canvas 2D no se eliminará antes de validar su reemplazo.

Entrega asociada:

`docs/phaser/entregas/ENTREGA_P0.md`

---

## ETAPA P1 — Núcleo técnico de Phaser

### Objetivo

Incorporar Phaser de manera mínima, reversible y sin migrar todavía la lógica real.

### Alcance mínimo

- revalidar versión estable;
- fijar la versión exacta;
- incorporar Phaser localmente o mediante la estrategia aprobada;
- registrar licencia;
- crear configuración;
- crear inicializador;
- crear escena de arranque;
- montar el canvas en el área central;
- conservar paneles HTML/CSS;
- agregar selector de renderizador;
- mostrar fondo, cuadrícula, un personaje y un enemigo;
- mostrar resolución y versión en modo diagnóstico;
- adaptar tamaño al espacio disponible;
- validar carga offline.

### No incluye

- mapa real completo;
- movimiento real;
- combate;
- inteligencia artificial;
- efectos complejos;
- eliminación del renderizador anterior.

### Resultado esperado

Una escena Phaser visible dentro de Dark Moon, activable sin romper la versión anterior.

### Criterio de cierre

- Phaser inicia sin errores;
- el canvas se adapta;
- los paneles funcionan;
- el modo anterior continúa funcionando;
- no se requieren servicios externos;
- no se duplicaron reglas del juego.

### Decisiones aprobadas para P1

- `Phaser.AUTO` elegirá WebGL o Canvas según disponibilidad;
- `Phaser.Scale.FIT` conservará la proporción dentro del panel central;
- 1024 × 640 será solamente una referencia técnica inicial de prueba;
- la casilla lógica continuará siendo 32 × 32;
- el backend se seleccionará al arrancar mediante `?render=canvas2d|phaser`;
- no habrá cambio de backend en caliente;
- Canvas 2D seguirá siendo el modo predeterminado;
- el canvas Phaser tendrá protección temporal de puntero hasta definir cámara,
  zoom y conversión de coordenadas;
- Phaser consumirá la escena neutral y no recibirá la instancia de `Juego`.

### Resultado consolidado de P1

P1 incorporó Phaser 4.2.1 localmente y verificó su funcionamiento offline. El backend Phaser se activa mediante `?render=phaser`, crea su propio canvas dentro del panel central y consume la misma escena neutral que Canvas 2D.

Validaciones consolidadas:

- Canvas 2D continúa siendo el modo predeterminado y no carga Phaser;
- Phaser inicia desde el vendor local sin servicios externos;
- `Phaser.AUTO` selecciona el renderizador disponible y `Scale.FIT` conserva la proporción dentro del panel;
- el backend refresca su escala cuando la pantalla de partida pasa de oculta a visible;
- la escena técnica representa cuadrícula, jugador, enemigos e interactuables;
- el movimiento continúa entrando por el controlador canónico y actualiza la escena Phaser;
- los paneles HTML/CSS y la persistencia conservan sus contratos;
- un parámetro inválido vuelve a Canvas 2D y una dependencia ausente produce un error explícito.

Los identificadores de commits cerrados no se registran en este documento maestro. Se heredan mediante el prompt y los documentos de entrega de cada etapa.

### Entregables

- implementación completa;
- `ENTREGA_P1.md`;
- instrucciones de prueba;
- Conventional Commit;
- enlace para la siguiente etapa aprobada por secuencia.

---

## ETAPA E0 — Prueba técnica temprana de Electron

### Objetivo

Comprobar tempranamente que Dark Moon puede ejecutarse como aplicación de escritorio sin exigir una reestructuración tardía.

### Alcance mínimo

- seleccionar versión estable de Electron;
- elegir herramienta de empaquetado;
- fijar versiones;
- crear configuración mínima;
- abrir Dark Moon en una ventana;
- probar modo actual y Phaser;
- validar rutas locales;
- validar JSON, imágenes y CSS;
- validar WebGL;
- validar pantalla completa;
- validar guardado y carga;
- definir directorio de datos;
- utilizar aislamiento de contexto;
- evitar acceso directo e innecesario a Node desde el juego;
- generar una compilación portable técnica para Windows;
- documentar comandos y estructura.

### No incluye

- instalador comercial;
- actualizador;
- Steam;
- logros;
- Steam Cloud;
- firma de código;
- telemetría;
- publicación.

### Resultado esperado

Una versión técnica ejecutable que pueda abrirse fuera del navegador.

### Criterio de cierre

- abre;
- carga recursos;
- permite jugar;
- guarda;
- cierra;
- recupera la partida;
- no depende de GitHub Pages;
- no expone privilegios innecesarios.

### Punto de decisión E0

**E0-A — Viable:** continuar con Phaser.

**E0-B — Viable con ajustes:** resolver los ajustes antes de ampliar la migración.

**E0-C — Problema estructural:** priorizar una etapa de compatibilidad de empaquetado antes de continuar.

### Estado temporal y condición de reanudación

E0 está pausada temporalmente por las limitaciones de conectividad, permisos de
instalación y descarga del equipo actual. La pausa no modifica su alcance ni
permite considerar sus criterios como cumplidos. Por la decisión D-023 se
habilitó completar P3 antes de E0, sin autorizar automáticamente etapas
posteriores ni incorporar Electron, Node.js o npm dentro de P3.

Antes de instalar cualquier herramienta deberán proponerse y aprobarse las
versiones exactas de Node.js, Electron y la herramienta de empaquetado, junto
con su propósito, comandos, archivos generados, impacto y alternativa.

---

## ETAPA P2 — Corte vertical visual

### Objetivo

Demostrar el valor visual de Phaser mediante una escena pequeña pero representativa.

### Alcance mínimo

- utilizar un mapa o fragmento real;
- suelo;
- paredes;
- obstáculos;
- personaje;
- entre dos y cinco enemigos;
- puerta, portal u objetivo;
- decoración;
- profundidad;
- sombras;
- cuadrícula discreta;
- iluminación básica;
- selección de casillas;
- cámara;
- zoom;
- desplazamiento;
- uso de recursos existentes cuando sea posible.

### No incluye

- migración de todos los mapas;
- integración completa con lógica;
- combate completo;
- animaciones definitivas;
- reemplazo total de assets.

### Resultado esperado

Una escena capaz de representar el aspecto futuro de Dark Moon.

### Punto de decisión P2

Preguntas obligatorias:

- ¿La mejora visual es clara?
- ¿El estilo es coherente?
- ¿La cuadrícula sigue siendo legible?
- ¿El rendimiento es suficiente?
- ¿La dirección artística es viable?
- ¿Conviene continuar con la migración?

Si la respuesta general es negativa, se puede conservar Phaser solo para efectos o abandonar la ruta antes de invertir más.

### Resultado consolidado de P2

P2 fue aprobada y se implementó en dos bloques internos sin commits separados:

- **P2.1 — Corte funcional:** recursos locales, composición del mundo, entidades reales, cámara, zoom, desplazamiento y lectura visual del puntero.
- **P2.2 — Acabado visual:** decoración determinista, sombras de muros y entidades, profundidad por base, iluminación ambiental básica, selección táctica y adaptación para ventanas de poca altura.
- **Ajustes de cierre de P2:** retiro del aura permanente de interactuables, clasificación configurable de muros por vecinos cardinales, seguimiento centralizado de cámara y anclaje de sprites por contenido visible.

La Alcantarilla es el corte vertical de referencia. Su apariencia Phaser se declara en `src/config/mapas/mapas.json` y sus imágenes ambientales se ubican en `assets/imagenes/mundo/alcantarilla/`.

La familia inicial de muros diferencia aislados, extremos, rectos, esquinas, uniones en T, cruces e interiores. P5 reutilizará y ampliará este contrato para el resto de biomas, puertas, transiciones y obstáculos complejos; no deberá crear un segundo clasificador paralelo.

La cámara ya no depende de listas de acciones que deban recentrarla. Mientras el seguimiento esté activo, la posición del personaje se confirma en cada actualización visual y después de cambios de escala o visibilidad. La carga inicial, las esperas, los modales y el redimensionamiento utilizan el mismo contrato general. El desplazamiento manual conserva el modo de cámara libre y cualquier selección táctica restablece el seguimiento.

Los recursos transparentes se analizan una sola vez al cargarse. El compositor utiliza la base y el centro del contenido alfa para apoyar sprites y dimensionar sombras, sin recortar archivos ni introducir excepciones por enemigo u objeto.

Canvas 2D sigue siendo el backend predeterminado. P2 superó las validaciones automatizadas de navegador y la validación manual del usuario. La decisión visual consolidada es continuar con Phaser conservando Canvas 2D como respaldo y sin adelantar en esa etapa los controles jugables directos previstos para P4.

---

## ETAPA P3 — Cámara, escala y controles

### Objetivo

Crear el sistema de navegación visual necesario para mapas más grandes.

### Alcance aprobado

- seguimiento opcional del personaje;
- desplazamiento de cámara con `I`, `J`, `K` y `L`;
- desplazamiento por arrastre derecho o central;
- zoom con `+`, `-` y rueda;
- límites dinámicos;
- `H` y doble clic izquierdo para recentrar y reactivar seguimiento;
- velocidad configurable y calculada por tiempo real;
- zoom inicial de 120 %, mínimo de 80 %, máximo de 160 % y pasos de 10 %;
- conversión única entre coordenadas de pantalla, mundo y casilla;
- mantenimiento de nitidez;
- compatibilidad con paneles y campos editables;
- conservación del modo libre al redimensionar;
- bloqueo del desplazamiento manual durante selección táctica.

### Arquitectura aprobada

`ConversorCoordenadasPhaser` centraliza pantalla, mundo y casilla. `ControladorCamaraPhaser` consume ese contrato para navegar y nunca emite comandos jugables. `CompositorMundoPhaser` reutiliza el mismo conversor para ubicar casillas. La escena llama al controlador desde su ciclo `update` sin trasladar reglas del juego a Phaser.

### No incluye

- movimiento lógico migrado;
- clics o teclado Phaser traducidos a intenciones jugables;
- combate;
- minimapa obligatorio;
- mapas definitivos de gran tamaño;
- Electron, Node.js o npm.

### Resultado consolidado de P3

La implementación fue completada el 31 de julio de 2026. Las comprobaciones estáticas, de configuración, de comportamiento aislado y de navegador automatizado fueron correctas para Phaser y Canvas 2D. El usuario aprobó además las pruebas manuales en su navegador habitual.

### Resultado esperado

Una cámara cómoda, predecible y preparada para mapas mayores que la pantalla, sin consumir turnos ni interferir con los controles canónicos del personaje.

### Criterio de cierre

El usuario puede navegar, ampliar, reducir y volver al personaje sin perder orientación; la selección táctica, los paneles, el redimensionamiento, Canvas 2D y la entrada canónica conservan su comportamiento.

---

## ETAPA P4 — Entrada e intenciones jugables desde Phaser

### Objetivo

Permitir que Phaser traduzca clics sobre su mapa a los mismos comandos compartidos utilizados por el juego, sin trasladar reglas jugables a la escena.

### Alcance aprobado

- conservar `ControladorTeclado` como único adaptador global de teclado jugable;
- conservar los controles de cámara en su componente especializado;
- crear un adaptador de puntero exclusivo para el canvas Phaser;
- reutilizar `ConversorCoordenadasPhaser` para considerar cámara, zoom y redimensionamiento;
- emitir un comando genérico `SELECCIONAR_CASILLA`;
- seleccionar casillas en combate, interacción y habilidades;
- mantener `F` como confirmación de combate o habilidad;
- mantener `R` como confirmación de interacción;
- impedir que el controlador DOM de habilidades procese también el canvas Phaser;
- ignorar clics fuera del mapa, botones no izquierdos y repeticiones inmediatas de un doble clic;
- conservar Canvas 2D y su puntero histórico;
- no agregar movimiento mediante clic;
- no agregar inspección de entidades todavía;
- no agregar una segunda configuración de teclas.

### Contrato conceptual

```text
Teclado DOM o puntero del backend activo
        ↓
Comando compartido
        ↓
ControladorPartida
        ↓
EjecutorAccionesJugador
        ↓
Sistema canónico correspondiente
        ↓
ResultadoAccion
        ↓
Estado neutral
        ↓
Canvas 2D o Phaser representa el resultado
```

Phaser entrega únicamente la casilla señalada. Combate, interacción y habilidades continúan decidiendo si esa casilla es válida. El clic cambia el selector, pero nunca confirma ni consume un turno por sí mismo.

### Estado operativo de P4

**En validación manual.** La implementación y las pruebas automatizadas están completas. El cierre definitivo requiere la comprobación del usuario en su navegador habitual. El SHA final se heredará mediante el próximo prompt y no se agregará posteriormente al Documento Maestro.

### Criterio de cierre

Una entrada realizada sobre Phaser debe producir el mismo cambio de selector que el flujo canónico existente, ejecutarse una sola vez, conservar `F`/`R` como confirmación y no crear reglas jugables paralelas ni regresiones en Canvas 2D.

### Punto de decisión A — Viabilidad de la migración

**Ruta A:** integración saludable; continuar.

**Ruta B:** integración útil pero costosa; limitar Phaser a mundo, cámara y efectos.

**Ruta C:** integración inconveniente; conservar lo aprendido, mejorar HTML/CSS y priorizar Electron.

---

## ETAPA P5 — Mundo jugable y mapas grandes

### Objetivo

Renderizar los mapas reales y permitir recorrerlos mediante Phaser.

### División operativa aprobada

- **P5.1 — Soporte real de mapas en Phaser:** contrato genérico de terrenos, símbolos configurables, muros, cámara, límites, entidades y transiciones sin reglas paralelas.
- **P5.2 — Tiles mejorados por bioma:** recursos visuales más detallados para Alcantarilla, Cementerio, Casa del Guerrero, Fortaleza abandonada, Sala de guerra y Ciudad Inicial.

P5.1 dejó preparada la configuración por símbolo. P5.2 incorpora familias de PNG de 128 × 128 para los cinco mapas procedurales y para los terrenos diferenciados de la Ciudad Inicial. Además agrega frentes modulares de 128 × 96 que Phaser representa como fachadas 2.5D de altura moderada. El compositor continúa utilizando la casilla lógica de 32 × 32 y no utiliza los recursos como regla jugable.

P5 permanece abierta hasta completar la validación manual de los seis escenarios, sus transiciones y la regresión de Canvas 2D.

### Alcance mínimo

- mapas normales;
- mapas especiales;
- terrenos;
- paredes;
- obstáculos;
- puertas;
- portales;
- personajes;
- enemigos;
- objetos;
- elementos interactivos;
- transiciones;
- límites;
- cámara;
- mapas mayores que el área visible;
- selección de casillas;
- casillas válidas e inválidas;
- niebla o visibilidad únicamente si ya existe contrato aprobado;
- optimización solo si se mide una necesidad real.

### No incluye

- cambio de generación procedural;
- cambio de conectividad;
- cambio de IA;
- cambio de reglas de ocupación;
- ampliación obligatoria del contenido.

### Criterio de cierre

Todos los mapas existentes pueden jugarse con Phaser sin cambiar sus resultados.

---

## ETAPA P6 — Combate y habilidades visuales

### Objetivo

Convertir el combate funcional existente en una experiencia visual más clara y atractiva.

### Alcance mínimo

- movimiento interpolado;
- ataque cuerpo a cuerpo;
- ataque a distancia;
- proyectiles;
- impactos;
- evasiones;
- bloqueos;
- críticos;
- números de daño;
- curación;
- muerte;
- botín;
- selección de objetivos;
- previsualización de áreas;
- líneas;
- explosiones;
- nubes;
- muros;
- fuego;
- frío;
- rayo;
- veneno;
- estados;
- respuesta sonora básica si se aprueba;
- velocidad de animación configurable.

### Principio obligatorio

La animación no debe alterar el resultado del combate ni convertirse en el temporizador real del sistema lógico.

### Criterio de cierre

Se valida el flujo completo desde seleccionar una acción hasta muerte, recompensa y actualización visual.

---

## ETAPA P7 — Candidato visual para beta web

### Objetivo

Preparar una versión presentable para amigos y testers mediante GitHub Pages.

### Alcance mínimo

- integración visual coherente;
- pantalla inicial;
- creación de personaje;
- selección de mapa;
- mapa Phaser;
- paneles HTML/CSS;
- jerarquía visual;
- tooltips;
- configuración;
- zoom;
- volumen;
- velocidad de animaciones;
- pantalla completa web si corresponde;
- número de versión;
- instrucciones breves;
- método de feedback;
- diagnóstico copiable;
- eliminación de elementos temporales.

### Criterio de cierre

Una persona sin conocimiento previo puede crear personaje, jugar, combatir, obtener botín, equiparse, usar habilidades, guardar y continuar.

### Punto de decisión B — Cierre inicial de Phaser

En P7 se decide si:

- continuar migrando interfaces;
- detener Phaser en mundo y combate;
- priorizar contenido;
- priorizar Electron;
- preparar beta más amplia.

La recomendación inicial es detener la migración obligatoria en:

> Mundo y combate en Phaser + interfaz densa en HTML/CSS.

---

## ETAPA E1 — Beta Electron

### Objetivo

Transformar la prueba técnica de E0 en una compilación útil para testers.

### Alcance mínimo

- versión portable de Windows;
- icono;
- nombre y versión;
- directorio estable de partidas;
- importación y exportación;
- logs;
- diagnóstico;
- pantalla completa;
- cierre seguro;
- recuperación;
- instrucciones para testers;
- política simple de compatibilidad de guardados.

### No incluye

- publicación comercial;
- actualización automática obligatoria;
- Steamworks;
- firma de código obligatoria.

### Criterio de cierre

Un tester puede abrir, jugar, guardar y enviar información útil sobre errores.

---

## ETAPA E2 — Empaquetado de producto

### Objetivo

Preparar una distribución de escritorio más cercana a un producto comercial.

### Alcance posible

- instalador;
- portable;
- compilación reproducible;
- licencias;
- iconografía definitiva;
- configuración;
- compatibilidad de partidas;
- recuperación de partidas dañadas;
- migraciones de guardado si fueran necesarias;
- control de versiones;
- logs;
- firma de código si se decide;
- pruebas en distintos equipos;
- estrategia de actualización.

### Inicio

E2 no debe comenzar por calendario. Debe comenzar cuando exista una versión que se considere suficientemente estable y atractiva.

---

## ETAPA S1 — Prueba privada en Steam

### Objetivo

Comprobar una compilación privada de Dark Moon dentro del flujo real de Steam.

### Alcance posible

- configuración inicial de aplicación;
- compilación privada;
- subida;
- ejecución desde Steam;
- cierre;
- guardado;
- overlay si se aprueba;
- Steam Cloud si se aprueba;
- logros si se aprueban;
- compatibilidad con actualizaciones.

### No incluye automáticamente

- publicación pública;
- precio;
- página definitiva;
- marketing;
- logros;
- Steam Cloud;
- workshop.

Cada integración debe evaluarse por separado.

---

## ETAPA P8 — Expansiones opcionales posteriores

Solo se realizarán si el feedback demuestra valor.

Posibles trabajos:

- HUD dentro de Phaser;
- menú principal;
- selección de mapa;
- transiciones avanzadas;
- iluminación dinámica;
- clima;
- atlas;
- animaciones direccionales;
- minimapa;
- efectos avanzados;
- accesibilidad adicional.

No se migrarán por defecto:

- cálculo de daño;
- reglas de inventario;
- IA;
- experiencia;
- afijos;
- persistencia;
- balance.

---

# 10. Hitos de beta recomendados

## Beta interna 0

Después de P1 + E0.

Objetivo: confirmar tecnología, no diseño.

## Beta visual 1

Después de P2 o P3.

Objetivo: mostrar dirección artística y cámara a un grupo muy pequeño.

## Beta funcional web

Después de P7.

Objetivo: obtener feedback sobre comprensión, presentación y diversión.

## Beta Electron

Después de E1.

Objetivo: probar la experiencia de escritorio y el comportamiento de guardados.

## Prueba privada Steam

Después de E2 y S1.

Objetivo: validar distribución, no lanzar comercialmente.

---

# 11. Criterios para detener la migración a Phaser

Phaser puede considerarse suficiente cuando:

- el mundo se renderiza correctamente;
- la cámara soporta mapas grandes;
- el combate se entiende visualmente;
- las habilidades poseen feedback;
- el resultado es atractivo para testers;
- los paneles HTML/CSS se integran bien;
- continuar migrando no mejora proporcionalmente la experiencia.

No es obligatorio migrar:

- inventario;
- equipamiento;
- maestrías;
- formularios;
- tablas;
- modales;
- pantallas densas.

La migración debe detenerse cuando el costo supera el beneficio.

---

# 12. Criterios para priorizar Electron antes de completar Phaser

Se puede adelantar Electron cuando:

- exista riesgo con rutas o persistencia;
- se necesite probar en otros equipos;
- la versión web ya sea suficientemente presentable;
- Phaser haya alcanzado P4, P5 o P6;
- se requiera validar pantalla completa o rendimiento;
- el usuario prefiera obtener un ejecutable antes de migrar más interfaces.

El orden del plan es recomendado, no rígido. Todo desvío debe documentarse.

---

# 13. Compatibilidad con contenido nuevo

El plan debe permitir agregar:

- enemigos;
- mapas;
- habilidades;
- armas;
- armaduras;
- objetos;
- afijos;
- encuentros;
- decoraciones.

Para lograrlo:

- Phaser debe recibir identificadores, rutas y estados;
- no debe reconocer contenido por nombre visible;
- no debe crear excepciones por enemigo o habilidad;
- los datos visuales deben ser configurables;
- un recurso nuevo no debe exigir editar el núcleo salvo que introduzca un comportamiento visual nuevo.

Ejemplo correcto:

```javascript
{
    id: "caballero_oseo",
    recursoVisual: "assets/enemigos/caballero_oseo.png",
    posicion: { x: 4, y: 7 },
    estadoVisual: "normal"
}
```

Ejemplo a evitar:

```javascript
if (enemigo.nombre === "Caballero Óseo") {
    // comportamiento particular
}
```

---

# 14. Validación general obligatoria

Cada etapa debe comprobar, según corresponda:

- inicio del juego;
- creación o carga de personaje;
- carga de datos;
- entrada a mapa;
- movimiento;
- espera;
- cámara;
- selección;
- combate;
- IA;
- daño;
- muerte;
- recompensa;
- botín;
- inventario;
- equipo;
- habilidades;
- cambio de mapa;
- guardado;
- carga;
- redimensionamiento;
- consola;
- versión web;
- versión Electron cuando corresponda.

No se debe considerar una etapa terminada solamente por:

- sintaxis;
- imports;
- carga de archivos;
- captura estática;
- ausencia de errores durante el inicio.

---

# 15. Gestión de riesgos

| Riesgo | Prevención |
|---|---|
| Reescribir lógica dentro de Phaser | Contrato neutral y comparación con renderizador anterior |
| Descubrir tarde problemas de Electron | E0 inmediatamente después de P1 |
| Perder versión web | Mantener GitHub Pages como destino activo |
| Mezclar estilos visuales | Aplicar el documento maestro de diseño |
| Animaciones que alteran turnos | Lógica canónica independiente de la animación |
| Rutas distintas en web y escritorio | Capa central de resolución de recursos |
| Dependencias descontroladas | Versiones exactas y aprobación previa |
| Migración interminable | Puntos de decisión P2, P4 y P7 |
| Incompatibilidad de guardados | Pruebas en E0 y política en E1 |
| Mapas grandes con bajo rendimiento | Medir antes de optimizar |
| Paneles menos usables en canvas | Mantener HTML/CSS salvo beneficio demostrado |
| Nuevo contenido exige código visual | Configuración genérica por identificadores y recursos |

---

# 16. Historial de decisiones

Registrar aquí los cambios importantes.

## Decisión D-001

Fecha: 30 de julio de 2026  
Estado: vigente

Se adopta una estrategia híbrida:

- Phaser para mundo y combate;
- HTML/CSS para interfaz densa;
- JavaScript actual para lógica;
- Electron para empaquetado;
- web para pruebas rápidas.

## Decisión D-002

Fecha: 30 de julio de 2026  
Estado: vigente

Se agrega E0 inmediatamente después de P1 para reducir el riesgo de descubrir tarde problemas de empaquetado.

## Decisión D-003

Fecha: 30 de julio de 2026  
Estado: vigente

La cámara deberá permitir mapas mayores que la pantalla, desplazamiento y zoom.

## Decisión D-004

Fecha: 30 de julio de 2026  
Estado: vigente

El teclado será el control principal. El ratón se utilizará para inspección, selección, modales, menús y cámara.

## Decisión D-005

Fecha: 30 de julio de 2026  
Estado: vigente

El estilo visual objetivo será fantasía medieval 2D ilustrada, estilizada y luminosa, con lectura táctica por casillas.

## Decisión D-006

Fecha: 30 de julio de 2026

Estado: vigente

P0 confirma que no se necesita una etapa P0A. La arquitectura actual ya posee separación suficiente para incorporar Phaser como backend visual progresivo.

## Decisión D-007

Fecha: 30 de julio de 2026

Estado: vigente

La casilla lógica se fija en 32 × 32. La resolución de los archivos gráficos podrá ser mayor y no determinará por sí sola el espacio lógico ocupado.

## Decisión D-008

Fecha: 30 de julio de 2026

Estado: vigente

Se adopta 1024 × 640 como resolución inicial de referencia para el área del mundo. No es un límite para el tamaño de los mapas, la ventana ni el modo de pantalla completa.

## Decisión D-009

Fecha: 30 de julio de 2026

Estado: vigente

Phaser utilizará cámara para mostrar mapas mayores que el panel. No deberá reducir todo el mapa para mantenerlo completamente visible.

## Decisión D-010

Fecha: 30 de julio de 2026

Estado: vigente

Durante la transición se utilizará el selector de URL `?render=canvas2d|phaser`. Canvas 2D será el valor predeterminado hasta que Phaser haya sido validado.

## Decisión D-011

Fecha: 30 de julio de 2026

Estado: vigente

Los paneles, menús y modales densos continuarán en HTML/CSS durante el hito actual. Podrá evaluarse una mejora o migración posterior al hito, pero no forma parte de la integración inicial.

## Decisión D-012

Fecha: 30 de julio de 2026

Estado: obligatoria

Phaser deberá consumir un estado neutral de presentación y producir comandos compartidos. No podrá convertirse en un segundo motor de movimiento, combate, IA, tiempo, muerte, experiencia, botín o persistencia.

## Decisión D-013

Fecha: 30 de julio de 2026

Estado: vigente

La copia descomprimida del ZIP completo con `.git` será la fuente principal de cada etapa. GitHub será una fuente complementaria de consulta y contraste.

## Decisión D-014

Fecha: 31 de julio de 2026

Estado: vigente

P1 adopta Phaser 4.2.1 con licencia MIT, `Phaser.AUTO`, `Phaser.Scale.FIT`,
resolución técnica inicial de 1024 × 640, casilla lógica de 32 × 32 y carga
local condicional mediante `?render=phaser`. Canvas 2D continúa siendo el modo
predeterminado.

## Decisión D-015

Fecha: 31 de julio de 2026

Estado: reemplazada por D-027

El bloqueo temporal del clic sobre Phaser se mantuvo hasta completar cámara, zoom y conversión de coordenadas. P4 reemplaza esta restricción mediante un adaptador de puntero que reutiliza el conversor único y emite comandos canónicos.

## Decisión D-016

Fecha: 31 de julio de 2026

Estado: vigente

P1 no se cerrará con una dependencia simulada, incompleta o sustituida por CDN.
Si el archivo oficial exacto no puede incorporarse o validarse offline, la etapa
se mantendrá pausada y no se avanzará a E0.

## Decisión D-017

Fecha: 31 de julio de 2026

Estado: vigente

Para conservar `Phaser.AUTO`, Phaser crea su propio canvas dentro de un host del
panel central. El canvas original de Dark Moon se mantiene para Canvas 2D y se
oculta únicamente durante el modo Phaser. Esta separación evita forzar WebGL o
Canvas manualmente y conserva un único backend activo.

## Decisión D-018

Fecha: 31 de julio de 2026

Estado: vigente

El backend Phaser observará el tamaño y la visibilidad de su contenedor. Cuando
la pantalla de partida pase de oculta a visible, actualizará los límites y
refrescará `Phaser.Scale.FIT`, con reintentos breves si el Scale Manager todavía
no terminó de inicializarse. Esto evita que WebGL conserve un canvas técnico de
2 × 2 píxeles hasta que el usuario redimensione la ventana.

## Decisión D-019

Fecha: 31 de julio de 2026

Estado: reemplazada parcialmente por D-023

El usuario confirmó el cierre de P1, incluida la validación manual y la corrección del ajuste inicial de resolución. El identificador del commit se conserva en la entrega correspondiente y se hereda mediante los prompts de etapa.

Debido a las limitaciones de conectividad, permisos de instalación y descarga
del equipo actual, E0 se pausa temporalmente y se autoriza analizar y proponer
P2 antes de realizar Electron. La secuencia temporal aprobada es:

```text
P1 → P2 → E0 → P3
```

P2 no deberá incorporar Node.js, npm, Electron ni nuevas dependencias. E0 no se
descarta ni se considera completada. La exigencia original de cerrarla antes de
P3 quedó reemplazada por D-023.

## Decisión D-020

Fecha: 31 de julio de 2026

Estado: vigente

P2 utiliza la Alcantarilla como corte vertical visual. Los recursos ambientales se ubican en `assets/imagenes/mundo/alcantarilla/` y se referencian desde la apariencia configurable del mapa. El compositor no utiliza el nombre visible del mapa como excepción.

## Decisión D-021

Fecha: 31 de julio de 2026

Estado: vigente

La entrada de Phaser durante P2 se limita a cámara, zoom, recentrado y lectura visual de casilla. Movimiento, espera, combate, habilidades e interacción continúan entrando por `ControladorTeclado` y `EjecutorAccionesJugador`.

## Decisión D-022

Fecha: 31 de julio de 2026

Estado: vigente

En ventanas de poca altura, solo el modo Phaser puede habilitar desplazamiento vertical de la pantalla para preservar un área de mapa legible. Canvas 2D conserva su comportamiento histórico.

## Decisión D-023

Fecha: 31 de julio de 2026

Estado: vigente

El usuario autoriza excepcionalmente implementar P3 mientras E0 continúa pausada por las limitaciones del equipo actual. Esta autorización reemplaza únicamente la obligación de cerrar E0 antes de P3. E0 no se descarta, no se considera cumplida y ninguna etapa posterior queda autorizada automáticamente por esta excepción.

## Decisión D-024

Fecha: 31 de julio de 2026

Estado: vigente

Los controles de cámara de P3 son `IJKL` para desplazamiento, `+` y `-` para zoom y `H` para recentrar y reactivar seguimiento. Se conservan rueda, arrastre derecho o central y doble clic izquierdo. Los controles se ignoran en campos editables, no mueven al personaje, no ejecutan acciones y no consumen turnos.

## Decisión D-025

Fecha: 31 de julio de 2026

Estado: vigente

La conversión pantalla, mundo y casilla se centraliza en `ConversorCoordenadasPhaser`. El compositor y el controlador de cámara reutilizan ese contrato. P3 no traduce clics o teclado Phaser a intenciones jugables; esa integración continúa reservada para P4.

## Decisión D-026

Fecha: 31 de julio de 2026

Estado: vigente

El usuario aprobó las pruebas manuales de P3. La etapa quedó cerrada funcional y documentalmente. El commit final se heredó mediante el prompt de P4 y no se incorpora como dato mutable del Documento Maestro. E0 continúa pausada.

---

## Decisión D-027

Fecha: 31 de julio de 2026

Estado: vigente

El puntero sobre Phaser pertenece a `ControladorEntradaJugablePhaser`, que convierte pantalla a casilla mediante `ConversorCoordenadasPhaser` y emite `SELECCIONAR_CASILLA`. `EjecutorAccionesJugador` deriva el comando al selector activo con prioridad habilidad, interacción y combate. Phaser no valida alcance, objetivos ni reglas. `F` y `R` continúan confirmando desde el teclado canónico.

## Decisión D-028

Fecha: 31 de julio de 2026

Estado: vigente

El Documento Maestro no mantendrá una tabla histórica de estados ni identificadores de commits por etapa. Las etapas cerradas se documentan mediante su resultado consolidado y sus entregas. Solo la etapa operativa actual indica si está cerrada o no; su SHA final se transmite en el prompt de la etapa siguiente.


## Decisión D-029

Fecha: 1 de agosto de 2026

Estado: vigente

P5 se divide operativamente en P5.1 y P5.2. P5.2 adopta tiles ilustrados de 128 × 128 generados específicamente para Dark Moon a partir de la dirección visual aprobada. Cada bioma conserva una familia propia de suelos y topologías de muro; la Ciudad Inicial diferencia adoquín, césped, madera y tierra. Phaser reduce estos recursos a la casilla lógica de 32 × 32. Los PNG no modifican caminabilidad, conectividad, generación, ocupación ni resultados canónicos.

La cuadrícula y la decoración vectorial se reducen cuando la textura ya aporta detalle para conservar lectura táctica. No se agrega una dependencia ni un atlas propietario externo.

---

## Decisión D-030

Fecha: 1 de agosto de 2026

Estado: vigente

Las paredes de P5.2 incorporan altura visual 2.5D utilizando la referencia gráfica aprobada por el usuario. Cada bioma declara dos recursos de fachada y parámetros de altura, solape, lateral y sombra dentro de la configuración visual Phaser.

La fachada solo se representa cuando la cara correspondiente está expuesta. La topología lógica del muro, su casilla, la caminabilidad, la generación y las reglas canónicas permanecen sin cambios. Los selectores, zonas y entidades continúan por encima de los frentes para no perder lectura táctica.

No se incorpora 3D real, perspectiva isométrica, físicas, un segundo mapa ni una lógica de ocultamiento autoritativa.

---

# 17. Etapa operativa actual

## P5 — Mundo jugable y mapas grandes

Estado: **P5.2 implementada; validación manual pendiente**.

P5.1 agregó el contrato visual genérico por símbolo y P5.2 incorporó tiles detallados y paredes con altura 2.5D para Alcantarilla, Cementerio, Casa del Guerrero, Fortaleza abandonada, Sala de guerra y Ciudad Inicial. Los mapas conservan sus matrices, generación, conectividad, reglas y resultados canónicos.

Próxima acción:

1. ejecutar la validación manual indicada en `docs/phaser/entregas/AVANCE_P5_2.md`;
2. revisar especialmente Ciudad Inicial, mapa máximo, transición repetida y recursos ausentes;
3. corregir cualquier incidencia visual o funcional real;
4. crear `docs/phaser/entregas/ENTREGA_P5.md` y cerrar P5 solamente después de la aprobación del usuario.

E0 continúa pausada y no se considera completada.
