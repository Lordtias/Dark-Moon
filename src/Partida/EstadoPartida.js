// Tipos generales de ubicación que puede ocupar
// el jugador dentro de una partida.
//
// Se mantienen fuera de Juego porque representan
// el progreso global entre distintos mapas.
export const TIPOS_UBICACION_PARTIDA = Object.freeze({
  CIUDAD: "ciudad",
  MAZMORRA: "mazmorra",
});

// Conserva la información que debe sobrevivir
// cuando se destruya un mapa y se cree otro.
//
// Juego administra únicamente el mapa activo.
// EstadoPartida conserva al jugador y el progreso
// general de la sesión completa.
export class EstadoPartida {
  constructor({ jugador } = {}) {
    if (!jugador || typeof jugador !== "object") {
      throw new Error("EstadoPartida necesita un jugador válido.");
    }

    // Conservamos la misma instancia del jugador.
    //
    // Inventario, equipamiento, experiencia,
    // atributos y recursos viajarán con ella
    // cuando cambiemos de mapa.
    this.jugador = jugador;

    // La ubicación se registra después de crear
    // el primer mapa de la partida.
    this._tipoUbicacionActual = null;
    this._idMapaActual = null;

    // Cuenta cuántas veces comenzó el jugador
    // una expedición dentro de una mazmorra.
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

  // Registra cualquier mapa como ubicación activa.
  //
  // Este método será utilizado por el futuro
  // GestorMapasPartida después de cada transición.
  registrarMapaActivo({ tipoUbicacion, idMapa } = {}) {
    validarTipoUbicacion(tipoUbicacion);
    validarIdMapa(idMapa);

    this._tipoUbicacionActual = tipoUbicacion;

    this._idMapaActual = idMapa.trim();

    return this.obtenerResumen();
  }

  // Registra el comienzo de una nueva expedición.
  //
  // Además de cambiar la ubicación, incrementa
  // el contador utilizado posteriormente para
  // renovar el stock aleatorio de los mercaderes.
  iniciarExpedicion({ idMapa } = {}) {
    this.registrarMapaActivo({
      tipoUbicacion: TIPOS_UBICACION_PARTIDA.MAZMORRA,

      idMapa,
    });

    this._expedicionesRealizadas++;

    return this.obtenerResumen();
  }

  // Registra el regreso del jugador a una ciudad.
  regresarACiudad({ idMapa } = {}) {
    return this.registrarMapaActivo({
      tipoUbicacion: TIPOS_UBICACION_PARTIDA.CIUDAD,

      idMapa,
    });
  }

  // Entrega una copia simple para registros,
  // depuración y futuras pantallas de estado.
  obtenerResumen() {
    return {
      tipoUbicacionActual: this._tipoUbicacionActual,

      idMapaActual: this._idMapaActual,

      expedicionesRealizadas: this._expedicionesRealizadas,
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
