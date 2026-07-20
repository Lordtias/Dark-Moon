import {
  crearConfiguracionInicial,
  TILE_SIZE,
} from "../juego/configuracion/ConfiguracionInicial.js";

import { Juego } from "../juego/Juego.js";

import { crearInterfazPartida } from "../interfaz/FabricaInterfazPartida.js";

import { ControladorTeclado } from "../controles/ControladorTeclado.js";

import { ControladorEquipamiento } from "../controles/ControladorEquipamiento.js";

import { leerParametrosPruebaMapa } from "../juego/ParametrosPruebaMapa.js";

// Coordina la creación y activación
// de una partida completa.
export class ControladorPartida {
  constructor({ controladorPantallas } = {}) {
    if (
      !controladorPantallas ||
      typeof controladorPantallas.mostrarPartida !== "function"
    ) {
      throw new Error(
        "ControladorPartida necesita un controlador de pantallas.",
      );
    }

    this.controladorPantallas = controladorPantallas;

    this.juego = null;
    this.renderizador = null;

    this.controladorTeclado = null;

    this.controladorEquipamiento = null;

    this.partidaIniciada = false;
  }

  iniciar({
    datosPersonaje,
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionMapas,
  } = {}) {
    if (this.partidaIniciada) {
      return false;
    }

    const parametrosPrueba = leerParametrosPruebaMapa();

    const configuracionInicial = crearConfiguracionInicial({
      datosPersonaje,
      configuracionPersonaje,
      configuracionEnemigos,
      configuracionObjetos,
      configuracionMapas,

      semillaMapa: parametrosPrueba.semillaMapa,

      idMapaForzado: parametrosPrueba.idMapaForzado,
    });

    const { canvas, renderizador, panelInventario, panelEquipamiento } =
      crearInterfazPartida({
        tileSize: TILE_SIZE,
      });

    const cantidadFilas = configuracionInicial.map.length;

    const cantidadColumnas = configuracionInicial.map[0].length;

    canvas.width = cantidadColumnas * TILE_SIZE;

    canvas.height = cantidadFilas * TILE_SIZE;

    const juego = new Juego(configuracionInicial);

    const controladorTeclado = new ControladorTeclado({
      juego,
      renderizador,
    });

    const controladorEquipamiento = new ControladorEquipamiento({
      juego,
      renderizador,
      panelInventario,
      panelEquipamiento,
    });

    this.juego = juego;

    this.renderizador = renderizador;

    this.controladorTeclado = controladorTeclado;

    this.controladorEquipamiento = controladorEquipamiento;

    this.partidaIniciada = true;

    this.controladorPantallas.mostrarPartida();

    this.controladorTeclado.activar();

    this.controladorEquipamiento.activar();

    this.renderizador.dibujarJuego(this.juego);

    const mapaSeleccionado = this.juego.mapaSeleccionado;

    const generacion = mapaSeleccionado.generacionActual;

    const tiposEnemigos = formatearConteo(generacion.enemigosPorTipo);

    const variantes = formatearConteo(generacion.variantes);

    const mensajeModoPrueba = parametrosPrueba.activo
      ? " Modo de prueba activo."
      : "";

    this.renderizador.mostrarMensaje(
      `Mapa generado: ${mapaSeleccionado.nombre}. ` +
        `Bioma: ${mapaSeleccionado.bioma}. ` +
        `Semilla: ${generacion.semilla}. ` +
        `Tamaño: ${generacion.ancho} × ${generacion.alto}. ` +
        `Nivel: ${generacion.nivelMapa}. ` +
        `Paredes: ${generacion.porcentajeNoCaminableReal}% ` +
        `(objetivo ${generacion.porcentajeNoCaminableObjetivo}%). ` +
        `Enemigos: ${generacion.cantidadEnemigos} ` +
        `(${tiposEnemigos}). ` +
        `Variantes: ${variantes}. ` +
        `Destructibles: ${generacion.cantidadDestructibles}.` +
        mensajeModoPrueba,
    );

    // Información de depuración útil mientras
    // validamos la generación procedural.
    console.groupCollapsed(
      `[Mapa] ${mapaSeleccionado.nombre} | ` + `semilla ${generacion.semilla}`,
    );

    console.log("Parámetros de prueba:", parametrosPrueba);

    console.log("Resumen de generación:", generacion);

    console.table(generacion.detalleEnemigos);

    console.table(generacion.detalleDestructibles);

    console.groupEnd();

    return true;
  }

  desactivarControles() {
    this.controladorTeclado?.desactivar();

    this.controladorEquipamiento?.desactivar();
  }
}

function formatearConteo(conteo) {
  const elementos = Object.entries(conteo ?? {});

  if (elementos.length === 0) {
    return "ninguno";
  }

  return elementos
    .map(([id, cantidad]) => `${formatearId(id)}: ${cantidad}`)
    .join(", ");
}

function formatearId(id) {
  return id.replaceAll("_", " ");
}
