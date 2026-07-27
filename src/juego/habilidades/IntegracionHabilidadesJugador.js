import { guardarJugadorDurable } from "../../Partida/PersistenciaJugador.js";
import { BarraHabilidades } from "../../interfaz/habilidades/BarraHabilidades.js";
import { PanelHabilidadesMaestrias } from "../../interfaz/habilidades/PanelHabilidadesMaestrias.js";
import { ControladorEntradaHabilidades } from "./ControladorEntradaHabilidades.js";
import { suscribirCambiosProgresoMagico } from "./ObservadorProgresoMagico.js";
import {
  guardarConfiguracionBarraHabilidades,
  leerConfiguracionBarraHabilidades,
  eliminarConfiguracionBarraHabilidades,
} from "./PersistenciaBarraHabilidades.js";
import { SistemaHabilidadesJugador } from "./SistemaHabilidadesJugador.js";

// Coordina los componentes permanentes de habilidades durante la vida de un
// mapa activo. No contiene reglas de progreso, combate ni persistencia propia.
export class IntegracionHabilidadesJugador {
  constructor({
    juego,
    renderizador,
    configuracionEjecucion,
    configuracionProgreso,
    configuracionObjetos,
    esJuegoActivo,
  } = {}) {
    if (!juego || typeof esJuegoActivo !== "function") {
      throw new Error(
        "La integración de habilidades necesita un Juego y su verificación de actividad.",
      );
    }

    if (
      !renderizador ||
      typeof renderizador.dibujarJuego !== "function" ||
      typeof renderizador.mostrarMensaje !== "function" ||
      typeof renderizador.actualizarEstadoVisualHabilidad !== "function"
    ) {
      throw new Error(
        "La integración de habilidades necesita el renderizador activo de la partida.",
      );
    }

    normalizarFachadaJuego(juego);

    this.juego = juego;
    this.jugador = juego.jugador;
    this.renderizador = renderizador;
    this.configuracionEjecucion = configuracionEjecucion;
    this.configuracionProgreso = configuracionProgreso;
    this.configuracionObjetos =
      configuracionObjetos ?? juego.configuracionObjetos;
    this.esJuegoActivo = esJuegoActivo;
    this.destruida = false;

    this.sistema = new SistemaHabilidadesJugador({
      juego,
      configuracionEjecucion,
    });

    this.restaurarBarraGuardada();

    this.barra = new BarraHabilidades({ sistemaHabilidades: this.sistema });
    this.panel = new PanelHabilidadesMaestrias({
      sistemaHabilidades: this.sistema,
      jugador: this.jugador,
      configuracionProgreso,
      configuracionEjecucion,
      familiasArmas: obtenerFamiliasArmas(this.configuracionObjetos),
      alGuardarCambios: ({ tipo }) => this.guardarCambios(tipo),
    });

    this.entrada = new ControladorEntradaHabilidades({
      sistemaHabilidades: this.sistema,
      esJuegoActivo: () =>
        !this.destruida && this.esJuegoActivo() && !this.panel.estaAbierto(),
      alProcesarResultado: (resultado) => this.procesarResultado(resultado),
    });

    this.desuscribirSistema = this.sistema.suscribirCambio(() => {
      this.actualizarSeleccionVisual();
      this.panel.renderizar();
      this.redibujarPartida();
    });

    this.desuscribirProgreso = suscribirCambiosProgresoMagico(
      this.jugador,
      () => {
        this.panel.renderizar();
        this.guardarJugador();
      },
    );
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
      return guardarJugadorDurable({ jugador: this.jugador });
    } catch (error) {
      console.warn("No se pudo guardar el jugador después del cambio:", error);
      return { exito: false, error };
    }
  }

  actualizarSeleccionVisual() {
    return this.renderizador.actualizarEstadoVisualHabilidad({
      activo: this.sistema.modoHabilidad === true,
      selector: this.sistema.obtenerSeleccionDetallada(),
    });
  }

  procesarResultado(resultado) {
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

    try {
      this.guardarBarra();
    } catch (error) {
      console.warn("No se pudo conservar la barra al cambiar de mapa:", error);
    }

    this.desuscribirProgreso?.();
    this.desuscribirSistema?.();
    this.entrada?.destruir();
    this.barra?.destruir();
    this.panel?.destruir();
    this.sistema?.destruir();
    this.renderizador.actualizarEstadoVisualHabilidad(null);

    return true;
  }
}

function normalizarFachadaJuego(juego) {
  if (!juego || typeof juego !== "object") {
    throw new Error(
      "La integración de habilidades recibió una instancia de Juego inválida.",
    );
  }

  definirAliasLectura(juego, "jugador", "player");
  definirAliasLectura(juego, "mapa", "map");
  definirAliasLectura(juego, "modoCombate", "modoCombateActivo");
  definirAliasLectura(juego, "modoInteraccion", "modoInteraccionActivo");

  if (!juego.jugador || !juego.mapa) {
    throw new Error("Juego no expone jugador y mapa para las habilidades.");
  }

  return juego;
}

function definirAliasLectura(objeto, alias, propiedadReal) {
  if (alias in objeto || !(propiedadReal in objeto)) return;

  Object.defineProperty(objeto, alias, {
    configurable: true,
    enumerable: false,
    get() {
      return this[propiedadReal];
    },
  });
}

function obtenerFamiliasArmas(configuracionObjetos) {
  if (!configuracionObjetos || typeof configuracionObjetos !== "object") {
    return ["daga", "espada", "mandoble", "lanza", "arco", "varita", "baston"];
  }

  const familias = new Set();
  for (const objeto of Object.values(configuracionObjetos)) {
    if (
      (objeto?.tipo === "arma" || objeto?.tipoObjeto === "arma") &&
      typeof objeto.familiaObjeto === "string"
    ) {
      familias.add(objeto.familiaObjeto);
    }
  }

  return familias.size > 0
    ? [...familias]
    : ["daga", "espada", "mandoble", "lanza", "arco", "varita", "baston"];
}
