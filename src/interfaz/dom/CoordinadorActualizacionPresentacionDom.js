// Centraliza la invalidación de valores derivados visibles en la interfaz.
// Los sistemas de dominio no entregan números calculados a la presentación:
// solamente cambian estado canónico y emiten una invalidación genérica.
export class CoordinadorActualizacionPresentacionDom {
  constructor({
    esPresentacionActiva = () => true,
    actualizarEstadoJugador,
    actualizarHabilidades,
  } = {}) {
    if (typeof esPresentacionActiva !== "function") {
      throw new Error(
        "El coordinador de actualización necesita comprobar si la presentación sigue activa.",
      );
    }
    if (typeof actualizarEstadoJugador !== "function") {
      throw new Error(
        "El coordinador de actualización necesita un refresco de estado del jugador.",
      );
    }
    if (typeof actualizarHabilidades !== "function") {
      throw new Error(
        "El coordinador de actualización necesita un refresco de habilidades.",
      );
    }

    this.esPresentacionActiva = esPresentacionActiva;
    this.actualizarEstadoJugador = actualizarEstadoJugador;
    this.actualizarHabilidades = actualizarHabilidades;
    this.invalidacionPendiente = crearInvalidacionVacia();
    this.microtareaProgramada = false;
    this.destruido = false;
  }

  invalidar({ estadoJugador = true, habilidades = true, motivo = null } = {}) {
    if (this.destruido) return false;

    this.invalidacionPendiente.estadoJugador ||= estadoJugador === true;
    this.invalidacionPendiente.habilidades ||= habilidades === true;
    if (typeof motivo === "string" && motivo.trim() !== "") {
      this.invalidacionPendiente.motivos.add(motivo.trim());
    }

    if (this.microtareaProgramada) return true;
    this.microtareaProgramada = true;
    queueMicrotask(() => this.procesarPendiente());
    return true;
  }

  procesarPendiente() {
    this.microtareaProgramada = false;
    if (this.destruido) return false;

    const invalidacion = this.invalidacionPendiente;
    this.invalidacionPendiente = crearInvalidacionVacia();

    if (!this.esPresentacionActiva()) return false;

    if (invalidacion.estadoJugador) {
      this.actualizarEstadoJugador({ motivos: [...invalidacion.motivos] });
    }
    if (invalidacion.habilidades) {
      this.actualizarHabilidades({ motivos: [...invalidacion.motivos] });
    }

    return invalidacion.estadoJugador || invalidacion.habilidades;
  }

  destruir() {
    if (this.destruido) return false;
    this.destruido = true;
    this.invalidacionPendiente = crearInvalidacionVacia();
    this.microtareaProgramada = false;
    return true;
  }
}

function crearInvalidacionVacia() {
  return {
    estadoJugador: false,
    habilidades: false,
    motivos: new Set(),
  };
}
