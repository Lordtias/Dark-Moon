import {
  crearEventoBotinGenerado,
  crearEventoNivelAumentado,
} from "../acciones/EventosAccion.js";
import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";
import {
  depositarObjetosEnSuelo,
  generarBotinCanonicoEnSuelo,
  materializarContenidoContenedor,
  resolverSupervivenciaContenidoDestruido,
} from "../botin/SistemaBotin.js";
import { calcularRecompensaExperiencia } from "../progresion/SistemaProgresion.js";
import {
  crearMensajeTraducible,
  crearParametroContenidoMensaje,
  crearParametroEntidadMensaje,
  crearParametroTraduccionMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "../mensajes/MensajesJuego.js";

function crearResultadoSinProcesar(objetivo = null) {
  return {
    procesada: false,
    objetivo,
    mensaje: null,
    resultadosBotin: [],
    recompensaExperiencia: null,
    progresion: null,
    eventos: [],
  };
}

function crearDetalleBotinPresentacion(resumen = []) {
  return resumen.map((entrada) => {
    const objeto = crearParametroContenidoMensaje("objetos", entrada.idObjeto, {
      respaldo: entrada.nombre,
    });
    if (entrada.rareza === "comun") {
      return crearParametroTraduccionMensaje(
        "mensajes.derrotas.botinEntradaComun",
        {
          parametros: { cantidad: entrada.cantidad, objeto },
          respaldo: `${entrada.cantidad} ${entrada.nombre}`,
        },
      );
    }
    return crearParametroTraduccionMensaje(
      "mensajes.derrotas.botinEntradaRara",
      {
        parametros: {
          cantidad: entrada.cantidad,
          objeto,
          rareza: crearParametroContenidoMensaje("rarezas", entrada.rareza, {
            respaldo: entrada.rareza,
          }),
          nivel: entrada.nivelObjeto,
        },
        respaldo: `${entrada.cantidad} ${entrada.nombre}`,
      },
    );
  });
}

// Resuelve una única vez todas las consecuencias jugables de un objetivo
// destruido. Enemigos y objetos físicos comparten el mismo punto de cierre;
// solamente la experiencia y reglas propias del combatiente quedan en su rama.
export class ResolutorDestruccionesJugador {
  constructor({
    jugador,
    objetivos,
    interactuables,
    configuracionObjetos,
    eliminarActorTemporal,
  } = {}) {
    if (!jugador || typeof jugador !== "object") {
      throw new Error(
        "ResolutorDestruccionesJugador necesita un jugador válido.",
      );
    }
    if (!Array.isArray(objetivos)) {
      throw new Error(
        "ResolutorDestruccionesJugador necesita una lista de objetivos.",
      );
    }
    if (!Array.isArray(interactuables)) {
      throw new Error(
        "ResolutorDestruccionesJugador necesita una lista de interactuables.",
      );
    }
    if (
      configuracionObjetos === null ||
      typeof configuracionObjetos !== "object" ||
      Array.isArray(configuracionObjetos)
    ) {
      throw new Error(
        "ResolutorDestruccionesJugador necesita una configuración de objetos válida.",
      );
    }
    if (typeof eliminarActorTemporal !== "function") {
      throw new Error(
        "ResolutorDestruccionesJugador necesita retirar actores temporales.",
      );
    }

    this.jugador = jugador;
    this.objetivos = objetivos;
    this.interactuables = interactuables;
    this.configuracionObjetos = configuracionObjetos;
    this.eliminarActorTemporal = eliminarActorTemporal;
    this.objetivosProcesados = new WeakSet();
  }

  resolverObjetivo(objetivo) {
    if (!objetivo?.estaDestruido) {
      return crearResultadoSinProcesar(objetivo);
    }
    if (this.objetivosProcesados.has(objetivo)) {
      return crearResultadoSinProcesar(objetivo);
    }

    this.objetivosProcesados.add(objetivo);

    try {
      return objetivo instanceof Enemigo
        ? this.resolverEnemigo(objetivo)
        : this.resolverObjetoFisico(objetivo);
    } catch (error) {
      this.objetivosProcesados.delete(objetivo);
      throw error;
    }
  }

  resolverEnemigo(objetivo) {
    this.eliminarActorTemporal(objetivo);

    const parametroObjetivo = crearParametroEntidadMensaje(objetivo);
    const mensajes = [
      crearMensajeTraducible("mensajes.derrotas.enemigo", {
        tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        parametros: { objetivo: parametroObjetivo },
      }),
    ];
    const resultadoBotin = generarBotinCanonicoEnSuelo({
      fuente: objetivo,
      solicitud: objetivo.solicitudBotin,
      configuracionObjetos: this.configuracionObjetos,
      interactuables: this.interactuables,
    });
    agregarMensajeBotin({ mensajes, objetivo, resultadoBotin });

    const recompensaExperiencia = calcularRecompensaExperiencia({
      experienciaBase: objetivo.experienciaOtorgada,
      nivelJugador: this.jugador.nivel,
      nivelEnemigo: objetivo.nivel,
    });
    const nivelAnterior = this.jugador.nivel;
    const progresion = this.jugador.ganarExperiencia(
      recompensaExperiencia.experienciaFinal,
    );
    mensajes.push(
      crearMensajeTraducible("mensajes.derrotas.experiencia", {
        tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        parametros: { cantidad: progresion.experienciaGanada },
      }),
    );

    if (progresion.nivelesGanados === 1) {
      mensajes.push(
        crearMensajeTraducible("mensajes.derrotas.nivel", {
          tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
          parametros: { nivel: progresion.nivelActual },
        }),
      );
    } else if (progresion.nivelesGanados > 1) {
      mensajes.push(
        crearMensajeTraducible("mensajes.derrotas.niveles", {
          tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
          parametros: {
            cantidad: progresion.nivelesGanados,
            nivel: progresion.nivelActual,
          },
        }),
      );
    }

    if (progresion.puntosGanados === 1) {
      mensajes.push(
        crearMensajeTraducible("mensajes.derrotas.atributo", {
          tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        }),
      );
    } else if (progresion.puntosGanados > 1) {
      mensajes.push(
        crearMensajeTraducible("mensajes.derrotas.atributos", {
          tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
          parametros: { cantidad: progresion.puntosGanados },
        }),
      );
    }

    const eventos = crearEventosBotin(objetivo, [resultadoBotin]);
    if (progresion.nivelesGanados > 0) {
      eventos.push(
        crearEventoNivelAumentado({
          jugador: this.jugador,
          nivelAnterior,
          nivelActual: progresion.nivelActual,
          nivelesGanados: progresion.nivelesGanados,
        }),
      );
    }

    return {
      procesada: true,
      objetivo,
      mensaje: mensajes.filter(Boolean),
      resultadosBotin: [resultadoBotin],
      resultadoBotin,
      recompensaExperiencia,
      progresion,
      eventos,
    };
  }

  resolverObjetoFisico(objetivo) {
    retirarInteractuablePorReferencia(this.interactuables, objetivo);

    const mensajes = [
      crearMensajeTraducible("mensajes.combate.destructibleDestruido", {
        tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        parametros: { objetivo: crearParametroEntidadMensaje(objetivo) },
      }),
    ];
    const resultadosBotin = [];

    const materializacionContenido = materializarContenidoContenedor({
      fuente: objetivo,
      configuracionObjetos: this.configuracionObjetos,
    });

    const objetosExistentes =
      typeof objetivo.contenedorObjetos?.extraerTodos === "function"
        ? objetivo.contenedorObjetos.extraerTodos()
        : [];
    if (objetosExistentes.length > 0) {
      const supervivencia = resolverSupervivenciaContenidoDestruido({
        objetos: objetosExistentes,
      });
      if (supervivencia.sobrevivientes.length > 0) {
        const resultadoContenido = depositarObjetosEnSuelo({
          fuente: objetivo,
          objetos: supervivencia.sobrevivientes,
          interactuables: this.interactuables,
        });
        resultadoContenido.detalleSupervivencia = supervivencia;
        resultadoContenido.detalleMaterializacion = materializacionContenido;
        resultadosBotin.push(resultadoContenido);
        agregarMensajeBotin({
          mensajes,
          objetivo,
          resultadoBotin: resultadoContenido,
        });
      }
    }

    if (objetivo.solicitudBotin) {
      const resultadoSolicitud = generarBotinCanonicoEnSuelo({
        fuente: objetivo,
        solicitud: objetivo.solicitudBotin,
        configuracionObjetos: this.configuracionObjetos,
        interactuables: this.interactuables,
      });
      resultadosBotin.push(resultadoSolicitud);
      agregarMensajeBotin({
        mensajes,
        objetivo,
        resultadoBotin: resultadoSolicitud,
      });
    }

    return {
      procesada: true,
      objetivo,
      mensaje: mensajes.filter(Boolean),
      resultadosBotin,
      resultadoBotin: resultadosBotin[resultadosBotin.length - 1] ?? null,
      recompensaExperiencia: null,
      progresion: null,
      eventos: crearEventosBotin(objetivo, resultadosBotin),
    };
  }

  resolverPendientes() {
    const resultados = [];
    for (const objetivo of this.objetivos) {
      const resultado = this.resolverObjetivo(objetivo);
      if (resultado.procesada) {
        resultados.push(resultado);
      }
    }

    const mensajes = resultados
      .map((resultado) => resultado.mensaje)
      .filter(Boolean);

    return {
      cantidadProcesada: resultados.length,
      mensajes,
      mensaje: mensajes.length > 0 ? mensajes : null,
      resultados,
      eventos: resultados.flatMap((resultado) => resultado.eventos ?? []),
    };
  }
}

function agregarMensajeBotin({ mensajes, objetivo, resultadoBotin }) {
  if ((resultadoBotin?.cantidadUnidades ?? 0) <= 0) return;

  mensajes.push(
    crearMensajeTraducible("mensajes.derrotas.botin", {
      tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
      parametros: {
        objetivo: crearParametroEntidadMensaje(objetivo),
        detalle: crearDetalleBotinPresentacion(resultadoBotin.resumen),
      },
    }),
  );
}

function crearEventosBotin(objetivo, resultadosBotin) {
  return resultadosBotin
    .filter((resultado) => (resultado?.cantidadUnidades ?? 0) > 0)
    .map((resultadoBotin) =>
      crearEventoBotinGenerado({
        fuente: objetivo,
        resultadoBotin,
      }),
    );
}

function retirarInteractuablePorReferencia(interactuables, objetivo) {
  const indice = interactuables.indexOf(objetivo);
  if (indice >= 0) {
    interactuables.splice(indice, 1);
  }
}
