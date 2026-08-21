import { crearEventoEntidadMovida } from "../acciones/EventosAccion.js";

export const REGLAS_ESPACIALES_DESPLAZAMIENTO_TACTICO = Object.freeze({
  PASO_A_PASO: "paso_a_paso",
  TRAYECTORIA_LIBRE: "trayectoria_libre",
  DESTINO_UNICAMENTE: "destino_unicamente",
});

export const FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO = Object.freeze({
  MOVIMIENTO: "movimiento",
  DASH: "dash",
  SALTO: "salto",
  TELETRANSPORTE: "teletransporte",
});

const REGLAS_VALIDAS = new Set(
  Object.values(REGLAS_ESPACIALES_DESPLAZAMIENTO_TACTICO),
);
const FORMAS_VALIDAS = new Set(
  Object.values(FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO),
);

export function validarContratoDesplazamientoTactico({
  reglaEspacial,
  formaVisual,
} = {}) {
  if (!REGLAS_VALIDAS.has(reglaEspacial)) {
    throw new Error(`La regla espacial táctica "${reglaEspacial}" no existe.`);
  }
  if (!FORMAS_VALIDAS.has(formaVisual)) {
    throw new Error(`La forma visual táctica "${formaVisual}" no existe.`);
  }
  return Object.freeze({ reglaEspacial, formaVisual });
}

export function resolverDesplazamientoTactico({
  sistemaEspacial,
  actor,
  direccion,
  distancia,
  reglaEspacial = REGLAS_ESPACIALES_DESPLAZAMIENTO_TACTICO.PASO_A_PASO,
  formaVisual = FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO.MOVIMIENTO,
  notificarMovimientoActor = () => ({ mensajes: [], eventos: [] }),
} = {}) {
  validarDependencias({ sistemaEspacial, actor, notificarMovimientoActor });
  validarContratoDesplazamientoTactico({ reglaEspacial, formaVisual });
  const vector = normalizarDireccion(direccion);
  if (!Number.isInteger(distancia) || distancia < 0) {
    throw new Error("La distancia del desplazamiento táctico debe ser un entero no negativo.");
  }

  const origen = { x: actor.x, y: actor.y };
  if (distancia === 0) {
    return crearResultado({
      actor,
      origen,
      pasos: [],
      reglaEspacial,
      formaVisual,
      mensajes: [],
      eventosZona: [],
      distanciaSolicitada: distancia,
    });
  }

  const pasosPlanificados = Array.from({ length: distancia }, (_, indice) => ({
    x: origen.x + vector.x * (indice + 1),
    y: origen.y + vector.y * (indice + 1),
  }));

  if (reglaEspacial === REGLAS_ESPACIALES_DESPLAZAMIENTO_TACTICO.DESTINO_UNICAMENTE) {
    const destino = pasosPlanificados.at(-1);
    if (!esDestinoValido({ sistemaEspacial, actor, origen, destino, vector, validarDiagonal: false })) {
      return crearResultado({
        actor,
        origen,
        pasos: [],
        reglaEspacial,
        formaVisual,
        mensajes: [],
        eventosZona: [],
        distanciaSolicitada: distancia,
      });
    }
    actor.x = destino.x;
    actor.y = destino.y;
    const zona = notificarMovimientoActor({ actor, origen, destino });
    return crearResultado({
      actor,
      origen,
      pasos: [destino],
      reglaEspacial,
      formaVisual,
      mensajes: zona?.mensajes ?? [],
      eventosZona: zona?.eventos ?? [],
      distanciaSolicitada: distancia,
    });
  }

  if (reglaEspacial === REGLAS_ESPACIALES_DESPLAZAMIENTO_TACTICO.TRAYECTORIA_LIBRE) {
    let puntoAnterior = origen;
    for (const destino of pasosPlanificados) {
      if (!esDestinoValido({
        sistemaEspacial,
        actor,
        origen: puntoAnterior,
        destino,
        vector,
        validarDiagonal: true,
      })) {
        return crearResultado({
          actor,
          origen,
          pasos: [],
          reglaEspacial,
          formaVisual,
          mensajes: [],
          eventosZona: [],
          distanciaSolicitada: distancia,
        });
      }
      puntoAnterior = destino;
    }
  }

  const recorridos = [];
  const mensajes = [];
  const eventosZona = [];
  let puntoAnterior = origen;

  for (const destino of pasosPlanificados) {
    if (reglaEspacial === REGLAS_ESPACIALES_DESPLAZAMIENTO_TACTICO.PASO_A_PASO) {
      const valido = esDestinoValido({
        sistemaEspacial,
        actor,
        origen: puntoAnterior,
        destino,
        vector,
        validarDiagonal: true,
      });
      if (!valido) break;
    }

    actor.x = destino.x;
    actor.y = destino.y;
    recorridos.push({ ...destino });
    const zona = notificarMovimientoActor({
      actor,
      origen: puntoAnterior,
      destino,
    });
    mensajes.push(...(zona?.mensajes ?? []));
    eventosZona.push(...(zona?.eventos ?? []));
    puntoAnterior = destino;
  }

  return crearResultado({
    actor,
    origen,
    pasos: recorridos,
    reglaEspacial,
    formaVisual,
    mensajes,
    eventosZona,
    distanciaSolicitada: distancia,
  });
}

function esDestinoValido({
  sistemaEspacial,
  actor,
  origen,
  destino,
  vector,
  validarDiagonal,
}) {
  if (!sistemaEspacial.estaDentroMapa(destino.x, destino.y)) return false;
  if (
    validarDiagonal &&
    vector.x !== 0 &&
    vector.y !== 0 &&
    sistemaEspacial.bloqueaPasoDiagonal({
      origen,
      movimientoX: vector.x,
      movimientoY: vector.y,
      ignorarEntidades: [actor],
    })
  ) {
    return false;
  }
  return !sistemaEspacial.bloqueaMovimiento(destino.x, destino.y, {
    ignorarEntidades: [actor],
  });
}

function crearResultado({
  actor,
  origen,
  pasos,
  reglaEspacial,
  formaVisual,
  mensajes,
  eventosZona,
  distanciaSolicitada,
}) {
  const destino = pasos.length > 0 ? pasos.at(-1) : origen;
  const desplazamientoTactico = Object.freeze({
    reglaEspacial,
    formaVisual,
    distanciaSolicitada,
    distanciaRecorrida: pasos.length,
    pasos: Object.freeze(pasos.map((paso) => Object.freeze({ ...paso }))),
  });
  const eventoMovimiento = pasos.length > 0
    ? crearEventoEntidadMovida({
        entidad: actor,
        origen,
        destino,
        desplazamientoTactico,
      })
    : null;
  return Object.freeze({
    movido: pasos.length > 0,
    origen: Object.freeze({ ...origen }),
    destino: Object.freeze({ ...destino }),
    distanciaRecorrida: pasos.length,
    pasos: desplazamientoTactico.pasos,
    desplazamientoTactico,
    mensajes: Object.freeze([...mensajes]),
    eventos: Object.freeze([
      ...(eventoMovimiento ? [eventoMovimiento] : []),
      ...eventosZona,
    ]),
  });
}

function normalizarDireccion(direccion) {
  const x = Number(direccion?.x ?? 0);
  const y = Number(direccion?.y ?? 0);
  if (![x, y].every(Number.isFinite)) {
    throw new Error("La dirección del desplazamiento táctico debe ser numérica.");
  }
  const normalizada = { x: Math.sign(x), y: Math.sign(y) };
  if (normalizada.x === 0 && normalizada.y === 0) {
    throw new Error("La dirección del desplazamiento táctico no puede ser nula.");
  }
  return normalizada;
}

function validarDependencias({ sistemaEspacial, actor, notificarMovimientoActor }) {
  if (
    !sistemaEspacial ||
    typeof sistemaEspacial.estaDentroMapa !== "function" ||
    typeof sistemaEspacial.bloqueaMovimiento !== "function" ||
    typeof sistemaEspacial.bloqueaPasoDiagonal !== "function"
  ) {
    throw new Error("El desplazamiento táctico necesita un SistemaEspacial válido.");
  }
  if (!actor || !Number.isInteger(actor.x) || !Number.isInteger(actor.y)) {
    throw new Error("El desplazamiento táctico necesita un actor posicionado.");
  }
  if (typeof notificarMovimientoActor !== "function") {
    throw new Error("El desplazamiento táctico necesita el notificador de movimiento.");
  }
}
