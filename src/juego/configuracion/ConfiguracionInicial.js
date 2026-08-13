import { Player } from "../../entidad/destructible/combatiente/Player.js";

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
import { configurarContextoGeneracionBotin } from "../botin/ContextoGeneracionBotin.js";
import { obtenerRecursoVisualPredeterminado } from "./RecursosVisualesCombatientes.js";


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
    recursoVisual: obtenerRecursoVisualPredeterminado(profesion.recursoVisual, {
      descripcion: `el recurso visual de la profesión "${idProfesion}"`,
    }),

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
  configuracionGeneracionObjetos,
  configuracionMapas,
  configuracionEntidadesMazmorra,

  // Los valores son opcionales.
  //
  // Cuando nivelMapaForzado es null,
  // el nivel se selecciona aleatoriamente dentro
  // del rango de la plantilla.
  semillaMapa = null,
  idMapaForzado = null,
  nivelMapaForzado = null,

  cantidadEnemigosRecurrentes = null,
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
    configuracionGeneracionObjetos,
    configuracionEntidadesMazmorra,
    cantidadEnemigosRecurrentes,
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
  // Desde la ciudad o desde una herramienta externa
  // puede solicitarse una plantilla concreta.
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

// Agrega enemigos, destructibles, interactuables procedurales
// y el resumen de generación al terreno preparado.
function completarConfiguracionMazmorra({
  player,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  configuracionEntidadesMazmorra,
  cantidadEnemigosRecurrentes,
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

  // El contenido de los cofres se resuelve durante la propia población.
  // El nivel del mapa se determina aquí, antes de crear entidades, para que
  // SistemaBotin disponga del mismo contexto canónico que utilizarán después
  // enemigos y destructibles.
  const nivelMapa = aleatorio.entero(
    plantillaGeneracion.niveles.minimo,
    plantillaGeneracion.niveles.maximo,
  );

  configurarContextoGeneracionBotin({
    configuracionGeneracionObjetos,
    semillaMapa: aleatorio.semilla,
    nivelMapa,
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
    configuracionEntidadesMazmorra,
    nivelMapa,
    cantidadEnemigosRecurrentes,
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

    ancho: terreno.ancho,

    alto: terreno.alto,

    porcentajeNoCaminableReal: terreno.porcentajeNoCaminableReal,

    porcentajeConectado: terreno.porcentajeConectado,

    intentoExitoso: terreno.intentoExitoso,

    cantidadHabitaciones: terreno.habitaciones.length,

    cantidadPasillos: terreno.pasillos.length,

    cantidadPuntosConexion: terreno.puntosConexion.length,

    cantidadConexionesExtra: terreno.conexiones.filter(
      (conexion) => conexion.tipo === "extra",
    ).length,

    salidaEstructural: {
      idHabitacion: terreno.salidaEstructural.idHabitacion,
      posicionPortal: { ...terreno.salidaEstructural.posicionPortal },
      posicionAcceso: { ...terreno.salidaEstructural.posicionAcceso },
      lado: terreno.salidaEstructural.lado,
      longitudConexion:
        terreno.salidaEstructural.casillasConexionBorde.length,
    },

    casillasReservadasContenido: terreno.casillasReservadasContenido.length,

    nivelMapa: contenido.resumen.nivelMapa,

    cantidadEnemigos: contenido.resumen.cantidadEnemigos,

    enemigosPorTipo: contenido.resumen.enemigosPorTipo,

    variantes: contenido.resumen.variantes,

    poblacionEnemigos: contenido.resumen.poblacionEnemigos,

    cantidadDestructibles: contenido.resumen.cantidadDestructibles,

    detalleEnemigos: contenido.resumen.detalleEnemigos,

    detalleDestructibles: contenido.resumen.detalleDestructibles,

    interactuablesProcedurales: contenido.resumen.interactuablesProcedurales,

    planPoblacion: contenido.resumen.planPoblacion,
  };

  return {
    // El runtime consume filas mutables. La conversión se realiza de forma
    // explícita al adaptar el plano estructural al mapa jugable, sin modificar
    // la fuente descriptiva del terreno.
    map: terreno.celdas.map((fila) => Array.from(fila)),

    // El plano se conserva como contrato descriptivo para los consumidores
    // de integración del mapa. Juego y Phaser continúan recibiendo únicamente
    // la matriz y el estado canónico que ya utilizaban.
    planoMazmorra: terreno,

    mapaSeleccionado,
    player,

    objetivos: contenido.objetivos,

    interactuables: contenido.interactuables ?? [],
  };
}

// Crea una copia superficial de la plantilla
// con el rango de nivel ajustado.
//
// Las demás secciones pueden compartirse porque
// GeneradorContenidoMapa solamente las consulta.
function crearPlantillaGeneracion({
  mapaSeleccionado,
  nivelMapaForzado,
}) {
  if (nivelMapaForzado === null) {
    return mapaSeleccionado;
  }

  return {
    ...mapaSeleccionado,
    niveles: { minimo: nivelMapaForzado, maximo: nivelMapaForzado },
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
