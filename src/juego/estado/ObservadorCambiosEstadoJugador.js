const CLAVE_OBSERVADOR = Symbol.for("darkMoon.estadoJugador.observadorCambios");
const METODOS_MUTACION_PROGRESO = [
  "agregarPuntosUniversales",
  "agregarExperienciaMaestria",
  "mejorarHabilidad",
  "restaurarEstado",
];

// Canal canónico único para avisar que cambió algún estado del jugador capaz
// de alterar valores derivados visibles. No envía números calculados ni
// conoce paneles concretos; solamente agrupa invalidaciones semánticas.
export function suscribirCambiosEstadoJugador(jugador, oyente) {
  if (typeof oyente !== "function") {
    throw new Error(
      "El observador de cambios de estado del jugador necesita una función.",
    );
  }

  const observador = instalarObservador(jugador);
  observador.oyentes.add(oyente);
  return () => observador.oyentes.delete(oyente);
}

// Punto canónico para avisar desde cualquier dueño de mutación: acciones,
// progresión, equipo, efectos temporales u otras fuentes futuras.
export function notificarCambioEstadoJugador(jugador, detalle = {}) {
  const observador = instalarObservador(jugador);
  programarNotificacion(observador, detalle);
  return true;
}

function instalarObservador(jugador) {
  const objetivo = obtenerJugador(jugador);
  if (objetivo[CLAVE_OBSERVADOR]) {
    return objetivo[CLAVE_OBSERVADOR];
  }

  const observador = {
    oyentes: new Set(),
    notificacionPendiente: false,
    invalidacionPendiente: crearInvalidacionVacia(),
  };

  Object.defineProperty(objetivo, CLAVE_OBSERVADOR, {
    value: observador,
    enumerable: false,
    configurable: false,
  });

  instalarDecoradoresProgreso(objetivo, observador);
  return observador;
}

function instalarDecoradoresProgreso(jugador, observador) {
  const progreso = jugador?.progresoHabilidades;
  if (!progreso || typeof progreso.obtenerResumen !== "function") {
    return;
  }

  for (const nombreMetodo of METODOS_MUTACION_PROGRESO) {
    const original = progreso[nombreMetodo];
    if (typeof original !== "function" || original.__darkMoonObservado === true) {
      continue;
    }

    const observable = function metodoObservable(...argumentos) {
      const resultado = original.apply(this, argumentos);
      programarNotificacion(observador, {
        origen: "progreso_habilidades",
        tipo: nombreMetodo,
        estadoJugador: true,
        habilidades: true,
        guardarJugador: true,
        motivo: `progreso_habilidades:${nombreMetodo}`,
      });
      return resultado;
    };

    Object.defineProperty(observable, "__darkMoonObservado", {
      value: true,
      enumerable: false,
      configurable: false,
    });

    progreso[nombreMetodo] = observable;
  }
}

function programarNotificacion(observador, detalle = {}) {
  fusionarInvalidacion(observador.invalidacionPendiente, detalle);
  if (observador.notificacionPendiente) {
    return;
  }

  observador.notificacionPendiente = true;
  queueMicrotask(() => {
    observador.notificacionPendiente = false;
    const invalidacion = observador.invalidacionPendiente;
    observador.invalidacionPendiente = crearInvalidacionVacia();

    for (const oyente of observador.oyentes) {
      oyente({
        estadoJugador: invalidacion.estadoJugador,
        habilidades: invalidacion.habilidades,
        guardarJugador: invalidacion.guardarJugador,
        motivos: [...invalidacion.motivos],
        origenes: [...invalidacion.origenes],
        tipos: [...invalidacion.tipos],
      });
    }
  });
}

function fusionarInvalidacion(destino, detalle) {
  destino.estadoJugador ||= detalle.estadoJugador !== false;
  destino.habilidades ||= detalle.habilidades === true;
  destino.guardarJugador ||= detalle.guardarJugador === true;

  if (typeof detalle.motivo === "string" && detalle.motivo.trim() !== "") {
    destino.motivos.add(detalle.motivo.trim());
  }
  if (typeof detalle.origen === "string" && detalle.origen.trim() !== "") {
    destino.origenes.add(detalle.origen.trim());
  }
  if (typeof detalle.tipo === "string" && detalle.tipo.trim() !== "") {
    destino.tipos.add(detalle.tipo.trim());
  }
}

function crearInvalidacionVacia() {
  return {
    estadoJugador: false,
    habilidades: false,
    guardarJugador: false,
    motivos: new Set(),
    origenes: new Set(),
    tipos: new Set(),
  };
}

function obtenerJugador(jugador) {
  if (!jugador || typeof jugador !== "object") {
    throw new Error(
      "El observador de cambios de estado necesita un jugador válido.",
    );
  }
  return jugador;
}
