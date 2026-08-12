# Dark Moon — Documento funcional y guía del código

Este es el único documento funcional del repositorio. Su objetivo es permitir que una persona pueda comprender la estructura actual de Dark Moon, encontrar cada sistema y realizar cambios sin tener que reconstruir el historial de desarrollo.

Este documento describe el estado funcional actual del repositorio. Cuando el comportamiento o la estructura cambien, debe actualizarse en el mismo cambio. El código y las configuraciones JSON son siempre la fuente de verdad final.

---

## 1. Qué es Dark Moon

Dark Moon es un RPG roguelike ejecutado en el navegador mediante HTML, CSS y módulos JavaScript nativos.

Candidato beta web actual: `0.7.0-beta.2`.

La versión actual incluye:

- creación de Guerrero, Rogue y Mago;
- ciudad inicial;
- selección y generación de mazmorras;
- movimiento en ocho direcciones;
- sistema temporal por acciones;
- combate físico y elemental;
- enemigos normales, variantes, encuentros especiales y jefe;
- inventario, equipamiento, munición y consumibles;
- rarezas y afijos;
- botín y contenedores;
- comerciantes y curandera;
- progresión general, experiencia, niveles y oro;
- cuatro maestrías mágicas;
- doce habilidades jugables;
- efectos temporales, resistencias e inmunidades;
- zonas temporales persistentes dentro del mapa activo;
- interfaz HTML con Phaser 4.2.1 como único renderizador gráfico canónico;
- persistencia durable del jugador y de la barra de habilidades;
- depurador accesible desde la consola;
- balanceador independiente en `balance.html`.

No se utiliza un empaquetador, servidor de aplicación ni framework de interfaz. Phaser 4.2.1 es el único renderizador gráfico mantenido por Dark Moon. Phaser puede elegir internamente WebGL o Canvas mediante `Phaser.AUTO`, pero la aplicación ya no mantiene un segundo renderizador propio.

---

## 2. Cómo ejecutar el proyecto

Los archivos JSON y los módulos JavaScript se cargan mediante `fetch` e imports ES. Por esa razón el proyecto debe abrirse mediante un servidor HTTP y no directamente con `file://`.

Con Python instalado:

```bash
python3 -m http.server 8000
```

En Windows también puede funcionar:

```bash
python -m http.server 8000
```

Abrir en el navegador:

```text
http://localhost:8000/index.html
```

Phaser se carga siempre desde `assets/vendor/phaser/4.2.1/phaser.min.js`, sin CDN. El parámetro histórico `render` ya no selecciona backends y, si aparece en una URL antigua, no modifica el arranque. La copia local puede ejecutarse sin internet mediante un servidor HTTP. El backend refresca automáticamente `Phaser.Scale.FIT` cuando la pantalla de la partida pasa de oculta a visible, por lo que no necesita un redimensionamiento manual para mostrar el mapa. El movimiento, el combate, las habilidades y las interacciones continúan entrando por los controladores canónicos del juego. En Phaser, `I`, `J`, `K` y `L` desplazan únicamente la cámara; `+` y `-` cambian el zoom; `H` vuelve al personaje y reactiva el seguimiento. La rueda también cambia el zoom, el arrastre con botón derecho o central desplaza la cámara y el doble clic izquierdo vuelve al personaje. Durante una selección táctica la cámara se fija en el personaje, conserva ese centro al cambiar zoom y bloquea el desplazamiento manual. Los controles de cámara se ignoran mientras se escribe en un campo editable.

Balanceador:

```text
http://localhost:8000/balance.html
```

No es necesario instalar dependencias.

### Parámetros de desarrollo para mapas

`src/herramientas/depuracion/ParametrosPruebaMapa.js` permite iniciar una partida directamente en una expedición determinada. Los recursos especiales se materializan desde `src/herramientas/depuracion/RecursosPruebaMapa.js`, fuera de la configuración canónica del mapa:

```text
http://localhost:8000/index.html?mapa=cementerio&nivel=3&semilla=prueba
```

Parámetros disponibles:

| Parámetro | Uso |
|---|---|
| `mapa` | ID de la plantilla de mapa. |
| `nivel` | Nivel de expedición. |
| `semilla` | Semilla numérica o textual. |
| `botin` | Activa recursos especiales para validar botín. Cualquier valor no vacío lo activa. |
| `portal` | Activa recursos especiales para validar portales. Cualquier valor no vacío lo activa. |
| `enemigos` | Fuerza una cantidad controlada de enemigos recurrentes para pruebas de carga y fluidez. |

El modo por URL puede ignorar el nivel de desbloqueo porque está destinado a pruebas.

---

## 3. Puntos de entrada

### Juego

```text
index.html
  └─ game.js
      ├─ src/interfaz/dom/PresentacionAplicacionDom.js
      ├─ src/interfaz/dom/PresentacionMapaActivoDom.js
      └─ src/aplicacion/Aplicacion.js
```

`game.js` carga y valida la copia local de Phaser, crea la presentación DOM, la inyecta en una única instancia de `Aplicacion`, publica las herramientas de consola y comienza el arranque:

```js
globalThis.darkMoonAplicacion
globalThis.darkMoonDebug
globalThis.darkMoonRenderizador
```

### Balanceador

```text
balance.html
  └─ src/herramientas/balance/BalanceAplicacion.js
```

Cuando termina de cargar publica:

```js
globalThis.balanceDarkMoon
globalThis.balanceDarkMoonInforme
```

---

## 4. Estructura general del repositorio

```text
Dark-Moon/
├─ assets/                       Recursos estáticos del navegador.
│  ├─ estilos/                   CSS agrupado por base, pantallas, paneles, modales y herramientas.
│  ├─ imagenes/                  Sprites, iconos, fondos y miniaturas.
│  ├─ licencias/                 Licencias de recursos externos.
│  └─ vendor/                    Dependencias gráficas locales con versión fijada.
├─ src/
│  ├─ aplicacion/                Casos de uso, comandos y coordinación de la sesión.
│  ├─ partida/                   Estado que sobrevive a los cambios de mapa.
│  ├─ config/                    Datos JSON y constantes generales.
│  ├─ controles/                 Adaptadores de teclado y puntero DOM.
│  ├─ entidad/                   Entidades del mundo y combatientes.
│  ├─ interfaz/                  Composición DOM, paneles, modales y representación visual.
│  ├─ juego/                     Motores y reglas jugables.
│  ├─ herramientas/              Balance y diagnóstico para desarrollo.
│  ├─ utilidades/                Primitivas neutrales compartidas sin reglas de juego.
│  └─ objetos/                   Modelo base de objetos, inventario y equipo.
├─ index.html                    Página principal del juego.
├─ balance.html                  Herramienta de análisis de balance.
├─ game.js                       Composición y arranque principal.
└─ README.md                     Este documento.
```

### Organización de estilos

Las hojas de estilo se concentran en `assets/estilos/`:

```text
assets/estilos/
├─ base/                         Estilos generales y composición principal.
├─ pantallas/                    Menús y pantallas completas.
├─ paneles/                      Paneles persistentes de la partida.
├─ modales/                      Ventanas, detalles e interacciones superpuestas.
└─ herramientas/                 Estilos de utilidades de desarrollo.
```

Los módulos de interfaz que cargan CSS dinámicamente usan rutas públicas desde la raíz del proyecto, por ejemplo `./assets/estilos/modales/modal-curacion.css`. Los recursos referenciados dentro de una hoja CSS se resuelven desde la ubicación de esa hoja. Debe evitarse incluir una misma hoja simultáneamente desde HTML y mediante `@import`. Los cargadores dinámicos que comparten una hoja reutilizan el mismo ID de enlace para no insertarla dos veces; `panel-personaje.css` se carga directamente desde `index.html`.

### Regla práctica para encontrar código

- Si define **qué puede ocurrir en el juego**, buscar en `src/juego/`.
- Si representa un **actor u objeto con estado**, buscar en `src/entidad/` o `src/objetos/`.
- Si traduce teclado o puntero del navegador a comandos, buscar en `src/controles/`.
- Si abre paneles, modales o presenta una interacción, buscar en `src/interfaz/`.
- Si ejecuta comandos compartidos o coordina casos de uso, buscar en `src/aplicacion/`.
- Si dibuja o muestra información, buscar en `src/interfaz/`.
- Si coordina el inicio, la ciudad, las expediciones o el cambio de mapa, buscar en `src/aplicacion/` y `src/partida/`.
- Si analiza o depura el juego sin formar parte de sus reglas, buscar en `src/herramientas/`.
- Si modifica contenido sin cambiar código, buscar en `src/config/`.

---

## 5. Arquitectura actual

El flujo principal es:

```text
index.html
   ↓
game.js
   ├─ PresentacionAplicacionDom
   └─ Aplicacion
          ↓
   ControladorPartida
      ├─ EstadoPartida + gestores persistentes
      ├─ CoordinadorEntradaJugable
      ├─ EjecutorAccionesJugador
      ├─ Juego del mapa activo
      │      ↓
      │   Motores jugables
      └─ solicita PresentacionMapaActivoDom
                 ↓
       teclado, paneles, modales y habilidades

ResultadoAccion
   ↓
ProcesadorResultadoAccion
   ├─ mensaje y redibujado
   └─ callback de derrota
          ↓
Renderizador + adaptadores DOM
```

### Responsabilidades principales

#### `Aplicacion`

`src/aplicacion/Aplicacion.js`

- coordina el arranque general;
- carga y valida los JSON;
- solicita a la presentación los componentes visuales necesarios;
- crea `ControladorPartida` mediante dependencias inyectadas;
- inicia una nueva sesión.

No utiliza `document`, selectores HTML ni clases visuales concretas.

Confirmar un personaje representa una partida nueva. Antes de iniciarla se eliminan:

- el guardado durable anterior;
- la configuración anterior de la barra de habilidades.

#### `PresentacionAplicacionDom`

`src/interfaz/dom/PresentacionAplicacionDom.js`

Concentra la composición HTML actual:

- localiza y valida los elementos iniciales del documento;
- crea `ControladorPantallasDom`;
- crea el menú de personaje;
- entrega la fábrica de interfaz persistente basada en Phaser;
- construye `PresentacionMapaActivoDom` para cada mapa activado;
- presenta la derrota mediante `AdaptadorDerrotaDom`;
- muestra errores de inicio en la pantalla de creación.

`game.js` decide utilizar esta presentación. Una composición futura puede entregar otra implementación sin modificar la coordinación general de `Aplicacion`.

#### `PresentacionMapaActivoDom`

`src/interfaz/dom/PresentacionMapaActivoDom.js`

Agrupa los componentes visuales y de entrada que existen solamente mientras un mapa está activo:

- teclado DOM;
- inventario y equipamiento;
- comercio;
- contenedores, curación y transiciones;
- barra y panel de habilidades; la selección de casillas del mapa entra por el controlador Phaser.

Se crea nuevamente al entrar en una ciudad o mazmorra y se destruye antes de retirar el `Juego` anterior. De esta forma, `ControladorPartida` no elige controladores DOM concretos ni administra sus listeners y modales de manera individual.

#### `ControladorPartida`

`src/aplicacion/ControladorPartida.js`

Coordina toda la sesión:

- crea al jugador;
- crea `EstadoPartida`;
- crea los gestores de mapas y mercaderes;
- solicita a la presentación una única interfaz persistente;
- activa ciudad o mazmorra;
- reemplaza `Juego` al cambiar de mapa;
- crea el ejecutor compartido de comandos para el mapa activo;
- solicita a la presentación una composición nueva para cada mapa;
- procesa en un único punto los resultados de acciones, inventario, equipamiento, comercio e interacciones;
- delega en `CoordinadorEntradaJugable` la compuerta de entrada y la espera visual entre acciones;
- entrega las interacciones resueltas a la presentación activa;
- elimina el guardado durable al confirmar la derrota y luego la notifica mediante un callback de presentación;
- destruye primero la presentación y después los sistemas del mapa anterior.

#### `CoordinadorEntradaJugable`

`src/aplicacion/CoordinadorEntradaJugable.js`

Administra una sola compuerta de entrada para teclado, mouse, barra y acciones DOM. Mantiene el estado `disponible → resolviendo → esperando_presentacion → disponible`, descarta entradas concurrentes y espera el punto seguro del renderizador cuando una acción consume turno. También concentra la medición de fluidez de ese ciclo. No interpreta comandos ni contiene reglas del juego.

#### `EjecutorAccionesJugador`

`src/aplicacion/EjecutorAccionesJugador.js`

Ejecuta comandos jugables sin conocer teclado, DOM ni Phaser:

- movimiento del jugador o del selector activo;
- espera;
- activación y confirmación del ataque básico;
- selección, apuntado, confirmación y cancelación de habilidades;
- ataque natural de respaldo;
- inicio y confirmación de interacciones;
- cancelación de combate o interacción.

El teclado DOM, la barra, la entrada del mapa Phaser, la consola y las pruebas reutilizan el mismo punto de entrada mediante `ControladorPartida.ejecutarComandoJugador()`.

#### `EstadoPartida`

`src/partida/EstadoPartida.js`

Conserva aquello que debe sobrevivir al cambio de mapa:

- la misma instancia de jugador;
- ubicación actual;
- ID del mapa actual;
- cantidad de expediciones realizadas.

Cada transición válida de mapa intenta guardar el estado durable del jugador. La misma autoridad recibe las solicitudes de guardado originadas por cambios de progreso y elimina el guardado cuando la partida termina por derrota. Los componentes DOM no escriben ni borran directamente el estado durable del personaje.

#### `Juego`

`src/juego/Juego.js`

Representa el mapa activo y es la fachada jugable utilizada por los controladores. Contiene o coordina:

- mapa;
- jugador;
- objetivos y enemigos;
- interactuables;
- combate;
- movimiento;
- tiempo;
- efectos;
- zonas temporales;
- interacciones;
- inventario y equipamiento;
- selección de ataque y de interacción;
- resolución de derrotas y recompensas.

`Juego` no debe conocer botones, paneles, selectores CSS ni escenas de Phaser.

#### `Renderizador`

`src/interfaz/Renderizador.js`

Actualiza la presentación general:

- crea la escena visual a partir de `Juego`;
- entrega la escena neutral al renderizador Phaser;
- actualiza panel de personaje, inventario y equipamiento;
- administra el registro de mensajes.

#### `ProcesadorResultadoAccion`

`src/aplicacion/ProcesadorResultadoAccion.js`

Recibe los resultados producidos por el juego y centraliza:

- normalización;
- mensajes;
- redibujado;
- detección y notificación de derrota.

No depende de `document`, eventos del navegador ni modales. Cuando el jugador es derrotado ejecuta el callback entregado por `ControladorPartida`.

La presentación HTML actual utiliza:

```text
src/interfaz/derrota/AdaptadorDerrotaDom.js
src/interfaz/derrota/ModalDerrota.js
```

Una presentación futura puede conectar otro adaptador sin modificar las reglas ni el procesador.

### Límites consolidados después de la higienización

- `src/juego/` y `src/objetos/` contienen reglas y estado autoritativo, no componentes visuales.
- `src/aplicacion/` coordina casos de uso y resultados, sin depender de `document`, Canvas o Phaser.
- `src/interfaz/` construye la presentación DOM y Phaser actual. Las reglas del juego permanecen separadas de esa presentación.
- `src/controles/` traduce teclado o puntero a comandos compartidos; no decide reglas jugables.
- `src/utilidades/` contiene primitivas técnicas neutrales reutilizables, sin reglas de dominio; actualmente centraliza carga JSON y almacenamiento JSON clave/valor.
- `src/herramientas/depuracion/` concentra soporte explícito de diagnóstico y pruebas; los recursos de prueba de mapas ya no se fabrican desde la configuración canónica.
- `assets/estilos/` concentra todas las hojas CSS, organizadas por responsabilidad.
- Los nombres, descripciones, costes y ejecuciones de habilidades provienen de las configuraciones JSON; la interfaz no mantiene catálogos paralelos.

El punto previsto para introducir Phaser es una nueva composición visual que consuma los comandos de `EjecutorAccionesJugador` y el contrato de `AdaptadorEscenaJuego`, conservando inicialmente los paneles y modales DOM.

---

## 6. Fuentes de verdad

Cada dato importante debe tener un único propietario.

| Dato | Fuente de verdad |
|---|---|
| Jugador de la sesión | `EstadoPartida.jugador` |
| Vida, Maná, nivel, experiencia, oro y atributos | Instancia de `Player` |
| Inventario | `Player.inventario` |
| Equipamiento | `Player.equipamiento` |
| Progreso de maestrías, puntos y grados | `Player.progresoMagico` |
| Definición, descripción y ejecución de habilidades | `src/config/magia/Habilidades.json` |
| Barra de accesos rápidos | `SistemaHabilidadesJugador`, persistida por `PersistenciaBarraHabilidades` |
| Mapa activo | Instancia actual de `Juego` |
| Enemigos y destructibles activos | `Juego.objetivos` |
| Interactuables y botín del suelo | `Juego.interactuables` |
| Tiempo y agenda de actores | `CoordinadorTiempoPartida` y `SistemaTiempo` |
| Efectos temporales | `SistemaEfectosTemporales` |
| Zonas temporales | `SistemaZonasTemporales` |
| Estado de combate | `EstadoCombatePartida` |
| DOM, Canvas y paneles | Representación derivada, nunca fuente de verdad |
| Guardado de navegador | Copia serializada del estado durable, nunca simulación activa |
| Balanceador | Informe derivado de motores reales, nunca motor paralelo |

Una futura escena de Phaser no debe almacenar una segunda versión autoritativa del jugador, los enemigos, el mapa o el tiempo.

---

## 7. Flujo de inicio de una partida

```text
game.js
  ↓
Aplicacion.iniciar()
  ↓
crearControladores()
  ↓
cargarConfiguraciones()
  ↓
crearMenuCreacionPersonaje()
  ↓
confirmar personaje
  ↓
ControladorPartida.iniciar()
  ↓
crear Player + EstadoPartida + gestores
  ↓
crear interfaz
  ↓
iniciar ciudad o mapa forzado por URL
```

Las configuraciones se cargan en paralelo cuando es posible.

Antes de crear el jugador se validan:

- profesiones y atributos;
- enemigos y variantes;
- objetos;
- rarezas y afijos;
- mapas;
- ciudad;
- comercio;
- maestrías;
- habilidades;
- efectos;
- catalizadores mágicos integrados en armas.

Si existen parámetros de prueba en la URL, se inicia directamente una expedición. En caso contrario la partida comienza en la ciudad.

---

## 8. Flujo de una acción del jugador

El patrón de las acciones básicas es:

```text
Teclado DOM, puntero DOM, Phaser o consola
   ↓
Comando de jugador
   ↓
ControladorPartida
   ↓
EjecutorAccionesJugador
   ↓
Método de Juego
   ↓
Motor real
   ↓
ResultadoAccion
   ↓
ProcesadorResultadoAccion
   ↓
Mensaje, redibujado y posible derrota
```

`src/juego/acciones/ResultadoAccion.js` define y normaliza el contrato compartido.

Un resultado puede indicar, entre otros datos:

- éxito o fallo;
- mensaje;
- si consumió turno;
- si necesita redibujado;
- eventos producidos;
- interacción solicitada.

### Entrada actual

#### Movimiento

- Flechas.
- `W`, `A`, `S`, `D`.
- Diagonales: `Q`, `E`, `Z`, `C`.
- Teclado numérico: `1` a `9`, excepto `5` para esperar.

#### Espera

- `Espacio`.
- `Numpad 5`.

#### Combate básico

- `F`: entrar en modo combate o confirmar ataque.
- `G`: utilizar ataque natural de respaldo.
- `Escape`: cancelar selección.

#### Interacción

- `R`: revisar, abrir contenedor, recoger, comerciar, curarse, seleccionar mazmorra o usar una transición.

#### Habilidades

- `1` a `0`: seleccionar una ranura de la barra.
- Movimiento por teclado o clic sobre el mapa: mover/fijar el selector.
- `F`: confirmar.
- `Escape`: cancelar.

Inventario, equipamiento, comercio, curación y paneles se operan mediante la interfaz HTML.

### Separación actual de las entradas jugables

`src/controles/ControladorTeclado.js` es el único adaptador global de teclado jugable: reconoce movimiento, espera, confirmación, cancelación, respaldo, interacción con `R` y ranuras `1–0`, pero no conoce `Juego`, el sistema de habilidades, el renderizador ni sus reglas.

`src/interfaz/graficos/phaser/ControladorEntradaJugablePhaser.js` convierte el clic izquierdo sobre el mapa en una casilla utilizando la cámara y el zoom reales y emite `SELECCIONAR_CASILLA`. No decide alcance, objetivos, interacción ni ejecución. `src/interfaz/habilidades/BarraHabilidades.js` entrega la ranura elegida mediante un callback.

`src/aplicacion/EjecutorAccionesJugador.js` resuelve todos esos comandos sobre el mapa activo y respeta la prioridad habilidad → interacción → combate → movimiento. `ControladorPartida` coordina mensajes, redibujados y derrota sin duplicarlos.

`src/interfaz/interacciones/AdaptadorInteraccionesDom.js` recibe las interacciones ya resueltas y abre los contenedores, comercio, curación, selección de mazmorras o transiciones correspondientes. No escucha teclado ni decide qué entidad debe utilizarse.

### Ejecución determinista desde consola

Después de crear una partida:

```js
const { TIPOS_COMANDO_JUGADOR } = await import(
  "./src/aplicacion/EjecutorAccionesJugador.js"
);
```

Mover hacia la derecha:

```js
darkMoonAplicacion.controladorPartida.ejecutarComandoJugador({
  tipo: TIPOS_COMANDO_JUGADOR.MOVER,
  movimientoX: 1,
  movimientoY: 0,
});
```

Esperar:

```js
darkMoonAplicacion.controladorPartida.ejecutarComandoJugador({
  tipo: TIPOS_COMANDO_JUGADOR.ESPERAR,
});
```

Confirmar la selección activa o entrar en modo combate:

```js
darkMoonAplicacion.controladorPartida.ejecutarComandoJugador({
  tipo: TIPOS_COMANDO_JUGADOR.ACTIVAR_O_CONFIRMAR_SELECCION,
});
```

Interactuar o confirmar el selector de interacción:

```js
darkMoonAplicacion.controladorPartida.ejecutarComandoJugador({
  tipo: TIPOS_COMANDO_JUGADOR.INTERACTUAR_O_CONFIRMAR,
});
```

Seleccionar la primera ranura de habilidad:

```js
darkMoonAplicacion.controladorPartida.ejecutarComandoJugador({
  tipo: TIPOS_COMANDO_JUGADOR.SELECCIONAR_HABILIDAD_RANURA,
  indiceRanura: 0,
});
```

Seleccionar una casilla para el modo activo:

```js
darkMoonAplicacion.controladorPartida.ejecutarComandoJugador({
  tipo: TIPOS_COMANDO_JUGADOR.SELECCIONAR_CASILLA,
  x: 5,
  y: 4,
});
```

Cancelar la selección activa:

```js
darkMoonAplicacion.controladorPartida.ejecutarComandoJugador({
  tipo: TIPOS_COMANDO_JUGADOR.CANCELAR_SELECCION,
});
```

---

## 9. Movimiento, tiempo y turnos

### Movimiento

Rutas principales:

```text
src/juego/movimiento/SistemaMovimientoJugador.js
src/juego/ia/BuscadorCamino.js
src/juego/ia/SistemaAccionesEnemigos.js
```

El movimiento valida:

- límites del mapa;
- casilla caminable;
- ocupación;
- bloqueo diagonal;
- estados temporales que impidan actuar.

### Tiempo

```text
src/juego/tiempo/SistemaTiempo.js
src/juego/tiempo/AgendaEventosTemporales.js
src/juego/tiempo/CoordinadorTiempoPartida.js
```

Principio temporal:

- una acción del jugador tiene un costo base;
- los factores temporales del actor modifican el momento de su próxima acción;
- al finalizar la acción se procesan actores, efectos y zonas que vencen o se activan antes del siguiente turno del jugador.

Los factores del combatiente son:

- `factorTiempo`;
- `factorMovimiento`;
- `factorAtaque`;
- `factorAccion`;
- `factorConsumo`.

No deben copiarse fórmulas temporales dentro de controladores, UI, balanceador o Phaser.

---

## 10. Combate

Archivos principales:

```text
src/juego/combate/SistemaCombate.js
src/juego/combate/SistemaCombateJugador.js
src/juego/combate/SistemaAlcanceAtaque.js
src/juego/combate/ComponentesDanio.js
src/juego/combate/EstadoCombatePartida.js
src/juego/combate/SelectorObjetivoPrioritario.js
src/juego/combate/ResolutorDestruccionesJugador.js
src/entidad/destructible/combatiente/ConfiguracionAtaque.js
src/entidad/destructible/combatiente/EstadisticasDerivadas.js
```

Flujo resumido:

```text
seleccionar ataque
  ↓
calcular casillas válidas
  ↓
seleccionar objetivo prioritario
  ↓
validar alcance, patrón y línea de visión
  ↓
resolver impacto
  ↓
resolver crítico y componentes de daño
  ↓
resolver bloqueo, armadura y resistencias
  ↓
aplicar daño
  ↓
resolver derrota y recompensas
  ↓
avanzar tiempo
```

### Daño

`ComponentesDanio.js` distingue:

- físico;
- fuego;
- frío;
- rayo;
- veneno.

La armadura se aplica al componente físico. Las resistencias elementales se aplican al componente correspondiente.

### Selección automática

`SelectorObjetivoPrioritario.js` contiene la prioridad compartida utilizada para elegir un objetivo inicial. Las interfaces nuevas deben solicitar la selección al juego en lugar de volver a definirla.

### Ataques y catalizadores

`ConfiguracionAtaque.js` determina el ataque disponible según:

- arma principal;
- arma secundaria;
- armas de dos manos;
- doble arma;
- arco y munición;
- varitas;
- ataque natural de respaldo.

Las varitas y bastones son armas normales configuradas en `Armas.json`. No existe un catálogo paralelo de catalizadores.

---

## 11. Muerte, experiencia, oro y botín

Rutas principales:

```text
src/juego/combate/ResolutorDestruccionesJugador.js
src/juego/progresion/SistemaProgresion.js
src/juego/botin/SistemaBotin.js
src/juego/botin/ContextoGeneracionBotin.js
src/juego/generacion/GeneradorContenidoMapa.js
```

Flujo:

```text
objetivo recibe daño mortal
  ↓
ResolutorDestruccionesJugador procesa la derrota pendiente
  ↓
otorga experiencia y oro una única vez
  ↓
genera botín cuando corresponde
  ↓
agrega botín al mapa como interactuable
  ↓
devuelve mensaje y solicita redibujado
```

La resolución centralizada evita que ataques básicos, habilidades, efectos o zonas otorguen recompensas mediante fórmulas diferentes.

Los sistemas nuevos que puedan matar una entidad deben notificar el daño al motor real y permitir que el resolutor procese la derrota. No deben otorgar experiencia u oro directamente.

Cuando el jugador muere, `ProcesadorResultadoAccion` notifica la derrota una sola vez por instancia de `Juego`. `ControladorPartida` solicita a `EstadoPartida` eliminar el guardado durable y recién después delega la presentación en `AdaptadorDerrotaDom`, que cierra otros diálogos y muestra `ModalDerrota`. El adaptador visual no accede a `localStorage`.

---

## 12. Mapas y expediciones

Configuraciones:

```text
src/config/mapas/CiudadInicial.json
src/config/mapas/Alcantarilla.json
src/config/mapas/Cementerio.json
src/config/mapas/CasaGuerrero.json
src/config/mapas/FortalezaAbandonada.json
src/config/mapas/SalaGuerra.json
```

Código principal:

```text
src/partida/GestorMapasPartida.js
src/juego/interacciones/TransicionesMapa.js
src/juego/configuracion/SelectorMapa.js
src/juego/configuracion/ReglasAccesoMapas.js
src/juego/configuracion/ValidadorConfiguracionMapas.js
src/juego/generacion/GeneradorTerreno.js
src/juego/generacion/GeneradorContenidoMapa.js
src/juego/generacion/PobladorEnemigosMazmorra.js
src/juego/generacion/PobladorInteractuablesMazmorra.js
src/juego/generacion/GeneradorSalidaMapa.js
```

### Mapas configurados

| ID | Nombre | Desbloqueo | Niveles |
|---|---|---:|---:|
| `alcantarilla` | Alcantarilla | 1 | 1–3 |
| `cementerio` | Cementerio | 2 | 2–5 |
| `casa_guerrero` | Casa del Guerrero | 4 | 4–6 |
| `fortaleza_abandonada` | Fortaleza abandonada | 6 | 6–8 |
| `sala_guerra` | Sala de guerra | 8 | 8–10 |

La Sala de guerra genera al Señor de la Guerra como jefe obligatorio.

`GeneradorTerreno` produce el `PlanoMazmorra` estructural: habitaciones, pasillos, accesos, entrada, salida y casillas transitables. `GeneradorContenidoMapa` conserva la orquestación de contenido, pero delega la población de enemigos y la colocación de interactuables en colaboradores independientes. La habitación inicial permanece segura, la habitación asociada a la salida actúa como zona especial y la población recurrente escala por densidad sobre habitaciones candidatas. Puertas, cofres, barriles y el portal de entrada se materializan desde la estructura existente sin excavar rutas alternativas.

### Ciclo de una transición

```text
interacción con portal o selector
  ↓
SolicitudTransicionMapa
  ↓
ControladorPartida
  ↓
destruir integración y controles del mapa anterior
  ↓
preservar efectos permitidos del jugador
  ↓
crear nueva configuración de mapa
  ↓
crear nuevo Juego con el mismo Player
  ↓
crear controles e integración de habilidades
```

La transición no consume tiempo.

---

## 13. Entidades y enemigos

Modelo principal:

```text
Entidad
  ├─ Destructible
  │  ├─ Barril
  │  └─ Combatiente
  │     ├─ Player
  │     └─ Enemigo
  └─ Interactuables
     ├─ BotinSuelo
     ├─ NPC
     ├─ PortalMapa
     ├─ Puerta
     └─ Cofre
```

Configuraciones:

```text
src/config/entidades/Enemigos.json
src/config/entidades/EnemigosEspeciales.json
src/config/entidades/VariantesEnemigos.json
```

Enemigos generales actuales:

- Rata;
- Cucaracha;
- Esqueleto arquero;
- Esqueleto guardia;
- Ladrón;
- Lancero.

Especiales:

- Hombre rata saqueador;
- Zombi;
- Caballero Óseo;
- Comandante;
- Señor de la Guerra.

Variantes:

- normal;
- enfermo;
- gigante;
- élite.

`FabricaEnemigos.js` debe seguir siendo el lugar que transforma plantillas JSON en instancias jugables. Los mapas solamente deben referenciar IDs y probabilidades.

---

## 14. Objetos, inventario y equipamiento

Modelo base:

```text
src/objetos/Objeto.js
src/objetos/ContenedorObjetos.js
src/objetos/Equipamiento.js
src/objetos/FabricaObjetos.js
```

Motores:

```text
src/juego/inventario/SistemaInventarioEquipamiento.js
src/juego/inventario/SistemaTransferenciaObjetos.js
src/juego/inventario/SistemaConsumibles.js
```

Configuraciones:

```text
src/config/objetos/Armas.json
src/config/objetos/Armaduras.json
src/config/objetos/Consumibles.json
src/config/objetos/Municiones.json
src/config/objetos/Contenedores.json
src/config/objetos/Materiales.json
src/config/objetos/GeneracionObjetos.json
src/config/objetos/Rarezas.json
src/config/objetos/afijos/Prefijos.json
src/config/objetos/afijos/Sufijos.json
```

### Carga de catálogos

`CargadorConfiguracion.js` carga cada categoría por separado y las combina en un único catálogo en memoria. Los IDs deben ser únicos entre archivos. El transporte HTTP y el parseo JSON común se concentran en `src/utilidades/CargadorJson.js`; cada catálogo conserva en su propio módulo la validación de sus reglas.

El resto del juego no debe depender de qué archivo físico contiene un objeto.

### Rarezas y afijos

Responsabilidades:

- la plantilla del objeto define sus propiedades base;
- `Rarezas.json` define la cantidad de afijos permitidos;
- `Prefijos.json` y `Sufijos.json` definen mejoras disponibles;
- `GeneracionObjetos.json` define reglas de nivel y generación;
- `SistemaAfijos.js` aplica los afijos;
- `GeneradorRarezaObjeto.js` elige rareza;
- `GeneradorObjetoAleatorio.js` construye el resultado;
- `MetadatosObjeto.js` conserva información de nivel, rareza y origen.

No se deben incorporar bonificaciones de afijos directamente en la interfaz. La UI muestra las propiedades calculadas por el objeto y el combatiente.

### Presentación de objetos

```text
src/interfaz/objetos/PresentadorObjeto.js
src/interfaz/objetos/VistaDetalleObjeto.js
src/interfaz/objetos/ComparadorObjetos.js
src/interfaz/objetos/VistaComparacionObjetos.js
src/interfaz/objetos/ModalDetalleObjeto.js
src/interfaz/objetos/ControladorEquipamientoDom.js
```

El modal recibe objetos reales y puede ofrecer una acción de equipar, consumir, cargar o desequipar.

---

## 15. Comercio y curación

### Comercio

Configuración:

```text
src/config/comercio/Comercio.json
```

Código:

```text
src/partida/EstadoMercader.js
src/partida/GestorMercaderesPartida.js
src/juego/comercio/GeneradorStockMercader.js
src/juego/comercio/CalculadorValorObjeto.js
src/juego/comercio/CalculadorPreciosComercio.js
src/juego/comercio/SistemaComercio.js
src/interfaz/comercio/ControladorComercioDom.js
src/interfaz/comercio/ModalComercio.js
```

Los estados de mercader sobreviven al cambio de mapa. El stock se renueva después de una expedición utilizando el nivel y la semilla correspondientes.

El cálculo de valor y el cálculo de precio pertenecen al motor, no al modal.

### Curación

```text
src/juego/curacion/ConfiguracionCuracion.js
src/juego/curacion/SistemaCuracion.js
src/interfaz/curacion/ModalCuracion.js
```

El sistema calcula el costo según los puntos de Vida y Maná que falten. El modal solamente presenta opciones y solicita la operación.

---

## 16. Magia, maestrías y habilidades

Configuraciones:

```text
src/config/magia/Maestrias.json
src/config/magia/Habilidades.json
src/config/magia/Efectos.json
```

### Maestrías

- Fuego.
- Frío.
- Rayo.
- Veneno.

Las cuatro están habilitadas actualmente para Guerrero, Rogue y Mago.

Reglas vigentes configuradas:

- 1 punto universal inicial;
- 1 punto universal por nivel general;
- nivel máximo de maestría: 10;
- experiencia de maestría vinculada al Maná consumido;
- cada habilidad tiene grados y un requisito de nivel de maestría.

`ProgresoMagicoJugador.js` es la única fuente de verdad para:

- nivel y experiencia de maestría;
- puntos universales;
- puntos propios de maestría;
- grados aprendidos.

### Habilidades

| Maestría | Básica, requisito 0 | Intermedia, requisito 3 | Avanzada, requisito 6 |
|---|---|---|---|
| Fuego | Ascua | Explosión ígnea | Incinerar |
| Frío | Esquirla de hielo | Nova de escarcha | Ráfaga glacial |
| Rayo | Chispa | Cadena de rayos | Descarga fulminante |
| Veneno | Aguijón tóxico | Nube tóxica | Plaga corrosiva |

Código principal:

```text
src/juego/habilidades/SistemaHabilidadesJugador.js
src/interfaz/habilidades/IntegracionHabilidadesDom.js
src/juego/habilidades/EstadoSesionHabilidades.js
src/juego/habilidades/GeometriaHabilidades.js
src/juego/habilidades/MotorDanioHabilidad.js
src/juego/habilidades/MotorEfectosHabilidad.js
src/juego/habilidades/ObservadorProgresoMagico.js
```

### División de responsabilidades

- `ContextoProgresoMagico`: carga y valida catálogos.
- `ProgresoMagicoJugador`: progreso durable.
- `SistemaHabilidadesJugador`: selección, validación y ejecución.
- `GeometriaHabilidades`: casillas y formas de impacto.
- `MotorDanioHabilidad`: daño de habilidad.
- `MotorEfectosHabilidad`: aplicación de efectos.
- `IntegracionHabilidadesDom`: conecta un `Juego` activo con barra, panel y comandos; cuando cambia el progreso solicita el guardado a la autoridad de partida mediante callback.
- `BarraHabilidades`: presentación de las diez ranuras y emisión de selecciones por callback.
- `PanelHabilidadesMaestrias`: presentación y mejora de habilidades.

La ejecución de una habilidad no debe depender de que el personaje equipe una varita o bastón. El equipamiento puede aportar potencia y configurar ataques básicos mágicos, pero no habilita o deshabilita el uso de las habilidades aprendidas.

### Potencia de habilidad

`src/juego/magia/SistemaCatalizadores.js` calcula la potencia aportada por objetos equipados y las reglas de varitas, bastones y doble varita.

No deben crearse catálogos o fórmulas paralelos para catalizadores.

---

## 17. Efectos, resistencias e inmunidades

Código:

```text
src/juego/efectos/CatalogoEfectos.js
src/juego/efectos/ContratosEfectosTemporales.js
src/juego/efectos/SistemaEfectosTemporales.js
src/juego/efectos/ResistenciasEfectos.js
src/config/ConfiguracionEfectosTemporales.js
```

Efectos configurados:

- ralentización;
- electrización;
- congelamiento;
- aturdimiento;
- envenenamiento;
- quemadura;
- parálisis, preparada para contenido futuro;
- silencio, preparado para contenido futuro.

Resistencias visibles del personaje:

- Congelamiento;
- Aturdimiento;
- Envenenamiento;
- Quemadura.

Para estos efectos, la resistencia decide si el efecto se aplica. Las inmunidades pueden impedir la aplicación y retirar efectos activos cuando la configuración así lo exige.

Congelamiento, Aturdimiento y Parálisis comparten el contrato `bloqueo_total`: mientras estén activos, la entidad no puede moverse, atacar, usar habilidades, consumir objetos ni interactuar. Silencio usa `bloqueo_habilidades` y solamente impide lanzar habilidades. Ninguno de estos controles concede inmunidad al daño.

Los contraefectos se declaran mediante `eliminaEfectosAlAplicarse` en `Efectos.json`. Una aplicación aceptada puede retirar efectos incompatibles activos; resistencia, inmunidad o rechazo por duplicado no ejecutan la retirada. Quemadura y Congelamiento son el primer par configurado y se cancelan mutuamente.

El sistema temporal conserva contratos de:

- duración;
- activación periódica;
- acumulación o renovación;
- intensidad;
- inmunidad;
- retirada;
- mensajes y eventos.

Los efectos deben registrarse en el sistema temporal compartido. No deben procesarse mediante intervalos independientes en la UI.

---

## 18. Zonas temporales

Código:

```text
src/juego/zonas/ContratosZonasTemporales.js
src/juego/zonas/SistemaZonasTemporales.js
src/juego/zonas/AplicadorContenidoZonaTemporal.js
```

Una zona temporal puede:

- ocupar una o varias casillas;
- tener duración e intervalo de activación;
- aplicar daño y efectos;
- reaccionar a actores que entran o se mueven;
- dibujarse mediante una apariencia declarativa.

Las zonas pertenecen al `Juego` activo. Al cambiar de mapa se destruyen junto con el mapa. No forman parte del guardado durable.

`AdaptadorEscenaJuego` las convierte a datos visuales planos para que el backend gráfico no necesite conocer el motor.

---

## 19. Persistencia

### Jugador

```text
src/partida/PersistenciaJugador.js
```

El acceso técnico compartido a almacenamiento JSON vive en `src/utilidades/AlmacenamientoJson.js`. `PersistenciaJugador`, `PersistenciaBarraHabilidades` y la persistencia de preferencias continúan siendo responsables de sus propias claves, versiones, validaciones y políticas ante ausencia de almacenamiento.

Clave de `localStorage`:

```text
dark-moon:estado-jugador:v1
```

Versión:

```text
1
```

Se guarda:

- identidad y profesión;
- nivel y experiencia;
- puntos de atributo;
- atributos;
- factores temporales;
- Vida y Maná actuales;
- acumuladores de regeneración;
- oro;
- progreso mágico;
- inventario;
- equipamiento;
- datos necesarios para reconstruir objetos y afijos.

No se guarda:

- mapa activo;
- posición;
- enemigos;
- agenda temporal;
- estado de combate;
- botín del suelo;
- efectos temporales activos;
- zonas temporales.

### Barra de habilidades

```text
src/juego/habilidades/PersistenciaBarraHabilidades.js
```

Clave:

```text
dark-moon:barra-habilidades:v1
```

La barra guarda exactamente diez IDs o valores `null`. No guarda grados, puntos ni requisitos.

### Estado real del flujo de carga

El proyecto posee funciones para:

- guardar;
- leer el snapshot;
- validar su versión;
- reconstruir un `Player` real;
- restaurar inventario y equipamiento.

El menú principal ofrece **Continuar** cuando existe un guardado durable válido. Continuar reconstruye el personaje y comienza una nueva sesión segura desde la ciudad; no restaura posición, enemigos, botín de suelo, agenda temporal ni la expedición interrumpida. Un guardado inválido deshabilita Continuar sin borrarse automáticamente. Crear un personaje nuevo solicita confirmación antes de reemplazar un guardado existente y solo lo elimina al confirmar la nueva aventura.

La activación de cualquier mapa jugable —incluidas nueva partida, Continuar y las transiciones entre ciudad y mazmorras— utiliza una preparación visual común. La aplicación muestra un Loading global durante al menos 1 segundo, prepara el mapa y precarga con Phaser sus recursos persistentes contextuales antes de dibujar la primera escena y habilitar la entrada. Las entidades ocultas por FOV solo aportan rutas de recursos al manifiesto de precarga; no revelan posiciones ni estado jugable. Un recurso que falla realmente puede caer al fallback visual, pero una textura que todavía está cargando no debe mostrarse primero como fallback.

No debe modificarse una clave, versión, ID de profesión, ID de objeto, ID de afijo o estructura persistida sin revisar la compatibilidad.

---

## 20. Configuración JSON

### Personaje

```text
src/config/ConfiguracionPersonaje.json
```

Define:

- atributos iniciales;
- límites de atributos;
- puntos disponibles;
- profesiones;
- estadísticas base;
- equipo inicial;
- apariencia.

### Enemigos

```text
src/config/entidades/Enemigos.json
src/config/entidades/EnemigosEspeciales.json
src/config/entidades/VariantesEnemigos.json
```

Define plantillas, escalado, IA, equipo y botín.

### Mapas

```text
src/config/mapas/CiudadInicial.json
src/config/mapas/Alcantarilla.json
src/config/mapas/Cementerio.json
src/config/mapas/CasaGuerrero.json
src/config/mapas/FortalezaAbandonada.json
src/config/mapas/SalaGuerra.json
```

Cada mazmorra concentra en su propio JSON terreno, dimensiones, habitaciones, población, enemigos, encuentros, destructibles y recursos visuales. `CargadorConfiguracion` recompone el contrato único `configuracionMapas.plantillas` para el resto del juego.

### Objetos

```text
src/config/objetos/
```

Define plantillas y reglas de generación.

### Magia

```text
src/config/magia/Maestrias.json
src/config/magia/Habilidades.json
src/config/magia/Efectos.json
```

Define progreso, ejecución, grados, costos, geometría, daño, efectos y zonas.

### Comercio

```text
src/config/comercio/Comercio.json
```

Define perfiles de mercader, stock y economía.

### Balance

```text
src/herramientas/balance/ObjetivosBalance.json
```

Define bandas y objetivos de evaluación utilizados por `balance.html`.

### Regla para IDs

Los IDs son contratos entre JSON, código, persistencia e interfaz. Antes de renombrar uno se debe buscar en:

- imports y código;
- todos los JSON;
- persistencia;
- assets;
- balanceador;
- depurador;
- parámetros de URL.

---

## 21. Interfaz y representación visual

### Composición DOM

`src/interfaz/dom/PresentacionAplicacionDom.js` construye la presentación inicial utilizada por `game.js`. Agrupa el menú, las pantallas, la derrota y las fábricas visuales sin trasladar reglas jugables al DOM.

`src/interfaz/dom/ControladorPantallasDom.js` cambia la visibilidad del menú, la creación del personaje y el contenedor del juego mediante clases CSS.

`src/interfaz/dom/PresentacionMapaActivoDom.js` construye y destruye los adaptadores asociados a cada ciudad o mazmorra: teclado, equipamiento, comercio, interacciones y habilidades.

### Interfaz de partida

`src/interfaz/dom/FabricaInterfazPartidaDom.js` crea los componentes persistentes utilizando elementos ya declarados en `index.html`:

- renderizador;
- panel del personaje;
- inventario;
- equipamiento;
- detalle de objetos;
- contenedores;
- selección de mazmorras;
- comercio.

`src/interfaz/interacciones/AdaptadorInteraccionesDom.js` coordina la presentación de contenedores, comercio, curación, selección de mazmorras y transiciones después de que el comando compartido resuelve la interacción.

`src/interfaz/objetos/ControladorEquipamientoDom.js`, `src/interfaz/comercio/ControladorComercioDom.js` y `src/interfaz/habilidades/IntegracionHabilidadesDom.js` conectan los paneles y modales con los motores reales. Otros componentes se crean cuando son necesarios, como el modal de curación.

### Contrato gráfico

```text
Juego
  ↓
AdaptadorEscenaJuego
  ↓
objeto de escena plano
  ↓
Renderizador
  ↓
RenderizadorPhaser
```

Archivos principales:

```text
src/interfaz/graficos/AdaptadorEscenaJuego.js
src/interfaz/graficos/TiposEscena.js
src/interfaz/Renderizador.js
src/interfaz/graficos/phaser/RenderizadorPhaser.js
```

La escena visual contiene:

- casillas y apariencia del mapa;
- entidades visibles;
- estado de hostilidad;
- Vida visual;
- selección de combate;
- selección de interacción;
- selección y geometría de habilidades;
- zonas temporales.

Este contrato neutral evita que Phaser conozca entidades o reglas de dominio directamente.

### Recursos

```text
assets/imagenes/destructibles/
assets/imagenes/enemigos/
assets/imagenes/habilidades/
assets/imagenes/interactuables/
assets/imagenes/jugador/
assets/imagenes/mapas/
assets/imagenes/materiales/
assets/imagenes/npc/
assets/imagenes/objetos/
```

Las rutas pueden aparecer en JSON. No se debe mover o renombrar una imagen sin actualizar y validar todas sus referencias.

Las licencias de recursos permanecen en:

```text
assets/licencias/
```

---

## 22. Balanceador

Abrir:

```text
http://localhost:8000/balance.html
```

Código principal:

```text
src/herramientas/balance/BalanceAplicacion.js
src/herramientas/balance/AnalizadorBalanceJuego.js
src/herramientas/balance/AnalizadorBalanceProgresion.js
src/herramientas/balance/AnalizadorBalanceCombate.js
src/herramientas/balance/AnalizadorBalanceEfectos.js
src/herramientas/balance/AnalizadorBalanceRegresion.js
```

El balanceador importa motores y fórmulas reales. No debe mantener copias de:

- progresión;
- daño;
- tiempo;
- Maná;
- potencia;
- efectos;
- resistencias;
- generación de enemigos o mapas.

API principal en consola:

```js
balanceDarkMoon.lineaBase()
balanceDarkMoon.progresion()
balanceDarkMoon.maestrias()
balanceDarkMoon.progresionMagica()
balanceDarkMoon.puntosHabilidad()
balanceDarkMoon.mana()
balanceDarkMoon.sostenibilidadMana()
balanceDarkMoon.habilidades()
balanceDarkMoon.armas()
balanceDarkMoon.combate()
balanceDarkMoon.danioArmas()
balanceDarkMoon.danioHabilidades()
balanceDarkMoon.potenciaHabilidad()
balanceDarkMoon.arquetipos()
balanceDarkMoon.pruebasFocalizadas()
balanceDarkMoon.efectos()
balanceDarkMoon.probabilidadesEfectos()
balanceDarkMoon.contratosEfectos()
balanceDarkMoon.inmunidadesEfectos()
balanceDarkMoon.enemigosResistencias()
balanceDarkMoon.afijosResistencias()
balanceDarkMoon.regresion()
balanceDarkMoon.constitucion()
balanceDarkMoon.escenariosTeoricos()
```

Ejemplos:

```js
console.table(balanceDarkMoon.progresion().rutaRecomendada);
console.table(balanceDarkMoon.danioArmas().filas);
console.table(balanceDarkMoon.danioHabilidades().filasPrincipales);
console.table(balanceDarkMoon.probabilidadesEfectos().filas);
```

`balanceDarkMoonInforme` contiene el informe de línea base dibujado al cargar la página.

---

## 23. Depuración desde la consola

La herramienta se encuentra en:

```text
src/herramientas/depuracion/DepuradorMagiaHabilidades.js
```

`game.js` la publica como ayuda de desarrollo. El motor de habilidades no depende del depurador. Los analizadores de balance se cargan bajo demanda solamente al ejecutar comandos de `darkMoonDebug.magia.balance`.

Después de crear un personaje están disponibles:

```js
darkMoonAplicacion
darkMoonDebug.magia
```

Áreas del depurador:

```js
darkMoonDebug.magia.progreso
darkMoonDebug.magia.persistencia
darkMoonDebug.magia.habilidades
darkMoonDebug.magia.efectos
darkMoonDebug.magia.barra
darkMoonDebug.magia.catalizadores
darkMoonDebug.magia.zonas
darkMoonDebug.magia.interfaz
darkMoonDebug.magia.arquitectura
darkMoonDebug.magia.balance
```

Validación general:

```js
darkMoonDebug.magia.validarTodo()
```

El resultado esperado es:

```js
{ aprobado: true, resultados: { /* ... */ } }
```

Comandos útiles:

```js
darkMoonDebug.magia.arquitectura.obtenerResumen()
darkMoonDebug.magia.arquitectura.validarCicloActivo()
darkMoonDebug.magia.persistencia.crearSnapshotJugador()
darkMoonDebug.magia.persistencia.guardarJugador()
darkMoonDebug.magia.persistencia.leerGuardado()
darkMoonDebug.magia.barra.obtenerEstado()
darkMoonDebug.magia.barra.validarPersistencia()
darkMoonDebug.magia.habilidades.obtenerInstantaneaEjecucion()
darkMoonDebug.magia.efectos.obtenerDefensas()
darkMoonDebug.magia.zonas.obtenerActivas()
```

El depurador resuelve siempre la aplicación y el mapa activos. No debe retener una integración destruida después de cambiar de mapa.

Los métodos que alteran Maná, enemigos, resistencias, inmunidades o tiradas están destinados a pruebas y no forman parte del flujo normal de usuario.

---

## 24. Integración actual con Phaser

Phaser es el único renderizador gráfico canónico del mapa y no reemplaza las reglas del juego. La implementación Canvas 2D propia de Dark Moon fue retirada después de certificar manualmente la cobertura funcional y visual de Phaser.

Arquitectura vigente:

```text
Teclado jugable DOM ───────────────┐
Barra y acciones DOM ──────────────┼─> comando compartido
Puntero del mapa Phaser ───────────┘           ↓
                                      ControladorPartida
                                              ↓
                                  EjecutorAccionesJugador
                                              ↓
                                            Juego
                                              ↓
                                      ResultadoAccion
                                  ┌───────────┴───────────┐
                             estado final          eventos ordenados
                                  └───────────┬───────────┘
                                      escena neutral
                                              ↓
                                           Phaser
                                              ↓
                                      cola visual no autoritativa
```

El teclado jugable permanece centralizado en `ControladorTeclado`. Phaser conserva por separado únicamente los controles visuales de cámara. Una futura pantalla de configuración podrá alimentar ambos componentes desde una sola configuración de acciones y teclas, sin convertirlos en dos fuentes de verdad.

### Piezas que ya pueden reutilizarse

- `Juego` como fachada del mapa activo;
- motores de combate, tiempo, movimiento, objetos y habilidades;
- `ResultadoAccion`;
- `EjecutorAccionesJugador` y sus comandos de movimiento, combate, habilidades e interacción;
- `AdaptadorEscenaJuego`;
- `TiposEscena`;
- rutas de assets declaradas en configuraciones;
- gestores persistentes de partida;
- balanceador y depurador.

### Estado del corte visual

El renderizador Phaser utiliza actualmente:

- `GestorRecursosPhaser` para cargar imágenes locales, precargar lotes contextuales y calcular los límites alfa, la base y el centro visible de cada PNG;
- `RecursosMapaPhaser` para reunir y deduplicar el manifiesto visual persistente requerido por el mapa activo sin conocer reglas de FOV ni posiciones ocultas;
- `ConfiguracionEntidadesPhaser` como única fuente de presentación cenital de entidades dentro de Phaser;
- `CompositorMundoPhaser` como fachada de composición del mapa: delega terreno, entidades y selección en `CompositorTerrenoPhaser`, `CompositorEntidadesPhaser` y `CompositorSeleccionPhaser`, y conserva la coordinación transversal de visibilidad final, zonas temporales e iluminación;
- `ControladorCamaraPhaser` para seguimiento, zoom y desplazamiento visual;
- `ConversorCoordenadasPhaser` como contrato único entre pantalla, mundo y casilla;
- `ControladorEntradaJugablePhaser` para traducir el clic izquierdo a `SELECCIONAR_CASILLA` solamente cuando existe un modo de selección;
- `EventosAccion` para conservar movimientos, ataques y cambios de hostilidad ya resueltos sin repetir reglas;
- `PlanificadorEventosVisuales` para reemplazar referencias del dominio por identidades visuales en memoria;
- `ReproductorEventosVisualesPhaser` como coordinador exclusivo de cola, orden, cancelación, inactividad y aplicación de escena final; `DespachadorEventosVisualesPhaser` enruta cada tipo y `ContextoReproduccionVisualPhaser` concentra la infraestructura temporal compartida;
- reproductores visuales funcionales para movimiento, estados y zonas, más `ReproductorResultadosVisualesPhaser` y `ReproductorRecuperacionesPhaser` para representar resultados ya resueltos sin recalcular reglas;
- `ReproductorAtaquesPhaser` y `ReproductorHabilidadesPhaser` como fachadas estables: ataques delega distancia/cuerpo a cuerpo y habilidades delega los patrones canónicos proyectil, línea, área instantánea, cadena y zona persistente;
- recursos ambientales de Alcantarilla en `assets/imagenes/mundo/alcantarilla/`, incluida la familia cenital de `cenital/`;
- `AnalizadorVecindadTerreno` y `ResolutorAutotilingParedes` como contrato genérico de ocho vecinos para muros y suelos;
- paredes representadas como una masa continua, con bordes expuestos y esquinas interiores definidos por la configuración del bioma;
- sombra de contacto opcional sobre las casillas de piso contiguas a una pared;
- entidades centradas por el centro visible de su PNG, conservando relación de aspecto dentro de una casilla de 32 × 32;
- sombras de entidades centradas y calculadas desde el contenido visible, sin propiedades visuales en `Player`, `Enemigo`, `Barril` o `BotinSuelo`;
- interactuables integrados al mapa sin un aura permanente;
- cámara centrada y sin arrastre manual mientras existe una selección de ataque, interacción o habilidad;
- una adaptación exclusiva del modo Phaser para impedir que ventanas bajas compriman el mapa hasta volverlo ilegible.

La presentación temporal consume exclusivamente resultados ya resueltos por el dominio. Movimiento, ataques físicos, proyectiles, habilidades, estados temporales, zonas, recuperaciones, derrotas, botín y cambios de hostilidad se convierten en eventos visuales ordenados sin recalcular daño, costes, resistencias, IA ni progresión. `PlanificadorRitmoVisual` convierte el tiempo jugable a duración de presentación; `ReproductorEventosVisualesPhaser` coordina la cola, `DespachadorEventosVisualesPhaser` selecciona el reproductor funcional y `ContextoReproduccionVisualPhaser` aporta temporización/cancelación compartida. Ataques se separan por familia visual de distancia o cuerpo a cuerpo y habilidades por los patrones canónicos configurables, sin crear motores por arma o habilidad concreta.

Los perfiles de presentación se mantienen en configuraciones visuales validadas. Los proyectiles conservan el recurso exacto ya consumido o equipado; las habilidades transportan sus impactos y objetivos resueltos; los estados persistentes se adjuntan a la entidad visual correspondiente; y el botín aparece después de la derrota que lo produjo. La derrota del jugador es inmediata en el dominio, aunque la interfaz puede esperar a que finalice la presentación visual pendiente antes de mostrar el modal.

La cola dispone de velocidades internas `normal`, `rapida` y `muy-rapida`, aceleración automática cuando se acumulan eventos y una opción de efectos reducidos. Las preferencias de presentación se cargan desde la configuración canónica y se aplican sin alterar el tiempo jugable.

Durante combate, interacción o selección de habilidad, el clic izquierdo sobre Phaser mueve el selector canónico y `F` o `R` continúan confirmando. El clic no camina, no inspecciona entidades y no ejecuta acciones automáticamente. Sin un modo de selección activo no emite comandos jugables. El doble clic conserva el recentrado únicamente fuera de esos modos.

### Lo que Phaser no debe contener

- fórmulas de daño;
- progresión;
- inventario autoritativo;
- enemigos autoritativos;
- agenda temporal;
- resolución de efectos;
- generación alternativa de mapas;
- persistencia alternativa;
- copias de reglas del balanceador.

### Lo que no debe migrarse primero

Los paneles HTML de inventario, equipamiento, habilidades, comercio y curación pueden continuar funcionando mientras Phaser se incorpora únicamente al mapa. Una migración gradual reduce el riesgo y permite conservar el juego operativo.

---

## 25. Guía para cambios futuros

### Agregar un enemigo

Revisar:

1. agregar la plantilla en `Enemigos.json` o `EnemigosEspeciales.json`;
2. agregar su imagen en `assets/imagenes/enemigos/`;
3. declarar la ruta en `recursoVisual`;
4. incorporarlo a mapas mediante ID y peso;
5. revisar niveles, escalado, IA, equipo y botín;
6. ejecutar validación de configuración y balanceador;
7. probar generación determinista mediante semilla.

No agregar casos especiales a `FabricaEnemigos` salvo que el comportamiento no pueda expresarse mediante la plantilla existente.

### Agregar un objeto

1. elegir el catálogo correcto: armas, armaduras, consumibles, municiones, contenedores o materiales;
2. utilizar un ID único y estable;
3. agregar recurso visual;
4. definir nivel, precio y propiedades base;
5. revisar reglas de generación y afijos compatibles;
6. probar inventario, equipamiento, comparación, comercio, botín y persistencia.

### Agregar una habilidad

1. agregarla a `Habilidades.json`;
2. usar una maestría existente o ampliar `Maestrias.json` de forma coherente;
3. definir requisito, grado máximo, icono y descripción;
4. definir ejecución y grados;
5. reutilizar tipos de objetivo y geometrías existentes;
6. agregar efectos en `Efectos.json` solamente cuando sean conceptos reutilizables;
7. comprobar validadores, barra, panel, Maná, tiempo, daño, efectos, recompensas y persistencia;
8. ampliar depurador y balanceador cuando sea necesario.

No crear un motor exclusivo para una habilidad si puede expresarse mediante los contratos existentes.

### Agregar un mapa

1. crear el JSON canónico del mapa dentro de `src/config/mapas/` y registrarlo en `CargadorConfiguracion`;
2. agregar miniatura/recurso visual;
3. definir desbloqueo y rango de niveles;
4. definir dimensiones y generación;
5. declarar enemigos, variantes, encuentro especial, jefe y destructibles;
6. validar conectividad y posiciones seguras;
7. probar varias semillas y niveles;
8. revisar balance y transición de regreso.

### Cambiar una fórmula

1. localizar el motor real responsable;
2. evitar ajustes en UI o analizadores que oculten el problema;
3. revisar todos los consumidores;
4. comprobar que el balanceador importe la fórmula real;
5. realizar pruebas deterministas antes y después;
6. documentar aquí el nuevo comportamiento cuando cambie un contrato funcional.

### Mover o renombrar un recurso

Buscar referencias en:

```bash
grep -RIn --exclude-dir=.git "ruta/actual" .
```

Comprobar:

- JSON;
- JavaScript;
- CSS;
- HTML;
- persistencia por ID;
- balanceador;
- depurador.

### Modificar la interfaz

La interfaz puede cambiar la forma de presentar un resultado, pero no debe decidir:

- si una acción es válida;
- cuánto daño causa;
- cuánto cuesta;
- qué recompensa entrega;
- cuánto tiempo consume;
- qué estado se aplica.

Esas decisiones pertenecen a los motores.

---

## 26. Validación mínima después de cambios

### Arranque

- `index.html` carga sin errores.
- No hay respuestas `404`.
- Los JSON se cargan y validan.
- Se puede crear Guerrero, Rogue y Mago.

### Ciudad y mapas

- La ciudad aparece correctamente.
- Mercader, curandera y selector de mazmorras funcionan.
- Se puede entrar y regresar de una expedición.
- Los cinco mapas pueden generarse con sus rangos.
- Las imágenes de mapas y entidades cargan.

### Acciones

- Movimiento cardinal y diagonal.
- Espera.
- Ataque básico.
- Ataque de respaldo.
- Selección y cancelación.
- Interacción con `R`.

### Objetos

- Inventario.
- Equipamiento y desequipamiento.
- Arma de dos manos.
- Doble arma.
- Munición.
- Consumibles.
- Comparación.
- Contenedores y recoger todo.
- Comercio.

### Magia

- Panel de habilidades y maestrías.
- Aprendizaje y mejora.
- Barra de diez ranuras.
- Habilidades básicas, intermedias y avanzadas.
- Consumo de Maná.
- Potencia de habilidad.
- Daño elemental.
- Efectos.
- Resistencias e inmunidades.
- Zonas temporales.

### Progresión y muerte

- Experiencia por ataques y habilidades.
- Recompensas únicas.
- Oro.
- Subida de nivel.
- Puntos de atributo y habilidad.
- Modal de derrota.

### Persistencia

- Guardado durable.
- Lectura del snapshot.
- Reconstrucción desde consola.
- Barra de habilidades.
- Nueva partida limpia guardado y barra anteriores.

### Herramientas

En el juego:

```js
darkMoonDebug.magia.validarTodo()
```

En el balanceador:

```js
balanceDarkMoon.lineaBase()
balanceDarkMoon.regresion()
```

### Estructura

- no quedan imports hacia rutas anteriores;
- no quedan referencias JSON a recursos inexistentes;
- no se duplicaron fórmulas ni descripciones de contenido;
- no se creó una segunda fuente de verdad;
- ninguna hoja CSS se carga simultáneamente desde HTML y mediante `@import`;
- no aparecieron errores en consola;
- `git diff --check` no informa errores.

### Comprobaciones deterministas después de mover archivos

Ejecutar desde la raíz del repositorio:

```bash
git status --short
git diff --check
find . -path './.git' -prune -o -type f -name '*.css' -print | sort
grep -RIn --exclude-dir=.git "ruta/anterior" .
```

Levantar después un servidor local y comprobar que los puntos de entrada y recursos modificados responden sin `404`:

```bash
python3 -m http.server 8000
```

La validación estática no sustituye la regresión jugable desde `index.html`.

---

## 27. Reglas de mantenimiento del repositorio

- No crear instaladores o migradores de una sola etapa dentro de producción.
- No conservar nombres de etapas en clases o archivos productivos.
- No copiar fórmulas para facilitar una interfaz o herramienta.
- No mover archivos únicamente para imponer una arquitectura teórica.
- No crear capas de compatibilidad sin consumidores reales.
- No acoplar lógica jugable a `document`, Canvas o Phaser.
- No cambiar IDs públicos sin revisar todos sus consumidores.
- No eliminar recursos solamente porque no aparezcan en un import: pueden ser cargados desde JSON o CSS.
- No duplicar en JavaScript nombres o descripciones cuyo propietario sea un JSON de configuración.
- Evitar cargas CSS duplicadas entre HTML y `@import`; los cargadores dinámicos compartidos deben reutilizar el mismo ID de enlace.
- Mantener `README.md` como único documento funcional del repositorio.
- Conservar los avisos de licencia de los recursos utilizados.

---

## 28. Resumen para comenzar a desarrollar

Para comprender una modificación, seguir este orden:

1. identificar el comportamiento visible;
2. localizar el método público de `Juego` que lo inicia;
3. localizar el motor que decide las reglas;
4. revisar la configuración JSON involucrada;
5. revisar cómo `ResultadoAccion` llega a la interfaz;
6. comprobar persistencia, balanceador y depurador;
7. realizar la prueba desde `index.html`, no solamente desde funciones aisladas.

La lógica jugable debe permanecer independiente del renderizador gráfico. Phaser consume escenas neutrales y eventos ya resueltos; cualquier cambio de presentación debe conservar esa separación y reutilizar los contratos canónicos existentes antes de introducir nuevas abstracciones.
