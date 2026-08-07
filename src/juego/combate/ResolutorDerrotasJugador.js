import {
  crearEventoBotinGenerado,
  crearEventoNivelAumentado,
} from "../acciones/EventosAccion.js";
import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";
import { generarBotinEnSuelo } from "../botin/SistemaBotin.js";
import { crearGeneradorAleatorio } from "../generacion/GeneradorAleatorio.js";
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
    resultadoBotin: null,
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
      return crearParametroTraduccionMensaje("mensajes.derrotas.botinEntradaComun", {
        parametros: { cantidad: entrada.cantidad, objeto },
        respaldo: `${entrada.cantidad} ${entrada.nombre}`,
      });
    }
    return crearParametroTraduccionMensaje("mensajes.derrotas.botinEntradaRara", {
      parametros: {
        cantidad: entrada.cantidad,
        objeto,
        rareza: crearParametroContenidoMensaje("rarezas", entrada.rareza, {
          respaldo: entrada.rareza,
        }),
        nivel: entrada.nivelObjeto,
      },
      respaldo: `${entrada.cantidad} ${entrada.nombre}`,
    });
  });
}

// Resuelve una sola vez las consecuencias jugables de derrotar a un enemigo:
// retiro temporal, botín, experiencia general y mensajes de progresión.
export class ResolutorDerrotasJugador {
  constructor({
    jugador,
    objetivos,
    interactuables,
    configuracionObjetos,
    semillaMapa = "partida",
    eliminarActorTemporal,
  } = {}) {
    if (!jugador || typeof jugador !== "object") {
      throw new Error("ResolutorDerrotasJugador necesita un jugador válido.");
    }
    if (!Array.isArray(objetivos)) {
      throw new Error(
        "ResolutorDerrotasJugador necesita una lista de objetivos.",
      );
    }
    if (!Array.isArray(interactuables)) {
      throw new Error(
        "ResolutorDerrotasJugador necesita una lista de interactuables.",
      );
    }
    if (
      configuracionObjetos === null ||
      typeof configuracionObjetos !== "object" ||
      Array.isArray(configuracionObjetos)
    ) {
      throw new Error(
        "ResolutorDerrotasJugador necesita una configuración de objetos válida.",
      );
    }
    if (typeof eliminarActorTemporal !== "function") {
      throw new Error(
        "ResolutorDerrotasJugador necesita retirar actores temporales.",
      );
    }

    this.jugador = jugador;
    this.objetivos = objetivos;
    this.interactuables = interactuables;
    this.configuracionObjetos = configuracionObjetos;
    this.eliminarActorTemporal = eliminarActorTemporal;
    this.aleatorioBotin = crearGeneradorAleatorio(`${semillaMapa}:botin`);
    this.enemigosProcesados = new WeakSet();
  }

  resolverObjetivo(objetivo) {
    if (!(objetivo instanceof Enemigo) || !objetivo.estaDestruido) {
      return crearResultadoSinProcesar(objetivo);
    }
    if (this.enemigosProcesados.has(objetivo)) {
      return crearResultadoSinProcesar(objetivo);
    }

    // Se marca antes de producir efectos para impedir recompensas duplicadas
    // si el mismo enemigo vuelve a ser detectado durante el cierre temporal.
    this.enemigosProcesados.add(objetivo);

    try {
      this.eliminarActorTemporal(objetivo);

      const parametroObjetivo = crearParametroEntidadMensaje(objetivo);
      const mensajes = [
        crearMensajeTraducible("mensajes.derrotas.enemigo", {
          tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
          parametros: { objetivo: parametroObjetivo },
        }),
      ];
      const resultadoBotin = generarBotinEnSuelo({
        fuente: objetivo,
        configuracionObjetos: this.configuracionObjetos,
        aleatorio: this.aleatorioBotin,
        interactuables: this.interactuables,
      });
      if (resultadoBotin.cantidadUnidades > 0) {
        mensajes.push(
          crearMensajeTraducible("mensajes.derrotas.botin", {
            tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
            parametros: {
              objetivo: parametroObjetivo,
              detalle: crearDetalleBotinPresentacion(resultadoBotin.resumen),
            },
          }),
        );
      }

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

      const eventos = [];
      if (resultadoBotin.cantidadUnidades > 0) {
        eventos.push(
          crearEventoBotinGenerado({
            fuente: objetivo,
            resultadoBotin,
          }),
        );
      }
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
        resultadoBotin,
        recompensaExperiencia,
        progresion,
        eventos,
      };
    } catch (error) {
      // Una falla real no debe dejar la derrota marcada como recompensada.
      // Así puede reintentarse después de corregir la causa sin duplicar nada.
      this.enemigosProcesados.delete(objetivo);
      throw error;
    }
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
      mensaje: mensajes,
      resultados,
      eventos: resultados.flatMap((resultado) => resultado.eventos ?? []),
    };
  }
}
