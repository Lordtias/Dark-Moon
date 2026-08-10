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

// Crea los componentes visuales persistentes
// utilizados durante toda una partida.
//
// Esta fábrica centraliza:
//
// - El renderizador Phaser del mapa.
// - Los paneles HTML.
// - Las ventanas modales.
// - Las referencias obligatorias del documento.
//
// La presentación de cada mapa recibe componentes ya construidos
// y no necesita conocer su estructura HTML interna.
export function crearInterfazPartidaDom({
  configuracionRarezas,
  Phaser = null,
  preferenciasInterfaz = null,
  obtenerContextoDiagnostico = () => ({}),
} = {}) {
  configurarContextoPresentacionObjetos({ configuracionRarezas });

  const panelMapa = obtenerElementoObligatorio(
    "gameMapPanel",
    "panel del mapa",
  );

  const renderizadorMapa = new RenderizadorPhaser({
    Phaser,
    contenedor: panelMapa,
    preferenciasInterfaz,
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

  const modalAyudaJuego = new ModalAyudaJuego({
    botonAbrir: obtenerElementoObligatorio(
      "gameHelpButton",
      "botón de ayuda del juego",
    ),
    obtenerContextoDiagnostico,
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
    modalAyudaJuego,
  };
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
