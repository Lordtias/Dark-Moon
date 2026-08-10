import { MedidorFluidezPartida } from "./diagnostico/MedidorFluidezPartida.js";

const ESTADOS_ENTRADA_JUGABLE = Object.freeze({
  DISPONIBLE: "disponible",
  RESOLVIENDO: "resolviendo",
  ESPERANDO_PRESENTACION: "esperando_presentacion",
});

// Coordina la compuerta única de entrada jugable de la aplicación.
//
// No interpreta comandos ni aplica reglas del juego. Su responsabilidad es
// aceptar una sola entrada, mantenerla bloqueada durante la resolución y,
// cuando consume turno, esperar el punto seguro de la presentación antes de
// devolver el control. También conserva la medición de fluidez asociada a ese
// ciclo sin acoplarse a un renderizador concreto.
export class CoordinadorEntradaJugable {
  constructor({
    obtenerContexto = () => null,
    obtenerDiagnosticoPresentacion = () => null,
    esperarPresentacionPendiente = () => null,
    medidorFluidez = null,
  } = {}) {
    validarFuncion(obtenerContexto, "obtener el contexto de diagnóstico");
    validarFuncion(
      obtenerDiagnosticoPresentacion,
      "obtener el diagnóstico de presentación",
    );
    validarFuncion(
      esperarPresentacionPendiente,
      "esperar la presentación pendiente",
    );

    this.obtenerContexto = obtenerContexto;
    this.obtenerDiagnosticoPresentacion = obtenerDiagnosticoPresentacion;
    this.esperarPresentacionPendiente = esperarPresentacionPendiente;
    this.medidorFluidez = medidorFluidez ?? new MedidorFluidezPartida();

    this.estado = ESTADOS_ENTRADA_JUGABLE.DISPONIBLE;
    this.versionSincronizacion = 0;
    this.secuenciaEntrada = 0;
    this.entradaActiva = null;
  }

  ejecutar({
    tipoEntrada = "accion",
    origenEntrada = "desconocido",
    ejecutarLogica,
    obtenerResultadoTemporal,
    procesarResultado,
  } = {}) {
    validarFuncion(ejecutarLogica, "ejecutar la lógica jugable");
    validarFuncion(
      obtenerResultadoTemporal,
      "obtener el resultado temporal de la acción",
    );
    validarFuncion(procesarResultado, "procesar el resultado de la acción");

    const contextoMedicion = this.obtenerContexto();
    if (!this.puedeAceptar()) {
      this.medidorFluidez.registrarEntradaDescartada({
        tipo: tipoEntrada,
        origen: origenEntrada,
        contexto: contextoMedicion,
      });
      return { aceptada: false, resultado: null };
    }

    const tokenEntrada = this.bloquear();
    const muestra = this.medidorFluidez.iniciarMuestra({
      tipo: tipoEntrada,
      origen: origenEntrada,
      contexto: contextoMedicion,
    });

    let resultadoLogico;
    try {
      resultadoLogico = ejecutarLogica();
    } catch (error) {
      this.medidorFluidez.registrarFinLogica(muestra, null);
      this.medidorFluidez.registrarFinPreparacion(muestra);
      this.medidorFluidez.completar(muestra, {
        estado: "error_logica",
        incluirEsperaVisual: false,
      });
      this.liberar(tokenEntrada);
      throw error;
    }

    const resultadoTemporal = obtenerResultadoTemporal(resultadoLogico);
    this.medidorFluidez.registrarFinLogica(muestra, resultadoTemporal);
    const consumeTurno = resultadoTemporal?.turnoConsumido === true;

    const idPresentacionAntes =
      this.obtenerDiagnosticoPresentacion()?.idPresentacion ?? null;
    let resultadoProcesado;
    try {
      resultadoProcesado = procesarResultado(resultadoLogico);
      const diagnosticoPresentacion =
        this.obtenerDiagnosticoPresentacion() ?? null;
      const huboNuevaPresentacion =
        diagnosticoPresentacion?.idPresentacion !== undefined &&
        diagnosticoPresentacion.idPresentacion !== idPresentacionAntes;
      this.medidorFluidez.registrarFinPreparacion(
        muestra,
        huboNuevaPresentacion ? diagnosticoPresentacion : null,
      );
    } catch (error) {
      this.medidorFluidez.registrarFinPreparacion(muestra);
      this.medidorFluidez.completar(muestra, {
        estado: "error_presentacion",
        incluirEsperaVisual: false,
      });
      this.liberar(tokenEntrada);
      throw error;
    }

    if (!consumeTurno) {
      this.medidorFluidez.completar(muestra, {
        incluirEsperaVisual: false,
      });
      this.liberar(tokenEntrada);
      return { aceptada: true, resultado: resultadoProcesado };
    }

    this.estado = ESTADOS_ENTRADA_JUGABLE.ESPERANDO_PRESENTACION;
    this.esperarPuntoSeguroPresentacion({ tokenEntrada, muestra });
    return { aceptada: true, resultado: resultadoProcesado };
  }

  puedeAceptar() {
    return (
      this.estado === ESTADOS_ENTRADA_JUGABLE.DISPONIBLE &&
      this.entradaActiva === null
    );
  }

  invalidarSincronizacion() {
    this.versionSincronizacion += 1;
    this.entradaActiva = null;
    this.estado = ESTADOS_ENTRADA_JUGABLE.DISPONIBLE;
  }

  obtenerResumen() {
    return {
      estadoEntradaJugable: this.estado,
      ...this.medidorFluidez.obtenerResumen(),
    };
  }

  reiniciarMedicion() {
    return this.medidorFluidez.reiniciar();
  }

  bloquear() {
    const tokenEntrada = Object.freeze({
      id: ++this.secuenciaEntrada,
      versionMapa: this.versionSincronizacion,
    });

    this.entradaActiva = tokenEntrada;
    this.estado = ESTADOS_ENTRADA_JUGABLE.RESOLVIENDO;
    return tokenEntrada;
  }

  liberar(tokenEntrada) {
    if (!this.esTokenActivo(tokenEntrada)) {
      return false;
    }

    this.entradaActiva = null;
    this.estado = ESTADOS_ENTRADA_JUGABLE.DISPONIBLE;
    return true;
  }

  esTokenActivo(tokenEntrada) {
    return Boolean(
      tokenEntrada &&
        this.entradaActiva === tokenEntrada &&
        tokenEntrada.versionMapa === this.versionSincronizacion,
    );
  }

  esperarPuntoSeguroPresentacion({ tokenEntrada, muestra }) {
    // Una transición puede reemplazar el mapa durante el procesamiento del
    // resultado. En ese caso el token anterior ya no gobierna la nueva escena.
    if (!this.esTokenActivo(tokenEntrada)) {
      this.medidorFluidez.completar(muestra, {
        estado: "mapa_reemplazado",
        incluirEsperaVisual: false,
      });
      return;
    }

    let esperaPresentacion = null;
    try {
      esperaPresentacion = this.esperarPresentacionPendiente();
    } catch (error) {
      this.medidorFluidez.completar(muestra, {
        estado: "error_espera_visual",
        incluirEsperaVisual: false,
      });
      this.liberar(tokenEntrada);
      console.error(
        "No se pudo consultar el punto seguro de presentación:",
        error,
      );
      return;
    }

    if (!esperaPresentacion || typeof esperaPresentacion.then !== "function") {
      this.medidorFluidez.completar(muestra, {
        incluirEsperaVisual: false,
      });
      this.liberar(tokenEntrada);
      return;
    }

    const finalizarEspera = (estado = "completada") => {
      const estadoFinal = this.esTokenActivo(tokenEntrada)
        ? estado
        : "mapa_reemplazado";
      this.medidorFluidez.completar(muestra, { estado: estadoFinal });
      this.liberar(tokenEntrada);
    };

    esperaPresentacion.then(
      () => finalizarEspera(),
      (error) => {
        console.error(
          "La presentación pendiente terminó con error; se libera la entrada:",
          error,
        );
        finalizarEspera("error_espera_visual");
      },
    );
  }
}

function validarFuncion(valor, descripcion) {
  if (typeof valor !== "function") {
    throw new Error(
      `CoordinadorEntradaJugable necesita una función para ${descripcion}.`,
    );
  }
}
