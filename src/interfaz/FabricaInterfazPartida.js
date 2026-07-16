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
// evitando que game.js conozca cada panel individual.
export function crearInterfazPartida({ tileSize } = {}) {
  if (!Number.isInteger(tileSize) || tileSize <= 0) {
    throw new Error("La interfaz necesita un tamaño de casilla válido.");
  }

  // Canvas donde se representa el mapa.
  const canvas = obtenerElementoObligatorio("gameCanvas", "canvas del mapa");

  // Panel con estadísticas y atributos.
  const panelPersonaje = new PanelPersonaje({
    contenedor: obtenerElementoObligatorio(
      "panelPersonaje",
      "panel del personaje",
    ),
  });

  // Panel con objetos almacenados.
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

  // Panel con objetos equipados.
  const panelEquipamiento = new PanelEquipamiento({
    cuadricula: obtenerElementoObligatorio(
      "cuadriculaEquipamiento",
      "cuadrícula de equipamiento",
    ),
  });

  // Área donde aparecen los mensajes actuales.
  const combatLogText = obtenerElementoObligatorio(
    "combatLog",
    "registro de combate",
  );

  // El renderizador recibe todos los componentes
  // necesarios para actualizar la interfaz.
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

// Busca un elemento del HTML y genera
// un error claro cuando no existe.
function obtenerElementoObligatorio(id, descripcion) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    throw new Error(`No se encontró ${descripcion} con id "${id}".`);
  }

  return elemento;
}
