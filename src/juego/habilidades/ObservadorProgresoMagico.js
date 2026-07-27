const CLAVE_OBSERVADOR = Symbol.for("darkMoon.magia.observadorProgresoMagico");
const METODOS_MUTACION = [
  "agregarPuntosUniversales",
  "registrarEjecucionEfectiva",
  "agregarExperienciaMaestria",
  "mejorarHabilidad",
  "restaurarEstado",
];
// Decora la instancia existente sin copiar datos. Las notificaciones sirven
// solo para repintar; ProgresoMagicoJugador continúa siendo la fuente única.
export function suscribirCambiosProgresoMagico(jugador, oyente) {
  if (typeof oyente !== "function") {
    throw new Error("El observador de progreso necesita una función.");
  }
  const progreso = obtenerProgreso(jugador);
  const observador = instalarObservador(progreso);
  observador.oyentes.add(oyente);
  return () => observador.oyentes.delete(oyente);
}
function instalarObservador(progreso) {
  if (progreso[CLAVE_OBSERVADOR]) {
    return progreso[CLAVE_OBSERVADOR];
  }
  const observador = {
    oyentes: new Set(),
    notificacionPendiente: false,
  };
  Object.defineProperty(progreso, CLAVE_OBSERVADOR, {
    value: observador,
    enumerable: false,
    configurable: false,
  });
  for (const nombreMetodo of METODOS_MUTACION) {
    const original = progreso[nombreMetodo];
    if (typeof original !== "function") {
      continue;
    }
    progreso[nombreMetodo] = function metodoObservable(...argumentos) {
      const resultado = original.apply(this, argumentos);
      programarNotificacion(observador, {
        tipo: nombreMetodo,
        resultado,
      });
      return resultado;
    };
  }
  return observador;
}
function programarNotificacion(observador, detalle) {
  observador.ultimoDetalle = detalle;
  if (observador.notificacionPendiente) {
    return;
  }
  observador.notificacionPendiente = true;
  queueMicrotask(() => {
    observador.notificacionPendiente = false;
    for (const oyente of observador.oyentes) {
      oyente(observador.ultimoDetalle);
    }
  });
}
function obtenerProgreso(jugador) {
  const progreso = jugador?.progresoMagico ?? jugador?.progresoMagicoJugador;
  if (!progreso || typeof progreso.obtenerResumen !== "function") {
    throw new Error("El jugador no expone ProgresoMagicoJugador.");
  }
  return progreso;
}
