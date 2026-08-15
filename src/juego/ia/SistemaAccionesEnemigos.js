import { obtenerInstante } from "../../utilidades/TiempoEjecucion.js";
import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";
import {
  crearEventoAtaqueResuelto,
  crearEventoEntidadMovida,
  crearEventoHostilidadCambiada,
  ESTADOS_HOSTILIDAD_ACCION,
} from "../acciones/EventosAccion.js";
import { verificarRequisitosAtaque } from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import {
  calcularDistanciaCuadricula,
  evaluarLineaVisionCuadricula,
} from "../espacio/GeometriaCuadricula.js";
import { evaluarAtaqueCasilla } from "../combate/SistemaAlcanceAtaque.js";
import {
  COSTOS_TEMPORALES_BASE,
  TIPOS_ACCION_TEMPORAL,
} from "../tiempo/SistemaTiempo.js";
import { buscarSiguientePaso } from "./BuscadorCamino.js";
import { crearMensajesResultadoAtaque } from "../mensajes/MensajesCombate.js";
import {
  crearMensajeTraducible,
  crearParametroContenidoMensaje,
  crearParametroEntidadMensaje,
  crearParametroTraduccionMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "../mensajes/MensajesJuego.js";


function actualizarAgresividad({
  enemigo,
  jugador,
  mapa,
  sistemaEspacial,
  registrarParticipanteCombate,
  retirarParticipanteCombate,
}) {
  const mensajes = [];
  const eventos = [];
  const distancia = calcularDistanciaCuadricula(enemigo, jugador);
  const { tipoAgresividad } = enemigo.configuracionIA;
  const percepcion = enemigo.percepcion;
  let puedeDetectar = false;

  // La distancia es la comprobación barata. Solo calculamos LOS cuando el
  // enemigo realmente puede iniciar detección y el jugador está dentro de su
  // alcance de percepción. El resultado jugable no cambia.
  if (
    !enemigo.estaAgresivo &&
    tipoAgresividad === "activa" &&
    distancia <= percepcion
  ) {
    puedeDetectar = evaluarLineaVisionCuadricula({
      mapa,
      sistemaEspacial,
      origen: { x: enemigo.x, y: enemigo.y },
      destino: { x: jugador.x, y: jugador.y },
    }).despejada;
  }

  if (!enemigo.estaAgresivo && puedeDetectar) {
    enemigo.activarAgresividad();
    registrarParticipanteCombate(enemigo, "deteccion_con_persecucion");
    mensajes.push(crearMensajeTraducible("mensajes.ia.detectado", {
      parametros: { enemigo: crearParametroEntidadMensaje(enemigo) },
      tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
      respaldo: `${enemigo.nombre} te ha detectado.`,
    }));
    eventos.push(
      crearEventoHostilidadCambiada({
        enemigo,
        estadoAnterior: ESTADOS_HOSTILIDAD_ACCION.PASIVO,
        estadoActual: ESTADOS_HOSTILIDAD_ACCION.AGRESIVO,
        motivo: "deteccion_con_persecucion",
      }),
    );
  }

  if (enemigo.estaAgresivo && distancia > enemigo.rangoPersecucion) {
    enemigo.desactivarAgresividad();
    retirarParticipanteCombate(enemigo, "perdida_de_persecucion");
    mensajes.push(crearMensajeTraducible("mensajes.ia.abandona", {
      parametros: { enemigo: crearParametroEntidadMensaje(enemigo) },
      tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
      respaldo: `${enemigo.nombre} dejó de perseguirte.`,
    }));
    eventos.push(
      crearEventoHostilidadCambiada({
        enemigo,
        estadoAnterior: ESTADOS_HOSTILIDAD_ACCION.AGRESIVO,
        estadoActual: ESTADOS_HOSTILIDAD_ACCION.PASIVO,
        motivo: "perdida_de_persecucion",
      }),
    );
  }

  return {
    distancia,
    mensajes,
    eventos,
  };
}

function prepararAtaqueEnemigo(enemigo) {
  const estabaUsandoAtaqueNatural = enemigo.ataqueNaturalForzado;
  enemigo.desactivarAtaqueNaturalForzado();
  const requisitosAtaqueEquipado = verificarRequisitosAtaque(enemigo);

  if (requisitosAtaqueEquipado.disponible) {
    const arma = requisitosAtaqueEquipado.configuracion.armaControladora;
    return {
      disponible: true,
      mensaje:
        estabaUsandoAtaqueNatural && arma
          ? crearMensajeTraducible("mensajes.ia.vuelveArma", {
              parametros: {
                enemigo: crearParametroEntidadMensaje(enemigo),
                arma: crearParametroContenidoMensaje("objetos", arma.id, { respaldo: arma.nombre ?? "" }),
              },
              respaldo: `${enemigo.nombre} vuelve a utilizar ${arma.nombre}.`,
            })
          : null,
    };
  }

  if (enemigo.configuracionIA.estrategiaSinRecursos === "ataqueNatural") {
    enemigo.activarAtaqueNaturalForzado();
    const requisitosAtaqueNatural = verificarRequisitosAtaque(enemigo);
    const arma = requisitosAtaqueEquipado.configuracion.armaControladora;
    return {
      disponible: requisitosAtaqueNatural.disponible,
      mensaje: !estabaUsandoAtaqueNatural
        ? crearMensajeTraducible("mensajes.ia.cambiaNatural", {
            parametros: {
              enemigo: crearParametroEntidadMensaje(enemigo),
              arma: arma
                ? crearParametroContenidoMensaje("objetos", arma.id, { respaldo: arma.nombre ?? "" })
                : crearParametroTraduccionMensaje("mensajes.ia.ataqueNatural", { respaldo: "su ataque equipado" }),
            },
            tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
            respaldo: `${enemigo.nombre} no puede utilizar ${arma?.nombre ?? "su ataque equipado"} y cambia a su ataque natural.`,
          })
        : null,
    };
  }

  return {
    disponible: false,
    mensaje: requisitosAtaqueEquipado.mensajePresentacion ?? requisitosAtaqueEquipado.mensaje,
  };
}

function evaluarAtaqueEnemigo({ enemigo, jugador, mapa, sistemaEspacial }) {
  return evaluarAtaqueCasilla({
    atacante: enemigo,
    xObjetivo: jugador.x,
    yObjetivo: jugador.y,
    mapa,
    sistemaEspacial,
  });
}

function moverEnemigoHaciaJugador({
  enemigo,
  jugador,
  sistemaEspacial,
  registrarDiagnosticoPathfinding = () => {},
}) {
  const origen = { x: enemigo.x, y: enemigo.y };
  const inicioPathfinding = obtenerInstante();
  const siguientePaso = buscarSiguientePaso({
    sistemaEspacial,
    origen: { x: enemigo.x, y: enemigo.y },
    destino: { x: jugador.x, y: jugador.y },
    ignorarEntidades: [enemigo, jugador],
  });
  registrarDiagnosticoPathfinding(
    Math.max(0, obtenerInstante() - inicioPathfinding),
  );

  if (!siguientePaso) {
    return {
      seMovio: false,
      origen,
      destino: origen,
    };
  }

  enemigo.x = siguientePaso.x;
  enemigo.y = siguientePaso.y;
  return {
    seMovio: true,
    origen,
    destino: { x: siguientePaso.x, y: siguientePaso.y },
  };
}

function crearResultadoAccion({
  tipoAccion,
  costoBase,
  mensajes = [],
  eventos = [],
}) {
  const mensajesLimpios = mensajes.filter(Boolean);
  return {
    tipoAccion,
    costoBase,
    mensajes: mensajesLimpios,
    mensaje: mensajesLimpios,
    eventos: Array.isArray(eventos) ? eventos : [],
  };
}

// Los bloqueos totales se resuelven en la agenda temporal antes de que la IA
// reciba un turno. Este módulo procesa únicamente actores disponibles.
export function procesarAccionEnemigo({
  enemigo,
  jugador,
  mapa,
  objetivos,
  sistemaEspacial,
  registrarParticipanteCombate = () => {},
  retirarParticipanteCombate = () => {},
  notificarMovimientoActor = () => ({ mensajes: [], eventos: [] }),
  registrarDiagnosticoPathfinding = () => {},
} = {}) {
  if (!(enemigo instanceof Enemigo)) {
    throw new Error("Se necesita un enemigo válido para procesar su acción.");
  }
  if (!Array.isArray(objetivos)) {
    throw new Error("Los objetivos deben estar dentro de una lista.");
  }
  if (
    !sistemaEspacial ||
    typeof sistemaEspacial.bloqueaMovimiento !== "function" ||
    typeof sistemaEspacial.bloqueaVision !== "function"
  ) {
    throw new Error("La IA necesita un sistema espacial válido.");
  }
  if (typeof registrarParticipanteCombate !== "function") {
    throw new Error("El registro de combate debe ser una función.");
  }
  if (typeof retirarParticipanteCombate !== "function") {
    throw new Error("La retirada de combate debe ser una función.");
  }
  if (typeof notificarMovimientoActor !== "function") {
    throw new Error("La notificación de movimiento debe ser una función.");
  }
  if (typeof registrarDiagnosticoPathfinding !== "function") {
    throw new Error("El diagnóstico de pathfinding debe ser una función.");
  }

  const mensajes = [];
  if (!enemigo.estaVivo) {
    retirarParticipanteCombate(enemigo, "enemigo_derrotado");
    return crearResultadoAccion({
      tipoAccion: TIPOS_ACCION_TEMPORAL.ESPERA,
      costoBase: COSTOS_TEMPORALES_BASE.espera,
    });
  }

  const resultadoAgresividad = actualizarAgresividad({
    enemigo,
    jugador,
    mapa,
    sistemaEspacial,
    registrarParticipanteCombate,
    retirarParticipanteCombate,
  });
  mensajes.push(...resultadoAgresividad.mensajes);

  if (!enemigo.estaAgresivo) {
    return crearResultadoAccion({
      tipoAccion: TIPOS_ACCION_TEMPORAL.ESPERA,
      costoBase: COSTOS_TEMPORALES_BASE.espera,
      mensajes,
      eventos: resultadoAgresividad.eventos,
    });
  }

  // Una agresividad ya existente puede provenir de un ataque previo del
  // jugador. Registrar nuevamente es seguro porque el estado es idempotente.
  registrarParticipanteCombate(enemigo, "persecucion_activa");

  const preparacionAtaque = prepararAtaqueEnemigo(enemigo);
  if (preparacionAtaque.mensaje) {
    mensajes.push(preparacionAtaque.mensaje);
  }

  if (!preparacionAtaque.disponible) {
    return crearResultadoAccion({
      tipoAccion: TIPOS_ACCION_TEMPORAL.ESPERA,
      costoBase: COSTOS_TEMPORALES_BASE.espera,
      mensajes,
      eventos: resultadoAgresividad.eventos,
    });
  }

  const evaluacionAtaque = evaluarAtaqueEnemigo({
    enemigo,
    jugador,
    mapa,
    sistemaEspacial,
  });

  if (evaluacionAtaque.puedeAtacar) {
    registrarParticipanteCombate(enemigo, "intento_hostil_enemigo");
    const costoAtaque = enemigo.costoAtaqueActual;
    const configuracionAtaque = enemigo.configuracionAtaqueActual;
    const resultadoAtaque = enemigo.atacar(jugador);
    mensajes.push(...crearMensajesResultadoAtaque({
      atacante: enemigo,
      objetivo: jugador,
      resultado: resultadoAtaque,
      ataqueDelJugador: false,
    }));

    if (!jugador.estaVivo) {
      mensajes.push(crearMensajeTraducible("mensajes.ia.jugadorMuerto", {
        tipo: TIPOS_MENSAJE_JUEGO.NEGATIVO,
        respaldo: "Has muerto. Recargá la página para reiniciar.",
      }));
    }

    return crearResultadoAccion({
      tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,
      costoBase: costoAtaque,
      mensajes,
      eventos: [
        ...resultadoAgresividad.eventos,
        crearEventoAtaqueResuelto({
          atacante: enemigo,
          objetivo: jugador,
          resultado: resultadoAtaque,
          configuracionAtaque,
        }),
      ],
    });
  }

  const resultadoMovimiento = moverEnemigoHaciaJugador({
    enemigo,
    jugador,
    sistemaEspacial,
    registrarDiagnosticoPathfinding,
  });

  if (resultadoMovimiento.seMovio) {
    const resultadoZona = notificarMovimientoActor({
      actor: enemigo,
      origen: resultadoMovimiento.origen,
      destino: resultadoMovimiento.destino,
    });
    mensajes.push(...(resultadoZona?.mensajes ?? []));
    return crearResultadoAccion({
      tipoAccion: TIPOS_ACCION_TEMPORAL.MOVIMIENTO,
      costoBase: COSTOS_TEMPORALES_BASE.movimiento,
      mensajes,
      eventos: [
        ...resultadoAgresividad.eventos,
        crearEventoEntidadMovida({
          entidad: enemigo,
          origen: resultadoMovimiento.origen,
          destino: resultadoMovimiento.destino,
        }),
        ...(resultadoZona?.eventos ?? []),
      ],
    });
  }

  return crearResultadoAccion({
    tipoAccion: TIPOS_ACCION_TEMPORAL.ESPERA,
    costoBase: COSTOS_TEMPORALES_BASE.espera,
    mensajes,
    eventos: resultadoAgresividad.eventos,
  });
}
