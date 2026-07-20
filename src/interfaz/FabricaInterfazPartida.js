import { Renderizador } from "./Renderizador.js";

import { RenderizadorCanvas2D } from "./graficos/RenderizadorCanvas2D.js";

import { PanelPersonaje } from "./PanelPersonaje.js";

import { PanelInventario } from "./PanelInventario.js";

import { PanelEquipamiento } from "./PanelEquipamiento.js";

import { PanelOrdenTemporal } from "./PanelOrdenTemporal.js";

import { ModalDetalleObjeto } from "./objetos/ModalDetalleObjeto.js";

// Crea todos los componentes visuales
// utilizados durante una partida.
//
// Esta fábrica centraliza:
//
// - La tecnología gráfica del mapa.
// - Los paneles HTML.
// - Las ventanas modales.
// - Las referencias obligatorias del documento.
//
// Los controladores reciben componentes ya construidos
// y no necesitan conocer su estructura interna.
export function crearInterfazPartida({ tileSize } = {}) {
  if (!Number.isInteger(tileSize) || tileSize <= 0) {
    throw new Error("La interfaz necesita un tamaño de casilla válido.");
  }

  const canvas = obtenerElementoObligatorio("gameCanvas", "canvas del mapa");

  const panelMapa = canvas.closest(".panel-mapa");

  if (!panelMapa) {
    throw new Error("No se encontró el panel que contiene el canvas del mapa.");
  }

  // Backend gráfico intercambiable.
  const renderizadorMapa = new RenderizadorCanvas2D({
    canvas,

    contenedor: panelMapa,

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

  // El modal se crea dinámicamente y podrá reutilizarse
  // luego desde botín, cofres o comerciantes.
  const modalDetalleObjeto = new ModalDetalleObjeto();

  const panelOrdenTemporal = new PanelOrdenTemporal({
    referenciaInsercion: panelMapa,

    maximoActores: 8,
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
    panelOrdenTemporal,
    combatLogText,
  });

  return {
    renderizador,
    panelInventario,
    panelEquipamiento,
    panelOrdenTemporal,
    modalDetalleObjeto,
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
