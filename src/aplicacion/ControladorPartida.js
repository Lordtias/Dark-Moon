import {
  crearConfiguracionInicial,
  TILE_SIZE,
} from "../juego/ConfiguracionInicial.js";

import { Juego } from "../juego/Juego.js";

import { crearInterfazPartida } from "../interfaz/FabricaInterfazPartida.js";

import { ControladorTeclado } from "../controles/ControladorTeclado.js";

import { ControladorEquipamiento } from "../controles/ControladorEquipamiento.js";

// Coordina la creación y activación
// de una partida completa.
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

    this.juego = null;
    this.renderizador = null;
    this.controladorTeclado = null;
    this.controladorEquipamiento = null;

    this.partidaIniciada = false;
  }

  iniciar({
    datosPersonaje,
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
  } = {}) {
    if (this.partidaIniciada) {
      return false;
    }

    const configuracionInicial = crearConfiguracionInicial({
      datosPersonaje,
      configuracionPersonaje,
      configuracionEnemigos,
      configuracionObjetos,
    });

    const { canvas, renderizador, panelInventario, panelEquipamiento } =
      crearInterfazPartida({
        tileSize: TILE_SIZE,
      });

    const cantidadFilas = configuracionInicial.map.length;

    const cantidadColumnas = configuracionInicial.map[0].length;

    canvas.width = cantidadColumnas * TILE_SIZE;

    canvas.height = cantidadFilas * TILE_SIZE;

    const juego = new Juego(configuracionInicial);

    const controladorTeclado = new ControladorTeclado({
      juego,
      renderizador,
    });

    const controladorEquipamiento = new ControladorEquipamiento({
      juego,
      renderizador,
      panelInventario,
      panelEquipamiento,
    });

    this.juego = juego;
    this.renderizador = renderizador;
    this.controladorTeclado = controladorTeclado;

    this.controladorEquipamiento = controladorEquipamiento;

    this.partidaIniciada = true;

    this.controladorPantallas.mostrarPartida();

    this.controladorTeclado.activar();

    this.controladorEquipamiento.activar();

    this.renderizador.dibujarJuego(this.juego);

    return true;
  }

  desactivarControles() {
    this.controladorTeclado?.desactivar();

    this.controladorEquipamiento?.desactivar();
  }
}
