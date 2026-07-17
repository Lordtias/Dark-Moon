// Componentes visuales necesarios
// para representar la pantalla de la partida.
import { Renderizador } from "./Renderizador.js";

import { PanelPersonaje } from "./PanelPersonaje.js";

import { PanelInventario } from "./PanelInventario.js";

import { PanelEquipamiento } from "./PanelEquipamiento.js";

// Crea todos los componentes visuales
// utilizados durante una partida.
//
// Esta fábrica centraliza las referencias al HTML,
// evitando que otras clases conozcan cada elemento.
export function crearInterfazPartida({ tileSize } = {}) {
  if (!Number.isInteger(tileSize) || tileSize <= 0) {
    throw new Error("La interfaz necesita un tamaño de casilla válido.");
  }

  const canvas = obtenerElementoObligatorio("gameCanvas", "canvas del mapa");

  // El panel recibe por separado su contenedor
  // visible y la plantilla que debe clonar.
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

  const combatLogText = obtenerElementoObligatorio(
    "combatLog",
    "registro de combate",
  );

  const renderizador = new Renderizador({
    canvas,
    panelPersonaje,
    panelInventario,
    panelEquipamiento,
    combatLogText,
    tileSize,
  });

  return {
    canvas,
    renderizador,
  };
}

// Busca un elemento obligatorio del HTML
// y genera un error claro si no existe.
function obtenerElementoObligatorio(id, descripcion) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    throw new Error(`No se encontró ${descripcion} ` + `con id "${id}".`);
  }

  return elemento;
}
