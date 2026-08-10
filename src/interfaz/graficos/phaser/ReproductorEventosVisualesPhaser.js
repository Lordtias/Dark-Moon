import { TIPOS_EVENTO_VISUAL } from "../TiposEventosVisuales.js";
import { TIPOS_ENTIDAD_VISUAL } from "../TiposEscena.js";
import { ContextoReproduccionVisualPhaser } from "./ContextoReproduccionVisualPhaser.js";
import { DespachadorEventosVisualesPhaser } from "./DespachadorEventosVisualesPhaser.js";

// Reproduce hechos ya resueltos. La cola jamás modifica el estado del juego ni
// decide el orden temporal: solamente conserva el orden recibido.
export class ReproductorEventosVisualesPhaser {
  constructor({
    escena,
    compositor,
    gestorRecursos,
    alAplicarEscena,
    alMoverJugadorVisual = null,
  } = {}) {
    if (!escena?.tweens || !escena?.time || !compositor || !gestorRecursos) {
      throw new Error(
        "El reproductor visual necesita escena, compositor y recursos válidos.",
      );
    }
    if (typeof alAplicarEscena !== "function") {
      throw new Error("El reproductor visual necesita aplicar la escena final.");
    }
    if (
      alMoverJugadorVisual !== null &&
      typeof alMoverJugadorVisual !== "function"
    ) {
      throw new Error("El seguimiento visual del jugador debe ser una función.");
    }

    this.alAplicarEscena = alAplicarEscena;
    this.cola = [];
    this.reproduciendo = false;
    this.destruido = false;
    this.esperadoresInactividad = new Set();

    this.contexto = new ContextoReproduccionVisualPhaser({
      escena,
      compositor,
      gestorRecursos,
      alMoverJugadorVisual,
      obtenerCantidadEventosPendientes: () =>
        this.obtenerCantidadEventosPendientes(),
      obtenerRachaMovimientosJugadorPendientes: () =>
        this.obtenerRachaMovimientosJugadorPendientes(),
      despacharEvento: (evento, version) =>
        this.despachador?.reproducir(evento, version),
    });

    this.despachador = new DespachadorEventosVisualesPhaser({
      contexto: this.contexto,
    });
  }

  configurar({ velocidad, efectosReducidos } = {}) {
    return this.contexto.configurar({ velocidad, efectosReducidos });
  }

  encolar({ escenaFinal, eventosVisuales = [] } = {}) {
    if (this.destruido || !escenaFinal) {
      return false;
    }

    this.cola.push({
      escenaFinal,
      eventosVisuales: Array.isArray(eventosVisuales)
        ? [...eventosVisuales]
        : [],
    });
    this.iniciarProcesamiento();
    return true;
  }

  estaActivo() {
    return this.reproduciendo || this.cola.length > 0;
  }

  obtenerCantidadEventosPendientes() {
    return this.cola.reduce(
      (total, actualizacion) => total + actualizacion.eventosVisuales.length,
      0,
    );
  }

  obtenerRachaMovimientosJugadorPendientes() {
    let cantidad = 0;
    for (const actualizacion of this.cola) {
      const eventos = actualizacion?.eventosVisuales ?? [];
      if (eventos.length === 0) break;

      for (const evento of eventos) {
        if (
          evento?.tipo !== TIPOS_EVENTO_VISUAL.MOVIMIENTO_ENTIDAD ||
          evento.tipoEntidad !== TIPOS_ENTIDAD_VISUAL.JUGADOR
        ) {
          return cantidad;
        }
        cantidad += 1;
      }
    }
    return cantidad;
  }

  esperarInactividad() {
    if (!this.estaActivo()) return Promise.resolve();
    return new Promise((resolver) => {
      this.esperadoresInactividad.add(resolver);
    });
  }

  resolverEsperadoresInactividad() {
    if (this.estaActivo()) return;
    for (const resolver of this.esperadoresInactividad) resolver();
    this.esperadoresInactividad.clear();
  }

  cancelar({ aplicarUltimaEscena = false } = {}) {
    this.contexto.cancelarEjecucion();
    const ultimaEscena = this.cola.at(-1)?.escenaFinal ?? null;
    this.cola.length = 0;
    this.reproduciendo = false;
    this.contexto.compositor?.limpiarEfectosTemporales?.();

    if (aplicarUltimaEscena && ultimaEscena) {
      this.alAplicarEscena(ultimaEscena);
    } else {
      this.contexto.compositor?.reconciliarEfectosTemporalesDesdeEscenaActual?.();
      this.contexto.compositor?.reconciliarZonasTemporalesDesdeEscenaActual?.();
    }
    this.resolverEsperadoresInactividad();
  }

  destruir() {
    if (this.destruido) return;
    this.destruido = true;
    this.cancelar();
    this.despachador?.destruir?.();
    this.contexto?.destruir?.();
    // Se conservan las referencias destruidas hasta que terminen microtareas ya
    // iniciadas; así una cancelación durante un await no deja accesos nulos.
    this.alAplicarEscena = null;
  }

  async iniciarProcesamiento() {
    if (this.reproduciendo || this.destruido) {
      return;
    }

    this.reproduciendo = true;
    const version = this.contexto.versionCancelacion;

    try {
      while (this.cola.length > 0 && version === this.contexto.versionCancelacion) {
        const actualizacion = this.cola.shift();
        await this.reproducirActualizacion(actualizacion, version);
      }
    } finally {
      if (version === this.contexto.versionCancelacion) {
        this.reproduciendo = false;
        this.resolverEsperadoresInactividad();
      }
    }
  }

  async reproducirActualizacion(actualizacion, version) {
    for (const evento of actualizacion.eventosVisuales) {
      if (version !== this.contexto.versionCancelacion || this.destruido) return;
      await this.despachador.reproducir(evento, version);
    }

    if (version === this.contexto.versionCancelacion && !this.destruido) {
      this.alAplicarEscena(actualizacion.escenaFinal);
    }
  }

}
