// Coordina las dos formas de iniciar una sesión: personaje nuevo y guardado.
// No conoce la interfaz ni construye reglas de juego; recibe esas decisiones
// mediante contratos para que Aplicacion conserve la responsabilidad visual.
export class CoordinadorInicioPartida {
  constructor({
    obtenerControladorPartida,
    obtenerConfiguracionInicioPartida,
    crearJugadorDesdeGuardado,
    eliminarGuardadoJugador,
    eliminarConfiguracionBarraHabilidades,
    alGuardadoInexistente,
    alErrorContinuar,
    alNuevoJuegoConfirmado,
    alAdvertenciaLimpieza,
  } = {}) {
    validarFuncion(obtenerControladorPartida, "obtenerControladorPartida");
    validarFuncion(
      obtenerConfiguracionInicioPartida,
      "obtenerConfiguracionInicioPartida",
    );
    validarFuncion(crearJugadorDesdeGuardado, "crearJugadorDesdeGuardado");
    validarFuncion(eliminarGuardadoJugador, "eliminarGuardadoJugador");
    validarFuncion(
      eliminarConfiguracionBarraHabilidades,
      "eliminarConfiguracionBarraHabilidades",
    );
    validarFuncion(alGuardadoInexistente, "alGuardadoInexistente");
    validarFuncion(alErrorContinuar, "alErrorContinuar");
    validarFuncion(alNuevoJuegoConfirmado, "alNuevoJuegoConfirmado");
    validarFuncion(alAdvertenciaLimpieza, "alAdvertenciaLimpieza");

    this.obtenerControladorPartida = obtenerControladorPartida;
    this.obtenerConfiguracionInicioPartida =
      obtenerConfiguracionInicioPartida;
    this.crearJugadorDesdeGuardado = crearJugadorDesdeGuardado;
    this.eliminarGuardadoJugador = eliminarGuardadoJugador;
    this.eliminarConfiguracionBarraHabilidades =
      eliminarConfiguracionBarraHabilidades;
    this.alGuardadoInexistente = alGuardadoInexistente;
    this.alErrorContinuar = alErrorContinuar;
    this.alNuevoJuegoConfirmado = alNuevoJuegoConfirmado;
    this.alAdvertenciaLimpieza = alAdvertenciaLimpieza;
  }

  continuar({ guardadoValido = false } = {}) {
    const controladorPartida = this.obtenerControladorPartida();
    if (!guardadoValido || controladorPartida?.partidaIniciada) {
      return false;
    }

    try {
      const jugadorRestaurado = this.crearJugadorDesdeGuardado();
      if (!jugadorRestaurado) {
        this.alGuardadoInexistente();
        return false;
      }

      return controladorPartida.iniciar({
        jugadorRestaurado,
        ...this.obtenerConfiguracionInicioPartida(),
      });
    } catch (error) {
      this.alErrorContinuar(error);
      return false;
    }
  }

  iniciarNuevoJuego(datosPersonaje) {
    // La limpieza ocurre solamente al confirmar el personaje. Conserva el
    // orden heredado para que cancelar la creación no altere un guardado.
    try {
      this.eliminarGuardadoJugador();
    } catch (error) {
      this.alAdvertenciaLimpieza({ recurso: "guardado", error });
    }

    try {
      this.eliminarConfiguracionBarraHabilidades();
    } catch (error) {
      this.alAdvertenciaLimpieza({ recurso: "barra", error });
    }

    this.alNuevoJuegoConfirmado();

    return this.obtenerControladorPartida().iniciar({
      datosPersonaje,
      ...this.obtenerConfiguracionInicioPartida(),
    });
  }
}

function validarFuncion(valor, nombre) {
  if (typeof valor !== "function") {
    throw new Error(`CoordinadorInicioPartida necesita "${nombre}".`);
  }
}
