import { Player } from "../entidad/destructible/combatiente/Player.js";

import { crearObjetosDesdeDefiniciones } from "../objetos/FabricaObjetos.js";

import { seleccionarPlantillaMapa } from "./SelectorMapa.js";

import {
  crearGeneradorAleatorio,
  crearSemillaAleatoria,
} from "./GeneradorAleatorio.js";

import { generarTerreno } from "./GeneradorTerreno.js";

import { generarContenidoMapa } from "./GeneradorContenidoMapa.js";

export const TILE_SIZE = 32;

function crearJugadorInicial(
  datosPersonaje,
  configuracionPersonaje,
  configuracionObjetos,
  posicionInicial,
) {
  if (datosPersonaje === null || typeof datosPersonaje !== "object") {
    throw new Error(
      "Se necesitan los datos del personaje para iniciar la partida.",
    );
  }

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

export function crearConfiguracionInicial({
  datosPersonaje,
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionMapas,

  // Más adelante podremos recibir esta semilla
  // desde una pantalla o desde la URL.
  semillaMapa = null,
} = {}) {
  const semilla = semillaMapa ?? crearSemillaAleatoria();

  const aleatorio = crearGeneradorAleatorio(semilla);

  // La selección del bioma forma parte de la
  // misma secuencia reproducible.
  const mapaSeleccionado = seleccionarPlantillaMapa(
    configuracionMapas,

    () => aleatorio.siguiente(),
  );

  const terreno = generarTerreno({
    plantilla: mapaSeleccionado,

    aleatorio,
  });

  const player = crearJugadorInicial(
    datosPersonaje,
    configuracionPersonaje,
    configuracionObjetos,

    terreno.posicionInicialSugerida,
  );

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

  // SelectorMapa devuelve una copia de la
  // plantilla, por lo que esta información
  // pertenece únicamente a la partida actual.
  mapaSeleccionado.generacionActual = {
    semilla: aleatorio.semilla,

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
  };
}
