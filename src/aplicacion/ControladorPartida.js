// Función encargada de crear el mapa,
// jugador, enemigos y objetos iniciales.
import {
  crearConfiguracionInicial,
  TILE_SIZE,
} from "../juego/ConfiguracionInicial.js";

// Clase principal que administra las reglas
// y el estado de una partida.
import { Juego } from "../juego/Juego.js";

// Fábrica que construye el canvas,
// los paneles y el renderizador.
import { crearInterfazPartida } from "../interfaz/FabricaInterfazPartida.js";

// Controlador que convierte las teclas
// en acciones dentro de la partida.
import { ControladorTeclado } from "../controles/ControladorTeclado.js";

// ControladorPartida coordina la creación
// y activación de una partida.
//
// No carga archivos JSON ni administra
// el menú de creación del personaje.
export class ControladorPartida {
  constructor({ controladorPantallas } = {}) {
    if (
      !controladorPantallas ||
      typeof controladorPantallas.mostrarPartida !== "function"
    ) {
      throw new Error(
        "ControladorPartida necesita un controlador de pantallas.",
      );
    }

    this.controladorPantallas = controladorPantallas;

    // Estas referencias solamente existirán
    // después de iniciar una partida.
    this.juego = null;
    this.renderizador = null;
    this.controladorTeclado = null;

    // Evita iniciar dos partidas simultáneas.
    this.partidaIniciada = false;
  }

  // Construye y activa una partida completa.
  iniciar({
    datosPersonaje,
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
  } = {}) {
    if (this.partidaIniciada) {
      return false;
    }

    // Creamos la configuración completa
    // con mapa, jugador, enemigos y objetos.
    const configuracionInicial = crearConfiguracionInicial({
      datosPersonaje,
      configuracionPersonaje,
      configuracionEnemigos,
      configuracionObjetos,
    });

    // Construimos todos los componentes
    // visuales de la pantalla de partida.
    const { canvas, renderizador } = crearInterfazPartida({
      tileSize: TILE_SIZE,
    });

    // Calculamos las dimensiones reales del mapa.
    const cantidadFilas = configuracionInicial.map.length;

    const cantidadColumnas = configuracionInicial.map[0].length;

    // Ajustamos el tamaño interno del canvas.
    canvas.width = cantidadColumnas * TILE_SIZE;

    canvas.height = cantidadFilas * TILE_SIZE;

    // Creamos el estado y las reglas del juego.
    const juego = new Juego(configuracionInicial);

    // Creamos el controlador de movimiento.
    const controladorTeclado = new ControladorTeclado({
      juego,
      renderizador,
    });

    // Conservamos las referencias por si luego
    // necesitamos pausar o finalizar la partida.
    this.juego = juego;
    this.renderizador = renderizador;
    this.controladorTeclado = controladorTeclado;

    this.partidaIniciada = true;

    // Mostramos la pantalla del juego.
    this.controladorPantallas.mostrarPartida();

    // Activamos los controles.
    this.controladorTeclado.activar();

    // Dibujamos el estado inicial.
    this.renderizador.dibujarJuego(this.juego);

    return true;
  }

  // Detiene la recepción de controles.
  //
  // Más adelante podrá utilizarse al pausar,
  // terminar o abandonar una partida.
  desactivarControles() {
    if (!this.controladorTeclado) {
      return;
    }

    this.controladorTeclado.desactivar();
  }
}
