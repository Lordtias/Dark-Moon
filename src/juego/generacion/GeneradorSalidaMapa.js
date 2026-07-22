import { PortalMapa } from "../../entidad/interactuable/PortalMapa.js";

import {
  crearSolicitudTransicionMapa,
  TIPOS_TRANSICION_MAPA,
} from "../../Partida/TransicionesMapa.js";

const SIMBOLO_PARED = "#";
const SIMBOLO_CAMINO = ".";

const LADOS_MAPA = Object.freeze({
  ARRIBA: "arriba",
  DERECHA: "derecha",
  ABAJO: "abajo",
  IZQUIERDA: "izquierda",
});

const ORDEN_LADOS = Object.freeze([
  LADOS_MAPA.ARRIBA,
  LADOS_MAPA.DERECHA,
  LADOS_MAPA.ABAJO,
  LADOS_MAPA.IZQUIERDA,
]);

// Crea una salida accesible dentro del borde
// de una mazmorra procedural.
//
// El portal se dibuja sobre una casilla del borde,
// que continúa siendo una pared no caminable.
// El jugador utiliza la salida desde la casilla
// interior adyacente mediante la tecla R.
export function generarSalidaMazmorra({
  mapa,
  jugador,
  entidadesOcupantes = [],
} = {}) {
  validarMapa(mapa);
  validarPosicion(jugador, "jugador");

  if (!Array.isArray(entidadesOcupantes)) {
    throw new Error("Las entidades ocupantes deben estar dentro de una lista.");
  }

  const mapaMutable = mapa.map((fila) =>
    Array.isArray(fila) ? [...fila] : Array.from(fila),
  );

  const posicionesOcupadas =
    crearConjuntoPosicionesOcupadas(entidadesOcupantes);

  const candidato = seleccionarCandidatoSalida({
    mapa: mapaMutable,
    jugador,
    posicionesOcupadas,
  });

  if (!candidato) {
    throw new Error(
      "No se encontró una ubicación válida para la salida de la mazmorra.",
    );
  }

  const casillasAbiertas = [];

  // Abrimos un corredor desde una casilla ya conectada
  // hasta la casilla interior vecina al borde.
  //
  // Como el recorrido comienza sobre suelo existente,
  // toda casilla nueva queda conectada con la mazmorra.
  for (const posicion of candidato.recorridoInterior) {
    if (mapaMutable[posicion.y][posicion.x] === SIMBOLO_PARED) {
      mapaMutable[posicion.y][posicion.x] = SIMBOLO_CAMINO;

      casillasAbiertas.push({
        x: posicion.x,
        y: posicion.y,
      });
    }
  }

  const portal = new PortalMapa({
    nombre: "Salida de la mazmorra",

    x: candidato.posicionPortal.x,

    y: candidato.posicionPortal.y,

    simbolo: "S",

    textoInteraccion: "Regresar a la ciudad",

    alcance: 1,
    prioridad: 110,

    solicitudTransicionMapa: crearSolicitudTransicionMapa({
      tipo: TIPOS_TRANSICION_MAPA.REGRESAR_CIUDAD,

      datos: {
        puntoEntrada: "regresoDungeon",
      },
    }),
  });

  return {
    mapa: mapaMutable,

    portal,

    posicionPortal: {
      ...candidato.posicionPortal,
    },

    posicionAcceso: {
      ...candidato.posicionAcceso,
    },

    lado: candidato.lado,

    casillasAbiertas,
  };
}

function seleccionarCandidatoSalida({ mapa, jugador, posicionesOcupadas }) {
  const alto = mapa.length;
  const ancho = mapa[0].length;
  const candidatos = [];

  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      if (mapa[y][x] === SIMBOLO_PARED) {
        continue;
      }

      for (const lado of ORDEN_LADOS) {
        const candidato = crearCandidatoDesdeCasilla({
          x,
          y,
          lado,
          ancho,
          alto,
        });

        const recorridoLibre = candidato.recorridoInterior.every(
          (posicion) =>
            !posicionesOcupadas.has(crearClavePosicion(posicion.x, posicion.y)),
        );

        if (!recorridoLibre) {
          continue;
        }

        candidato.distanciaJugador = calcularDistanciaCuadricula(
          jugador,
          candidato.posicionAcceso,
        );

        candidato.paredesAbrir = candidato.recorridoInterior.filter(
          (posicion) => mapa[posicion.y][posicion.x] === SIMBOLO_PARED,
        ).length;

        candidatos.push(candidato);
      }
    }
  }

  candidatos.sort(
    (primero, segundo) =>
      primero.paredesAbrir - segundo.paredesAbrir ||
      primero.recorridoInterior.length - segundo.recorridoInterior.length ||
      segundo.distanciaJugador - primero.distanciaJugador ||
      ORDEN_LADOS.indexOf(primero.lado) - ORDEN_LADOS.indexOf(segundo.lado) ||
      primero.posicionPortal.y - segundo.posicionPortal.y ||
      primero.posicionPortal.x - segundo.posicionPortal.x,
  );

  return candidatos[0] ?? null;
}

function crearCandidatoDesdeCasilla({ x, y, lado, ancho, alto }) {
  switch (lado) {
    case LADOS_MAPA.ARRIBA:
      return {
        lado,

        posicionPortal: {
          x,
          y: 0,
        },

        posicionAcceso: {
          x,
          y: 1,
        },

        recorridoInterior: crearRecorridoVertical({
          x,
          desdeY: y,
          hastaY: 1,
        }),
      };

    case LADOS_MAPA.DERECHA:
      return {
        lado,

        posicionPortal: {
          x: ancho - 1,
          y,
        },

        posicionAcceso: {
          x: ancho - 2,
          y,
        },

        recorridoInterior: crearRecorridoHorizontal({
          y,
          desdeX: x,
          hastaX: ancho - 2,
        }),
      };

    case LADOS_MAPA.ABAJO:
      return {
        lado,

        posicionPortal: {
          x,
          y: alto - 1,
        },

        posicionAcceso: {
          x,
          y: alto - 2,
        },

        recorridoInterior: crearRecorridoVertical({
          x,
          desdeY: y,
          hastaY: alto - 2,
        }),
      };

    case LADOS_MAPA.IZQUIERDA:
      return {
        lado,

        posicionPortal: {
          x: 0,
          y,
        },

        posicionAcceso: {
          x: 1,
          y,
        },

        recorridoInterior: crearRecorridoHorizontal({
          y,
          desdeX: x,
          hastaX: 1,
        }),
      };

    default:
      throw new Error(`El lado de salida "${lado}" no es válido.`);
  }
}

function crearRecorridoHorizontal({ y, desdeX, hastaX }) {
  const paso = desdeX <= hastaX ? 1 : -1;

  const recorrido = [];

  for (let x = desdeX; ; x += paso) {
    recorrido.push({
      x,
      y,
    });

    if (x === hastaX) {
      break;
    }
  }

  return recorrido;
}

function crearRecorridoVertical({ x, desdeY, hastaY }) {
  const paso = desdeY <= hastaY ? 1 : -1;

  const recorrido = [];

  for (let y = desdeY; ; y += paso) {
    recorrido.push({
      x,
      y,
    });

    if (y === hastaY) {
      break;
    }
  }

  return recorrido;
}

function crearConjuntoPosicionesOcupadas(entidades) {
  const posiciones = new Set();

  for (const entidad of entidades) {
    if (
      !entidad ||
      !Number.isInteger(entidad.x) ||
      !Number.isInteger(entidad.y)
    ) {
      continue;
    }

    posiciones.add(crearClavePosicion(entidad.x, entidad.y));
  }

  return posiciones;
}

function crearClavePosicion(x, y) {
  return `${x}:${y}`;
}

function calcularDistanciaCuadricula(origen, destino) {
  return Math.max(
    Math.abs(destino.x - origen.x),
    Math.abs(destino.y - origen.y),
  );
}

function validarMapa(mapa) {
  if (!Array.isArray(mapa) || mapa.length < 3) {
    throw new Error("Se necesita un mapa válido para generar una salida.");
  }

  const ancho = mapa[0]?.length ?? 0;

  if (ancho < 3) {
    throw new Error("El mapa es demasiado pequeño para generar una salida.");
  }

  for (const fila of mapa) {
    if (
      (!Array.isArray(fila) && typeof fila !== "string") ||
      fila.length !== ancho
    ) {
      throw new Error("Todas las filas del mapa deben tener el mismo ancho.");
    }
  }
}

function validarPosicion(entidad, descripcion) {
  if (
    !entidad ||
    !Number.isInteger(entidad.x) ||
    !Number.isInteger(entidad.y)
  ) {
    throw new Error(`La posición del ${descripcion} no es válida.`);
  }
}
