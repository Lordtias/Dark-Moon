import { Player } from "../../entidad/destructible/combatiente/Player.js";

import { BotinSuelo } from "../../entidad/interactuable/BotinSuelo.js";

import { PortalMapa } from "../../entidad/interactuable/PortalMapa.js";

import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";

import { crearObjetosDesdeDefiniciones } from "../../objetos/FabricaObjetos.js";

import {
  crearSolicitudTransicionMapa,
  TIPOS_TRANSICION_MAPA,
} from "../../Partida/TransicionesMapa.js";

import {
  seleccionarPlantillaMapa,
  obtenerPlantillaMapa,
} from "./SelectorMapa.js";

import {
  crearGeneradorAleatorio,
  crearSemillaAleatoria,
} from "../generacion/GeneradorAleatorio.js";

import { generarTerreno } from "../generacion/GeneradorTerreno.js";

import { generarContenidoMapa } from "../generacion/GeneradorContenidoMapa.js";

export const TILE_SIZE = 32;

const DEFINICIONES_BOTIN_PRUEBA = Object.freeze([
  {
    id: "pocion_curacion",
    cantidad: 1,
  },
  {
    id: "flecha_madera",
    cantidad: 8,
  },
  {
    id: "daga_hierro",
    cantidad: 1,
  },
]);

const DIRECCIONES_INTERACTUABLES_PRUEBA = Object.freeze([
  {
    x: 0,
    y: -1,
  },
  {
    x: 1,
    y: 0,
  },
  {
    x: 0,
    y: 1,
  },
  {
    x: -1,
    y: 0,
  },
  {
    x: 1,
    y: -1,
  },
  {
    x: 1,
    y: 1,
  },
  {
    x: -1,
    y: 1,
  },
  {
    x: -1,
    y: -1,
  },
]);

// Crea al jugador una única vez al comenzar
// una partida completa.
//
// Los mapas posteriores reutilizarán esta misma
// instancia en lugar de crear otro personaje.
export function crearJugadorInicial({
  datosPersonaje,
  configuracionPersonaje,
  configuracionObjetos,
  posicionInicial = {
    x: 0,
    y: 0,
  },
} = {}) {
  if (datosPersonaje === null || typeof datosPersonaje !== "object") {
    throw new Error(
      "Se necesitan los datos del personaje para iniciar la partida.",
    );
  }

  validarPosicion(posicionInicial);

  const { nombre, idProfesion, clasePersonaje, atributos } = datosPersonaje;

  const profesion = configuracionPersonaje.profesiones[idProfesion];

  if (!profesion) {
    throw new Error(`No existe la profesión "${idProfesion}".`);
  }

  if (!profesion.estadisticasBase) {
    throw new Error(
      `La profesión "${idProfesion}" no tiene estadísticas base.`,
    );
  }

  const configuracionContenedor = profesion.contenedor ?? {};

  const configuracionEquipamiento = profesion.equipamiento ?? {};

  const objetosInventarioIniciales = crearObjetosDesdeDefiniciones({
    configuracionObjetos,

    definiciones: configuracionContenedor.objetosIniciales ?? [],
  });

  const equipamientoInicial = crearObjetosDesdeDefiniciones({
    configuracionObjetos,

    definiciones: configuracionEquipamiento.objetosIniciales ?? [],
  });

  return new Player({
    nombre,
    clasePersonaje,

    // La profesión seleccionada determina
    // la imagen inicial del personaje.
    recursoVisual: profesion.recursoVisual ?? null,

    atributos,

    estadisticasBase: profesion.estadisticasBase,

    ataqueNatural: profesion.ataqueNatural ?? null,

    nivel: 1,
    experiencia: 0,

    x: posicionInicial.x,

    y: posicionInicial.y,

    capacidadInventario: configuracionContenedor.capacidad ?? 12,

    objetosInventarioIniciales,
    equipamientoInicial,
  });
}

// Crea una nueva mazmorra utilizando un jugador
// que ya existe dentro de EstadoPartida.
//
// Solamente cambia su posición dentro del nuevo mapa.
// Inventario, equipamiento, experiencia y recursos
// permanecen intactos.
export function crearConfiguracionMazmorra({
  player,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionMapas,

  // Los valores son opcionales.
  //
  // Cuando nivelMapaForzado es null,
  // el nivel se selecciona aleatoriamente dentro
  // del rango de la plantilla.
  semillaMapa = null,
  idMapaForzado = null,
  nivelMapaForzado = null,

  botinPrueba = false,
  portalPrueba = false,
} = {}) {
  validarJugador(player);

  const preparacion = prepararGeneracionMazmorra({
    configuracionMapas,
    semillaMapa,
    idMapaForzado,
    nivelMapaForzado,
  });

  posicionarJugador(
    player,

    preparacion.terreno.posicionInicialSugerida,
  );

  return completarConfiguracionMazmorra({
    player,
    configuracionEnemigos,
    configuracionObjetos,
    botinPrueba,
    portalPrueba,
    semillaMapa,
    idMapaForzado,
    nivelMapaForzado,
    ...preparacion,
  });
}

// Conserva la función utilizada originalmente
// para crear jugador y mazmorra en una sola llamada.
//
// El flujo nuevo crea ambas partes por separado,
// pero mantener esta función evita romper pruebas
// o herramientas que todavía puedan utilizarla.
export function crearConfiguracionInicial({
  datosPersonaje,
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionMapas,

  semillaMapa = null,
  idMapaForzado = null,
  nivelMapaForzado = null,

  botinPrueba = false,
  portalPrueba = false,
} = {}) {
  const preparacion = prepararGeneracionMazmorra({
    configuracionMapas,
    semillaMapa,
    idMapaForzado,
    nivelMapaForzado,
  });

  const player = crearJugadorInicial({
    datosPersonaje,
    configuracionPersonaje,
    configuracionObjetos,

    posicionInicial: preparacion.terreno.posicionInicialSugerida,
  });

  return completarConfiguracionMazmorra({
    player,
    configuracionEnemigos,
    configuracionObjetos,
    botinPrueba,
    portalPrueba,
    semillaMapa,
    idMapaForzado,
    nivelMapaForzado,
    ...preparacion,
  });
}

// Selecciona la plantilla y genera únicamente
// la estructura física de la mazmorra.
function prepararGeneracionMazmorra({
  configuracionMapas,
  semillaMapa,
  idMapaForzado,
  nivelMapaForzado,
}) {
  const semilla = semillaMapa ?? crearSemillaAleatoria();

  const aleatorio = crearGeneradorAleatorio(semilla);

  // Durante una partida normal se utiliza
  // la selección ponderada.
  //
  // Desde la ciudad o mediante parámetros
  // de prueba puede solicitarse una plantilla concreta.
  const mapaSeleccionado =
    idMapaForzado !== null
      ? obtenerPlantillaMapa(configuracionMapas, idMapaForzado)
      : seleccionarPlantillaMapa(
          configuracionMapas,

          () => aleatorio.siguiente(),
        );

  validarNivelMapaForzado({
    nivelMapaForzado,
    mapaSeleccionado,
  });

  const terreno = generarTerreno({
    plantilla: mapaSeleccionado,

    aleatorio,
  });

  return {
    aleatorio,
    mapaSeleccionado,
    terreno,
  };
}

// Agrega enemigos, destructibles, interactuables
// de prueba y el resumen de generación
// al terreno preparado.
function completarConfiguracionMazmorra({
  player,
  configuracionEnemigos,
  configuracionObjetos,
  botinPrueba,
  portalPrueba,
  semillaMapa,
  idMapaForzado,
  nivelMapaForzado,
  aleatorio,
  mapaSeleccionado,
  terreno,
}) {
  // GeneradorContenidoMapa continúa siendo
  // responsable de elegir el nivel aleatorio.
  //
  // Cuando existe un nivel forzado le entregamos
  // una copia de la plantilla cuyo rango contiene
  // exclusivamente ese nivel.
  const plantillaGeneracion = crearPlantillaGeneracion({
    mapaSeleccionado,
    nivelMapaForzado,
  });

  const contenido = generarContenidoMapa({
    plantilla: plantillaGeneracion,

    terreno,

    posicionJugador: {
      x: player.x,

      y: player.y,
    },

    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
  });

  const interactuables = crearInteractuablesIniciales({
    botinPrueba,
    portalPrueba,

    mapa: terreno.celdas,

    player,

    objetivos: contenido.objetivos,

    configuracionObjetos,
  });

  // SelectorMapa siempre devuelve una copia,
  // por lo que esta información pertenece
  // únicamente al mapa actual.
  mapaSeleccionado.generacionActual = {
    semilla: aleatorio.semilla,

    mapaForzado: idMapaForzado !== null,

    nivelForzado: nivelMapaForzado !== null,

    nivelSolicitado: nivelMapaForzado,

    semillaForzada: semillaMapa !== null,

    botinPrueba,
    portalPrueba,

    ancho: terreno.ancho,

    alto: terreno.alto,

    porcentajeNoCaminableObjetivo: terreno.porcentajeNoCaminableObjetivo,

    porcentajeNoCaminableReal: terreno.porcentajeNoCaminableReal,

    porcentajeConectado: terreno.porcentajeConectado,

    intentoExitoso: terreno.intentoExitoso,

    nivelMapa: contenido.resumen.nivelMapa,

    cantidadEnemigos: contenido.resumen.cantidadEnemigos,

    enemigosPorTipo: contenido.resumen.enemigosPorTipo,

    variantes: contenido.resumen.variantes,

    cantidadDestructibles: contenido.resumen.cantidadDestructibles,

    porcentajeDestructibles: contenido.resumen.porcentajeDestructibles,

    detalleEnemigos: contenido.resumen.detalleEnemigos,

    detalleDestructibles: contenido.resumen.detalleDestructibles,
  };

  return {
    map: terreno.celdas,

    mapaSeleccionado,
    player,

    objetivos: contenido.objetivos,

    interactuables,
  };
}

// Crea una copia superficial de la plantilla
// con el rango de nivel ajustado.
//
// Las demás secciones pueden compartirse porque
// GeneradorContenidoMapa solamente las consulta.
function crearPlantillaGeneracion({ mapaSeleccionado, nivelMapaForzado }) {
  if (nivelMapaForzado === null) {
    return mapaSeleccionado;
  }

  return {
    ...mapaSeleccionado,

    niveles: {
      minimo: nivelMapaForzado,

      maximo: nivelMapaForzado,
    },
  };
}

// Comprueba el nivel después de seleccionar
// la plantilla concreta.
//
// Esto permite emitir un error preciso cuando
// se usa una URL o transición inválida.
function validarNivelMapaForzado({ nivelMapaForzado, mapaSeleccionado }) {
  if (nivelMapaForzado === null) {
    return;
  }

  if (!Number.isInteger(nivelMapaForzado) || nivelMapaForzado < 1) {
    throw new Error(
      "El nivel forzado del mapa debe ser un entero mayor que 0.",
    );
  }

  const minimo = mapaSeleccionado.niveles.minimo;

  const maximo = mapaSeleccionado.niveles.maximo;

  if (nivelMapaForzado < minimo || nivelMapaForzado > maximo) {
    throw new Error(
      `${mapaSeleccionado.nombre} permite niveles ` +
        `entre ${minimo} y ${maximo}. ` +
        `Se solicitó el nivel ${nivelMapaForzado}.`,
    );
  }
}

// Crea recursos controlados mediante parámetros
// de prueba en la URL.
function crearInteractuablesIniciales({
  botinPrueba,
  portalPrueba,
  mapa,
  player,
  objetivos,
  configuracionObjetos,
}) {
  const interactuables = [];
  const posicionesOcupadas = [];

  if (botinPrueba) {
    const objetos = crearObjetosDesdeDefiniciones({
      configuracionObjetos,

      definiciones: DEFINICIONES_BOTIN_PRUEBA,
    });

    const posicion = obtenerPosicionInteractuablePrueba({
      mapa,
      player,
      objetivos,
      posicionesOcupadas,
    });

    const botin = new BotinSuelo({
      nombre: "Botín de prueba",

      x: posicion.x,

      y: posicion.y,

      contenedorObjetos: new ContenedorObjetos({
        capacidad: 6,
        objetosIniciales: objetos,
      }),
    });

    interactuables.push(botin);

    posicionesOcupadas.push(posicion);
  }

  if (portalPrueba) {
    const posicion = obtenerPosicionInteractuablePrueba({
      mapa,
      player,
      objetivos,
      posicionesOcupadas,
    });

    const portal = new PortalMapa({
      nombre: "Portal inestable",

      x: posicion.x,

      y: posicion.y,

      simbolo: "O",

      textoInteraccion: "Atravesar portal",

      solicitudTransicionMapa: crearSolicitudTransicionMapa({
        tipo: TIPOS_TRANSICION_MAPA.NUEVA_EXPEDICION,

        // El nuevo mapa también incluirá
        // un portal para repetir la prueba.
        datos: {
          portalPrueba: true,
        },
      }),
    });

    interactuables.push(portal);

    posicionesOcupadas.push(posicion);
  }

  return interactuables;
}

// Busca una casilla próxima que sea caminable,
// no esté ocupada por objetivos y no haya sido
// utilizada por otro interactuable de prueba.
//
// Si ninguna está disponible, puede utilizarse
// la posición del jugador porque estos elementos
// no bloquean el movimiento.
function obtenerPosicionInteractuablePrueba({
  mapa,
  player,
  objetivos,
  posicionesOcupadas,
}) {
  for (const direccion of DIRECCIONES_INTERACTUABLES_PRUEBA) {
    const x = player.x + direccion.x;

    const y = player.y + direccion.y;

    const dentroMapa =
      y >= 0 && y < mapa.length && x >= 0 && x < mapa[y].length;

    if (!dentroMapa || mapa[y][x] === "#") {
      continue;
    }

    const ocupadoPorObjetivo = objetivos.some(
      (objetivo) =>
        objetivo.estaDestruido !== true && objetivo.x === x && objetivo.y === y,
    );

    const ocupadoPorInteractuable = posicionesOcupadas.some(
      (posicion) => posicion.x === x && posicion.y === y,
    );

    if (!ocupadoPorObjetivo && !ocupadoPorInteractuable) {
      return {
        x,
        y,
      };
    }
  }

  return {
    x: player.x,

    y: player.y,
  };
}

function posicionarJugador(player, posicion) {
  validarPosicion(posicion);

  player.x = posicion.x;

  player.y = posicion.y;
}

function validarJugador(player) {
  if (!player || typeof player !== "object") {
    throw new Error("Se necesita un jugador existente para crear la mazmorra.");
  }
}

function validarPosicion(posicion) {
  if (
    !posicion ||
    !Number.isInteger(posicion.x) ||
    !Number.isInteger(posicion.y)
  ) {
    throw new Error("Se necesita una posición inicial válida para el jugador.");
  }
}
