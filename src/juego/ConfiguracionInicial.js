import { Player } from "../entidad/destructible/combatiente/Player.js";

import { crearEnemigo } from "./FabricaEnemigos.js";

import { crearObjetosDesdeDefiniciones } from "../objetos/FabricaObjetos.js";

import { Barril } from "../entidad/destructible/Barril.js";

import { seleccionarPlantillaMapa } from "./SelectorMapa.js";

import {
  crearGeneradorAleatorio,
  crearSemillaAleatoria,
} from "./GeneradorAleatorio.js";

import { generarTerreno } from "./GeneradorTerreno.js";

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

// Conservamos temporalmente los objetivos actuales.
//
// En la próxima etapa esta función será sustituida
// por la generación configurable según el bioma.
function crearObjetivosIniciales(
  configuracionEnemigos,
  configuracionObjetos,
  posiciones,
) {
  const rata = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,

    idPlantilla: "rata",
    nivel: 1,
    idVariante: null,

    x: posiciones.rata.x,

    y: posiciones.rata.y,
  });

  const esqueletoGuerrero = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,

    idPlantilla: "esqueleto_guerrero",

    nivel: 1,
    idVariante: null,

    x: posiciones.esqueletoGuerrero.x,

    y: posiciones.esqueletoGuerrero.y,
  });

  const esqueletoRogue = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,

    idPlantilla: "esqueleto_rogue",

    nivel: 1,
    idVariante: null,

    x: posiciones.esqueletoRogue.x,

    y: posiciones.esqueletoRogue.y,
  });

  const barril = new Barril({
    x: posiciones.barril.x,

    y: posiciones.barril.y,
  });

  return [rata, esqueletoGuerrero, esqueletoRogue, barril];
}

// Selecciona casillas distintas para mantener
// temporalmente las entidades actuales.
//
// Los enemigos respetan:
//
// - Distancia segura respecto al jugador.
// - Distancia mínima entre ellos.
function seleccionarPosicionesTemporales({
  casillasCaminables,
  posicionJugador,
  plantilla,
  aleatorio,
}) {
  const disponibles = aleatorio
    .mezclar(casillasCaminables)
    .filter((posicion) => !sonMismaPosicion(posicion, posicionJugador));

  const posicionesEnemigos = [];

  const distanciaSegura = plantilla.enemigos.distanciaSeguraJugador;

  const distanciaEntreEnemigos =
    plantilla.enemigos.distanciaMinimaEntreEnemigos;

  for (let indice = 0; indice < 3; indice++) {
    const indiceEncontrado = disponibles.findIndex(
      (posicion) =>
        calcularDistancia(posicion, posicionJugador) >= distanciaSegura &&
        posicionesEnemigos.every(
          (enemigoExistente) =>
            calcularDistancia(posicion, enemigoExistente) >=
            distanciaEntreEnemigos,
        ),
    );

    if (indiceEncontrado === -1) {
      throw new Error(
        "El terreno no dispone de espacio suficiente " +
          "para colocar los enemigos temporales.",
      );
    }

    const [posicionElegida] = disponibles.splice(indiceEncontrado, 1);

    posicionesEnemigos.push(posicionElegida);
  }

  if (disponibles.length === 0) {
    throw new Error("El terreno no dispone de espacio para colocar el barril.");
  }

  const posicionBarril = disponibles.shift();

  return {
    rata: posicionesEnemigos[0],

    esqueletoGuerrero: posicionesEnemigos[1],

    esqueletoRogue: posicionesEnemigos[2],

    barril: posicionBarril,
  };
}

// Utilizamos distancia de cuadrícula porque coincide
// con la percepción y movimiento general del juego.
function calcularDistancia(origen, destino) {
  return Math.max(
    Math.abs(destino.x - origen.x),

    Math.abs(destino.y - origen.y),
  );
}

function sonMismaPosicion(posicionA, posicionB) {
  return posicionA.x === posicionB.x && posicionA.y === posicionB.y;
}

export function crearConfiguracionInicial({
  datosPersonaje,
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionMapas,

  // Más adelante podremos recibir esta semilla
  // desde un campo de depuración o desde la URL.
  semillaMapa = null,
} = {}) {
  const semilla = semillaMapa ?? crearSemillaAleatoria();

  const aleatorio = crearGeneradorAleatorio(semilla);

  // La propia selección del bioma también utiliza
  // la semilla, por lo que toda la partida inicial
  // puede reproducirse.
  const mapaSeleccionado = seleccionarPlantillaMapa(
    configuracionMapas,

    () => aleatorio.siguiente(),
  );

  const terreno = generarTerreno({
    plantilla: mapaSeleccionado,

    aleatorio,
  });

  const posiciones = seleccionarPosicionesTemporales({
    casillasCaminables: terreno.casillasCaminables,

    posicionJugador: terreno.posicionInicialSugerida,

    plantilla: mapaSeleccionado,

    aleatorio,
  });

  const player = crearJugadorInicial(
    datosPersonaje,
    configuracionPersonaje,
    configuracionObjetos,

    terreno.posicionInicialSugerida,
  );

  const objetivos = crearObjetivosIniciales(
    configuracionEnemigos,
    configuracionObjetos,
    posiciones,
  );

  // La plantilla fue clonada por SelectorMapa,
  // por lo que podemos agregar información de
  // esta instancia sin modificar Mapas.json.
  mapaSeleccionado.generacionActual = {
    semilla: aleatorio.semilla,

    ancho: terreno.ancho,

    alto: terreno.alto,

    porcentajeNoCaminableObjetivo: terreno.porcentajeNoCaminableObjetivo,

    porcentajeNoCaminableReal: terreno.porcentajeNoCaminableReal,

    porcentajeConectado: terreno.porcentajeConectado,

    intentoExitoso: terreno.intentoExitoso,
  };

  return {
    map: terreno.celdas,

    mapaSeleccionado,
    player,
    objetivos,
  };
}
