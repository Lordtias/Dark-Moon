// Importamos la función encargada de crear
// el mapa, el jugador y los objetivos iniciales.
import {
  crearConfiguracionInicial,
  TILE_SIZE
} from "./src/juego/ConfiguracionInicial.js";

// Importamos la clase que administra
// el estado y las reglas de la partida.
import {
  Juego
} from "./src/juego/Juego.js";

// Importamos la clase encargada de dibujar
// el juego y actualizar los textos visibles.
import {
  Renderizador
} from "./src/interfaz/Renderizador.js";

// Importamos el cargador del archivo JSON.
import {
  cargarConfiguracionPersonaje
} from "./src/juego/CargadorConfiguracion.js";

// Importamos la pantalla de creación.
import {
  MenuCreacionPersonaje
} from "./src/interfaz/MenuCreacionPersonaje.js";

// Obtenemos las dos pantallas principales.
const pantallaCreacion =
  document.getElementById("characterCreation");

const contenedorJuego =
  document.getElementById("gameContainer");

// Obtenemos los elementos utilizados por el renderizador.
const canvas =
  document.getElementById("gameCanvas");

const statusText =
  document.getElementById("status");

const combatLogText =
  document.getElementById("combatLog");

// Estas variables comenzarán vacías porque la partida
// todavía no debe existir mientras estamos en el menú.
let juego = null;
let renderizador = null;

// Evita que una partida pueda iniciarse dos veces.
let partidaIniciada = false;

/**
 * Crea e inicia una partida utilizando
 * el personaje terminado dentro del menú.
 *
 * @param {Object} datosPersonaje Información seleccionada
 * durante la creación del personaje.
 */
function iniciarPartida(datosPersonaje) {
  // Evitamos crear más de una partida.
  if (partidaIniciada) {
    return;
  }

  partidaIniciada = true;

  // Ocultamos la pantalla de creación.
  pantallaCreacion.classList.add("oculto");

  // Mostramos el canvas y la información del juego.
  contenedorJuego.classList.remove("oculto");

  // Creamos el mapa, los objetivos y el jugador
  // utilizando los datos seleccionados en el menú.
  const configuracionInicial =
    crearConfiguracionInicial(
      datosPersonaje
    );
  
  // Calculamos el tamaño real que necesita el canvas
  // en función de la cantidad de columnas y filas del mapa.
  //
  // Si el mapa es un array de strings,:
  // - configuracionInicial.map.length = cantidad de filas
  // - configuracionInicial.map[0].length = cantidad de columnas
  const cantidadFilas =
    configuracionInicial.map.length;

  const cantidadColumnas =
    configuracionInicial.map[0].length;

  // Ajustamos el tamaño interno del canvas para que
  // coincida exactamente con el tamaño del mapa.
  canvas.width =
    cantidadColumnas * TILE_SIZE;
  canvas.height =
    cantidadFilas * TILE_SIZE;

  // Creamos el objeto encargado de administrar
  // la lógica y el estado de la partida.
  juego =
    new Juego(configuracionInicial);

  // Creamos el objeto encargado de representar
  // visualmente el estado del juego.
  renderizador =
    new Renderizador({
      canvas,
      statusText,
      combatLogText,
      tileSize: TILE_SIZE
    });

  // Activamos los controles solamente cuando
  // la partida ya comenzó.
  document.addEventListener(
    "keydown",
    manejarTecla
  );

  // Dibujamos el estado inicial.
  renderizador.dibujarJuego(juego);
}

/**
 * Convierte la tecla presionada en un movimiento.
 *
 * @param {KeyboardEvent} event Evento del teclado.
 */
function manejarTecla(event) {
  // Protección adicional por si se recibiera
  // un evento antes de crear la partida.
  if (!juego || !renderizador) {
    return;
  }

  // Inicialmente no existe ningún movimiento.
  let movimientoX = 0;
  let movimientoY = 0;

  // Convertimos la tecla en una dirección.
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      movimientoY = -1;
      break;

    case "ArrowDown":
    case "KeyS":
      movimientoY = 1;
      break;

    case "ArrowLeft":
    case "KeyA":
      movimientoX = -1;
      break;

    case "ArrowRight":
    case "KeyD":
      movimientoX = 1;
      break;

    // Ignoramos cualquier otra tecla.
    default:
      return;
  }

  // Evitamos que las flechas desplacen la página.
  event.preventDefault();

  // Juego decide si el jugador se mueve,
  // ataca o encuentra una pared.
  const resultado =
    juego.moverJugador(
      movimientoX,
      movimientoY
    );

  // Mostramos el mensaje producido por la acción.
  if (resultado.mensaje !== null) {
    renderizador.mostrarMensaje(
      resultado.mensaje
    );
  }

  // Solo dibujamos nuevamente cuando la acción
  // modificó el estado de la partida.
  if (resultado.turnoConsumido) {
    renderizador.dibujarJuego(juego);
  }
}

/**
 * Carga el JSON y construye la pantalla
 * de creación del personaje.
 */
async function iniciarAplicacion() {
  try {
    // Leemos profesiones, atributos, límites y pesos.
    const configuracionPersonaje =
      await cargarConfiguracionPersonaje();

    // Construimos el menú utilizando la configuración.
    new MenuCreacionPersonaje({
      configuracion:
        configuracionPersonaje,

      // MenuCreacionPersonaje entrega aquí el objeto
      // con el nombre, profesión y atributos elegidos.
      alConfirmar: (datosPersonaje) => {
          iniciarPartida(
              datosPersonaje
          );
      }
    });

  } catch (error) {
    // Conservamos el error técnico en la consola
    // para facilitar su diagnóstico.
    console.error(
      "No se pudo iniciar la aplicación:",
      error
    );

    // Mostramos también un mensaje comprensible
    // dentro de la propia pantalla.
    const mensaje =
      document.getElementById(
        "creationMessage"
      );

    mensaje.textContent =
      "No se pudo cargar la configuración del personaje.";
  }
}

// La aplicación comienza cargando el menú,
// no creando directamente la partida.
iniciarAplicacion();