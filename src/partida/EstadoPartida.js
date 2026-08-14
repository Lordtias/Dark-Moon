import {
  eliminarGuardadoJugador,
  guardarJugadorDurable,
} from "./PersistenciaJugador.js";

export const TIPOS_UBICACION_PARTIDA = Object.freeze({
  CIUDAD: "ciudad",
  MAZMORRA: "mazmorra",
});

// Conserva la información que debe sobrevivir cuando se destruye un mapa.
//
// La misma instancia de Player viaja entre ciudad y mazmorras. Cada transición
// válida funciona además como punto seguro de guardado durable del personaje.
export class EstadoPartida {
  constructor({ jugador } = {}) {
    if (!jugador || typeof jugador !== "object") {
      throw new Error("EstadoPartida necesita un jugador válido.");
    }

    this.jugador = jugador;
    this._tipoUbicacionActual = null;
    this._idMapaActual = null;
    this._expedicionesRealizadas = 0;
  }

  get tipoUbicacionActual() {
    return this._tipoUbicacionActual;
  }

  get idMapaActual() {
    return this._idMapaActual;
  }

  get expedicionesRealizadas() {
    return this._expedicionesRealizadas;
  }

  get estaEnCiudad() {
    return this._tipoUbicacionActual === TIPOS_UBICACION_PARTIDA.CIUDAD;
  }

  get estaEnMazmorra() {
    return this._tipoUbicacionActual === TIPOS_UBICACION_PARTIDA.MAZMORRA;
  }

  registrarMapaActivo({ tipoUbicacion, idMapa } = {}) {
    validarTipoUbicacion(tipoUbicacion);
    validarIdMapa(idMapa);

    this._tipoUbicacionActual = tipoUbicacion;
    this._idMapaActual = idMapa.trim();
    this.guardarEstadoDurable();

    return this.obtenerResumen();
  }

  iniciarExpedicion({ idMapa } = {}) {
    this.registrarMapaActivo({
      tipoUbicacion: TIPOS_UBICACION_PARTIDA.MAZMORRA,
      idMapa,
    });
    this._expedicionesRealizadas++;

    return this.obtenerResumen();
  }

  regresarACiudad({ idMapa } = {}) {
    return this.registrarMapaActivo({
      tipoUbicacion: TIPOS_UBICACION_PARTIDA.CIUDAD,
      idMapa,
    });
  }

  guardarEstadoDurable() {
    try {
      return guardarJugadorDurable({
        jugador: this.jugador,
      });
    } catch (error) {
      // Una restricción del navegador no debe impedir una transición
      // válida de mapa. La operación explícita del depurador sí conserva
      // el error para diagnosticar el almacenamiento.
      console.warn("No se pudo guardar durablemente al jugador:", error);
      return {
        exito: false,
        error,
      };
    }
  }

  eliminarEstadoDurable() {
    try {
      return eliminarGuardadoJugador();
    } catch (error) {
      // La derrota debe poder continuar hacia su presentación aunque una
      // política del navegador impida acceder al almacenamiento local.
      console.warn("No se pudo eliminar el guardado durable del jugador:", error);
      return {
        exito: false,
        eliminado: false,
        error,
      };
    }
  }

  obtenerResumen() {
    return {
      tipoUbicacionActual: this._tipoUbicacionActual,
      idMapaActual: this._idMapaActual,
      expedicionesRealizadas: this._expedicionesRealizadas,
      progresoHabilidades:
        typeof this.jugador.obtenerResumenProgresoHabilidades === "function"
          ? this.jugador.obtenerResumenProgresoHabilidades()
          : null,
    };
  }
}

function validarTipoUbicacion(tipoUbicacion) {
  const tiposValidos = Object.values(TIPOS_UBICACION_PARTIDA);

  if (!tiposValidos.includes(tipoUbicacion)) {
    throw new Error(`El tipo de ubicación "${tipoUbicacion}" no es válido.`);
  }
}

function validarIdMapa(idMapa) {
  if (typeof idMapa !== "string" || idMapa.trim() === "") {
    throw new Error("EstadoPartida necesita un ID de mapa válido.");
  }
}
