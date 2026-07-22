import {
  crearJugadorInicial,
  TILE_SIZE,
} from "../juego/configuracion/ConfiguracionInicial.js";

import { Juego } from "../juego/Juego.js";

import { EstadoPartida } from "../Partida/EstadoPartida.js";

import { GestorMapasPartida } from "../Partida/GestorMapasPartida.js";

import {
  normalizarSolicitudTransicionMapa,
  TIPOS_TRANSICION_MAPA,
} from "../Partida/TransicionesMapa.js";

import { crearInterfazPartida } from "../interfaz/FabricaInterfazPartida.js";

import { ControladorTeclado } from "../controles/ControladorTeclado.js";

import { ControladorEquipamiento } from "../controles/ControladorEquipamiento.js";

import { ControladorInteracciones } from "../controles/ControladorInteracciones.js";

import { leerParametrosPruebaMapa } from "../juego/configuracion/ParametrosPruebaMapa.js";

import { configurarContextoPresentacionObjetos } from "../interfaz/objetos/ContextoPresentacionObjetos.js";

// Coordina la sesión completa y conecta
// el mapa activo con la interfaz.
//
// EstadoPartida y GestorMapasPartida viven
// durante toda la sesión.
//
// Juego y sus controladores se reemplazan
// cada vez que se activa un mapa diferente.
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

    // Estado persistente de la sesión.
    this.estadoPartida = null;
    this.gestorMapasPartida = null;

    // La interfaz se crea una sola vez
    // y se reutiliza cuando cambia el mapa.
    this.interfazPartida = null;

    // Estado y controladores del mapa activo.
    this.juego = null;
    this.renderizador = null;
    this.controladorTeclado = null;
    this.controladorEquipamiento = null;
    this.controladorInteracciones = null;

    this.configuracionObjetos = null;

    this.partidaIniciada = false;
  }

  iniciar({
    datosPersonaje,
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionMapas,
    configuracionCiudad,
  } = {}) {
    if (this.partidaIniciada) {
      return false;
    }

    const parametrosPrueba = leerParametrosPruebaMapa();

    // El jugador se crea una sola vez.
    //
    // GestorMapasPartida lo posicionará después
    // dentro de cada mapa que se active.
    const jugador = crearJugadorInicial({
      datosPersonaje,
      configuracionPersonaje,
      configuracionObjetos,
    });

    this.estadoPartida = new EstadoPartida({
      jugador,
    });

    this.gestorMapasPartida = new GestorMapasPartida({
      estadoPartida: this.estadoPartida,

      configuracionEnemigos,
      configuracionObjetos,
      configuracionGeneracionObjetos,
      configuracionMapas,
      configuracionCiudad,
    });

    this.configuracionObjetos = configuracionObjetos;

    // La presentación de las rarezas
    // no depende del mapa y se configura
    // una sola vez.
    configurarContextoPresentacionObjetos({
      configuracionRarezas: configuracionGeneracionObjetos.rarezas,
    });

    this.interfazPartida = crearInterfazPartida({
      tileSize: TILE_SIZE,
    });

    this.renderizador = this.interfazPartida.renderizador;

    this.partidaIniciada = true;

    this.controladorPantallas.mostrarPartida();

    // El inicio normal ocurre dentro
    // del mapa fijo de la ciudad.
    //
    // Los parámetros de prueba conservan el acceso
    // directo a una mazmorra para no romper las
    // herramientas actuales de desarrollo.
    if (parametrosPrueba.activo) {
      this.iniciarNuevaExpedicion({
        semillaMapa: parametrosPrueba.semillaMapa,

        idMapaForzado: parametrosPrueba.idMapaForzado,

        botinPrueba: parametrosPrueba.botinPrueba,

        portalPrueba: parametrosPrueba.portalPrueba,

        parametrosPrueba,
      });
    } else {
      this.iniciarCiudad({
        puntoEntrada: "inicioPartida",

        esInicioPartida: true,
      });
    }

    return true;
  }

  // Activa el mapa fijo de la ciudad
  // conservando el mismo jugador.
  iniciarCiudad({
    puntoEntrada = "inicioPartida",
    esInicioPartida = false,
  } = {}) {
    if (!this.partidaIniciada || !this.gestorMapasPartida) {
      throw new Error(
        "No se puede activar la ciudad sin una partida iniciada.",
      );
    }

    const configuracionMapa = this.gestorMapasPartida.crearCiudad({
      puntoEntrada,
    });

    this.activarMapa(configuracionMapa);

    this.mostrarResumenCiudad({
      esInicioPartida,
    });

    return true;
  }

  // Genera y activa una mazmorra nueva
  // conservando la misma instancia del jugador.
  //
  // La entrada de la ciudad entrega un ID concreto
  // seleccionado desde ModalSeleccionMazmorra.
  iniciarNuevaExpedicion({
    semillaMapa = null,
    idMapaForzado = null,
    botinPrueba = false,
    portalPrueba = false,
    parametrosPrueba = null,
  } = {}) {
    if (!this.partidaIniciada || !this.gestorMapasPartida) {
      throw new Error(
        "No se puede iniciar una expedición sin una partida activa.",
      );
    }

    const configuracionMapa = this.gestorMapasPartida.crearMazmorra({
      semillaMapa,
      idMapaForzado,
      botinPrueba,
      portalPrueba,
    });

    this.activarMapa(configuracionMapa);

    this.mostrarResumenMazmorra({
      parametrosPrueba: parametrosPrueba ?? {
        activo: botinPrueba || portalPrueba || semillaMapa !== null,

        botinPrueba,
        portalPrueba,
      },
    });

    return true;
  }

  // Recibe solicitudes originadas por puertas,
  // portales, NPC u objetos futuros.
  procesarSolicitudTransicionMapa(solicitud) {
    const solicitudNormalizada = normalizarSolicitudTransicionMapa(solicitud);

    switch (solicitudNormalizada.tipo) {
      case TIPOS_TRANSICION_MAPA.NUEVA_EXPEDICION:
        return this.iniciarNuevaExpedicion({
          semillaMapa: solicitudNormalizada.datos.semillaMapa ?? null,

          idMapaForzado: solicitudNormalizada.datos.idMapaForzado ?? null,

          botinPrueba: solicitudNormalizada.datos.botinPrueba === true,

          portalPrueba: solicitudNormalizada.datos.portalPrueba === true,
        });

      case TIPOS_TRANSICION_MAPA.REGRESAR_CIUDAD:
        return this.iniciarCiudad({
          puntoEntrada:
            solicitudNormalizada.datos.puntoEntrada ?? "regresoDungeon",
        });

      case TIPOS_TRANSICION_MAPA.ACTIVAR_MAPA_FIJO:
        return this.procesarActivacionMapaFijo(solicitudNormalizada.datos);

      default:
        throw new Error(
          "ControladorPartida recibió una transición desconocida.",
        );
    }
  }

  // La primera implementación de mapas fijos
  // solamente conoce la ciudad inicial.
  //
  // Mantener este método separado permitirá agregar
  // otras ciudades, campamentos o interiores después.
  procesarActivacionMapaFijo(datos) {
    const idMapa = datos?.idMapa;

    if (idMapa === this.gestorMapasPartida.idCiudad) {
      return this.iniciarCiudad({
        puntoEntrada: datos.puntoEntrada ?? "inicioPartida",
      });
    }

    this.renderizador.mostrarMensaje(
      `El mapa fijo "${idMapa}" todavía no está disponible.`,
    );

    return false;
  }

  // Reemplaza Juego y sus controladores,
  // pero conserva EstadoPartida, el jugador
  // y todos los componentes de la interfaz.
  activarMapa(configuracionMapa) {
    validarConfiguracionMapa(configuracionMapa);

    if (!this.interfazPartida) {
      throw new Error("No se puede activar un mapa sin una interfaz creada.");
    }

    this.desactivarControles();

    const {
      renderizador,
      panelInventario,
      panelEquipamiento,
      modalDetalleObjeto,
      modalContenedorObjetos,
      modalSeleccionMazmorra,
    } = this.interfazPartida;

    const cantidadFilas = configuracionMapa.map.length;

    const cantidadColumnas = configuracionMapa.map[0].length;

    renderizador.configurarDimensionesMapa({
      columnas: cantidadColumnas,

      filas: cantidadFilas,
    });

    const juego = new Juego({
      ...configuracionMapa,

      // La referencia ya es la misma,
      // pero la asignación explícita
      // documenta la persistencia.
      player: this.estadoPartida.jugador,

      configuracionObjetos: this.configuracionObjetos,
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
      modalSeleccionMazmorra,

      obtenerMazmorrasDisponibles: () =>
        this.gestorMapasPartida.obtenerMazmorrasDisponibles(),

      alSeleccionarMazmorra: (idMazmorra) =>
        this.iniciarNuevaExpedicion({
          idMapaForzado: idMazmorra,
        }),

      alSolicitarTransicionMapa: (solicitud) =>
        this.procesarSolicitudTransicionMapa(solicitud),
    });

    this.juego = juego;
    this.renderizador = renderizador;

    this.controladorTeclado = controladorTeclado;

    this.controladorEquipamiento = controladorEquipamiento;

    this.controladorInteracciones = controladorInteracciones;

    this.controladorTeclado.activar();

    this.controladorEquipamiento.activar();

    this.controladorInteracciones.activar();

    this.renderizador.dibujarJuego(this.juego);
  }

  mostrarResumenCiudad({ esInicioPartida } = {}) {
    const mapaSeleccionado = this.juego.mapaSeleccionado;

    const mensajePrincipal = esInicioPartida
      ? `Comenzaste tu aventura en ${mapaSeleccionado.nombre}.`
      : `Regresaste a ${mapaSeleccionado.nombre}.`;

    this.renderizador.mostrarMensaje(
      `${mensajePrincipal}\n` +
        "Acercate al mercader y presioná R para interactuar. " +
        "La entrada a las mazmorras se encuentra al norte.",
    );

    console.groupCollapsed(`[Ciudad] ${mapaSeleccionado.nombre}`);

    console.log("Estado persistente:", this.estadoPartida.obtenerResumen());

    console.log("Configuración del mapa:", mapaSeleccionado.generacionActual);

    console.log("Interactuables de la ciudad:", this.juego.interactuables);

    console.groupEnd();
  }

  mostrarResumenMazmorra({ parametrosPrueba } = {}) {
    const mapaSeleccionado = this.juego.mapaSeleccionado;

    const generacion = mapaSeleccionado.generacionActual;

    const tiposEnemigos = formatearConteo(generacion.enemigosPorTipo);

    const variantes = formatearConteo(generacion.variantes);

    const mensajeModoPrueba = parametrosPrueba?.activo
      ? " Modo de prueba activo."
      : "";

    const mensajeBotinPrueba = parametrosPrueba?.botinPrueba
      ? " Botín de prueba activo: acercate y presioná R para revisarlo."
      : "";

    const mensajePortalPrueba = parametrosPrueba?.portalPrueba
      ? " Portal de prueba activo: acercate y presioná R para generar otra mazmorra."
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
        `Destructibles: ${generacion.cantidadDestructibles}. ` +
        "La salida hacia la ciudad está ubicada en un borde del mapa." +
        mensajeModoPrueba +
        mensajeBotinPrueba +
        mensajePortalPrueba,
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

function validarConfiguracionMapa(configuracionMapa) {
  if (
    !configuracionMapa ||
    !Array.isArray(configuracionMapa.map) ||
    configuracionMapa.map.length === 0 ||
    !configuracionMapa.player ||
    !Array.isArray(configuracionMapa.objetivos) ||
    !Array.isArray(configuracionMapa.interactuables) ||
    !configuracionMapa.mapaSeleccionado
  ) {
    throw new Error(
      "ControladorPartida recibió una configuración de mapa inválida.",
    );
  }
}
