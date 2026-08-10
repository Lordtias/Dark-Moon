import {
  calcularDuracionAnimacionPhaser,
  CONFIGURACION_ANIMACIONES_PHASER,
  normalizarVelocidadAnimacionPhaser,
} from "./ConfiguracionAnimacionesPhaser.js";
import { CreadorEfectosCombatePhaser } from "./CreadorEfectosCombatePhaser.js";
import { CreadorEfectosHabilidadesPhaser } from "./CreadorEfectosHabilidadesPhaser.js";
import { CreadorAreasHabilidadesPhaser } from "./CreadorAreasHabilidadesPhaser.js";
import { CreadorCadenasHabilidadesPhaser } from "./CreadorCadenasHabilidadesPhaser.js";
import { CreadorLineasHabilidadesPhaser } from "./CreadorLineasHabilidadesPhaser.js";
import { CreadorZonasTemporalesPhaser } from "./CreadorZonasTemporalesPhaser.js";
import { CreadorEstadosTemporalesPhaser } from "./CreadorEstadosTemporalesPhaser.js";
import { CreadorEfectosRecuperacionPhaser } from "./CreadorEfectosRecuperacionPhaser.js";
import { CreadorProyectilesElementalesPhaser } from "./CreadorProyectilesElementalesPhaser.js";
import { CreadorRecursosVisualesPhaser } from "./CreadorRecursosVisualesPhaser.js";

// Infraestructura compartida por los reproductores especializados. No conoce
// la cola de actualizaciones ni decide qué tipo de evento debe reproducirse.
export class ContextoReproduccionVisualPhaser {
  constructor({
    escena,
    compositor,
    gestorRecursos,
    alMoverJugadorVisual = null,
    obtenerCantidadEventosPendientes = null,
    obtenerRachaMovimientosJugadorPendientes = null,
    despacharEvento = null,
  } = {}) {
    if (!escena?.tweens || !escena?.time || !compositor || !gestorRecursos) {
      throw new Error(
        "El contexto visual necesita escena, compositor y recursos válidos.",
      );
    }
    if (
      alMoverJugadorVisual !== null &&
      typeof alMoverJugadorVisual !== "function"
    ) {
      throw new Error("El seguimiento visual del jugador debe ser una función.");
    }

    this.escena = escena;
    this.compositor = compositor;
    this.gestorRecursos = gestorRecursos;
    this.alMoverJugadorVisual = alMoverJugadorVisual;
    this.obtenerCantidadEventosPendientesCallback =
      typeof obtenerCantidadEventosPendientes === "function"
        ? obtenerCantidadEventosPendientes
        : () => 0;
    this.obtenerRachaMovimientosJugadorPendientesCallback =
      typeof obtenerRachaMovimientosJugadorPendientes === "function"
        ? obtenerRachaMovimientosJugadorPendientes
        : () => 0;
    this.despacharEventoCallback =
      typeof despacharEvento === "function" ? despacharEvento : null;

    this.creadorEfectos = new CreadorEfectosCombatePhaser({ escena, compositor });
    this.creadorEfectosHabilidades = new CreadorEfectosHabilidadesPhaser({
      escena,
      compositor,
    });
    this.creadorAreasHabilidades = new CreadorAreasHabilidadesPhaser({
      escena,
      compositor,
    });
    this.creadorCadenasHabilidades = new CreadorCadenasHabilidadesPhaser({
      escena,
      compositor,
    });
    this.creadorLineasHabilidades = new CreadorLineasHabilidadesPhaser({
      escena,
      compositor,
    });
    this.creadorZonasTemporales = new CreadorZonasTemporalesPhaser({
      escena,
      compositor,
    });
    this.creadorEstadosTemporales = new CreadorEstadosTemporalesPhaser({
      escena,
      compositor,
    });
    this.creadorEfectosRecuperacion = new CreadorEfectosRecuperacionPhaser({
      escena,
      compositor,
    });
    this.creadorProyectilesElementales = new CreadorProyectilesElementalesPhaser({
      escena,
      compositor,
    });
    this.creadorRecursosVisuales = new CreadorRecursosVisualesPhaser({
      escena,
      compositor,
      gestorRecursos,
    });

    this.velocidad = CONFIGURACION_ANIMACIONES_PHASER.velocidadInicial;
    this.efectosReducidos = false;
    this.versionCancelacion = 0;
    this.destruido = false;
    this.tweensActivos = new Set();
    this.temporizadoresActivos = new Set();
  }

  configurar({ velocidad, efectosReducidos } = {}) {
    if (velocidad !== undefined) {
      this.velocidad = normalizarVelocidadAnimacionPhaser(velocidad);
    }
    if (efectosReducidos !== undefined) {
      this.efectosReducidos = efectosReducidos === true;
    }
    return Object.freeze({
      velocidad: this.velocidad,
      efectosReducidos: this.efectosReducidos,
    });
  }

  obtenerCantidadEventosPendientes() {
    return Number(this.obtenerCantidadEventosPendientesCallback()) || 0;
  }

  obtenerRachaMovimientosJugadorPendientes() {
    return Number(this.obtenerRachaMovimientosJugadorPendientesCallback()) || 0;
  }

  calcularDuracion(duracionBase) {
    return calcularDuracionAnimacionPhaser(duracionBase, {
      velocidad: this.velocidad,
      cantidadPendiente: this.obtenerCantidadEventosPendientes(),
    });
  }

  crearTween(configuracion, version) {
    return new Promise((resolver) => {
      if (version !== this.versionCancelacion || this.destruido) {
        resolver();
        return;
      }

      let tween = null;
      let finalizado = false;
      const finalizar = () => {
        if (finalizado) return;
        finalizado = true;
        if (tween) this.tweensActivos.delete(tween);
        resolver();
      };

      tween = this.escena.tweens.add({
        ...configuracion,
        onComplete: finalizar,
        onStop: finalizar,
      });
      this.tweensActivos.add(tween);
    });
  }

  esperar(duracion, version) {
    return new Promise((resolver) => {
      if (version !== this.versionCancelacion || this.destruido) {
        resolver();
        return;
      }

      let finalizado = false;
      const espera = { temporizador: null, finalizar: null };
      const finalizar = () => {
        if (finalizado) return;
        finalizado = true;
        this.temporizadoresActivos.delete(espera);
        resolver();
      };

      espera.finalizar = finalizar;
      espera.temporizador = this.escena.time.delayedCall(duracion, finalizar);
      this.temporizadoresActivos.add(espera);
    });
  }

  cancelarEjecucion() {
    this.versionCancelacion += 1;
    for (const tween of this.tweensActivos) {
      tween.stop?.();
      tween.remove?.();
    }
    this.tweensActivos.clear();

    for (const espera of this.temporizadoresActivos) {
      espera.temporizador?.remove?.(false);
      espera.finalizar?.();
    }
    this.temporizadoresActivos.clear();
    return this.versionCancelacion;
  }

  async reproducirEventoVisual(evento, version) {
    if (!this.despacharEventoCallback) return;
    return await this.despacharEventoCallback(evento, version);
  }

  destruir() {
    if (this.destruido) return;
    this.destruido = true;
    for (const tween of this.tweensActivos) {
      tween.stop?.();
      tween.remove?.();
    }
    this.tweensActivos.clear();
    for (const espera of this.temporizadoresActivos) {
      espera.temporizador?.remove?.(false);
      espera.finalizar?.();
    }
    this.temporizadoresActivos.clear();

    this.escena = null;
    this.compositor = null;
    this.gestorRecursos = null;
    this.alMoverJugadorVisual = null;
    this.despacharEventoCallback = null;
    this.creadorEfectos = null;
    this.creadorEfectosHabilidades = null;
    this.creadorAreasHabilidades = null;
    this.creadorCadenasHabilidades = null;
    this.creadorLineasHabilidades = null;
    this.creadorZonasTemporales = null;
    this.creadorEstadosTemporales = null;
    this.creadorEfectosRecuperacion = null;
    this.creadorProyectilesElementales = null;
    this.creadorRecursosVisuales = null;
  }
}
