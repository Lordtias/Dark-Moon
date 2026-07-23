import {
  crearJugadorInicial,
  TILE_SIZE,
} from "../juego/configuracion/ConfiguracionInicial.js";

import { Juego } from "../juego/Juego.js";

import { EstadoPartida } from "../Partida/EstadoPartida.js";

import { GestorMapasPartida } from "../Partida/GestorMapasPartida.js";

import { GestorMercaderesPartida } from "../Partida/GestorMercaderesPartida.js";

import {
  normalizarSolicitudTransicionMapa,
  TIPOS_TRANSICION_MAPA,
} from "../Partida/TransicionesMapa.js";

import { crearInterfazPartida } from "../interfaz/FabricaInterfazPartida.js";

import { ControladorTeclado } from "../controles/ControladorTeclado.js";

import { ControladorEquipamiento } from "../controles/ControladorEquipamiento.js";

import { ControladorInteracciones } from "../controles/ControladorInteracciones.js";

import { ControladorComercio } from "../controles/ControladorComercio.js";

import { leerParametrosPruebaMapa } from "../juego/configuracion/ParametrosPruebaMapa.js";

import { configurarContextoPresentacionObjetos } from "../interfaz/objetos/ContextoPresentacionObjetos.js";

// Coordina la sesión completa y conecta
// el mapa activo con la interfaz.
//
// EstadoPartida, GestorMapasPartida y
// GestorMercaderesPartida viven durante toda la sesión.
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

    // Estado persistente.
    this.estadoPartida = null;
    this.gestorMapasPartida = null;
    this.gestorMercaderesPartida = null;

    // Interfaz persistente.
    this.interfazPartida = null;

    // Estado y controladores del mapa activo.
    this.juego = null;
    this.renderizador = null;
    this.controladorTeclado = null;
    this.controladorEquipamiento = null;
    this.controladorInteracciones = null;
    this.controladorComercio = null;

    // Configuraciones persistentes requeridas
    // por los controladores de cada mapa.
    this.configuracionObjetos = null;
    this.configuracionRarezas = null;
    this.configuracionComercio = null;

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
    configuracionComercio,
  } = {}) {
    if (this.partidaIniciada) {
      return false;
    }

    const parametrosPrueba = leerParametrosPruebaMapa();

    const jugador = crearJugadorInicial({
      datosPersonaje,
      configuracionPersonaje,
      configuracionObjetos,
    });

    this.estadoPartida = new EstadoPartida({
      jugador,
    });

    this.gestorMercaderesPartida = new GestorMercaderesPartida({
      configuracionObjetos,
      configuracionGeneracionObjetos,
      configuracionComercio,
    });

    this.gestorMercaderesPartida.inicializarStocks({
      nivelReferencia: jugador.nivel,
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

    this.configuracionRarezas = configuracionGeneracionObjetos.rarezas;

    this.configuracionComercio = configuracionComercio;

    configurarContextoPresentacionObjetos({
      configuracionRarezas: this.configuracionRarezas,
    });

    this.interfazPartida = crearInterfazPartida({
      tileSize: TILE_SIZE,
    });

    this.renderizador = this.interfazPartida.renderizador;

    this.partidaIniciada = true;

    this.controladorPantallas.mostrarPartida();

    if (parametrosPrueba.activo) {
      this.iniciarNuevaExpedicion({
        semillaMapa: parametrosPrueba.semillaMapa,

        idMapaForzado: parametrosPrueba.idMapaForzado,

        nivelMapaForzado: parametrosPrueba.nivelMapaForzado,

        botinPrueba: parametrosPrueba.botinPrueba,

        portalPrueba: parametrosPrueba.portalPrueba,

        // Los parámetros de URL forman parte del modo
        // de desarrollo y pueden abrir mapas bloqueados.
        ignorarNivelDesbloqueo: true,

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

  // Genera y activa una mazmorra utilizando
  // el nivel elegido por el jugador.
  iniciarNuevaExpedicion({
    semillaMapa = null,
    idMapaForzado = null,
    nivelMapaForzado = null,
    botinPrueba = false,
    portalPrueba = false,
    ignorarNivelDesbloqueo = false,
    parametrosPrueba = null,
  } = {}) {
    if (
      !this.partidaIniciada ||
      !this.gestorMapasPartida ||
      !this.gestorMercaderesPartida
    ) {
      throw new Error(
        "No se puede iniciar una expedición sin una partida activa.",
      );
    }

    const configuracionMapa = this.gestorMapasPartida.crearMazmorra({
      semillaMapa,
      idMapaForzado,
      nivelMapaForzado,
      botinPrueba,
      portalPrueba,
      ignorarNivelDesbloqueo,
    });

    this.activarMapa(configuracionMapa);

    const generacion = configuracionMapa.mapaSeleccionado.generacionActual;

    // La siguiente visita a la ciudad encontrará
    // stock generado con el nivel de esta expedición.
    this.gestorMercaderesPartida.renovarStocksTrasExpedicion({
      semillaMapa: generacion.semilla,

      nivelMapa: generacion.nivelMapa,

      numeroExpedicion: this.estadoPartida.expedicionesRealizadas,
    });

    this.mostrarResumenMazmorra({
      parametrosPrueba: parametrosPrueba ?? {
        activo:
          idMapaForzado !== null ||
          nivelMapaForzado !== null ||
          botinPrueba ||
          portalPrueba ||
          semillaMapa !== null,

        idMapaForzado,
        nivelMapaForzado,
        botinPrueba,
        portalPrueba,
        semillaMapa,
        ignorarNivelDesbloqueo,
      },
    });

    return true;
  }

  // Recibe la selección completa producida
  // por ModalSeleccionMazmorra.
  iniciarExpedicionSeleccionada(seleccion) {
    if (
      !seleccion ||
      typeof seleccion !== "object" ||
      Array.isArray(seleccion)
    ) {
      throw new Error("La selección de expedición no es válida.");
    }

    if (
      typeof seleccion.idMazmorra !== "string" ||
      seleccion.idMazmorra.trim() === ""
    ) {
      throw new Error("La expedición necesita una mazmorra seleccionada.");
    }

    if (!Number.isInteger(seleccion.nivelMapa) || seleccion.nivelMapa < 1) {
      throw new Error("La expedición necesita un nivel válido.");
    }

    return this.iniciarNuevaExpedicion({
      idMapaForzado: seleccion.idMazmorra,

      nivelMapaForzado: seleccion.nivelMapa,
    });
  }

  procesarSolicitudTransicionMapa(solicitud) {
    const solicitudNormalizada = normalizarSolicitudTransicionMapa(solicitud);

    switch (solicitudNormalizada.tipo) {
      case TIPOS_TRANSICION_MAPA.NUEVA_EXPEDICION:
        return this.iniciarNuevaExpedicion({
          semillaMapa: solicitudNormalizada.datos.semillaMapa ?? null,

          idMapaForzado: solicitudNormalizada.datos.idMapaForzado ?? null,

          nivelMapaForzado: solicitudNormalizada.datos.nivelMapaForzado ?? null,

          botinPrueba: solicitudNormalizada.datos.botinPrueba === true,

          portalPrueba: solicitudNormalizada.datos.portalPrueba === true,

          ignorarNivelDesbloqueo:
            solicitudNormalizada.datos.ignorarNivelDesbloqueo === true,
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
      modalComercio,
    } = this.interfazPartida;

    const cantidadFilas = configuracionMapa.map.length;

    const cantidadColumnas = configuracionMapa.map[0].length;

    renderizador.configurarDimensionesMapa({
      columnas: cantidadColumnas,

      filas: cantidadFilas,
    });

    const juego = new Juego({
      ...configuracionMapa,

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

    const controladorComercio = new ControladorComercio({
      juego,
      renderizador,
      modalComercio,

      gestorMercaderesPartida: this.gestorMercaderesPartida,

      configuracionObjetos: this.configuracionObjetos,

      configuracionRarezas: this.configuracionRarezas,

      configuracionComercio: this.configuracionComercio,
    });

    const controladorInteracciones = new ControladorInteracciones({
      juego,
      renderizador,
      modalContenedorObjetos,
      modalSeleccionMazmorra,

      obtenerMazmorrasDisponibles: () =>
        this.gestorMapasPartida.obtenerMazmorrasDisponibles(),

      // ControladorInteracciones reenvía
      // el resultado completo del modal.
      alSeleccionarMazmorra: (seleccion) =>
        this.iniciarExpedicionSeleccionada(seleccion),

      alSolicitarComercio: (idMercader) =>
        controladorComercio.abrir(idMercader),

      alSolicitarTransicionMapa: (solicitud) =>
        this.procesarSolicitudTransicionMapa(solicitud),
    });

    this.juego = juego;

    this.renderizador = renderizador;

    this.controladorTeclado = controladorTeclado;

    this.controladorEquipamiento = controladorEquipamiento;

    this.controladorComercio = controladorComercio;

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
        "Acercate al mercader y presioná R para comerciar. " +
        "La entrada a las mazmorras se encuentra al norte.",
    );

    console.groupCollapsed(`[Ciudad] ${mapaSeleccionado.nombre}`);

    console.log("Estado persistente:", this.estadoPartida.obtenerResumen());

    console.log("Configuración del mapa:", mapaSeleccionado.generacionActual);

    console.log("Interactuables de la ciudad:", this.juego.interactuables);

    console.log(
      "Estado de mercaderes:",
      this.gestorMercaderesPartida.obtenerResumen(),
    );

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
        `Nivel seleccionado: ${generacion.nivelMapa}. ` +
        `Semilla: ${generacion.semilla}. ` +
        `Tamaño: ${generacion.ancho} × ${generacion.alto}. ` +
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
      `[Mapa] ${mapaSeleccionado.nombre} | ` +
        `nivel ${generacion.nivelMapa} | ` +
        `semilla ${generacion.semilla}`,
    );

    console.log("Estado persistente:", this.estadoPartida.obtenerResumen());

    console.log("Parámetros de prueba:", parametrosPrueba);

    console.log("Resumen de generación:", generacion);

    console.log("Interactuables iniciales:", this.juego.interactuables);

    console.log(
      "Stock renovado de mercaderes:",
      this.gestorMercaderesPartida.obtenerResumen(),
    );

    console.table(generacion.detalleEnemigos);

    console.table(generacion.detalleDestructibles);

    console.groupEnd();
  }

  desactivarControles() {
    // Cerramos primero las ventanas
    // asociadas al mapa anterior.
    this.controladorComercio?.desactivar();

    this.controladorTeclado?.desactivar();

    this.controladorEquipamiento?.desactivar();

    this.controladorInteracciones?.desactivar();
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
