import { crearConfiguracionMazmorra } from "../juego/configuracion/ConfiguracionInicial.js";

import { crearConfiguracionCiudad } from "../juego/configuracion/ConfiguracionCiudad.js";

import { configurarContextoGeneracionBotin } from "../juego/botin/ContextoGeneracionBotin.js";

import { generarSalidaMazmorra } from "../juego/generacion/GeneradorSalidaMapa.js";

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

          nivelJugador,
          nivelSugerido,

          nivelMinimo: plantilla.niveles.minimo,

          nivelMaximo: plantilla.niveles.maximo,

          anchoMinimo: plantilla.dimensiones.ancho.minimo,

          anchoMaximo: plantilla.dimensiones.ancho.maximo,

          altoMinimo: plantilla.dimensiones.alto.minimo,

          altoMaximo: plantilla.dimensiones.alto.maximo,

          cantidadEnemigosMinima: plantilla.enemigos.cantidad.minimo,

          cantidadEnemigosMaxima: plantilla.enemigos.cantidad.maximo,

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
    botinPrueba = false,
    portalPrueba = false,
  } = {}) {
    const configuracionMapa = crearConfiguracionMazmorra({
      player: this.estadoPartida.jugador,

      configuracionEnemigos: this.configuracionEnemigos,

      configuracionObjetos: this.configuracionObjetos,

      configuracionMapas: this.configuracionMapas,

      semillaMapa,
      idMapaForzado,
      nivelMapaForzado,
      botinPrueba,
      portalPrueba,
    });

    // Cada mazmorra recibe una salida real situada
    // sobre uno de sus bordes.
    //
    // Si el terreno no alcanza el borde, el generador
    // abre un corredor conectado sin colocar enemigos
    // ni destructibles sobre las casillas nuevas.
    const salida = generarSalidaMazmorra({
      mapa: configuracionMapa.map,

      jugador: this.estadoPartida.jugador,

      entidadesOcupantes: [
        ...configuracionMapa.objetivos,

        ...configuracionMapa.interactuables,

        this.estadoPartida.jugador,
      ],
    });

    configuracionMapa.map = salida.mapa;

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

    // El corredor puede convertir algunas paredes
    // en suelo, por eso actualizamos el porcentaje
    // mostrado en el resumen de generación.
    generacion.porcentajeNoCaminableReal = calcularPorcentajeNoCaminable(
      configuracionMapa.map,
    );

    // Los drops deben utilizar la semilla y el nivel
    // correspondientes al mapa que acaba de activarse.
    configurarContextoGeneracionBotin({
      configuracionGeneracionObjetos: this.configuracionGeneracionObjetos,

      semillaMapa: generacion.semilla,

      nivelMapa: generacion.nivelMapa,
    });

    // El contador se incrementa únicamente después
    // de que la generación haya finalizado correctamente.
    this.estadoPartida.iniciarExpedicion({
      idMapa: configuracionMapa.mapaSeleccionado.id,
    });

    this._configuracionMapaActual = configuracionMapa;

    return configuracionMapa;
  }
}

function limitarNumero({ valor, minimo, maximo }) {
  return Math.max(
    minimo,

    Math.min(maximo, valor),
  );
}

function calcularPorcentajeNoCaminable(mapa) {
  let cantidadTotal = 0;
  let cantidadParedes = 0;

  for (const fila of mapa) {
    for (const casilla of fila) {
      cantidadTotal++;

      if (casilla === "#") {
        cantidadParedes++;
      }
    }
  }

  if (cantidadTotal === 0) {
    return 0;
  }

  return Number(((cantidadParedes / cantidadTotal) * 100).toFixed(2));
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
