import { Renderizador } from "./Renderizador.js";

import { RenderizadorCanvas2D } from "./graficos/RenderizadorCanvas2D.js";

import { PanelPersonaje } from "./PanelPersonaje.js";

import { PanelInventario } from "./PanelInventario.js";

import { PanelEquipamiento } from "./PanelEquipamiento.js";

import { PanelOrdenTemporal } from "./PanelOrdenTemporal.js";

// Crea todos los componentes visuales
// utilizados durante una partida.
//
// Esta fábrica es el único lugar que decide
// qué tecnología gráfica representa el mapa.
//
// Cuando utilicemos Phaser, la sustitución
// principal ocurrirá aquí.
export function crearInterfazPartida({ tileSize } = {}) {
  if (!Number.isInteger(tileSize) || tileSize <= 0) {
    throw new Error("La interfaz necesita un tamaño de casilla válido.");
  }

  // Actualmente utilizamos un canvas HTML,
  // pero el resto de la aplicación ya no
  // dependerá directamente de él.
  const canvas = obtenerElementoObligatorio("gameCanvas", "canvas del mapa");

  const panelMapa = canvas.closest(".panel-mapa");

  if (!panelMapa) {
    throw new Error("No se encontró el panel que contiene el canvas del mapa.");
  }

  // El backend gráfico recibe también el panel
  // disponible para calcular su escala visual.
  //
  // Esta responsabilidad queda aislada dentro
  // de la implementación de Canvas 2D.
  const renderizadorMapa = new RenderizadorCanvas2D({
    canvas,
    contenedor: panelMapa,
    tileSize,
  });

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
  // Aunque actualmente está visualmente
  // deshabilitada, conservamos su actualización.
  const panelOrdenTemporal = new PanelOrdenTemporal({
    referenciaInsercion: panelMapa,

    maximoActores: 8,
  });

  // Historial de eventos de la partida.
  const combatLogText = obtenerElementoObligatorio(
    "combatLog",
    "registro de combate",
  );

  // Fachada general de la interfaz.
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
