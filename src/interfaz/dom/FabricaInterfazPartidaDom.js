import { configurarContextoPresentacionObjetos } from "../objetos/ContextoPresentacionObjetos.js";
import { Renderizador } from "../Renderizador.js";
import { RenderizadorCanvas2D } from "../graficos/RenderizadorCanvas2D.js";
import {
  TIPO_RENDERIZADOR_CANVAS_2D,
  TIPO_RENDERIZADOR_PHASER,
} from "../graficos/SelectorRenderizador.js";
import { RenderizadorPhaser } from "../graficos/phaser/RenderizadorPhaser.js";
import { PanelPersonaje } from "../PanelPersonaje.js";
import { PanelInventario } from "../PanelInventario.js";
import { PanelEquipamiento } from "../PanelEquipamiento.js";
import { ModalDetalleObjeto } from "../objetos/ModalDetalleObjeto.js";
import { ModalContenedorObjetos } from "../objetos/ModalContenedorObjetos.js";
import { ModalSeleccionMazmorra } from "../ModalSeleccionMazmorra.js";
import { ModalComercio } from "../comercio/ModalComercio.js";

// Crea los componentes visuales persistentes
// utilizados durante toda una partida.
//
// Esta fábrica centraliza:
//
// - La tecnología gráfica del mapa.
// - Los paneles HTML.
// - Las ventanas modales.
// - Las referencias obligatorias del documento.
//
// La presentación de cada mapa recibe componentes ya construidos
// y no necesita conocer su estructura HTML interna.
export function crearInterfazPartidaDom({
  tileSize,
  configuracionRarezas,
  tipoRenderizador = TIPO_RENDERIZADOR_CANVAS_2D,
  Phaser = null,
} = {}) {
  if (!Number.isInteger(tileSize) || tileSize <= 0) {
    throw new Error("La interfaz necesita un tamaño de casilla válido.");
  }

  configurarContextoPresentacionObjetos({ configuracionRarezas });

  const canvas = obtenerElementoObligatorio("gameCanvas", "canvas del mapa");

  const panelMapa = canvas.closest(".panel-mapa");

  if (!panelMapa) {
    throw new Error("No se encontró el panel que contiene el canvas del mapa.");
  }

  // Backend gráfico intercambiable.
  const renderizadorMapa = crearRenderizadorMapa({
    tipoRenderizador,
    Phaser,
    canvas,
    panelMapa,
    tileSize,
  });

  const panelPersonaje = new PanelPersonaje({
    contenedor: obtenerElementoObligatorio(
      "panelPersonaje",
      "panel del personaje",
    ),

    plantilla: obtenerElementoObligatorio(
      "plantillaPanelPersonaje",
      "plantilla del panel del personaje",
    ),
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

  // El modal de detalle se utiliza desde
  // inventario y equipamiento.
  const modalDetalleObjeto = new ModalDetalleObjeto();

  // La ventana de contenedores se utiliza
  // para botines, cofres y almacenamientos.
  const modalContenedorObjetos = new ModalContenedorObjetos();

  // La selección de destino se reutiliza
  // en cada regreso a la ciudad.
  const modalSeleccionMazmorra = new ModalSeleccionMazmorra();

  // El comercio tiene su propia ventana porque
  // muestra simultáneamente inventario, detalle
  // y stock persistente.
  const modalComercio = new ModalComercio();

  const combatLogText = obtenerElementoObligatorio(
    "combatLog",
    "registro de combate",
  );

  const renderizador = new Renderizador({
    renderizadorMapa,
    panelPersonaje,
    panelInventario,
    panelEquipamiento,
    combatLogText,
  });

  return {
    renderizador,
    panelInventario,
    panelEquipamiento,
    modalDetalleObjeto,
    modalContenedorObjetos,
    modalSeleccionMazmorra,
    modalComercio,
  };
}

function crearRenderizadorMapa({
  tipoRenderizador,
  Phaser,
  canvas,
  panelMapa,
  tileSize,
}) {
  canvas.classList.remove("game-canvas--oculto-phaser");
  canvas.removeAttribute("aria-hidden");
  canvas.style.removeProperty("width");
  canvas.style.removeProperty("height");

  switch (tipoRenderizador) {
    case TIPO_RENDERIZADOR_PHASER:
      return new RenderizadorPhaser({
        Phaser,
        canvasBase: canvas,
        contenedor: panelMapa,
      });

    case TIPO_RENDERIZADOR_CANVAS_2D:
      return new RenderizadorCanvas2D({
        canvas,
        contenedor: panelMapa,
        tileSize,
      });

    default:
      throw new Error(
        `No existe una fábrica para el renderizador "${tipoRenderizador}".`,
      );
  }
}

// Busca un elemento del HTML y genera
// un error claro cuando no existe.
function obtenerElementoObligatorio(id, descripcion) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    throw new Error(`No se encontró ${descripcion} con id "${id}".`);
  }

  return elemento;
}
