import { TIPOS_ENTIDAD_VISUAL } from "../TiposEscena.js";
import { CompositorMundoPhaser } from "./CompositorMundoPhaser.js";
import { ControladorCamaraPhaser } from "./ControladorCamaraPhaser.js";
import { ControladorEntradaJugablePhaser } from "./ControladorEntradaJugablePhaser.js";
import { ConversorCoordenadasPhaser } from "./ConversorCoordenadasPhaser.js";
import { GestorRecursosPhaser } from "./GestorRecursosPhaser.js";
import {
  ReproductorEventosVisualesPhaser,
} from "./ReproductorEventosVisualesPhaser.js";

// La clase se crea después de cargar Phaser para no introducir una dependencia
// global durante el arranque del modo Canvas 2D.
export function crearEscenaArranquePhaser({ Phaser, alPreparar } = {}) {
  if (!Phaser?.Scene) {
    throw new Error("No se puede crear la escena sin Phaser.Scene.");
  }

  return class EscenaArranquePhaser extends Phaser.Scene {
    constructor() {
      super({ key: "escena-visual-dark-moon" });

      this.escenaDarkMoon = null;
      this.dimensionesMapa = null;
      this.gestorRecursos = null;
      this.conversorCoordenadas = null;
      this.compositor = null;
      this.controladorCamara = null;
      this.controladorEntradaJugable = null;
      this.reproductorEventosVisuales = null;
      this.alEjecutarComando = null;
      this.textoAyuda = null;
      this.redibujoPendiente = false;
      this.destruida = false;
    }

    create() {
      this.gestorRecursos = new GestorRecursosPhaser({
        escena: this,
        alActualizar: () => {
          this.compositor?.invalidarTerreno();
          this.solicitarRedibujo();
        },
      });

      this.conversorCoordenadas = new ConversorCoordenadasPhaser({
        camara: this.cameras.main,
      });

      this.compositor = new CompositorMundoPhaser({
        escena: this,
        gestorRecursos: this.gestorRecursos,
        conversorCoordenadas: this.conversorCoordenadas,
      });

      this.controladorCamara = new ControladorCamaraPhaser({
        escena: this,
        compositor: this.compositor,
        conversorCoordenadas: this.conversorCoordenadas,
        alCambiar: (estado) => this.actualizarTextoAyuda(estado),
      });

      this.reproductorEventosVisuales =
        new ReproductorEventosVisualesPhaser({
          escena: this,
          compositor: this.compositor,
          alAplicarEscena: (escenaFinal) =>
            this.aplicarEscenaInmediata(escenaFinal),
          alMoverJugadorVisual: (posicion) =>
            this.controladorCamara?.actualizarPosicionVisualJugador(posicion),
        });

      this.textoAyuda = this.add
        .text(14, 14, "", {
          color: "#edf4ee",
          backgroundColor: "rgba(7, 13, 10, 0.82)",
          fontFamily: "Georgia, serif",
          fontSize: "12px",
          padding: { x: 9, y: 6 },
          stroke: "#07100c",
          strokeThickness: 1,
        })
        .setScrollFactor(0)
        .setDepth(1000);

      this.actualizarTextoAyuda(this.controladorCamara.obtenerEstado());

      this.events.once("shutdown", () => this.destruirComponentes());
      this.events.once("destroy", () => this.destruirComponentes());

      if (typeof alPreparar === "function") {
        alPreparar(this);
      }

      this.redibujar();
    }

    update(tiempo, delta) {
      this.controladorCamara?.actualizar(delta);
    }

    configurarDimensionesMapa(dimensiones) {
      this.dimensionesMapa = dimensiones ? { ...dimensiones } : null;
      this.redibujar();
    }

    actualizarEscena(escena, { eventosVisuales = [] } = {}) {
      if (!escena) {
        this.reproductorEventosVisuales?.cancelar();
        this.escenaDarkMoon = null;
        return;
      }

      const mismoMapa = pertenecenAlMismoMapa(this.escenaDarkMoon, escena);
      const puedeAnimar =
        mismoMapa &&
        this.escenaDarkMoon !== null &&
        this.reproductorEventosVisuales !== null;

      if (!puedeAnimar) {
        this.reproductorEventosVisuales?.cancelar();
        this.aplicarEscenaInmediata(escena);
        return;
      }

      this.reproductorEventosVisuales.encolar({
        escenaFinal: escena,
        eventosVisuales,
      });
    }

    configurarAnimaciones(configuracion = {}) {
      return this.reproductorEventosVisuales?.configurar(configuracion) ?? null;
    }

    aplicarEscenaInmediata(escena) {
      this.escenaDarkMoon = escena ?? null;
      this.redibujar();
    }

    sincronizarCamaraConVista() {
      this.controladorCamara?.sincronizarVista();
    }

    establecerManejadorEntradaJugable(alEjecutarComando = null) {
      if (
        alEjecutarComando !== null &&
        alEjecutarComando !== undefined &&
        typeof alEjecutarComando !== "function"
      ) {
        throw new Error(
          "La escena Phaser necesita una función de entrada o null.",
        );
      }

      this.controladorEntradaJugable?.destruir();
      this.controladorEntradaJugable = null;
      this.alEjecutarComando = alEjecutarComando ?? null;

      if (!this.alEjecutarComando || !this.conversorCoordenadas) {
        return false;
      }

      this.controladorEntradaJugable =
        new ControladorEntradaJugablePhaser({
          escena: this,
          conversorCoordenadas: this.conversorCoordenadas,
          obtenerModoSeleccion: () =>
            this.escenaDarkMoon?.combate?.modo ?? null,
          alEjecutarComando: this.alEjecutarComando,
        });

      return true;
    }

    redibujar() {
      if (!this.compositor || !this.controladorCamara || !this.escenaDarkMoon) {
        return;
      }

      const geometria = this.compositor.actualizar(this.escenaDarkMoon);
      this.controladorCamara.actualizarMapa(geometria);

      const jugador = this.escenaDarkMoon.entidades?.find(
        (entidad) => entidad.tipo === TIPOS_ENTIDAD_VISUAL.JUGADOR,
      );
      this.controladorCamara.actualizarJugador(jugador);
      this.controladorCamara.actualizarSeleccionActiva(
        this.escenaDarkMoon.combate?.activo === true,
      );
    }

    solicitarRedibujo() {
      if (
        this.redibujoPendiente ||
        this.destruida ||
        this.reproductorEventosVisuales?.estaActivo()
      ) {
        return;
      }

      this.redibujoPendiente = true;
      requestAnimationFrame(() => {
        this.redibujoPendiente = false;
        this.redibujar();
      });
    }

    actualizarTextoAyuda(estado) {
      if (!this.textoAyuda || !estado) {
        return;
      }

      const zoom = Math.round(estado.zoom * 100);
      const seguimiento = estado.siguiendoJugador
        ? "siguiendo al personaje"
        : "cámara libre";
      const controles = estado.seleccionActiva
        ? "Selección: clic para elegir · F/R: confirmar · rueda o +/-: zoom"
        : "IJKL: cámara · rueda o +/-: zoom · arrastre: cámara · H: recentrar";

      this.textoAyuda.setText(
        `Vista ${zoom}% · ${seguimiento}\n` +
          controles,
      );
    }

    destruirComponentes() {
      if (this.destruida) {
        return;
      }

      this.destruida = true;
      this.controladorEntradaJugable?.destruir();
      this.reproductorEventosVisuales?.destruir();
      this.controladorCamara?.destruir();
      this.compositor?.destruir();
      this.conversorCoordenadas?.destruir();
      this.gestorRecursos?.destruir();
      this.controladorEntradaJugable = null;
      this.reproductorEventosVisuales = null;
      this.controladorCamara = null;
      this.alEjecutarComando = null;
      this.compositor = null;
      this.conversorCoordenadas = null;
      this.gestorRecursos = null;
      this.textoAyuda = null;
      this.escenaDarkMoon = null;
    }
  };
}

function pertenecenAlMismoMapa(escenaAnterior, escenaFinal) {
  return Boolean(
    escenaAnterior?.mapa?.casillas &&
      escenaFinal?.mapa?.casillas &&
      escenaAnterior.mapa.casillas === escenaFinal.mapa.casillas,
  );
}
