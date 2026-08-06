# PLAN MAESTRO — INTEGRACIÓN PROGRESIVA DE PHASER, BETA Y ELECTRON

Proyecto: Dark Moon
Repositorio: https://github.com/Lordtias/Dark-Moon.git
Rama principal: main
Versión del documento: 1.7
Fecha inicial: 30 de julio de 2026
Última actualización: 31 de julio de 2026
Etapa operativa actual: P4 — Entrada e intenciones jugables desde Phaser

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

> Fantasía medieval 2D ilustrada, estilizada y luminosa, con vista cenital ortográfica y lectura táctica clara por casillas.

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

La Alcantarilla sigue siendo el mapa de referencia para validar el lenguaje visual de Phaser. Su apariencia se declara en `src/config/mapas/mapas.json` y sus imágenes ambientales se ubican en `assets/imagenes/mundo/alcantarilla/`.

P5.1 reemplaza la clasificación puntual de muros por un análisis genérico de ocho vecinos reutilizable. El sistema describe lados expuestos, esquinas exteriores, esquinas interiores y sombra de contacto sobre el piso sin modificar la matriz lógica del mapa. El material visible del borde queda a cargo de la configuración del bioma; no debe existir una segunda implementación específica por mapa.

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

Renderizar los mapas reales y permitir recorrerlos mediante Phaser, comenzando por un sistema reutilizable de autotiling cenital para paredes y piso.

### Alcance mínimo

- sistema genérico de autotiling de paredes reutilizable por bioma;
- análisis de ocho vecinos;
- identificación de lados expuestos, esquinas exteriores e interiores;
- sombra de contacto opcional sobre el piso;
- validación inicial en Alcantarilla;
- posterior ampliación al resto de mapas, personajes, props e interactuables;
- límites;
- cámara;
- mapas mayores que el área visible;
- selección de casillas;
- casillas válidas e inválidas;
- optimización solo si se mide una necesidad real.

### División aprobada

#### P5.1 — Alcantarilla cenital base

- validar únicamente piso y paredes de Alcantarilla;
- analizar ocho vecinos mediante una función genérica y reutilizable;
- representar el interior del muro como una masa continua;
- aplicar bordes únicamente en los lados que limitan con piso real;
- obtener material, grosor y apariencia del borde desde el bioma;
- aplicar una sombra de contacto opcional sobre el piso;
- conservar temporalmente personajes, enemigos y props heredados.

P5.1 no cierra P5 completa. Su resultado debe aprobar primero el lenguaje visual y el contrato técnico antes de extender recursos a otros mapas.

#### P5.2 — Soporte técnico para entidades cenitales

- mantener `recursoVisual` como única ruta de imagen transportada por las entidades;
- no agregar `aparienciaVisual` ni otras decisiones de Phaser a `Player`, `Enemigo`, `Barril` o `BotinSuelo`;
- centralizar perspectiva, tamaño, anclaje y sombra en `ConfiguracionEntidadesPhaser`;
- ampliar `GestorRecursosPhaser` para calcular el centro vertical visible de cada PNG;
- centrar todas las entidades Phaser según el contenido alfa del recurso;
- conservar la relación de aspecto dentro de la casilla lógica de 32 × 32;
- calcular sombras centradas desde el tamaño visible;
- omitir la creación o sustitución de PNG de entidades durante esta subetapa.

P5.2 prepara el contrato técnico para recibir los assets cenitales definitivos. Los recursos heredados pueden verse transitoriamente distintos porque Phaser ya aplica la colocación cenital global, pero la lógica jugable y Canvas 2D permanecen sin cambios.

#### P5.3 — Expansión ambiental a todos los mapas

- incorporar soporte Phaser para múltiples símbolos de terreno dentro de un mismo mapa;
- configurar ciudad, mapas normales y mapas especiales mediante el mismo autotiling reusable;
- agregar recursos ambientales propios para cada bioma: pisos, masas de pared, bordes, esquinas internas y sombras de contacto;
- validar terreno, transiciones, cámara, selección, guardado y regresión Canvas 2D;
- dejar los PNG cenitales definitivos de entidades para el commit posterior `P5.3Especial`.

#### P5.4 — Validación integral y cierre técnico de P5

Estado: **completada técnicamente**.

- auditar los PNG cenitales definitivos de Guerrero, Rogue y Mago incorporados en `P5.3Especial`;
- comprobar dimensiones, transparencia, centro visible, tamaño, sombra y lectura táctica de los tres jugadores;
- verificar que todas las rutas activas de entidades existan y separar claramente arte definitivo de arte provisional;
- validar mediante pruebas estáticas y composición simulada ciudad, mapas normales, mapas especiales, terrenos, entidades, selección y regresión Canvas 2D;
- cerrar P5 sin cambiar resultados canónicos y sin introducir propiedades visuales en el dominio.

Los enemigos, destructibles, botín, portales y NPC conservan temporalmente sus PNG anteriores. Esta deuda es artística y no arquitectónica: pueden reemplazarse por las mismas rutas sin modificar la lógica del juego ni el contrato Phaser.

### No incluye

- cambio de generación procedural;
- cambio de conectividad;
- cambio de IA;
- cambio de reglas de ocupación;
- ampliación obligatoria del contenido;
- migración automática de todos los biomas antes de aprobar Alcantarilla.

### Criterio de cierre de P5.1

Alcantarilla muestra piso y paredes cenitales continuas, bordes correctos según vecindad, esquinas internas y sombra de contacto; cámara, zoom, selección, movimiento, transiciones, guardado y Canvas 2D continúan funcionando sin cambios canónicos.

### Criterio de cierre de P5.2

Phaser centra entidades por el centro visible del PNG, conserva su relación de aspecto, calcula sombras cenitales y mantiene `recursoVisual` como único dato visual del dominio. No se modifican clases jugables, persistencia ni Canvas 2D. Los PNG definitivos quedan pendientes para `P5.3Especial` y su revisión global para P5.4.

### Criterio de cierre de P5.3

Todos los mapas existentes cuentan con configuración ambiental Phaser, la ciudad puede resolver varios suelos por símbolo de casilla y cada bioma dispone de su propio piso, masa de pared, borde y sombra de contacto sin alterar generación, conectividad ni reglas canónicas.

### Criterio de cierre de P5 completa

Todos los mapas existentes disponen de representación ambiental Phaser sin cambiar sus resultados canónicos; el renderizador centra, escala y sombrea cualquier entidad mediante `recursoVisual`; los tres jugadores definitivos están validados; y los recursos provisionales restantes quedan identificados para sustitución directa sin deuda arquitectónica. Con este criterio P5 queda cerrada técnicamente y el proyecto puede avanzar a P6.

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

### División aprobada de P6

P6 se cierra mediante subetapas independientes, cada una con validación, documento de entrega y commit propio:

1. `P6.1` — contrato visual, movimiento interpolado y secuenciación enemiga;
2. `P6.2` — combate físico, proyectiles y feedback de impacto;
3. `P6.3` — habilidades, estados y zonas;
4. `P6.4` — muerte, botín, regresión y cierre general. P6.4 debe hacer aparecer visualmente el botín inmediatamente después de la desaparición del derrotado, no al terminar toda la ronda.

Una subetapa puede dividirse nuevamente cuando el ajuste visual lo requiera. No se avanza a la siguiente hasta confirmar el commit de la anterior.

### P6.1 — Contrato visual, movimiento y secuenciación enemiga

Estado: cerrada, validada manualmente y publicada en `687ef42d363c308063ef5ab5f0d0b3ae8f425211`.

P6.1 incorpora:

- eventos estructurados para movimiento y ataque ya resueltos;
- identidad visual estable y exclusivamente en memoria para cada entidad;
- conversión de referencias del dominio a un plan visual neutral;
- cola Phaser ordenada que nunca modifica el estado jugable;
- interpolación de jugador y enemigos entre casillas;
- aceleración progresiva de recorridos consecutivos del jugador;
- desplazamiento conjunto de sprite y sombra;
- seguimiento de cámara durante el movimiento interpolado del jugador;
- señal y pausa separadas para cada ataque enemigo;
- reacción genérica de impacto sobre jugador y enemigos cuando existe daño real;
- retiro del aura luminosa fija alrededor del jugador;
- velocidades `normal`, `rapida` y `muy-rapida`;
- aceleración automática de colas extensas;
- efectos reducidos;
- cancelación segura al cambiar de mapa o destruir la escena;
- Canvas 2D conservado como representación inmediata del estado final.

La señal ofensiva de P6.1 no es todavía la animación final del ataque. La reacción genérica de daño solo confirma visualmente que una entidad fue alcanzada. P6.2 deberá agregar preparación, desplazamiento corporal, proyectil, evasión, bloqueo, crítico, variantes de impacto y números sin cambiar este contrato.

Los paneles HTML continúan actualizando el estado final inmediatamente. La sincronización expresiva de Vida, daño y muerte con cada impacto pertenece a P6.2 y P6.4; el dominio ya queda resuelto y no espera a la cola visual.

### Criterio de cierre de P6.1

Los movimientos del jugador y los enemigos se reproducen en orden sobre identidades visuales estables; los recorridos largos recuperan ritmo sin omitir casillas; varios ataques enemigos se distinguen mediante una secuencia visual; jugador y enemigos reaccionan ante daño real; cancelar la cola no deja esperas pendientes; el resultado canónico, el sistema temporal, la persistencia, Canvas 2D y Phaser 4.2.1 permanecen sin reglas duplicadas.

### P6.2 — Combate físico, proyectiles y feedback de impacto

P6.2 se divide en cierres independientes con commit propio:

1. `P6.2A` — resultados visuales del combate;
2. `P6.2B.1` — contrato temporal final y perfiles por familia;
3. `P6.2B.2` — animaciones cuerpo a cuerpo por familia;
4. `P6.2C.1` — motor de proyectiles, arcos y lanza con recurso visual;
5. `P6.2C.2` — varitas elementales y doble varita;
6. `P6.2D` — consumibles, recuperación visual y cierre de P6.2.

#### P6.2A — Resultados visuales del combate

Estado: cerrada, validada manualmente y publicada en `cc88ed0b5c347e10cd665dcebefe6fb667cf54cb`.

P6.2A amplía el evento `ataque_resuelto` sin modificar `SistemaCombate`:

- copia el tipo, patrón, alcance, munición y fuentes del ataque antes de ejecutarlo;
- conserva daño, fallo, bloqueo y crítico por cada golpe realmente realizado;
- reconstruye la Vida anterior y posterior de cada golpe usando el daño canónico aplicado y la Vida final del objetivo;
- muestra un número independiente por golpe, sin duplicarlo con un total adicional;
- representa el fallo mediante desplazamiento lateral y texto `FALLO`;
- representa el bloqueo mediante señal de escudo y texto `BLOQUEO`;
- representa el crítico mediante marca y texto `CRÍTICO`;
- actualiza progresivamente la barra de Vida de enemigos durante la secuencia;
- conserva el pulso ofensivo provisional de P6.1 hasta P6.2B y P6.2C;
- no inventa objetivo, fallo ni daño cuando se ataca una casilla vacía.

Los paneles HTML continúan mostrando inmediatamente el estado canónico final. P6.2A sincroniza exclusivamente el feedback dentro del mapa Phaser. La coordinación completa del panel del jugador con muerte y derrota permanece en P6.4.

### Criterio de cierre de P6.2A

Daño, fallo, bloqueo y crítico son distinguibles para ataques del jugador y enemigos; los golpes duales se muestran individualmente y solamente cuando ocurrieron; la barra de Vida enemiga desciende golpe por golpe; los ataques a casillas vacías no generan feedback falso; el sistema canónico, la agenda temporal, persistencia, Canvas 2D y Phaser 4.2.1 permanecen sin cambios de reglas.

#### P6.2B.1 — Contrato temporal final y perfiles por familia

Estado: cerrada, validada manualmente y publicada en `d4a3b4f9e38b0f68da7c0b74ecd4a0f88c29b158`.

P6.2B.1 establece la infraestructura canónica que utilizarán todas las animaciones de ataque:

- `SistemaTiempo` continúa siendo el único sistema que calcula `costoFinal`;
- `CoordinadorTiempoPartida` conserva el resultado exacto de `registrarAccion()` y lo asocia con los eventos pertenecientes al actor;
- jugador y enemigos utilizan el mismo flujo, incluso cuando un enemigo equipa una o dos armas;
- `ataque_resuelto` copia `familiaObjeto` por fuente y distingue el fallback `ataque_natural`;
- `PlanificadorRitmoVisual` convierte una sola vez `costoFinal` en duración visual total;
- las fases se distribuyen mediante proporciones configurables que siempre suman uno;
- `PerfilesAtaquePorFamilia.json` une las familias de `Armas.json` con forma, tamaño, sentido, avance visual y futuros identificadores de sonido;
- las familias no incluyen multiplicadores de velocidad ni ecuaciones temporales;
- el arranque valida que todas las familias de armas tengan un perfil y que no existan perfiles desconectados;
- el mismo catálogo ya contiene las secuencias `simple`, `dual`, `estocada` y `proyectil`;
- las animaciones definitivas no cambian todavía y quedan para P6.2B.2 y P6.2C.

### Criterio de cierre de P6.2B.1

Cada ataque del jugador o enemigo conserva el `costoFinal` realmente registrado; el plan visual obtiene una duración y fases coherentes sin recalcular factores; todas las familias de `Armas.json` están conectadas con un perfil; ataque natural y familia desconocida disponen de fallback; no cambian combate, agenda, persistencia, Canvas 2D ni Phaser 4.2.1.

#### P6.2B.2 — Animaciones cuerpo a cuerpo por familia

Estado: cerrada, validada manualmente y publicada en `9979c9fe30710bfcbcb055f277b237533de9c701`.

P6.2B.2 consume el ritmo y los perfiles de P6.2B.1:

- reemplaza el pulso provisional por preparación, avance, efecto ofensivo y retorno;
- daga usa corte corto; espada, corte medio; hacha, corte medio inverso; mandoble, corte amplio; bastón, estrella contundente grande con centro grueso; lanza, estocada lineal;
- ataque natural utiliza un fallback genérico sin condiciones por nombre de enemigo;
- doble arma conserva la familia de cada mano y utiliza la pausa de la secuencia dual;
- sprite y sombra se animan juntos y vuelven a la casilla canónica;
- los resultados de P6.2A conservan daño y palabras, pero un crítico intensifica el efecto propio del arma sin agregar una estrella independiente;
- `hostilidad_cambiada` ordena la aparición o retirada del indicador antes de movimiento o espera;
- provocar a un enemigo con un ataque conserva el orden ataque, resultado y cambio de hostilidad;
- el indicador de agresión se reduce y deja de obstruir la barra de Vida;
- una entidad derrotada se retira visualmente después de su acción y antes de continuar con otros combatientes;
- el daño periódico conserva Vida anterior y posterior para actualizar barra y derrota sin recalcular el efecto;
- la aparición inmediata y animada del botín queda reservada para P6.4.

### Criterio de cierre de P6.2B.2

Cada familia cuerpo a cuerpo tiene una lectura reconocible; las fases respetan el `costoFinal`; doble arma conserva orden y familias; el crítico refuerza el efecto propio sin símbolo duplicado; el indicador de agresión aparece o desaparece en el momento correcto; una derrota directa o periódica se refleja antes de la acción siguiente; cancelar una cola restaura posiciones; no cambian combate, IA decisoria, tiempo, persistencia, Canvas 2D ni Phaser 4.2.1.

#### P6.2C.1 — Motor de proyectiles, arcos y lanza con recurso visual

Estado: cerrada, validada manualmente y publicada en `1a3c4f4aa9585e32d5b0d3448af569d746f05a88`.

P6.2C.1 extiende el contrato visual sin transferir reglas del dominio a Phaser:

- el consumo de munición conserva una descripción inmutable de la pila exacta utilizada con `idObjeto`, `tipoMunicion` y `recursoVisual`;
- `SistemaCombate`, `EventosAccion` y el plan visual transportan esa descripción sin volver a buscar la munición;
- Phaser utiliza directamente la ruta recibida y no consulta `Municiones.json`;
- todas las municiones con una imagen propia pueden representarse sin condiciones por ID;
- la secuencia `proyectil` distribuye la duración total en preparación 40 %, lanzamiento 15 %, trayectoria 25 % y retorno 20 %;
- el arco utiliza el PNG horizontal de la flecha consumida, lo rota hacia la casilla objetivo y representa impacto, fallo, bloqueo, crítico o casilla vacía según el resultado ya resuelto;
- el crítico intensifica la propia flecha y su impacto sin agregar una marca independiente;
- cada fuente de arma conserva también `idObjeto` y `recursoVisual`;
- la lanza y la lanza reforzada utilizan el PNG exacto del arma equipada;
- la imagen de lanza conserva un largo visual de dos casillas y el combatiente no avanza: a alcance uno se centra sobre el atacante y a alcance dos sobre la casilla intermedia;
- `CreadorRecursosVisualesPhaser` resuelve sprites temporales desde recursos y queda preparado para reutilizarse con armas o equipamiento visible futuro, sin implementarlo todavía;
- el selector automático prioriza enemigos atacables y solo selecciona destructibles cuando no existe ninguno dentro de las reglas del ataque;
- Canvas 2D conserva la representación inmediata y no incorpora estas animaciones.

### Criterio de cierre de P6.2C.1

La imagen del proyectil coincide con la munición realmente consumida; flechas cardinales y diagonales nacen en el atacante y llegan a la casilla seleccionada; fallo, crítico, bloqueo, casilla vacía y muerte conservan el resultado canónico; la lanza exacta se muestra sin adelantar al combatiente y con origen visual coherente para alcance uno y dos; enemigos equipados reutilizan el mismo flujo; el selector no elige destructibles mientras exista un enemigo atacable; cancelación, cambio de mapa, tiempo, combate, persistencia, Canvas 2D y Phaser 4.2.1 permanecen sin reglas duplicadas.

#### P6.2C.2 — Varitas elementales y doble varita

Estado: cerrada, validada manualmente y publicada en `6a660e3d59af0bd22ee6073cabf56af1442d404c`.

P6.2C.2 consume los elementos y resultados por fuente que ya transporta el ataque canónico:

- fuego utiliza un orbe irregular con cola breve de brasas;
- frío utiliza un fragmento angular con estela lineal;
- en el cierre original de P6.2C.2, rayo utilizaba una descarga fina en zig-zag; el ajuste aprobado de P6.3A trasladó esa descarga a Chispa y dejó para la varita una chispa compacta ramificada con estela nerviosa e impacto cruzado;
- veneno utiliza una gota tóxica alargada con salpicadura viscosa;
- una varita conserva la secuencia `proyectil` de P6.2C.1;
- dos varitas utilizan `proyectil_dual` con preparación compartida, disparo principal, pausa, disparo secundario y retorno;
- la duración total continúa derivando del único `costoFinal` canónico;
- cada mano conserva elemento, impacto, fallo, bloqueo, crítico, daño y Vida posterior;
- una casilla vacía reproduce ambas fuentes sin inventar resultados;
- si el primer golpe destruye al objetivo, el segundo proyectil no se reproduce;
- el crítico intensifica la forma elemental propia y conserva texto y daño sin símbolo independiente;
- `CreadorProyectilesElementalesPhaser` solo interpreta perfiles visuales y no conoce Maná, daño, resistencias, inventario ni habilidades;
- las habilidades, áreas y estados elementales completos permanecen reservados para P6.3.

### Criterio de cierre de P6.2C.2

Los cuatro elementos se distinguen por forma y color; varita simple y doble varita respetan el orden real de fuentes y resultados; combinaciones de elementos diferentes se leen por separado; casilla vacía reproduce las fuentes configuradas sin feedback falso; muerte con el primer golpe no genera un segundo disparo; fallo, bloqueo y crítico conservan el resultado canónico; arco, lanza, cuerpo a cuerpo, Maná, combate, tiempo, persistencia, Canvas 2D y Phaser 4.2.1 permanecen sin reglas duplicadas.

#### P6.2D — Consumibles, recuperación y cierre de P6.2

Estado: cerrada, validada manualmente y publicada en `046a1d5391800ea827bdc71613eed5776d6f4dab`.

P6.2D incorpora `recursos_recuperados` para recuperaciones explícitas. El dominio conserva el objeto exacto, recurso, cantidad aplicada y valores anterior, posterior y máximo. La ejecución de consumo recibe el `costoFinal` canónico calculado con `factorTiempo` y `factorConsumo`; Phaser distribuye esa duración en preparación 20 %, uso 20 %, recuperación 45 % y retorno 15 %.

- Vida utiliza rojo dominante y texto `+N VIDA`;
- Maná utiliza azul-violeta y texto `+N MANÁ`;
- el PNG exacto del consumible se muestra mediante `CreadorRecursosVisualesPhaser`;
- se incorpora `pocion_mana` con recuperación provisional de 10 y stock fijo en Edran;
- una recuperación explícita futura de un enemigo podrá elevar su barra inmediatamente;
- la regeneración pasiva no genera eventos visuales;
- `nivel_aumentado` se conserva desde la derrota hasta presentación y produce un aura blanca tipo energía/ki sin consumir tiempo; solo su entrada breve bloquea la cola, mientras permanencia y salida continúan en paralelo;
- Lythra y las recuperaciones mágicas quedan reservadas para P6.3;
- los efectos persistentes de habilidades y estados deberán representarse durante toda su duración en P6.3.

### Criterio de cierre de P6.2D

Las pociones muestran el recurso y la cantidad realmente recuperados; no se consumen cuando no producen efecto; la imagen del consumible deriva del `costoFinal`, mientras texto, partículas y aura usan una duración fija y legible; Vida y Maná se distinguen; el icono corresponde al objeto real; la poción de Maná se compra y consume; `nivel_aumentado` llega a Phaser y se representa una sola vez mediante un aura blanca tipo energía/ki no bloqueante después de su entrada; regeneración pasiva y Lythra no reciben efectos incorrectos; cuerpo a cuerpo, arcos, lanzas, varitas, tiempo, persistencia, Canvas 2D y Phaser 4.2.1 permanecen sin reglas duplicadas.

### P6.3 — Habilidades, estados y zonas

P6.3 se divide en entregas independientes:

1. `P6.3A` — contratos universales y habilidades básicas;
2. `P6.3B.1` — contratos y representación persistente de estados temporales;
3. `P6.3B.2` — renovaciones, intensificación, acumulación, ticks y coexistencia avanzada;
4. `P6.3C.1A` — habilidades intermedias de área;
5. `P6.3C.1B` — Cadena de rayos;
6. `P6.3C.2` — Nube tóxica y ciclo visual de zonas temporales;
7. `P6.3D` — habilidades avanzadas;
8. `P6.3E` — habilidades canónicas de NPC para Lythra;
9. `P6.3F` — regresión, documentación y cierre general de P6.3;


#### P6.3A — Contratos universales y habilidades básicas

Estado: cerrada, validada manualmente y publicada en `113130c8b0d6cc1d4e79a07709d7e814ab25d87d`.

P6.3A incorpora `habilidad_resuelta` como contrato neutral para ejecutores de tipo jugador, enemigo o NPC. La implementación inicial conecta únicamente las cuatro habilidades básicas del jugador; no agrega IA ni contenido enemigo o de NPC.

- el evento conserva origen, habilidad, maestría, grado, selección, casillas, recorrido, impactos, Vida anterior y posterior, cambios de recursos del ejecutor y de cada objetivo, efectos, zona y ejecución temporal;
- `MotorDanioHabilidad` conserva los valores exactos de Vida alrededor de cada impacto;
- los eventos canónicos producidos por efectos dejan de perderse antes de la cola visual;
- `PerfilesHabilidadesVisuales.json` conecta y valida las doce habilidades reales sin incluir velocidad jugable;
- Ascua, Esquirla de hielo, Chispa y Aguijón tóxico se diferencian por forma, textura, movimiento, estela, impacto, ritmo y color;
- Chispa usa una descarga completa anclada en zig-zag; la varita eléctrica usa una chispa compacta ramificada con estela nerviosa e impacto cruzado;
- el intercambio de ambos efectos es únicamente de presentación y elimina la bifurcación especial antigua de la varita;
- la selección táctica conserva la maestría y se distingue elementalmente en Canvas 2D y Phaser;
- la duración total parte del `costoFinal` ya registrado por `SistemaTiempo`;
- cancelación y cambio de mapa eliminan recursos transitorios;
- las habilidades intermedias y avanzadas ya pueden emitir el contrato, pero su reproducción especializada queda para las siguientes entregas.

Los contratos aceptan futuras habilidades de enemigos y NPC. La IA enemiga continuará pendiente de hitos posteriores. Lythra deberá usar habilidades canónicas de NPC no aprendibles por el jugador, con presentación mágica propia y sin reutilizar la animación de beber.

### Criterio de cierre de P6.3A

Las cuatro habilidades básicas se reproducen en orden y se distinguen sin depender solamente del color; daño, fallo, crítico, Vida y derrota coinciden con los resultados canónicos; el ritmo visual deriva del `costoFinal`; los eventos de efectos no se pierden; jugador, enemigo y NPC comparten contrato; cancelación y cambio de mapa no dejan residuos; Canvas 2D, Maná, progresión, tiempo, persistencia y Phaser 4.2.1 permanecen sin reglas duplicadas.

#### P6.3B.1 — Contratos y representación persistente

Estado: cerrada, validada manualmente y publicada en `0c61b97269509d8be8ac35c2e5af78c3a84800ba`.

- `PerfilesEstadosTemporalesVisuales.json` conecta exactamente los seis efectos canónicos y define forma, canal espacial, textura, movimiento y colores sin incluir duración jugable;
- cada entidad neutral transporta sus efectos activos con ID de instancia, catálogo, intensidad, cantidad, máximos y tiempos canónicos;
- Phaser adjunta los estados persistentes al contenedor del actor, por lo que siguen su movimiento y se destruyen con la entidad;
- Canvas 2D muestra marcas estáticas simples para conservar compatibilidad funcional;
- aplicación, actualización, resistencia, inmunidad, duplicado, vencimiento y retirada se convierten en eventos visuales neutrales;
- la cancelación de la cola reconcilia los estados contra la escena autoritativa anterior y la aplicación de la escena final reconstruye el estado real;
- muerte y cambio de mapa no necesitan inventar eventos de retirada para cada estado, porque destruir o reconstruir la entidad elimina representaciones huérfanas;
- ninguna resistencia, inmunidad, duración, intensidad, acumulación, factor temporal o daño periódico se calcula dentro de Phaser.
- la aplicación muestra el nombre del estado; renovación agrega `RENOVADO` e intensificación o acumulación muestran `×N`;
- Esquirla de hielo usa Ralentización 1.40–1.55 y Nova de escarcha 1.60–1.70;
- el movimiento visual aplica el factor neutral `costoFinal / costoBase`, sin recalcular la Ralentización en Phaser;
- el posible rediseño de Congelamiento como inmovilización con invulnerabilidad se reserva para Prisión glacial y las habilidades avanzadas.

#### P6.3B.2 — Ciclos visuales, intensidad y coexistencia

Estado: validada manualmente y cerrada en `ec5933cd5090042f1be6511cbd5ad12ac5a65be3`.

- `efecto_tick` se transporta como evento visual neutral antes de `danio_periodico`;
- Veneno utiliza un pulso de burbujas y Quemadura una llamarada ascendente, sin recalcular daño ni intervalos;
- renovación, intensificación y acumulación actualizan la misma instancia persistente y agregan un pulso transitorio;
- intensidad y cantidad aumentan densidad hasta un máximo visual de tres niveles y muestran `×N`;
- Canvas 2D conserva pulsos y multiplicadores equivalentes;
- los seis canales espaciales se compactan cuando coexisten muchos estados, sin ocultar el sprite;
- cancelación, muerte y cambio de mapa continúan reconciliándose contra la escena autoritativa.

### Criterio de cierre de P6.3B.2

Ticks temáticos preceden al daño canónico; renovar no duplica ni parpadea la instancia; intensidad o cantidad se leen mediante densidad y `×N`; varios estados coexisten; muerte, mapa y cancelación no dejan objetos huérfanos; Canvas 2D y Phaser no contienen reglas de daño, duración o acumulación.

#### P6.3C.1A — Habilidades intermedias de área

Estado: implementación y validaciones técnicas completadas; validación visual manual y commit pendientes.

- `habilidad_resuelta` agrega `idEjecucion` para correlacionar eventos derivados y conserva el objetivo primario solamente cuando la selección contiene una entidad;
- `ResolucionEspacialHabilidades` centraliza políticas de obstáculos y reutiliza la línea de visión canónica de combate;
- las formas de radio usan `vision_desde_centro`, de modo que paredes y esquinas recortan vista previa, objetivos, daño y casillas visuales con una única resolución;
- `PatronesVisualesHabilidades` centraliza los patrones de presentación reutilizables sin contener geometría jugable;
- los eventos de estados temporales producidos por Explosión ígnea o Nova de escarcha se adjuntan al impacto correcto y no se reproducen dos veces;
- Phaser incorpora la secuencia `area_conjurada` con preparación, manifestación, expansión por anillos, impacto y retorno;
- cada casilla canónica recibe fuego o fractura de hielo aunque no contenga una entidad;
- Explosión ígnea siempre crea el núcleo en la casilla seleccionada; el impacto grande solo se usa si existe un objetivo primario real;
- Nova de escarcha nace en el jugador y sincroniza daño y Ralentización por objetivo;
- Canvas 2D continúa como respaldo funcional sin reglas nuevas.

### Criterio de cierre de P6.3C.1A

Explosión ígnea y Nova de escarcha se reproducen por anillos y muestran un efecto temático en cada casilla canónica, esté vacía u ocupada; las paredes recortan la vista previa y el daño mediante la resolución espacial compartida; el centro visual coincide con la selección o el actor según el patrón; solamente una entidad seleccionada explícitamente recibe énfasis primario; daño, crítico, fallo, derrota y estados aparecen sobre el objetivo correcto; cancelar la cola no deja restos; Canvas 2D y Phaser no recalculan geometría, colisiones, daño ni duración.

### Criterio de cierre de P6.3B.1

Los seis estados se reconstruyen desde la escena, siguen a la entidad, responden a aplicación y retirada, muestran resistencia e inmunidad sin crear persistencia, desaparecen con muerte o mapa, se restauran correctamente tras cancelar una cola y no modifican ninguna regla canónica.

### Criterio de cierre de P6 completa

Estado: en progreso. P6.1, P6.2, P6.3A, P6.3B.1 y P6.3B.2 están cerradas; P6.3C.1A queda implementada con validaciones técnicas completas y la validación manual pendiente; las etapas posteriores permanecen pendientes.

El cierre general requiere completar habilidades, estados, zonas, muerte, aparición inmediata de botín y regresión final sin trasladar reglas canónicas a Phaser.

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

---

# 17. Etapa operativa actual

## P4 — Entrada e intenciones jugables desde Phaser

Estado: **En validación manual**.

La implementación permite seleccionar casillas con clic en combate, interacción y habilidades, conserva la confirmación mediante `F` o `R`, evita la doble captura DOM/Phaser y mantiene Canvas 2D sin cambios de reglas.

Próxima acción:

1. realizar la validación manual indicada en `docs/phaser/entregas/ENTREGA_P4.md`;
2. corregir cualquier incidencia real encontrada;
3. marcar P4 como cerrada solamente después de esa aprobación;
4. transmitir el SHA final mediante el prompt de la siguiente etapa, sin editar este documento para agregarlo.

E0 continúa pausada y no se considera completada.
