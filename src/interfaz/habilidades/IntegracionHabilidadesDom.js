import { BarraHabilidades } from "./BarraHabilidades.js";
import { PanelHabilidadesMaestrias } from "./PanelHabilidadesMaestrias.js";
import { TIPOS_COMANDO_JUGADOR } from "../../aplicacion/EjecutorAccionesJugador.js";
import { suscribirCambiosProgresoHabilidades } from "../../juego/habilidades/ObservadorProgresoHabilidades.js";
import {
  guardarConfiguracionBarraHabilidades,
  leerConfiguracionBarraHabilidades,
  eliminarConfiguracionBarraHabilidades,
} from "../../juego/habilidades/PersistenciaBarraHabilidades.js";
import { SistemaHabilidadesJugador } from "../../juego/habilidades/SistemaHabilidadesJugador.js";

// Coordina la presentación DOM de habilidades durante la vida de un mapa
// activo. No contiene reglas de progreso, combate ni persistencia propia.
export class IntegracionHabilidadesDom {
  constructor({
    juego,
    renderizador,
    configuracionEjecucion,
    configuracionProgreso,
    gestorPaneles,
    esJuegoActivo,
    alEjecutarComando,
    alSolicitarGuardadoJugador,
  } = {}) {
    if (!juego || typeof esJuegoActivo !== "function") {
      throw new Error(
        "La integración DOM de habilidades necesita un Juego y su verificación de actividad.",
      );
    }

    if (
      !renderizador ||
      typeof renderizador.dibujarJuego !== "function" ||
      typeof renderizador.mostrarMensaje !== "function" ||
      typeof renderizador.actualizarEstadoVisualHabilidad !== "function" ||
      typeof renderizador.actualizarEstadoJugador !== "function"
    ) {
      throw new Error(
        "La integración DOM de habilidades necesita el renderizador activo de la partida.",
      );
    }

    if (typeof alEjecutarComando !== "function") {
      throw new Error(
        "La integración DOM de habilidades necesita una función para ejecutar comandos.",
      );
    }

    if (typeof alSolicitarGuardadoJugador !== "function") {
      throw new Error(
        "La integración DOM de habilidades necesita una función para solicitar el guardado del jugador.",
      );
    }

    if (!juego.player || !juego.map) {
      throw new Error(
        "La integración DOM de habilidades necesita un Juego activo con jugador y mapa.",
      );
    }

    this.juego = juego;
    this.jugador = juego.player;
    this.renderizador = renderizador;
    this.configuracionEjecucion = configuracionEjecucion;
    this.configuracionProgreso = configuracionProgreso;
    if (
      !gestorPaneles ||
      typeof gestorPaneles.registrarPanelDinamico !== "function" ||
      typeof gestorPaneles.cerrar !== "function"
    ) {
      throw new Error(
        "La integración DOM de habilidades necesita el gestor de paneles de la partida.",
      );
    }
    this.gestorPaneles = gestorPaneles;
    this.esJuegoActivo = esJuegoActivo;
    this.alEjecutarComando = alEjecutarComando;
    this.alSolicitarGuardadoJugador = alSolicitarGuardadoJugador;
    this.destruida = false;
    this.contextoProcesamientoComando = null;

    this.sistema = new SistemaHabilidadesJugador({
      juego,
      configuracionEjecucion,
    });

    this.restaurarBarraGuardada();

    this.barra = new BarraHabilidades({
      sistemaHabilidades: this.sistema,
      alSeleccionarRanura: (indiceRanura) =>
        this.alEjecutarComando({
          tipo: TIPOS_COMANDO_JUGADOR.SELECCIONAR_HABILIDAD_RANURA,
          indiceRanura,
          origenEntrada: "barra",
          silenciarRechazo: true,
        }),
    });

    this.panel = new PanelHabilidadesMaestrias({
      sistemaHabilidades: this.sistema,
      jugador: this.jugador,
      configuracionProgreso,
      configuracionEjecucion,
      alGuardarCambios: ({ tipo }) => this.guardarCambios(tipo),
      alSolicitarCierre: () => this.gestorPaneles.cerrar("habilidades"),
    });

    this.gestorPaneles.registrarPanelDinamico("habilidades", this.panel);

    this.desuscribirSistema = this.sistema.suscribirCambio(() => {
      this.actualizarSeleccionVisual();
      this.panel.renderizar();

      if (this.contextoProcesamientoComando) {
        this.contextoProcesamientoComando.cambioEmitido = true;
      }

      if (!this.contextoProcesamientoComando?.suprimirRedibujado) {
        this.redibujarPartida();
      }
    });

    this.desuscribirProgreso = suscribirCambiosProgresoHabilidades(
      this.jugador,
      (detalle) => {
        this.panel.renderizar();
        if (
          detalle?.tipo === "mejorarHabilidad" ||
          detalle?.tipo === "restaurarEstado"
        ) {
          this.renderizador.actualizarEstadoJugador(this.jugador);
        }
        this.guardarJugador();
      },
    );
  }

  obtenerSistemaParaEntrada() {
    if (
      this.destruida ||
      !this.esJuegoActivo() ||
      this.panel?.estaAbierto()
    ) {
      return null;
    }

    return this.sistema;
  }

  iniciarProcesamientoComando({ suprimirRedibujado = false } = {}) {
    const contexto = {
      suprimirRedibujado: suprimirRedibujado === true,
      cambioEmitido: false,
    };

    this.contextoProcesamientoComando = contexto;
    return contexto;
  }

  finalizarProcesamientoComando(contexto) {
    if (this.contextoProcesamientoComando !== contexto) {
      return {
        suprimirRedibujado: false,
        cambioEmitido: false,
      };
    }

    this.contextoProcesamientoComando = null;
    return { ...contexto };
  }

  cancelarProcesamientoComando(contexto) {
    if (this.contextoProcesamientoComando === contexto) {
      this.contextoProcesamientoComando = null;
    }
  }

  restaurarBarraGuardada() {
    try {
      const guardada = leerConfiguracionBarraHabilidades();
      if (guardada) {
        this.sistema.restaurarBarra(guardada.ranuras);
      } else {
        this.sistema.vaciarBarra();
      }
    } catch (error) {
      console.warn(
        "La configuración de la barra fue rechazada y se iniciará vacía:",
        error,
      );
      eliminarConfiguracionBarraHabilidades();
      this.sistema.vaciarBarra();
    }
  }

  guardarCambios(tipo) {
    if (tipo === "barra") this.guardarBarra();
    this.guardarJugador();
  }

  guardarBarra() {
    return guardarConfiguracionBarraHabilidades({
      ranuras: this.sistema.obtenerAsignaciones(),
    });
  }

  guardarJugador() {
    try {
      return this.alSolicitarGuardadoJugador();
    } catch (error) {
      console.warn("No se pudo solicitar el guardado del jugador después del cambio:", error);
      return { exito: false, error };
    }
  }

  actualizarSeleccionVisual() {
    return this.renderizador.actualizarEstadoVisualHabilidad({
      activo: this.sistema.modoHabilidad === true,
      selector: this.sistema.obtenerSeleccionDetallada(),
    });
  }

  registrarResultado(resultado) {
    if (!resultado) {
      return resultado;
    }

    const metodo = resultado.exito ? "info" : "warn";
    console[metodo]("[Dark Moon · Habilidades]", resultado.mensaje, resultado);
    return resultado;
  }

  procesarResultado(resultado) {
    this.registrarResultado(resultado);

    if (!resultado?.mensaje || this.destruida || !this.esJuegoActivo()) {
      return resultado;
    }

    this.renderizador.mostrarMensaje(resultado.mensaje);
    return resultado;
  }

  redibujarPartida() {
    if (this.destruida || !this.esJuegoActivo()) {
      return false;
    }

    this.renderizador.dibujarJuego(this.juego);
    return true;
  }

  destruir() {
    if (this.destruida) return false;
    this.destruida = true;
    this.contextoProcesamientoComando = null;

    try {
      this.guardarBarra();
    } catch (error) {
      console.warn("No se pudo conservar la barra al cambiar de mapa:", error);
    }

    this.desuscribirProgreso?.();
    this.desuscribirSistema?.();
    this.gestorPaneles?.desregistrarPanelDinamico?.("habilidades", this.panel);
    this.barra?.destruir();
    this.panel?.destruir();
    this.sistema?.destruir();
    this.renderizador.actualizarEstadoVisualHabilidad(null);

    return true;
  }
}
