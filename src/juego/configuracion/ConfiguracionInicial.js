import { Player } from "../../entidad/destructible/combatiente/Player.js";

import { crearObjetosDesdeDefiniciones } from "../../objetos/FabricaObjetos.js";

import {
  seleccionarPlantillaMapa,
  obtenerPlantillaMapa,
} from "./SelectorMapa.js";

import {
  crearGeneradorAleatorio,
  crearSemillaAleatoria,
} from "../GeneradorAleatorio.js";

import { generarTerreno } from "../GeneradorTerreno.js";

import { generarContenidoMapa } from "../GeneradorContenidoMapa.js";

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

  // Ambos valores son opcionales.
  //
  // Si no se proporcionan, la generación
  // continúa funcionando aleatoriamente.
  semillaMapa = null,
  idMapaForzado = null,
} = {}) {
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
      : seleccionarPlantillaMapa(
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

  // SelectorMapa siempre devuelve una copia,
  // por lo que esta información pertenece
  // únicamente a la partida actual.
  mapaSeleccionado.generacionActual = {
    semilla: aleatorio.semilla,

    mapaForzado: idMapaForzado !== null,

    semillaForzada: semillaMapa !== null,

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
