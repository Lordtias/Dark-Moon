import { crearConfiguracionMazmorra } from "../juego/configuracion/ConfiguracionInicial.js";

import { crearConfiguracionCiudad } from "../juego/configuracion/ConfiguracionCiudad.js";

import { generarSalidaMazmorra } from "../juego/generacion/GeneradorSalidaMapa.js";

import {
  evaluarAccesoMapa,
  filtrarConfiguracionMapasAccesibles,
  validarAccesoMapa,
} from "../juego/configuracion/ReglasAccesoMapas.js";

// Administra la creación de los mapas utilizados
// durante una misma partida.
//
// EstadoPartida conserva al jugador y el progreso global.
// GestorMapasPartida crea el contenido de cada mapa activo
// utilizando siempre la misma instancia del jugador.
export class GestorMapasPartida {
  constructor({
    estadoPartida,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionMapas,
    configuracionCiudad,
  } = {}) {
    validarEstadoPartida(estadoPartida);

    validarConfiguracion(configuracionEnemigos, "enemigos");

    validarConfiguracion(configuracionObjetos, "objetos");

    validarConfiguracion(
      configuracionGeneracionObjetos,
      "generación de objetos",
    );

    validarConfiguracion(configuracionMapas, "mapas");

    validarConfiguracion(configuracionCiudad, "la ciudad inicial");

    this.estadoPartida = estadoPartida;

    this.configuracionEnemigos = configuracionEnemigos;

    this.configuracionObjetos = configuracionObjetos;

    this.configuracionGeneracionObjetos = configuracionGeneracionObjetos;

    this.configuracionMapas = configuracionMapas;

    this.configuracionCiudad = configuracionCiudad;

    // Conserva la última configuración generada.
    //
    // Permite consultar el mapa activo sin depender
    // directamente de ControladorPartida.
    this._configuracionMapaActual = null;
  }

  get configuracionMapaActual() {
    return this._configuracionMapaActual;
  }

  get idCiudad() {
    return this.configuracionCiudad.id;
  }

  // Entrega una vista segura de las plantillas
  // disponibles para la ventana de selección.
  //
  // También calcula el nivel sugerido a partir
  // del nivel actual del jugador.
  obtenerMazmorrasDisponibles() {
    const nivelJugador = this.estadoPartida.jugador.nivel;

    return Object.entries(this.configuracionMapas.plantillas).map(
      ([id, plantilla]) => {
        const acceso = evaluarAccesoMapa({
          plantilla,
          nivelJugador,
        });

        const nivelSugerido = limitarNumero({
          valor: nivelJugador,

          minimo: plantilla.niveles.minimo,

          maximo: plantilla.niveles.maximo,
        });

        return {
          id,

          nombre: plantilla.nombre,

          descripcion:
            plantilla.descripcion ??
            `Explorá una expedición del bioma ${plantilla.bioma}.`,

          bioma: plantilla.bioma,

          recursoVisual: plantilla.recursoVisual ?? null,

          nivelJugador,
          nivelSugerido,

          nivelDesbloqueo: acceso.nivelDesbloqueo,

          desbloqueada: acceso.desbloqueada,

          nivelesFaltantes: acceso.nivelesFaltantes,

          mensajeBloqueo: acceso.mensajeBloqueo,

          nivelMinimo: plantilla.niveles.minimo,

          nivelMaximo: plantilla.niveles.maximo,

          anchoMinimo: plantilla.dimensiones.ancho.minimo,

          anchoMaximo: plantilla.dimensiones.ancho.maximo,

          altoMinimo: plantilla.dimensiones.alto.minimo,

          altoMaximo: plantilla.dimensiones.alto.maximo,

          densidadEnemigosPor100Casillas:
            plantilla.enemigos.densidadPor100Casillas,

          probabilidadZonaPoblada:
            plantilla.enemigos.probabilidadZonaPoblada,

          enemigos: plantilla.enemigos.permitidos.map((enemigo) => enemigo.id),
        };
      },
    );
  }

  // Construye la ciudad fija reutilizando
  // al mismo jugador de toda la partida.
  crearCiudad({ puntoEntrada = "inicioPartida" } = {}) {
    const configuracionMapa = crearConfiguracionCiudad({
      player: this.estadoPartida.jugador,

      configuracionCiudad: this.configuracionCiudad,

      puntoEntrada,
    });

    this.estadoPartida.regresarACiudad({
      idMapa: configuracionMapa.mapaSeleccionado.id,
    });

    this._configuracionMapaActual = configuracionMapa;

    return configuracionMapa;
  }

  // Genera una nueva mazmorra para el jugador persistente.
  //
  // La mazmorra anterior puede descartarse completamente:
  // inventario, equipamiento, experiencia y atributos
  // permanecen dentro de EstadoPartida.jugador.
  crearMazmorra({
    semillaMapa = null,
    idMapaForzado = null,
    nivelMapaForzado = null,
    cantidadEnemigosRecurrentes = null,
    ignorarNivelDesbloqueo = false,
  } = {}) {
    const configuracionMapasGeneracion =
      this.prepararConfiguracionMapasGeneracion({
        idMapaForzado,
        ignorarNivelDesbloqueo,
      });

    const configuracionMapa = crearConfiguracionMazmorra({
      player: this.estadoPartida.jugador,

      configuracionEnemigos: this.configuracionEnemigos,

      configuracionObjetos: this.configuracionObjetos,

      configuracionGeneracionObjetos: this.configuracionGeneracionObjetos,

      configuracionMapas: configuracionMapasGeneracion,

      semillaMapa,
      idMapaForzado,
      nivelMapaForzado,
      cantidadEnemigosRecurrentes,
    });

    // Cada mazmorra recibe una salida real situada sobre el acceso reservado
    // dentro del plano estructural. La población recibe el mapa con la topología
    // definitiva y este paso solamente materializa el portal.
    const salida = generarSalidaMazmorra({
      mapa: configuracionMapa.map,

      planoMazmorra: configuracionMapa.planoMazmorra,

      entidadesOcupantes: [
        ...configuracionMapa.objetivos,

        ...configuracionMapa.interactuables,

        this.estadoPartida.jugador,
      ],
    });

    // La salida se dibuja debajo del resto
    // de interactuables, pero continúa disponible
    // para el sistema de selección.
    configuracionMapa.interactuables.unshift(salida.portal);

    const generacion = configuracionMapa.mapaSeleccionado.generacionActual;

    generacion.salida = {
      posicionPortal: {
        ...salida.posicionPortal,
      },

      posicionAcceso: {
        ...salida.posicionAcceso,
      },

      lado: salida.lado,

      casillasAbiertas: salida.casillasAbiertas.length,
    };

    // El contexto de botín ya fue configurado durante la población de la
    // mazmorra, antes de resolver los cofres procedurales. No se reinicia
    // aquí: hacerlo repetiría la secuencia dedicada a rarezas/afijos y haría
    // que futuros drops reutilizaran resultados ya consumidos por cofres.

    // El contador se incrementa únicamente después
    // de que la generación haya finalizado correctamente.
    this.estadoPartida.iniciarExpedicion({
      idMapa: configuracionMapa.mapaSeleccionado.id,
    });

    this._configuracionMapaActual = configuracionMapa;

    return configuracionMapa;
  }

  // Prepara la configuración utilizada por el generador.
  //
  // Cuando se solicita una plantilla concreta, valida
  // explícitamente el nivel del jugador antes de generar.
  //
  // Cuando no existe un ID forzado, conserva solamente
  // las plantillas desbloqueadas para que la selección
  // ponderada no pueda elegir un destino bloqueado.
  prepararConfiguracionMapasGeneracion({
    idMapaForzado,
    ignorarNivelDesbloqueo,
  }) {
    if (typeof ignorarNivelDesbloqueo !== "boolean") {
      throw new Error(
        "La opción para ignorar el desbloqueo de mapas debe ser booleana.",
      );
    }

    const nivelJugador = this.estadoPartida.jugador.nivel;

    if (idMapaForzado !== null) {
      if (typeof idMapaForzado !== "string" || idMapaForzado.trim() === "") {
        throw new Error("La expedición necesita un ID de mapa válido.");
      }

      const idNormalizado = idMapaForzado.trim();

      const plantilla = this.configuracionMapas.plantillas[idNormalizado];

      if (!plantilla) {
        throw new Error(`No existe la plantilla de mapa "${idNormalizado}".`);
      }

      validarAccesoMapa({
        plantilla,
        idMapa: idNormalizado,
        nivelJugador,
        ignorarNivelDesbloqueo,
      });

      return this.configuracionMapas;
    }

    if (ignorarNivelDesbloqueo) {
      return this.configuracionMapas;
    }

    return filtrarConfiguracionMapasAccesibles({
      configuracionMapas: this.configuracionMapas,

      nivelJugador,
    });
  }
}

function limitarNumero({ valor, minimo, maximo }) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function validarEstadoPartida(estadoPartida) {
  if (
    !estadoPartida ||
    typeof estadoPartida !== "object" ||
    !estadoPartida.jugador ||
    typeof estadoPartida.iniciarExpedicion !== "function" ||
    typeof estadoPartida.regresarACiudad !== "function"
  ) {
    throw new Error("GestorMapasPartida necesita un EstadoPartida válido.");
  }
}

function validarConfiguracion(configuracion, nombre) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error(
      `GestorMapasPartida necesita la configuración de ${nombre}.`,
    );
  }
}
