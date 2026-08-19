import { configurarContextoPresentacionObjetos } from "../objetos/ContextoPresentacionObjetos.js";
import { Renderizador } from "../Renderizador.js";
import { RenderizadorPhaser } from "../graficos/phaser/RenderizadorPhaser.js";
import { PanelPersonaje } from "../PanelPersonaje.js";
import { PanelInventario } from "../PanelInventario.js";
import { PanelEquipamiento } from "../PanelEquipamiento.js";
import { ModalDetalleObjeto } from "../objetos/ModalDetalleObjeto.js";
import { ModalContenedorObjetos } from "../objetos/ModalContenedorObjetos.js";
import { ModalSeleccionMazmorra } from "../ModalSeleccionMazmorra.js";
import { ModalComercio } from "../comercio/ModalComercio.js";
import { ModalAyudaJuego } from "../ayuda/ModalAyudaJuego.js";
import { ModalDetalleEntidad } from "../entidades/ModalDetalleEntidad.js";
import { GestorPanelesPartidaDom } from "./GestorPanelesPartidaDom.js";
import { HudPartidaDom } from "./HudPartidaDom.js";
import {
  obtenerConfiguracionEjecucionHabilidades,
  obtenerConfiguracionProgresoHabilidades,
} from "../../juego/maestrias/ContextoProgresoHabilidades.js";

// Crea los componentes visuales persistentes utilizados durante toda una
// partida. La fábrica no crea reglas jugables: solamente conecta las vistas
// HTML persistentes y el backend Phaser con sus contratos de presentación.
export function crearInterfazPartidaDom({
  configuracionRarezas,
  configuracionPersonaje = null,
  configuracionEnemigos = null,
  Phaser = null,
  preferenciasInterfaz = null,
  configuracionZoomInterfaz = null,
  obtenerContextoDiagnostico = () => ({}),
} = {}) {
  configurarContextoPresentacionObjetos({ configuracionRarezas });

  const panelMapa = obtenerElementoObligatorio("gameMapPanel", "panel del mapa");
  const renderizadorMapa = new RenderizadorPhaser({
    Phaser,
    contenedor: panelMapa,
    preferenciasInterfaz,
    configuracionZoomInterfaz,
  });

  const panelPersonaje = new PanelPersonaje({
    contenedor: obtenerElementoObligatorio("panelPersonaje", "panel del personaje"),
    plantilla: obtenerElementoObligatorio(
      "plantillaPanelPersonaje",
      "plantilla del panel del personaje",
    ),
    configuracionHabilidades: obtenerConfiguracionProgresoHabilidades(),
    configuracionEjecucionHabilidades: obtenerConfiguracionEjecucionHabilidades(),
  });

  const panelInventario = new PanelInventario({
    cuadricula: obtenerElementoObligatorio(
      "cuadriculaInventario",
      "cuadrícula del inventario",
    ),
    mensajeVacio: obtenerElementoObligatorio(
      "mensajeInventario",
      "mensaje del inventario",
    ),
  });

  const panelEquipamiento = new PanelEquipamiento({
    cuadricula: obtenerElementoObligatorio(
      "cuadriculaEquipamiento",
      "cuadrícula de equipamiento",
    ),
  });

  const hudPartida = new HudPartidaDom({
    configuracionHabilidades: obtenerConfiguracionEjecucionHabilidades(),
    elementos: {
      vidaTexto: obtenerElementoObligatorio("hudVidaTexto", "valor de Vida del HUD"),
      vidaRelleno: obtenerElementoObligatorio("hudVidaRelleno", "relleno de Vida del HUD"),
      vidaTextoMovil: document.getElementById("hudVidaTextoMovil"),
      vidaRellenoMovil: document.getElementById("hudVidaRellenoMovil"),
      manaTexto: obtenerElementoObligatorio("hudManaTexto", "valor de Maná del HUD"),
      manaRelleno: obtenerElementoObligatorio("hudManaRelleno", "relleno de Maná del HUD"),
      manaTextoMovil: document.getElementById("hudManaTextoMovil"),
      manaRellenoMovil: document.getElementById("hudManaRellenoMovil"),
      experienciaTexto: obtenerElementoObligatorio(
        "hudExperienciaTexto",
        "experiencia del HUD",
      ),
      experienciaRelleno: obtenerElementoObligatorio(
        "hudExperienciaRelleno",
        "barra de experiencia del HUD",
      ),
      nivelTexto: obtenerElementoObligatorio("hudNivelTexto", "nivel del HUD"),
      aurasActivas: obtenerElementoObligatorio("hudAurasActivas", "auras activas del HUD"),
      maldicionesActivas: obtenerElementoObligatorio("hudMaldicionesActivas", "maldiciones activas del HUD"),
    },
  });

  const modalDetalleObjeto = new ModalDetalleObjeto();
  const modalDetalleEntidad = new ModalDetalleEntidad();
  const modalContenedorObjetos = new ModalContenedorObjetos();
  const modalSeleccionMazmorra = new ModalSeleccionMazmorra();
  const modalComercio = new ModalComercio();

  const modalAyudaJuego = new ModalAyudaJuego({
    botonAbrir: obtenerElementoObligatorio(
      "gameHelpButton",
      "botón de ayuda del menú de partida",
    ),
    obtenerContextoDiagnostico,
  });

  const gestorPaneles = new GestorPanelesPartidaDom({
    capa: obtenerElementoObligatorio("capaPanelesPartida", "capa de paneles de partida"),
    botones: {
      personaje: obtenerElementoObligatorio("botonPanelPersonaje", "botón Personaje"),
      inventario: obtenerElementoObligatorio("botonPanelInventario", "botón Inventario"),
      habilidades: obtenerElementoObligatorio("botonPanelHabilidades", "botón Habilidades"),
      registro: obtenerElementoObligatorio("botonPanelRegistro", "botón Registro"),
      menu: obtenerElementoObligatorio("botonPanelMenu", "botón Menú"),
    },
    paneles: {
      personaje: obtenerElementoObligatorio(
        "panelSuperpuestoPersonaje",
        "panel superpuesto de personaje",
      ),
      inventario: obtenerElementoObligatorio(
        "panelSuperpuestoInventario",
        "panel superpuesto de inventario",
      ),
      registro: obtenerElementoObligatorio(
        "panelSuperpuestoRegistro",
        "panel superpuesto de registro",
      ),
      menu: {
        elemento: obtenerElementoObligatorio(
          "panelSuperpuestoMenu",
          "panel superpuesto de menú",
        ),
        alCerrar: () => {
          if (modalAyudaJuego.estaAbierto()) {
            modalAyudaJuego.cerrar({ devolverFoco: false });
          }
        },
      },
    },
  });

  const combatLogText = obtenerElementoObligatorio(
    "combatLog",
    "registro de combate",
  );

  const renderizador = new Renderizador({
    renderizadorMapa,
    panelPersonaje,
    panelInventario,
    panelEquipamiento,
    hudPartida,
    combatLogText,
    configuracionPersonaje,
    configuracionEnemigos,
  });

  return {
    renderizador,
    panelInventario,
    panelEquipamiento,
    gestorPaneles,
    modalDetalleObjeto,
    modalDetalleEntidad,
    modalContenedorObjetos,
    modalSeleccionMazmorra,
    modalComercio,
    modalAyudaJuego,
  };
}

function obtenerElementoObligatorio(id, descripcion) {
  const elemento = document.getElementById(id);
  if (!elemento) {
    throw new Error(`No se encontró ${descripcion} con id "${id}".`);
  }
  return elemento;
}
