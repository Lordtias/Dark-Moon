import { Renderizador } from "./Renderizador.js";

import { PanelPersonaje } from "./PanelPersonaje.js";

import { PanelInventario } from "./PanelInventario.js";

import { PanelEquipamiento } from "./PanelEquipamiento.js";

import { PanelOrdenTemporal } from "./PanelOrdenTemporal.js";

// Crea todos los componentes visuales
// utilizados durante una partida.
//
// Esta fábrica centraliza:
//
// - Referencias al HTML.
// - Creación de paneles.
// - Dependencias del renderizador.
//
// De esta manera, los controladores y game.js
// no necesitan conocer los elementos internos
// de la interfaz.
export function crearInterfazPartida({ tileSize } = {}) {
  if (!Number.isInteger(tileSize) || tileSize <= 0) {
    throw new Error("La interfaz necesita un tamaño " + "de casilla válido.");
  }

  // Canvas donde se representa el mapa.
  const canvas = obtenerElementoObligatorio("gameCanvas", "canvas del mapa");

  // El panel temporal se insertará
  // inmediatamente después del panel del mapa.
  const panelMapa = canvas.closest(".panel-mapa");

  if (!panelMapa) {
    throw new Error(
      "No se encontró el panel que contiene " + "el canvas del mapa.",
    );
  }

  // Panel con estadísticas y atributos.
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

  // Vista compacta del sistema temporal.
  //
  // El panel se crea desde JavaScript para evitar
  // modificar la estructura extensa de index.html.
  const panelOrdenTemporal = new PanelOrdenTemporal({
    referenciaInsercion: panelMapa,

    maximoActores: 8,
  });

  // Historial de eventos de la partida.
  const combatLogText = obtenerElementoObligatorio(
    "combatLog",
    "registro de combate",
  );

  // El renderizador recibe todos los componentes
  // que debe mantener actualizados.
  const renderizador = new Renderizador({
    canvas,
    panelPersonaje,
    panelInventario,
    panelEquipamiento,
    panelOrdenTemporal,
    combatLogText,
    tileSize,
  });

  return {
    canvas,
    renderizador,
    panelInventario,
    panelEquipamiento,
    panelOrdenTemporal,
  };
}

// Busca un elemento del HTML y genera
// un error claro cuando no existe.
function obtenerElementoObligatorio(id, descripcion) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    throw new Error(`No se encontró ${descripcion} ` + `con id "${id}".`);
  }

  return elemento;
}
