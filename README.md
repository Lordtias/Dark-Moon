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
- interfaz HTML con representación del mapa mediante Canvas 2D;
- persistencia durable del jugador y de la barra de habilidades;
- depurador accesible desde la consola;
- balanceador independiente en `balance.html`.

No se utiliza un empaquetador, servidor de aplicación, framework de interfaz ni framework de juego.

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
      └─ src/aplicacion/Aplicacion.js
```

`game.js` crea una única instancia de `Aplicacion`, publica las herramientas de consola y comienza el arranque:

```js
globalThis.darkMoonAplicacion
globalThis.darkMoonDebug
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
├─ assets/                       Recursos visuales y licencias.
├─ src/
│  ├─ aplicacion/                Arranque y coordinación de la sesión.
│  ├─ partida/                   Estado que sobrevive a los cambios de mapa.
│  ├─ config/                    Datos JSON y constantes generales.
│  ├─ controles/                 Entrada DOM y coordinación de acciones visuales.
│  ├─ entidad/                   Entidades del mundo y combatientes.
│  ├─ interfaz/                  Paneles, modales y representación visual.
│  ├─ juego/                     Motores y reglas jugables.
│  ├─ herramientas/              Balance y depuración para desarrollo.
│  └─ objetos/                   Modelo base de objetos, inventario y equipo.
├─ index.html                    Página principal del juego.
├─ balance.html                  Herramienta de análisis de balance.
├─ game.js                       Composición y arranque principal.
├─ *.css                         Estilos generales y de componentes.
└─ README.md                     Este documento.
```

### Regla práctica para encontrar código

- Si define **qué puede ocurrir en el juego**, buscar en `src/juego/`.
- Si representa un **actor u objeto con estado**, buscar en `src/entidad/` o `src/objetos/`.
- Si conecta botones, teclado o ventanas con el juego, buscar en `src/controles/`.
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
   ↓
Aplicacion
   ↓
ControladorPartida
   ↓
EstadoPartida + Gestores persistentes
   ↓
Juego del mapa activo
   ↓
Motores jugables
   ↓
ResultadoAccion
   ↓
ProcesadorResultadoAccion
   ↓
Renderizador + paneles y modales DOM
```

### Responsabilidades principales

#### `Aplicacion`

`src/aplicacion/Aplicacion.js`

- localiza los elementos iniciales del DOM;
- crea los controladores generales;
- carga y valida los JSON;
- crea el menú de personaje;
- inicia una nueva sesión.

Confirmar un personaje representa una partida nueva. Antes de iniciarla se eliminan:

- el guardado durable anterior;
- la configuración anterior de la barra de habilidades.

#### `ControladorPartida`

`src/aplicacion/ControladorPartida.js`

Coordina toda la sesión:

- crea al jugador;
- crea `EstadoPartida`;
- crea los gestores de mapas y mercaderes;
- crea una única interfaz persistente;
- activa ciudad o mazmorra;
- reemplaza `Juego` y sus controladores al cambiar de mapa;
- conecta habilidades, inventario, comercio e interacciones;
- destruye correctamente los sistemas del mapa anterior.

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
- dibuja el mapa mediante Canvas;
- actualiza panel de personaje, inventario y equipamiento;
- administra el registro de mensajes.

#### `ProcesadorResultadoAccion`

`src/controles/ProcesadorResultadoAccion.js`

Recibe los resultados producidos por el juego y centraliza:

- normalización;
- mensajes;
- redibujado;
- notificación de derrota.

Actualmente la derrota visual se comunica mediante el evento DOM:

```text
dark-moon:jugador-derrotado
```

Este punto es una frontera natural para una presentación futura que no dependa del DOM.

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

El patrón general es:

```text
Entrada DOM
   ↓
Controlador
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
- Movimiento o clic en Canvas: mover/fijar selector.
- `F`: confirmar.
- `Escape`: cancelar.

Inventario, equipamiento, comercio, curación y paneles se operan mediante la interfaz HTML.

### Dependencia actual a separar en el futuro

`ControladorTeclado` y `ControladorEntradaHabilidades` detectan entrada y llaman directamente a acciones de `Juego` o `SistemaHabilidadesJugador`.

Una integración futura con Phaser debe reutilizar las mismas acciones y no copiar sus reglas. La forma recomendada es introducir un ejecutor de comandos compartido entre DOM, Phaser, consola y pruebas deterministas.

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

Cuando el jugador muere, `ProcesadorResultadoAccion` emite el evento de derrota una sola vez por instancia de `Juego`, y `ControladorDerrota` muestra el modal correspondiente.

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
src/controles/ControladorComercio.js
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
src/juego/habilidades/IntegracionHabilidadesJugador.js
src/juego/habilidades/EstadoSesionHabilidades.js
src/juego/habilidades/GeometriaHabilidades.js
src/juego/habilidades/MotorDanioHabilidad.js
src/juego/habilidades/MotorEfectosHabilidad.js
src/juego/habilidades/ControladorEntradaHabilidades.js
src/juego/habilidades/ObservadorProgresoMagico.js
```

### División de responsabilidades

- `ContextoProgresoMagico`: carga y valida catálogos.
- `ProgresoMagicoJugador`: progreso durable.
- `SistemaHabilidadesJugador`: selección, validación y ejecución.
- `GeometriaHabilidades`: casillas y formas de impacto.
- `MotorDanioHabilidad`: daño de habilidad.
- `MotorEfectosHabilidad`: aplicación de efectos.
- `IntegracionHabilidadesJugador`: conecta un `Juego` activo con barra, panel, entrada y persistencia.
- `BarraHabilidades`: presentación de las diez ranuras.
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

### Interfaz HTML

`src/interfaz/FabricaInterfazPartida.js` crea los componentes principales utilizando elementos ya declarados en `index.html`:

- renderizador;
- panel del personaje;
- inventario;
- equipamiento;
- detalle de objetos;
- contenedores;
- selección de mazmorras;
- comercio.

Otros componentes se crean cuando son necesarios, como el modal de curación y la integración de habilidades.

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

## 24. Preparación para una futura integración con Phaser

Phaser debe incorporarse como una nueva capa de entrada y representación, no como reemplazo de las reglas del juego.

Arquitectura objetivo gradual:

```text
Interfaz DOM actual ─────┐
Phaser futuro ───────────┼─> comando o acción compartida
Consola/pruebas ─────────┘              ↓
                                      Juego
                                        ↓
                                  ResultadoAccion
                                        ↓
Canvas/DOM actual ────────┐
Phaser futuro ────────────┘
```

### Piezas que ya pueden reutilizarse

- `Juego` como fachada del mapa activo;
- motores de combate, tiempo, movimiento, objetos y habilidades;
- `ResultadoAccion`;
- `AdaptadorEscenaJuego`;
- `TiposEscena`;
- rutas de assets declaradas en configuraciones;
- gestores persistentes de partida;
- balanceador y depurador.

### Preparaciones concretas pendientes

1. Separar detección de teclado de ejecución de acciones.
2. Permitir que las acciones sean llamadas mediante comandos compartidos.
3. Reemplazar la notificación DOM de derrota por un callback o adaptador pequeño, manteniendo el evento DOM actual.
4. Separar la construcción concreta de la interfaz DOM del arranque general de `Aplicacion`.
5. Formalizar el contrato de escena visual que consumirá Canvas o Phaser.

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
- no se duplicaron fórmulas;
- no se creó una segunda fuente de verdad;
- no aparecieron errores en consola;
- `git diff --check` no informa errores.

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
