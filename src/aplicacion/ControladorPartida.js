import {
  crearConfiguracionInicial,
  TILE_SIZE,
} from "../juego/configuracion/ConfiguracionInicial.js";

import { Juego } from "../juego/Juego.js";

import { EstadoPartida } from "../partida/EstadoPartida.js";

import { crearInterfazPartida } from "../interfaz/FabricaInterfazPartida.js";

import { ControladorTeclado } from "../controles/ControladorTeclado.js";

import { ControladorEquipamiento } from "../controles/ControladorEquipamiento.js";

import { ControladorInteracciones } from "../controles/ControladorInteracciones.js";

import { leerParametrosPruebaMapa } from "../juego/configuracion/ParametrosPruebaMapa.js";

import { configurarContextoGeneracionBotin } from "../juego/botin/ContextoGeneracionBotin.js";

import { configurarContextoPresentacionObjetos } from "../interfaz/objetos/ContextoPresentacionObjetos.js";

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

    // Estado persistente que sobrevivirá
    // a los futuros cambios de mapa.
    this.estadoPartida = null;

    // Estado y componentes del mapa activo.
    this.juego = null;
    this.renderizador = null;
    this.controladorTeclado = null;
    this.controladorEquipamiento = null;
    this.controladorInteracciones = null;

    this.partidaIniciada = false;
  }

  iniciar({
    datosPersonaje,
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
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

      botinPrueba: parametrosPrueba.botinPrueba,
    });

    // EstadoPartida conserva la misma instancia
    // del jugador creada para el mapa inicial.
    //
    // En etapas posteriores, los mapas cambiarán,
    // pero esta referencia continuará siendo la misma.
    const estadoPartida = new EstadoPartida({
      jugador: configuracionInicial.player,
    });

    // El flujo actual todavía comienza directamente
    // dentro de una mazmorra procedural.
    //
    // Cuando incorporemos la ciudad, el inicio normal
    // registrará primero el mapa fijo de la ciudad.
    estadoPartida.iniciarExpedicion({
      idMapa: configuracionInicial.mapaSeleccionado.id,
    });

    const generacionMapa =
      configuracionInicial.mapaSeleccionado.generacionActual;

    // Preparamos una secuencia dedicada a la generación
    // de niveles, rarezas y afijos de los drops.
    //
    // Cuando se incorporen entradas y salidas,
    // deberá repetirse esta configuración al crear
    // cada mapa nuevo.
    configurarContextoGeneracionBotin({
      configuracionGeneracionObjetos,

      semillaMapa: generacionMapa.semilla,

      nivelMapa: generacionMapa.nivelMapa,
    });

    // La interfaz utiliza el nombre y el color declarados
    // en Rarezas.json para inventario, equipamiento,
    // contenedores y ventanas de detalle.
    configurarContextoPresentacionObjetos({
      configuracionRarezas: configuracionGeneracionObjetos.rarezas,
    });

    const {
      renderizador,
      panelInventario,
      panelEquipamiento,
      modalDetalleObjeto,
      modalContenedorObjetos,
    } = crearInterfazPartida({
      tileSize: TILE_SIZE,
    });

    const cantidadFilas = configuracionInicial.map.length;

    const cantidadColumnas = configuracionInicial.map[0].length;

    // El controlador no modifica directamente
    // la superficie gráfica utilizada.
    renderizador.configurarDimensionesMapa({
      columnas: cantidadColumnas,
      filas: cantidadFilas,
    });

    // Juego recibe el jugador persistente conservado
    // dentro de EstadoPartida.
    //
    // Hoy es la misma instancia creada por
    // crearConfiguracionInicial. En el futuro será
    // reutilizada al construir la ciudad y cada dungeon.
    const juego = new Juego({
      ...configuracionInicial,

      player: estadoPartida.jugador,

      configuracionObjetos,
    });

    const controladorTeclado = new ControladorTeclado({
      juego,
      renderizador,
    });

    const controladorEquipamiento = new ControladorEquipamiento({
      juego,
      renderizador,
      panelInventario,
      panelEquipamiento,
      modalDetalleObjeto,
    });

    const controladorInteracciones = new ControladorInteracciones({
      juego,
      renderizador,
      modalContenedorObjetos,
    });

    this.estadoPartida = estadoPartida;

    this.juego = juego;

    this.renderizador = renderizador;

    this.controladorTeclado = controladorTeclado;

    this.controladorEquipamiento = controladorEquipamiento;

    this.controladorInteracciones = controladorInteracciones;

    this.partidaIniciada = true;

    this.controladorPantallas.mostrarPartida();

    this.controladorTeclado.activar();

    this.controladorEquipamiento.activar();

    this.controladorInteracciones.activar();

    this.renderizador.dibujarJuego(this.juego);

    const mapaSeleccionado = this.juego.mapaSeleccionado;

    const generacion = mapaSeleccionado.generacionActual;

    const tiposEnemigos = formatearConteo(generacion.enemigosPorTipo);

    const variantes = formatearConteo(generacion.variantes);

    const mensajeModoPrueba = parametrosPrueba.activo
      ? " Modo de prueba activo."
      : "";

    const mensajeBotinPrueba = parametrosPrueba.botinPrueba
      ? " Botín de prueba activo: acercate y presioná R para revisarlo."
      : "";

    this.renderizador.mostrarMensaje(
      `Mapa generado: ${mapaSeleccionado.nombre}.\n` +
        `Bioma: ${mapaSeleccionado.bioma}. ` +
        `Semilla: ${generacion.semilla}. ` +
        `Tamaño: ${generacion.ancho} × ${generacion.alto}. ` +
        `Nivel: ${generacion.nivelMapa}. ` +
        `Paredes: ${generacion.porcentajeNoCaminableReal}% ` +
        `(objetivo ${generacion.porcentajeNoCaminableObjetivo}%). ` +
        `Enemigos: ${generacion.cantidadEnemigos} ` +
        `(${tiposEnemigos}). ` +
        `Variantes: ${variantes}.\n` +
        `Destructibles: ${generacion.cantidadDestructibles}.` +
        mensajeModoPrueba +
        mensajeBotinPrueba,
    );

    console.groupCollapsed(
      `[Mapa] ${mapaSeleccionado.nombre} | ` + `semilla ${generacion.semilla}`,
    );

    console.log("Estado persistente:", this.estadoPartida.obtenerResumen());

    console.log("Parámetros de prueba:", parametrosPrueba);

    console.log("Resumen de generación:", generacion);

    console.log("Interactuables iniciales:", this.juego.interactuables);

    console.table(generacion.detalleEnemigos);

    console.table(generacion.detalleDestructibles);

    console.groupEnd();

    return true;
  }

  desactivarControles() {
    this.controladorTeclado?.desactivar();

    this.controladorEquipamiento?.desactivar();

    this.controladorInteracciones?.desactivar();
  }
}

// Convierte los contadores internos
// en texto legible para el registro.
function formatearConteo(conteo) {
  const elementos = Object.entries(conteo ?? {});

  if (elementos.length === 0) {
    return "ninguno";
  }

  return elementos
    .map(([id, cantidad]) => `${formatearId(id)}: ${cantidad}`)
    .join(", ");
}

// Convierte IDs de configuración
// en nombres más legibles.
function formatearId(id) {
  return id.replaceAll("_", " ");
}
