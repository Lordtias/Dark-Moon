import { crearConfiguracionMazmorra } from "../juego/configuracion/ConfiguracionInicial.js";

import { configurarContextoGeneracionBotin } from "../juego/botin/ContextoGeneracionBotin.js";

// Administra la creación de los mapas utilizados
// durante una misma partida.
//
// EstadoPartida conserva al jugador y el progreso global.
// GestorMapasPartida crea el contenido de cada mapa activo
// utilizando siempre la misma instancia del jugador.
export class GestorMapasPartida {
  constructor({
    estadoPartida,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionMapas,
  } = {}) {
    validarEstadoPartida(estadoPartida);

    validarConfiguracion(configuracionEnemigos, "enemigos");

    validarConfiguracion(configuracionObjetos, "objetos");

    validarConfiguracion(
      configuracionGeneracionObjetos,
      "generación de objetos",
    );

    validarConfiguracion(configuracionMapas, "mapas");

    this.estadoPartida = estadoPartida;

    this.configuracionEnemigos = configuracionEnemigos;

    this.configuracionObjetos = configuracionObjetos;

    this.configuracionGeneracionObjetos = configuracionGeneracionObjetos;

    this.configuracionMapas = configuracionMapas;

    // Conserva la última configuración generada.
    //
    // Más adelante permitirá consultar el mapa activo
    // sin depender directamente de ControladorPartida.
    this._configuracionMapaActual = null;
  }

  get configuracionMapaActual() {
    return this._configuracionMapaActual;
  }

  // Genera una nueva mazmorra para el jugador persistente.
  //
  // La mazmorra anterior puede descartarse completamente:
  // inventario, equipamiento, experiencia y atributos
  // permanecen dentro de EstadoPartida.jugador.
  crearMazmorra({
    semillaMapa = null,
    idMapaForzado = null,
    botinPrueba = false,
    portalPrueba = false,
  } = {}) {
    const configuracionMapa = crearConfiguracionMazmorra({
      player: this.estadoPartida.jugador,

      configuracionEnemigos: this.configuracionEnemigos,

      configuracionObjetos: this.configuracionObjetos,

      configuracionMapas: this.configuracionMapas,

      semillaMapa,
      idMapaForzado,
      botinPrueba,
      portalPrueba,
    });

    const generacion = configuracionMapa.mapaSeleccionado.generacionActual;

    // Los drops deben utilizar la semilla y el nivel
    // correspondientes al mapa que acaba de activarse.
    configurarContextoGeneracionBotin({
      configuracionGeneracionObjetos: this.configuracionGeneracionObjetos,

      semillaMapa: generacion.semilla,

      nivelMapa: generacion.nivelMapa,
    });

    // El contador se incrementa únicamente después
    // de que la generación haya finalizado correctamente.
    this.estadoPartida.iniciarExpedicion({
      idMapa: configuracionMapa.mapaSeleccionado.id,
    });

    this._configuracionMapaActual = configuracionMapa;

    return configuracionMapa;
  }
}

function validarEstadoPartida(estadoPartida) {
  if (
    !estadoPartida ||
    typeof estadoPartida !== "object" ||
    !estadoPartida.jugador ||
    typeof estadoPartida.iniciarExpedicion !== "function"
  ) {
    throw new Error("GestorMapasPartida necesita un EstadoPartida válido.");
  }
}

function validarConfiguracion(configuracion, nombre) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error(
      `GestorMapasPartida necesita la configuración de ${nombre}.`,
    );
  }
}
