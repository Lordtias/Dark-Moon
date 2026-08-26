import { notificarCambioEstadoJugador } from "../juego/estado/ObservadorCambiosEstadoJugador.js";
import { aplicarResultadoAccion } from "./ProcesadorResultadoAccion.js";
import { TIPOS_COMANDO_JUGADOR } from "./EjecutorAccionesJugador.js";

// Coordina la entrada de juego y la presentación de sus resultados. No posee
// estado de partida ni reglas: siempre consulta el mapa activo de la sesión.
export class CoordinadorComandosPartida {
  constructor({
    coordinadorEntradaJugable,
    obtenerContextoMapaActivo,
    alJugadorDerrotado,
  } = {}) {
    validarCoordinadorEntrada(coordinadorEntradaJugable);
    validarFuncion(obtenerContextoMapaActivo, "obtenerContextoMapaActivo");
    validarFuncion(alJugadorDerrotado, "alJugadorDerrotado");

    this.coordinadorEntradaJugable = coordinadorEntradaJugable;
    this.obtenerContextoMapaActivo = obtenerContextoMapaActivo;
    this.alJugadorDerrotado = alJugadorDerrotado;
  }

  ejecutarComandoJugador(comando) {
    const origenEntrada = comando?.origenEntrada ?? "comando";
    const tipoEntrada = comando?.tipo ?? "comando";

    const ejecucion = this.ejecutarConControlEntrada({
      tipoEntrada,
      origenEntrada,
      ejecutarLogica: () => this.ejecutarComandoSinControlEntrada(comando),
      obtenerResultadoTemporal: (contexto) => contexto?.resultado ?? null,
      procesarResultado: (contexto) =>
        this.procesarContextoComandoJugador(contexto),
    });

    return ejecucion.aceptada ? ejecucion.resultado : null;
  }

  ejecutarAccionJugable({
    tipoEntrada = "accion",
    origenEntrada = "dom",
    ejecutar,
    procesarResultado = true,
    presentarInteraccion = false,
  } = {}) {
    if (typeof ejecutar !== "function") {
      throw new Error(
        "La entrada jugable necesita una acción válida para ejecutar.",
      );
    }

    return this.ejecutarConControlEntrada({
      tipoEntrada,
      origenEntrada,
      ejecutarLogica: ejecutar,
      obtenerResultadoTemporal: (resultado) => resultado,
      procesarResultado: (resultado) => {
        if (!procesarResultado) {
          return resultado;
        }

        const resultadoProcesado = this.procesarResultadoAccion(resultado);
        if (presentarInteraccion) {
          this.presentarInteraccionResultado(resultadoProcesado);
        }
        return resultadoProcesado;
      },
    });
  }

  procesarResultadoAccion(resultado) {
    const { juego, renderizador } = this.obtenerContextoMapaActivo();
    const procesado = aplicarResultadoAccion({
      resultado,
      juego,
      renderizador,
      alJugadorDerrotado: this.alJugadorDerrotado,
    });

    if (procesado) {
      const estadoJugadorYaActualizado =
        procesado.turnoConsumido === true || procesado.redibujar === true;

      // Toda acción jugable converge aquí. La capa visual recibe únicamente
      // una invalidación genérica y vuelve a consultar el estado canónico.
      notificarCambioEstadoJugador(juego?.player, {
        origen: "resultado_accion",
        tipo: "procesarResultadoAccion",
        estadoJugador: !estadoJugadorYaActualizado,
        habilidades: true,
        guardarJugador: false,
        motivo: "resultado_accion",
      });
    }

    return procesado;
  }

  ejecutarComandoSinControlEntrada(comando) {
    const contextoMapa = this.obtenerContextoMapaActivo();
    this.validarMapaActivoParaEntrada(contextoMapa, "comando");

    const integracionHabilidades =
      contextoMapa.presentacionMapaActivo?.obtenerIntegracionHabilidades() ??
      null;
    const contextoHabilidad = crearContextoHabilidadParaComando({
      comando,
      integracionHabilidades,
    });
    const contextoProcesamiento = contextoHabilidad.esComandoHabilidad
      ? integracionHabilidades.iniciarProcesamientoComando({
          suprimirRedibujado: contextoHabilidad.esConfirmacion,
        })
      : null;

    let resultado;
    try {
      resultado = contextoMapa.ejecutorAccionesJugador.ejecutar(comando);
    } catch (error) {
      integracionHabilidades?.cancelarProcesamientoComando(
        contextoProcesamiento,
      );
      throw error;
    }

    return {
      comando,
      resultado,
      contextoHabilidad,
      contextoProcesamiento,
      integracionHabilidades,
    };
  }

  procesarContextoComandoJugador(contexto) {
    const {
      comando,
      resultado,
      contextoHabilidad,
      contextoProcesamiento,
      integracionHabilidades,
    } = contexto;

    const estadoProcesamiento = contextoProcesamiento
      ? integracionHabilidades.finalizarProcesamientoComando(
          contextoProcesamiento,
        )
      : { cambioEmitido: false };

    const resultadoHabilidad = this.procesarResultadoComandoHabilidad({
      comando,
      resultado,
      contextoHabilidad,
      estadoProcesamiento,
    });

    if (resultadoHabilidad.procesado) {
      return resultadoHabilidad.resultado;
    }

    const resultadoParaProcesar = this.incorporarOrientacionInteraccion({
      comando,
      resultado,
    });
    const resultadoProcesado = this.procesarResultadoAccion(
      resultadoParaProcesar,
    );
    this.presentarDetalleEntidadResultado(resultadoProcesado);
    this.presentarInteraccionResultado(resultadoProcesado);
    return resultadoProcesado;
  }

  ejecutarConControlEntrada({
    tipoEntrada,
    origenEntrada,
    ejecutarLogica,
    obtenerResultadoTemporal,
    procesarResultado,
  }) {
    this.validarMapaActivoParaEntrada(this.obtenerContextoMapaActivo());

    return this.coordinadorEntradaJugable.ejecutar({
      tipoEntrada,
      origenEntrada,
      ejecutarLogica,
      obtenerResultadoTemporal,
      procesarResultado,
    });
  }

  validarMapaActivoParaEntrada(contextoMapa, tipoEntrada = "entrada") {
    if (
      !contextoMapa.partidaIniciada ||
      !contextoMapa.juego ||
      !contextoMapa.renderizador ||
      !contextoMapa.ejecutorAccionesJugador
    ) {
      const mensaje =
        tipoEntrada === "comando"
          ? "No se puede ejecutar un comando sin un mapa activo."
          : "No se puede ejecutar una entrada jugable sin un mapa activo.";
      throw new Error(mensaje);
    }
  }

  incorporarOrientacionInteraccion({ comando, resultado } = {}) {
    const { juego } = this.obtenerContextoMapaActivo();
    if (
      comando?.tipo !== TIPOS_COMANDO_JUGADOR.INTERACTUAR_O_CONFIRMAR ||
      !resultado?.entidad ||
      !juego?.player
    ) {
      return resultado;
    }

    const actor = juego.player;
    const objetivo = resultado.entidad;
    if (
      !Number.isFinite(actor.x) ||
      !Number.isFinite(actor.y) ||
      !Number.isFinite(objetivo.x) ||
      !Number.isFinite(objetivo.y) ||
      (actor.x === objetivo.x && actor.y === objetivo.y)
    ) {
      return resultado;
    }

    return {
      ...resultado,
      redibujar: true,
      orientacionesSolicitadas: [
        ...(Array.isArray(resultado.orientacionesSolicitadas)
          ? resultado.orientacionesSolicitadas
          : []),
        Object.freeze({
          entidad: actor,
          origen: Object.freeze({ x: actor.x, y: actor.y }),
          objetivo: Object.freeze({ x: objetivo.x, y: objetivo.y }),
        }),
      ],
    };
  }

  presentarDetalleEntidadResultado(resultado) {
    if (!resultado?.detalleEntidad) {
      return false;
    }

    const { presentacionMapaActivo } = this.obtenerContextoMapaActivo();
    if (!presentacionMapaActivo) {
      throw new Error(
        "No se puede presentar el detalle de una entidad sin un mapa activo.",
      );
    }

    presentacionMapaActivo.presentarDetalleEntidad(resultado.detalleEntidad);
    return true;
  }

  presentarInteraccionResultado(resultado) {
    if (!resultado?.interaccion) {
      return false;
    }

    const { juego, presentacionMapaActivo } = this.obtenerContextoMapaActivo();
    if (!presentacionMapaActivo) {
      throw new Error(
        "No se puede presentar una interacción sin un mapa activo.",
      );
    }

    const interaccionPreparada = juego.prepararInteraccionContenedor(
      resultado.interaccion,
    );
    presentacionMapaActivo.presentarInteraccion(interaccionPreparada);
    return true;
  }

  procesarResultadoComandoHabilidad({
    comando,
    resultado,
    contextoHabilidad,
    estadoProcesamiento,
  }) {
    if (!contextoHabilidad.esComandoHabilidad) {
      return { procesado: false, resultado };
    }

    const { presentacionMapaActivo } = this.obtenerContextoMapaActivo();
    const integracion =
      presentacionMapaActivo?.obtenerIntegracionHabilidades() ?? null;

    if (contextoHabilidad.esConfirmacion) {
      integracion.registrarResultado(resultado);

      const resultadoParaProcesar =
        estadoProcesamiento.cambioEmitido &&
        resultado &&
        resultado.redibujar !== true
          ? { ...resultado, redibujar: true }
          : resultado;

      return {
        procesado: true,
        resultado: this.procesarResultadoAccion(resultadoParaProcesar),
      };
    }

    if (
      contextoHabilidad.esBloqueoRespaldo ||
      (contextoHabilidad.esSeleccionRanura &&
        resultado?.exito === false &&
        comando.silenciarRechazo !== true)
    ) {
      integracion.procesarResultado(resultado);
    }

    return { procesado: true, resultado };
  }
}

function crearContextoHabilidadParaComando({
  comando,
  integracionHabilidades,
}) {
  const sistemaHabilidades =
    integracionHabilidades?.obtenerSistemaParaEntrada() ?? null;
  const modoHabilidadAntes = sistemaHabilidades?.modoHabilidad === true;
  const tipo = comando?.tipo;
  const accionBasicaRanura =
    tipo === TIPOS_COMANDO_JUGADOR.SELECCIONAR_HABILIDAD_RANURA
      ? sistemaHabilidades?.obtenerAccionBasicaPorRanura?.(comando.indiceRanura) ?? null
      : null;
  const esSeleccionRanura =
    tipo === TIPOS_COMANDO_JUGADOR.SELECCIONAR_HABILIDAD_RANURA &&
    accionBasicaRanura === null;
  const esSeleccionCasilla =
    modoHabilidadAntes &&
    tipo === TIPOS_COMANDO_JUGADOR.SELECCIONAR_CASILLA;
  const esConfirmacion =
    modoHabilidadAntes &&
    (tipo === TIPOS_COMANDO_JUGADOR.ACTIVAR_O_CONFIRMAR_SELECCION ||
      accionBasicaRanura === "atacar");
  const esBloqueoRespaldo =
    modoHabilidadAntes &&
    tipo === TIPOS_COMANDO_JUGADOR.ACTIVAR_ATAQUE_RESPALDO;
  const esMovimiento =
    modoHabilidadAntes && tipo === TIPOS_COMANDO_JUGADOR.MOVER;
  const esCancelacion =
    modoHabilidadAntes &&
    tipo === TIPOS_COMANDO_JUGADOR.CANCELAR_SELECCION;

  return {
    esSeleccionRanura,
    esSeleccionCasilla,
    esConfirmacion,
    esBloqueoRespaldo,
    esMovimiento,
    esCancelacion,
    esComandoHabilidad:
      Boolean(sistemaHabilidades) &&
      (esSeleccionRanura ||
        esSeleccionCasilla ||
        esConfirmacion ||
        esBloqueoRespaldo ||
        esMovimiento ||
        esCancelacion),
  };
}

function validarCoordinadorEntrada(coordinadorEntradaJugable) {
  if (
    !coordinadorEntradaJugable ||
    typeof coordinadorEntradaJugable.ejecutar !== "function"
  ) {
    throw new Error(
      "CoordinadorComandosPartida necesita un coordinador de entrada jugable.",
    );
  }
}

function validarFuncion(valor, nombre) {
  if (typeof valor !== "function") {
    throw new Error(`CoordinadorComandosPartida necesita "${nombre}".`);
  }
}
