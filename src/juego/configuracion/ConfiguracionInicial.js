import { Player } from "../../entidad/destructible/combatiente/Player.js";
import { BotinSuelo } from "../../entidad/interactuable/BotinSuelo.js";
import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";

import { crearObjetosDesdeDefiniciones } from "../../objetos/FabricaObjetos.js";

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

const DIRECCIONES_BOTIN_PRUEBA = Object.freeze([
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
  // Si no se proporcionan, la generación
  // continúa funcionando aleatoriamente.
  semillaMapa = null,
  idMapaForzado = null,
  botinPrueba = false,
} = {}) {
  validarJugador(player);

  const preparacion = prepararGeneracionMazmorra({
    configuracionMapas,
    semillaMapa,
    idMapaForzado,
  });

  posicionarJugador(player, preparacion.terreno.posicionInicialSugerida);

  return completarConfiguracionMazmorra({
    player,
    configuracionEnemigos,
    configuracionObjetos,
    botinPrueba,
    semillaMapa,
    idMapaForzado,
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
  botinPrueba = false,
} = {}) {
  const preparacion = prepararGeneracionMazmorra({
    configuracionMapas,
    semillaMapa,
    idMapaForzado,
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
    semillaMapa,
    idMapaForzado,
    ...preparacion,
  });
}

// Selecciona la plantilla y genera únicamente
// la estructura física de la mazmorra.
function prepararGeneracionMazmorra({
  configuracionMapas,
  semillaMapa,
  idMapaForzado,
}) {
  const semilla = semillaMapa ?? crearSemillaAleatoria();

  const aleatorio = crearGeneradorAleatorio(semilla);

  // Durante una partida normal se utiliza
  // la selección ponderada.
  //
  // En modo de prueba podemos solicitar
  // directamente una plantilla concreta.
  const mapaSeleccionado =
    idMapaForzado !== null
      ? obtenerPlantillaMapa(configuracionMapas, idMapaForzado)
      : seleccionarPlantillaMapa(configuracionMapas, () =>
          aleatorio.siguiente(),
        );

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

// Agrega enemigos, destructibles, botín de prueba
// y el resumen de generación al terreno preparado.
function completarConfiguracionMazmorra({
  player,
  configuracionEnemigos,
  configuracionObjetos,
  botinPrueba,
  semillaMapa,
  idMapaForzado,
  aleatorio,
  mapaSeleccionado,
  terreno,
}) {
  const contenido = generarContenidoMapa({
    plantilla: mapaSeleccionado,

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

    semillaForzada: semillaMapa !== null,

    botinPrueba,

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

// Crea un botín controlado únicamente
// mediante el parámetro ?botin=prueba.
//
// Este recurso permite validar interacciones,
// transferencias y la ventana de contenedores.
function crearInteractuablesIniciales({
  botinPrueba,
  mapa,
  player,
  objetivos,
  configuracionObjetos,
}) {
  if (!botinPrueba) {
    return [];
  }

  const objetos = crearObjetosDesdeDefiniciones({
    configuracionObjetos,

    definiciones: DEFINICIONES_BOTIN_PRUEBA,
  });

  const posicion = obtenerPosicionBotinPrueba({
    mapa,
    player,
    objetivos,
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

  return [botin];
}

// Busca una casilla próxima que sea caminable
// y no esté ocupada por un objetivo.
//
// Si ninguna está disponible, el botín puede compartir
// la casilla inicial con el jugador porque no bloquea
// movimiento ni combate.
function obtenerPosicionBotinPrueba({ mapa, player, objetivos }) {
  for (const direccion of DIRECCIONES_BOTIN_PRUEBA) {
    const x = player.x + direccion.x;

    const y = player.y + direccion.y;

    const dentroMapa =
      y >= 0 && y < mapa.length && x >= 0 && x < mapa[y].length;

    if (!dentroMapa || mapa[y][x] === "#") {
      continue;
    }

    const ocupado = objetivos.some(
      (objetivo) =>
        objetivo.estaDestruido !== true && objetivo.x === x && objetivo.y === y,
    );

    if (!ocupado) {
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
