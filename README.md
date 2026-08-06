# Dark Moon — Documento funcional y guía del código

Este es el único documento funcional del repositorio. Su objetivo es permitir que una persona pueda comprender la estructura actual de Dark Moon, encontrar cada sistema y realizar cambios sin tener que reconstruir el historial de desarrollo.

Este documento describe el estado funcional actual del repositorio. Cuando el comportamiento o la estructura cambien, debe actualizarse en el mismo cambio. El código y las configuraciones JSON son siempre la fuente de verdad final.

---

## 1. Qué es Dark Moon

Dark Moon es un RPG roguelike ejecutado en el navegador mediante HTML, CSS y módulos JavaScript nativos.

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
- interfaz HTML con backend Canvas 2D y un corte visual Phaser seleccionable;
- persistencia durable del jugador y de la barra de habilidades;
- depurador accesible desde la consola;
- balanceador independiente en `balance.html`.

No se utiliza un empaquetador, servidor de aplicación ni framework de interfaz. Canvas 2D continúa siendo el modo operativo predeterminado. Phaser 4.2.1 está incorporado localmente como backend técnico opcional y no se carga cuando se utiliza Canvas 2D.

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

Abrir en el navegador con Canvas 2D, que continúa siendo el modo predeterminado:

```text
http://localhost:8000/index.html
```

Corte visual Phaser:

```text
http://localhost:8000/index.html?render=phaser
```

También puede solicitarse Canvas 2D de forma explícita:

```text
http://localhost:8000/index.html?render=canvas2d
```

Phaser se carga desde `assets/vendor/phaser/4.2.1/phaser.min.js`, sin CDN y solamente cuando se solicita `?render=phaser`. La copia local puede ejecutarse sin internet mediante un servidor HTTP. El backend refresca automáticamente `Phaser.Scale.FIT` cuando la pantalla de la partida pasa de oculta a visible, por lo que no necesita un redimensionamiento manual para mostrar el mapa. El movimiento, el combate, las habilidades y las interacciones continúan entrando por los controladores canónicos del juego. En Phaser, `I`, `J`, `K` y `L` desplazan únicamente la cámara; `+` y `-` cambian el zoom; `H` vuelve al personaje y reactiva el seguimiento. La rueda también cambia el zoom, el arrastre con botón derecho o central desplaza la cámara y el doble clic izquierdo vuelve al personaje. Durante una selección táctica la cámara se fija en el personaje, conserva ese centro al cambiar zoom y bloquea el desplazamiento manual. Los controles de cámara se ignoran mientras se escribe en un campo editable.

Balanceador:

```text
http://localhost:8000/balance.html
```

No es necesario instalar dependencias.

### Parámetros de desarrollo para mapas

`src/juego/configuracion/ParametrosPruebaMapa.js` permite iniciar una partida directamente en una expedición determinada:

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

`game.js` resuelve `?render=canvas2d|phaser`, carga Phaser solamente cuando corresponde, crea la presentación DOM, la inyecta en una única instancia de `Aplicacion`, publica las herramientas de consola y comienza el arranque:

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
│  ├─ herramientas/              Balance y depuración para desarrollo.
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
- entrega la fábrica de interfaz persistente y el backend de mapa seleccionado;
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
- barra, panel y puntero de habilidades.

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
- entrega las interacciones resueltas a la presentación activa;
- notifica la derrota mediante un callback de presentación;
- destruye primero la presentación y después los sistemas del mapa anterior.

#### `EjecutorAccionesJugador`

`src/aplicacion/EjecutorAccionesJugador.js`

Ejecuta comandos jugables sin conocer teclado, DOM, Canvas o Phaser:

- movimiento del jugador o del selector activo;
- espera;
- activación y confirmación del ataque básico;
- selección, apuntado, confirmación y cancelación de habilidades;
- ataque natural de respaldo;
- inicio y confirmación de interacciones;
- cancelación de combate o interacción.

El teclado DOM, la barra, el puntero, una futura escena de Phaser, la consola y las pruebas pueden reutilizar el mismo punto de entrada mediante `ControladorPartida.ejecutarComandoJugador()`.

#### `EstadoPartida`

`src/partida/EstadoPartida.js`

Conserva aquello que debe sobrevivir al cambio de mapa:

- la misma instancia de jugador;
- ubicación actual;
- ID del mapa actual;
- cantidad de expediciones realizadas.

Cada transición válida de mapa intenta guardar el estado durable del jugador.

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
- entrega el mapa al backend Canvas 2D o Phaser seleccionado;
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
- `src/interfaz/` construye la presentación DOM/Canvas actual y puede ser reemplazada o combinada con otro backend gráfico.
- `src/controles/` traduce teclado o puntero a comandos compartidos; no decide reglas jugables.
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

`src/controles/ControladorPunteroHabilidades.js` convierte clics sobre casillas DOM o Canvas 2D en coordenadas de mapa. `src/interfaz/graficos/phaser/ControladorEntradaJugablePhaser.js` convierte el clic izquierdo sobre Phaser mediante la cámara y el zoom reales. Ambos emiten `SELECCIONAR_CASILLA`; ninguno decide alcance, objetivos, interacción ni ejecución. `src/interfaz/habilidades/BarraHabilidades.js` entrega la ranura elegida mediante un callback.

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
src/juego/combate/ResolutorDerrotasJugador.js
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
src/juego/combate/ResolutorDerrotasJugador.js
src/juego/progresion/SistemaProgresion.js
src/juego/botin/SistemaBotin.js
src/juego/botin/ContextoGeneracionBotin.js
src/juego/generacion/GeneradorContenidoMapa.js
```

Flujo:

```text
objetivo recibe daño mortal
  ↓
ResolutorDerrotasJugador procesa la derrota pendiente
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

Cuando el jugador muere, `ProcesadorResultadoAccion` notifica la derrota una sola vez por instancia de `Juego`. `ControladorPartida` entrega esa notificación a `AdaptadorDerrotaDom`, que cierra otros diálogos y muestra `ModalDerrota`.

---

## 12. Mapas y expediciones

Configuraciones:

```text
src/config/mapas/CiudadInicial.json
src/config/mapas/mapas.json
```

Código principal:

```text
src/partida/GestorMapasPartida.js
src/partida/TransicionesMapa.js
src/juego/configuracion/SelectorMapa.js
src/juego/configuracion/ReglasAccesoMapas.js
src/juego/configuracion/ValidadorConfiguracionMapas.js
src/juego/generacion/GeneradorTerreno.js
src/juego/generacion/GeneradorContenidoMapa.js
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
     └─ PortalMapa
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

`CargadorConfiguracion.js` carga cada categoría por separado y las combina en un único catálogo en memoria. Los IDs deben ser únicos entre archivos.

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
| Frío | Esquirla de hielo | Nova de escarcha | Prisión glacial |
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
src/controles/ControladorPunteroHabilidades.js
src/juego/habilidades/ObservadorProgresoMagico.js
```

### División de responsabilidades

- `ContextoProgresoMagico`: carga y valida catálogos.
- `ProgresoMagicoJugador`: progreso durable.
- `SistemaHabilidadesJugador`: selección, validación y ejecución.
- `GeometriaHabilidades`: casillas y formas de impacto.
- `MotorDanioHabilidad`: daño de habilidad.
- `MotorEfectosHabilidad`: aplicación de efectos.
- `IntegracionHabilidadesDom`: conecta un `Juego` activo con barra, panel, puntero, comandos y persistencia.
- `BarraHabilidades`: presentación de las diez ranuras y emisión de selecciones por callback.
- `ControladorPunteroHabilidades`: adaptación DOM de clics a coordenadas del selector.
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
- quemadura.

Resistencias visibles del personaje:

- Congelamiento;
- Aturdimiento;
- Envenenamiento;
- Quemadura.

Para estos efectos, la resistencia decide si el efecto se aplica. Las inmunidades pueden impedir la aplicación y retirar efectos activos cuando la configuración así lo exige.

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

Sin embargo, el menú principal todavía no ofrece una opción funcional de **Continuar partida**. Crear un personaje nuevo elimina el guardado anterior. La reconstrucción desde guardado está disponible desde el código y el depurador, pero todavía no está integrada como flujo de usuario.

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
src/config/mapas/mapas.json
```

Define terreno, dimensiones, niveles, enemigos, variantes, encuentros, jefe, destructibles y recursos visuales.

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
RenderizadorCanvas2D
```

Archivos:

```text
src/interfaz/graficos/AdaptadorEscenaJuego.js
src/interfaz/graficos/TiposEscena.js
src/interfaz/graficos/RenderizadorCanvas2D.js
src/interfaz/graficos/CargadorImagenes.js
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

Este contrato es el principal punto de entrada para una futura capa Phaser.

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

Phaser está incorporado como backend visual opcional del mapa y no reemplaza las reglas del juego. Canvas 2D continúa siendo el backend predeterminado.

Arquitectura vigente:

```text
Teclado jugable DOM ───────────────┐
Puntero DOM / Canvas 2D ───────────┼─> comando compartido
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
                                        ┌─────┴─────┐
                                   Canvas 2D     Phaser
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

El modo `?render=phaser` utiliza actualmente:

- `GestorRecursosPhaser` para cargar imágenes locales y calcular los límites alfa, la base y el centro visible de cada PNG;
- `ConfiguracionEntidadesPhaser` como única fuente de presentación cenital de entidades dentro de Phaser;
- `CompositorMundoPhaser` para suelo, paredes, cuadrícula, decoración, sombras, selección, entidades, iluminación ambiental y efectos temporales;
- `ControladorCamaraPhaser` para seguimiento, zoom y desplazamiento visual;
- `ConversorCoordenadasPhaser` como contrato único entre pantalla, mundo y casilla;
- `ControladorEntradaJugablePhaser` para traducir el clic izquierdo a `SELECCIONAR_CASILLA` solamente cuando existe un modo de selección;
- `EventosAccion` para conservar movimientos, ataques y cambios de hostilidad ya resueltos sin repetir reglas;
- `PlanificadorEventosVisuales` para reemplazar referencias del dominio por identidades visuales en memoria;
- `ReproductorEventosVisualesPhaser` para interpolar desplazamientos y reproducir las acciones enemigas en el orden canónico;
- recursos ambientales de Alcantarilla en `assets/imagenes/mundo/alcantarilla/`, incluida la familia cenital de `cenital/`;
- `AnalizadorVecindadTerreno` y `ResolutorAutotilingParedes` como contrato genérico de ocho vecinos para muros y suelos;
- paredes representadas como una masa continua, con bordes expuestos y esquinas interiores definidos por la configuración del bioma;
- sombra de contacto opcional sobre las casillas de piso contiguas a una pared;
- entidades centradas por el centro visible de su PNG, conservando relación de aspecto dentro de una casilla de 32 × 32;
- sombras de entidades centradas y calculadas desde el contenido visible, sin propiedades visuales en `Player`, `Enemigo`, `Barril` o `BotinSuelo`;
- interactuables integrados al mapa sin un aura permanente;
- cámara centrada y sin arrastre manual mientras existe una selección de ataque, interacción o habilidad;
- una adaptación exclusiva del modo Phaser para impedir que ventanas bajas compriman el mapa hasta volverlo ilegible.

P5.2 dejó preparado el soporte técnico global de entidades sin agregar `aparienciaVisual` al dominio. P5.3 amplió el mismo enfoque al resto del mundo: Phaser resuelve suelos por símbolo de casilla, la ciudad distingue adoquín, césped, madera y tierra, y cada bioma dispone de su propia familia de pisos, masas de pared, bordes, esquinas internas y sombras de contacto.

P5.4 cierra técnicamente la etapa P5. Los PNG activos de Guerrero, Rogue y Mago fueron auditados en dimensiones, transparencia, centro visible, escala, sombra y lectura sobre todos los biomas. El resto de enemigos, destructibles, botín, portales y NPC continúa como arte provisional, pero todas sus rutas existen y el contrato gráfico ya permite reemplazarlos sin modificar `Player`, `Enemigo`, fábricas, combate o persistencia. La sustitución artística pendiente no bloquea P6.

P6.1 incorpora el primer contrato de presentación temporal. Cada movimiento conserva origen, destino y entidad; cada ataque conserva atacante, objetivo y el resultado ya calculado. Phaser transforma esos hechos en una cola visual, interpola jugador y enemigos junto con sus sombras, acelera recorridos largos y separa las acciones ofensivas enemigas mediante una señal breve y una pausa. Los impactos con daño generan una reacción visual genérica tanto sobre el jugador como sobre los enemigos. La Vida, los turnos y el orden continúan resolviéndose inmediatamente en el dominio; la duración visual nunca decide resultados.

P6.2A amplía ese contrato para conservar la configuración visual y el resultado individual de cada golpe. Phaser muestra números de daño por golpe, `FALLO`, `BLOQUEO` y `CRÍTICO`, y reduce progresivamente la barra de Vida de los enemigos sin recalcular combate. Los ataques duales no muestran un total duplicado y una casilla vacía no genera un objetivo o resultado ficticio. El pulso ofensivo de P6.1 continúa siendo provisional hasta incorporar cuerpo a cuerpo en P6.2B y proyectiles en P6.2C.

P6.2B.1 conecta cada acción con el `costoFinal` que ya registró `SistemaTiempo`. `CoordinadorTiempoPartida` asocia ese resultado temporal con los eventos del mismo actor y `PlanificadorRitmoVisual` realiza una única conversión de presentación desde unidades temporales a milisegundos. Las proporciones de preparación, acción, pausa y retorno se alojan en `PerfilesAtaquePorFamilia.json`; las familias solamente definen forma, tamaño, sentido y futuros IDs de sonido. Ninguna familia recalcula velocidad ni incorpora multiplicadores temporales propios.

P6.2B.2 consume esos perfiles para reemplazar el pulso provisional por preparación, avance, corte, golpe contundente o estocada y retorno. Daga, espada, hacha, mandoble, bastón, lanza y ataque natural comparten la misma arquitectura para jugador y enemigos; las dos manos conservan su familia y la pausa proporcional de la secuencia dual. El bastón usa una estrella contundente grande con centro grueso y los críticos intensifican el efecto propio del arma sin agregar una estrella independiente. Los cambios de hostilidad se representan como eventos ordenados: el indicador `!` aparece antes de un avance agresivo, desaparece antes de una acción pasiva y aparece después del ataque con el que el jugador provoca a un enemigo. El indicador también se redujo para no cubrir la barra de Vida. Las derrotas directas o periódicas retiran la entidad antes de continuar con la siguiente acción; la aparición inmediata del botín queda para P6.4.

P6.2C.1 reemplaza los ataques provisionales de arco por proyectiles que utilizan la munición exacta consumida. El resultado canónico conserva `idObjeto`, `tipoMunicion` y `recursoVisual`; Phaser recibe esos datos ya resueltos y no consulta el catálogo de municiones. La flecha horizontal se orienta hacia la casilla seleccionada y distribuye el ritmo visual en preparación 40 %, lanzamiento 15 %, trayectoria 25 % y retorno 20 %. La lanza utiliza el PNG exacto del arma equipada, permanece visualmente larga y no adelanta al combatiente: a alcance uno nace sobre el atacante y a alcance dos se centra en la casilla intermedia. El selector automático prioriza enemigos atacables y solo propone destructibles cuando no existe ninguno.

P6.2C.2 reemplaza la presentación provisional de varitas por proyectiles básicos de fuego, frío, rayo y veneno. Cada fuente conserva su elemento y mano; una varita utiliza la secuencia `proyectil` y dos varitas utilizan `proyectil_dual`, distribuyendo una única duración derivada de `costoFinal`. Los disparos se reproducen por mano, admiten elementos diferentes, casilla vacía, fallo, bloqueo, crítico y muerte con el primer golpe sin inventar un segundo proyectil. Las formas elementales son procedurales y no alteran Maná, daño, resistencias ni reglas de doble varita.

P6.2D cierra el feedback de recuperaciones explícitas y resultados meta básicos. El consumible exacto conserva ID y ruta visual, mientras `SistemaTiempo` aporta el `costoFinal` ya ajustado por `factorTiempo` y `factorConsumo`. La imagen del consumible sigue esa duración canónica; el texto, las partículas y el aura de recuperación usan una duración fija y legible en paralelo. Vida utiliza rojo, Maná azul-violeta y el texto muestra la cantidad realmente aplicada. Se agrega una poción de Maná provisional disponible en Edran y `CreadorRecursosVisualesPhaser` queda como punto genérico para sprites temporales. `nivel_aumentado` se conserva desde la derrota hasta Phaser y genera un aura blanca vertical tipo energía/ki: solo su entrada bloquea brevemente la cola y el resto desaparece en paralelo. La regeneración pasiva continúa sin evento visual y Lythra queda reservada para presentación mágica en P6.3. P6.2 queda cerrada y validada manualmente en `046a1d5391800ea827bdc71613eed5776d6f4dab`.

P6.3A introduce `habilidad_resuelta`, un contrato universal para ejecutores de tipo jugador, enemigo o NPC. La primera implementación conecta Ascua, Esquirla de hielo, Chispa y Aguijón tóxico sin agregar IA o contenido nuevo. Cada impacto conserva objetivo, posición, daño, crítico, derrota y Vida anterior/posterior; los eventos producidos por efectos temporales continúan hacia la cola visual. `PerfilesHabilidadesVisuales.json` valida las doce habilidades canónicas y separa forma, textura, movimiento, estela, impacto y secuencia del tiempo jugable. Phaser reproduce conjuración, proyectil, trayectoria, resultado y retorno usando la duración derivada del `costoFinal`; Canvas 2D y Phaser conservan una selección elemental diferenciada. Los estados persistentes se analizarán en P6.3B y Lythra se incorporará después mediante habilidades canónicas de NPC no aprendibles por el jugador. Como ajuste visual aprobado, Chispa adopta la descarga completa anclada en zig-zag que antes utilizaba la varita eléctrica, mientras la varita eléctrica adopta la chispa compacta ramificada, su estela nerviosa y su impacto cruzado. El intercambio no modifica ninguna regla canónica. P6.3A fue validada manualmente y cerrada en `113130c8b0d6cc1d4e79a07709d7e814ab25d87d`.

P6.3B.1 incorpora contratos y representación persistente para Ralentización, Electrización, Congelamiento, Aturdimiento, Envenenamiento y Quemadura. Cada entidad de la escena neutral transporta sus instancias activas con ID, intensidad, cantidad y tiempos canónicos, además del perfil visual ya resuelto. Phaser adjunta la representación al contenedor del actor para que acompañe movimientos y desaparezca con la entidad; Canvas 2D conserva marcas estáticas equivalentes. Al aplicar un estado aparece su nombre (`RALENTIZADO`, `ELECTRIZADO`, `CONGELADO`, `ATURDIDO`, `ENVENENADO` o `QUEMADO`); las renovaciones agregan `RENOVADO` y las intensificaciones muestran `×N`. La Ralentización de Esquirla usa factores 1.40–1.55 y Nova de escarcha 1.60–1.70; la animación de movimiento escala con `costoFinal / costoBase`, por lo que el efecto también se percibe durante el desplazamiento. La escena final reconcilia estados después de cancelaciones y cambios de mapa. El rediseño de Congelamiento como bloqueo de acciones e invulnerabilidad queda reservado para las habilidades avanzadas. P6.3B.1 fue validada manualmente y cerrada en `0c61b97269509d8be8ac35c2e5af78c3a84800ba`.

P6.3B.2 completa el ciclo visual de los estados temporales. `efecto_tick` se convierte en un evento visual propio que precede al daño periódico: Envenenamiento utiliza burbujas que se inflan y estallan, mientras Quemadura utiliza una llamarada ascendente. Las renovaciones actualizan la misma instancia gráfica y realizan un pulso breve sin destruirla; intensidad y cantidad modifican densidad y muestran un indicador persistente `×2` o `×3`. Phaser y Canvas 2D conservan canales espaciales separados para permitir la coexistencia de varios estados sin cubrir el sprite. El evento de daño periódico continúa siendo la única autoridad para el número, la barra de Vida y la derrota. P6.3B.2 fue validada manualmente y cerrada en `ec5933cd5090042f1be6511cbd5ad12ac5a65be3`.

P6.3C.1A abre la representación de habilidades intermedias de área. `habilidad_resuelta` transporta `idEjecucion` para correlacionar los estados derivados y conserva explícitamente el objetivo primario cuando la casilla seleccionada contiene una entidad. `ResolucionEspacialHabilidades` centraliza las políticas canónicas de obstáculos y reutiliza `evaluarLineaVision`: las formas de radio usan `vision_desde_centro`, por lo que la vista previa, el daño, las zonas futuras y la presentación reciben la misma lista de casillas recortada por paredes. `PatronesVisualesHabilidades` separa los patrones reutilizables (`proyectil`, `area_instantanea`, `cadena`, `zona_persistente` y `linea`) de la apariencia concreta definida en `PerfilesHabilidadesVisuales.json`. Phaser incorpora el patrón `area_conjurada` mediante `CreadorAreasHabilidadesPhaser`: Explosión ígnea siempre centra el núcleo en la casilla elegida y muestra fuego en cada casilla afectada; solamente amplifica el golpe sobre una entidad cuando esa entidad fue realmente el objetivo primario. Nova de escarcha nace en el jugador, dibuja fracturas y cristales en todas las casillas canónicas y sincroniza `RALENTIZADO`, renovación o resistencia después del daño correspondiente. Canvas 2D permanece como respaldo funcional sin absorber reglas nuevas. P6.3C.1A fue validada manualmente y cerrada en `8bf47e50eb70ebc552649716a61eb5bbef829f5d`.

P6.3C.1B completa las habilidades intermedias no persistentes mediante Cadena de rayos. `ResolucionEspacialHabilidades` concentra ahora la elección del recorrido: cada salto limita alcance, excluye visitados, reutiliza la línea de visión canónica y elige el candidato visible más cercano con desempate estable. Los tres grados declaran `vision_entre_saltos`, por lo que ningún tramo atraviesa paredes, aunque la cadena puede rodearlas mediante objetivos intermedios visibles. `CreadorCadenasHabilidadesPhaser` representa carga, arcos quebrados, núcleos viajeros e impactos; el objetivo primario recibe énfasis real y los saltos posteriores conservan legibilidad según el multiplicador ya resuelto. Daño, fallo, crítico, Electrización y derrota se reproducen antes de iniciar el siguiente salto. Una muerte retira la entidad y la cadena continúa desde su posición congelada, sin duplicar la derrota ni recalcular el recorrido en Phaser. P6.3C.1B fue validada manualmente y cerrada en `e2e2b859f2e3e25989a73ab057b5f11195e32a0e`.

P6.3C.2A incorpora la representación persistente y reutilizable de zonas temporales. `PerfilesZonasTemporalesVisuales.json` separa las apariencias de veneno, fuego, frío, electricidad y zona genérica de las reglas canónicas. La escena neutral transporta identidad, grado, casillas, tiempos y perfil ya resuelto; `CompositorMundoPhaser` conserva un objeto por `zonaId`, actualiza renovaciones sin duplicar y reconcilia creación, vencimiento, cancelación y cambio de mapa. Nube tóxica reemplaza los rectángulos verdes por manchas, vapor ondulante y burbujas en cada casilla canónica, manteniendo entidades y barras por encima. `zona_conjurada` muestra el despliegue inicial y los resultados ya resueltos; las activaciones posteriores por entrada e intervalo quedan para P6.3C.2B. Canvas 2D conserva una versión simplificada y pulsos de creación, renovación y vencimiento. P6.3C.2A fue validada manualmente y cerrada en `4c124b9b45489dba723f9a70848c59d316229e0c`.

P6.3C.2B completa el ciclo visual de zonas temporales. Cada activación conserva `idEjecucion`, objetivo, posición, daño, Vida anterior/posterior, efectos y derrota; los eventos derivados se colocan inmediatamente después y el planificador los correlaciona con el impacto correcto. `al_crear` reutiliza los impactos de `habilidad_resuelta` sin duplicar daño o Envenenamiento. `al_entrar` reproduce movimiento, remolino local, impacto y estado. `por_intervalo` genera un pulso global aun con la zona vacía y después procesa los ocupantes en orden canónico. Phaser y Canvas 2D presentan estos hechos sin calcular duración, intervalos, objetivos, daño, resistencias o superposición.

La cola dispone de velocidades internas `normal`, `rapida` y `muy-rapida`, aceleración automática cuando se acumulan eventos y una opción de efectos reducidos. P6.1 prepara estas opciones como contrato programático; la pantalla de configuración para el jugador pertenece a una etapa posterior.

Durante combate, interacción o selección de habilidad, el clic izquierdo sobre Phaser mueve el selector canónico y `F` o `R` continúan confirmando. El clic no camina, no inspecciona entidades y no ejecuta acciones automáticamente. Sin un modo de selección activo no emite comandos jugables. El doble clic conserva el recentrado únicamente fuera de esos modos y Canvas 2D mantiene su adaptador histórico.

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

1. agregar plantilla en `mapas.json`;
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

La arquitectura actual ya permite que la lógica principal continúe independiente del backend gráfico. La prioridad para incorporar Phaser debe ser conservar esa separación y reemplazar gradualmente entrada y representación, no reescribir el juego.
