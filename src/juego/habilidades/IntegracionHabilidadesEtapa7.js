import { guardarJugadorDurable } from "../../Partida/PersistenciaJugador.js";
import { BarraHabilidades } from "../../interfaz/habilidades/BarraHabilidades.js";
import { PanelHabilidadesMaestrias } from "../../interfaz/habilidades/PanelHabilidadesMaestrias.js";
import { ControladorEntradaHabilidades } from "./ControladorEntradaHabilidades.js";
import {
  crearDepuradorEtapa5,
  publicarDepuradorEtapa5,
} from "./DepuradorEtapa5.js";
import {
  crearDepuradorEtapa6,
  publicarDepuradorEtapa6,
} from "./DepuradorEtapa6.js";
import {
  crearDepuradorEtapa7,
  publicarDepuradorEtapa7,
} from "./DepuradorEtapa7.js";
import { suscribirCambiosProgresoMagico } from "./ObservadorProgresoMagico.js";
import {
  guardarConfiguracionBarraHabilidades,
  leerConfiguracionBarraHabilidades,
  eliminarConfiguracionBarraHabilidades,
} from "./PersistenciaBarraHabilidades.js";
import { SistemaHabilidadesJugadorEtapa7 } from "./SistemaHabilidadesJugadorEtapa7.js";

export class IntegracionHabilidadesEtapa7 {
  constructor({
    juego,
    configuracionEjecucion,
    configuracionProgreso,
    configuracionObjetos,
    esJuegoActivo,
  } = {}) {
    if (!juego || typeof esJuegoActivo !== "function") {
      throw new Error("ETAPA 7 necesita un Juego y su verificación de actividad.");
    }
    normalizarFachadaJuego(juego);
    this.juego = juego;
    this.jugador = juego.jugador;
    this.esJuegoActivo = esJuegoActivo;
    this.sistema = new SistemaHabilidadesJugadorEtapa7({
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
      familiasArmas: obtenerFamiliasArmas(
        configuracionObjetos ?? juego.configuracionObjetos,
      ),
      alGuardarCambios: ({ tipo }) => this.guardarCambios(tipo),
    });
    this.entrada = new ControladorEntradaHabilidades({
      sistemaHabilidades: this.sistema,
      esJuegoActivo: () => this.esJuegoActivo() && !this.panel.estaAbierto(),
    });

    this.desuscribirSistema = this.sistema.suscribirCambio(() => {
      this.panel.renderizar();
    });
    this.desuscribirProgreso = suscribirCambiosProgresoMagico(
      this.jugador,
      () => {
        this.panel.renderizar();
        this.guardarJugador();
      },
    );

    // El procesamiento de efectos temporales se conserva separado del
    // repintado. La interfaz ya no consulta todo el estado cada 250 ms.
    this.intervaloEfectos = window.setInterval(() => {
      if (this.esJuegoActivo()) {
        this.sistema.procesarEfectosPendientes();
      }
    }, 250);

    const depuradorEtapa5 = crearDepuradorEtapa5({
      juego,
      sistemaHabilidades: this.sistema,
    });
    publicarDepuradorEtapa5(depuradorEtapa5);
    const depuradorEtapa6 = crearDepuradorEtapa6({ juego });
    publicarDepuradorEtapa6(depuradorEtapa6);
    const depuradorEtapa7 = crearDepuradorEtapa7({
      juego,
      sistemaHabilidades: this.sistema,
      panel: this.panel,
      configuracionProgreso,
      configuracionEjecucion,
      guardarBarra: () => this.guardarBarra(),
    });
    publicarDepuradorEtapa7(depuradorEtapa7);
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
    if (tipo === "barra") {
      this.guardarBarra();
    }
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

  destruir() {
    try {
      this.guardarBarra();
    } catch (error) {
      console.warn("No se pudo conservar la barra al cambiar de mapa:", error);
    }
    window.clearInterval(this.intervaloEfectos);
    this.desuscribirProgreso?.();
    this.desuscribirSistema?.();
    this.entrada?.destruir();
    this.barra?.destruir();
    this.panel?.destruir();
  }
}

function normalizarFachadaJuego(juego) {
  if (!juego || typeof juego !== "object") {
    throw new Error("ETAPA 7 recibió una instancia de Juego inválida.");
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
  if (alias in objeto || !(propiedadReal in objeto)) {
    return;
  }
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
