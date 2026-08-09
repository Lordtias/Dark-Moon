import { ControladorTeclado } from "../../controles/ControladorTeclado.js";
import { ControladorEquipamientoDom } from "../objetos/ControladorEquipamientoDom.js";
import { ControladorComercioDom } from "../comercio/ControladorComercioDom.js";
import { AdaptadorInteraccionesDom } from "../interacciones/AdaptadorInteraccionesDom.js";
import { IntegracionHabilidadesDom } from "../habilidades/IntegracionHabilidadesDom.js";
import {
  obtenerConfiguracionEjecucionHabilidades,
  obtenerConfiguracionProgresoMagico,
} from "../../juego/maestrias/ContextoProgresoMagico.js";

// Construye y administra los adaptadores DOM asociados a un único mapa.
//
// La sesión y las reglas continúan coordinadas por ControladorPartida. Esta
// presentación solamente conecta el Juego activo con teclado, paneles,
// ventanas e integración visual de habilidades.
export class PresentacionMapaActivoDom {
  constructor({
    juego,
    interfazPartida,
    gestorMercaderesPartida,
    configuracionObjetos,
    configuracionRarezas,
    configuracionComercio,
    configuracionHabilidadesNPC,
    obtenerMazmorrasDisponibles,
    alSeleccionarMazmorra,
    alSolicitarTransicionMapa,
    alProcesarResultado,
    alEjecutarAccionJugable,
    alEjecutarComando,
    esJuegoActivo,
  } = {}) {
    validarJuego(juego);
    validarInterfazPartida(interfazPartida);
    validarFuncion(
      obtenerMazmorrasDisponibles,
      "consultar las mazmorras disponibles",
    );
    validarFuncion(alSeleccionarMazmorra, "seleccionar una mazmorra");
    validarFuncion(alSolicitarTransicionMapa, "procesar transiciones de mapa");
    validarFuncion(alProcesarResultado, "procesar resultados de acción");
    validarFuncion(
      alEjecutarAccionJugable,
      "ejecutar acciones jugables centralizadas",
    );
    validarFuncion(alEjecutarComando, "ejecutar comandos del jugador");
    validarFuncion(esJuegoActivo, "comprobar el mapa activo");

    this.juego = juego;
    this.interfazPartida = interfazPartida;
    this.alEjecutarComando = alEjecutarComando;
    this.estaActiva = false;
    this.destruida = false;

    this.controladorTeclado = new ControladorTeclado({
      alEjecutarComando: (comando) =>
        alEjecutarComando({
          ...comando,
          origenEntrada: comando?.origenEntrada ?? "teclado",
        }),
    });

    this.controladorEquipamiento = new ControladorEquipamientoDom({
      juego,
      panelInventario: interfazPartida.panelInventario,
      panelEquipamiento: interfazPartida.panelEquipamiento,
      modalDetalleObjeto: interfazPartida.modalDetalleObjeto,
      alEjecutarAccionJugable,
    });

    this.controladorComercio = new ControladorComercioDom({
      juego,
      modalComercio: interfazPartida.modalComercio,
      gestorMercaderesPartida,
      configuracionObjetos,
      configuracionRarezas,
      configuracionComercio,
      alEjecutarAccionJugable,
    });

    this.adaptadorInteracciones = new AdaptadorInteraccionesDom({
      juego,
      configuracionHabilidadesNPC,
      modalContenedorObjetos: interfazPartida.modalContenedorObjetos,
      modalSeleccionMazmorra: interfazPartida.modalSeleccionMazmorra,
      obtenerMazmorrasDisponibles,
      alSeleccionarMazmorra,
      alSolicitarComercio: (idMercader) =>
        this.controladorComercio.abrir(idMercader),
      alSolicitarTransicionMapa,
      alProcesarResultado,
      alEjecutarAccionJugable,
    });

    this.integracionHabilidades = new IntegracionHabilidadesDom({
      juego,
      renderizador: interfazPartida.renderizador,
      configuracionEjecucion: obtenerConfiguracionEjecucionHabilidades(),
      configuracionProgreso: obtenerConfiguracionProgresoMagico(),
      configuracionObjetos,
      esJuegoActivo,
      alEjecutarComando,
    });
  }

  activar() {
    if (this.destruida) {
      throw new Error(
        "No se puede activar una presentación de mapa ya destruida.",
      );
    }

    if (this.estaActiva) {
      return false;
    }

    try {
      this.interfazPartida.renderizador.conectarEntradaMapa(
        this.alEjecutarComando,
      );
      this.controladorTeclado.activar();
      this.controladorEquipamiento.activar();
      this.estaActiva = true;
      return true;
    } catch (error) {
      this.interfazPartida.renderizador.conectarEntradaMapa(null);
      this.controladorTeclado.desactivar();
      this.controladorEquipamiento.desactivar();
      throw error;
    }
  }

  presentarInteraccion(interaccion) {
    if (this.destruida) {
      throw new Error(
        "No se puede presentar una interacción desde un mapa destruido.",
      );
    }

    return this.adaptadorInteracciones.presentar(interaccion);
  }

  obtenerSistemaHabilidades() {
    return this.integracionHabilidades?.obtenerSistemaParaEntrada() ?? null;
  }

  obtenerIntegracionHabilidades() {
    return this.integracionHabilidades ?? null;
  }

  destruir() {
    if (this.destruida) {
      return false;
    }

    // Se desconecta primero la entrada del mapa para que ningún clic tardío
    // alcance la instancia de Juego que está por destruirse.
    this.interfazPartida.renderizador.conectarEntradaMapa(null);

    // Se retiran después observadores y listeners de habilidades, igual que en
    // el flujo anterior, antes de destruir la instancia de Juego asociada.
    this.integracionHabilidades?.destruir();
    this.controladorComercio?.desactivar();
    this.controladorTeclado?.desactivar();
    this.controladorEquipamiento?.desactivar();
    this.adaptadorInteracciones?.desactivar();

    this.alEjecutarComando = null;
    this.estaActiva = false;
    this.destruida = true;
    return true;
  }
}

function validarJuego(juego) {
  if (!juego?.player || typeof juego !== "object") {
    throw new Error(
      "PresentacionMapaActivoDom necesita una instancia de Juego válida.",
    );
  }
}

function validarInterfazPartida(interfaz) {
  const propiedadesObligatorias = [
    "renderizador",
    "panelInventario",
    "panelEquipamiento",
    "modalDetalleObjeto",
    "modalContenedorObjetos",
    "modalSeleccionMazmorra",
    "modalComercio",
  ];

  if (!interfaz || typeof interfaz !== "object") {
    throw new Error(
      "PresentacionMapaActivoDom necesita la interfaz persistente de partida.",
    );
  }

  for (const propiedad of propiedadesObligatorias) {
    if (!interfaz[propiedad]) {
      throw new Error(
        `La interfaz de partida no contiene el componente "${propiedad}".`,
      );
    }
  }
}

function validarFuncion(valor, descripcion) {
  if (typeof valor !== "function") {
    throw new Error(
      `PresentacionMapaActivoDom necesita una acción para ${descripcion}.`,
    );
  }
}
