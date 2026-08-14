import { traducir } from "../../idiomas/ContextoIdioma.js";
import { TIPOS_ENTIDAD_VISUAL } from "../TiposEscena.js";
import { CompositorMundoPhaser } from "./CompositorMundoPhaser.js";
import { ControladorCamaraPhaser } from "./ControladorCamaraPhaser.js";
import { ControladorEntradaJugablePhaser } from "./ControladorEntradaJugablePhaser.js";
import { ConversorCoordenadasPhaser } from "./ConversorCoordenadasPhaser.js";
import { GestorRecursosPhaser } from "./GestorRecursosPhaser.js";
import { obtenerRutasRecursosMapaPhaser } from "./RecursosMapaPhaser.js";
import {
  ReproductorEventosVisualesPhaser,
} from "./ReproductorEventosVisualesPhaser.js";

// La clase se crea después de validar la dependencia Phaser para mantener su
// acceso explícito y evitar dependencias globales ocultas entre módulos.
export function crearEscenaArranquePhaser({
  Phaser,
  alPreparar,
  zoomInicial,
  configuracionZoomInterfaz,
} = {}) {
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
      this.textoZoom = null;
      this.temporizadorZoom = null;
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
        zoomInicial,
        configuracionZoomInterfaz,
        alCambiar: (estado, motivo) => this.mostrarFeedbackCamara(estado, motivo),
      });

      this.reproductorEventosVisuales =
        new ReproductorEventosVisualesPhaser({
          escena: this,
          compositor: this.compositor,
          gestorRecursos: this.gestorRecursos,
          alAplicarEscena: (escenaFinal) =>
            this.aplicarEscenaInmediata(escenaFinal),
          alMoverJugadorVisual: (posicion) =>
            this.controladorCamara?.actualizarPosicionVisualJugador(posicion),
        });

      this.textoZoom = this.add
        .text(14, 14, "", {
          color: "#edf4ee",
          backgroundColor: "rgba(7, 13, 10, 0.82)",
          fontFamily: "Georgia, serif",
          fontSize: "13px",
          fontStyle: "bold",
          padding: { x: 9, y: 6 },
          stroke: "#07100c",
          strokeThickness: 1,
        })
        .setScrollFactor(0)
        .setDepth(1000)
        .setVisible(false);

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

    esperarPresentacionPendiente() {
      return this.reproductorEventosVisuales?.esperarInactividad() ?? null;
    }

    async prepararRecursosMapa({
      escena,
      recursosEntidades = [],
      alProgreso = null,
    } = {}) {
      if (!this.gestorRecursos) {
        throw new Error("La escena Phaser todavía no preparó su gestor de recursos.");
      }

      const rutas = obtenerRutasRecursosMapaPhaser({
        escena,
        recursosEntidades,
      });

      return this.gestorRecursos.precargarYEsperar(rutas, { alProgreso });
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
      if (this.redibujoPendiente || this.destruida) {
        return;
      }

      this.redibujoPendiente = true;

      const programarRedibujo = () => {
        if (this.destruida) {
          this.redibujoPendiente = false;
          return;
        }

        requestAnimationFrame(() => {
          this.redibujoPendiente = false;

          if (this.destruida) {
            return;
          }

          // Una textura puede terminar de cargar mientras se reproduce una
          // actualización visual. Redibujar en ese instante reemplazaría nodos
          // que todavía están siendo animados, pero descartar la solicitud deja
          // la nueva textura sin aplicar hasta la siguiente acción jugable.
          // Si apareció otra animación entre la espera y este frame, diferimos
          // nuevamente el redibujo hasta que el reproductor quede inactivo.
          if (this.reproductorEventosVisuales?.estaActivo()) {
            this.solicitarRedibujo();
            return;
          }

          this.redibujar();
        });
      };

      if (this.reproductorEventosVisuales?.estaActivo()) {
        this.reproductorEventosVisuales
          .esperarInactividad()
          .then(programarRedibujo);
        return;
      }

      programarRedibujo();
    }

    mostrarFeedbackCamara(estado, motivo) {
      if (!this.textoZoom || !estado || motivo !== "zoom") return;
      const porcentaje = Math.round(estado.zoom * 100);
      this.textoZoom
        .setText(
          traducir("interfaz.ayuda.zoomFeedback", {
            parametros: { porcentaje },
            respaldo: `Zoom ${porcentaje} %`,
          }),
        )
        .setVisible(true)
        .setAlpha(1);
      this.temporizadorZoom?.remove?.(false);
      this.temporizadorZoom = this.time.delayedCall(900, () => {
        this.textoZoom?.setVisible(false);
      });
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
      this.temporizadorZoom?.remove?.(false);
      this.temporizadorZoom = null;
      this.textoZoom = null;
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
