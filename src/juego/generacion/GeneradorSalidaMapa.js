import { PortalMapa } from "../../entidad/interactuable/PortalMapa.js";

import {
  crearSolicitudTransicionMapa,
  TIPOS_TRANSICION_MAPA,
} from "../interacciones/TransicionesMapa.js";

const SIMBOLO_PARED = "#";
const SIMBOLO_CAMINO = ".";

// Materializa el portal jugable sobre la salida que ya forma parte del plano.
//
// La salida no excava terreno después de haber poblado el mapa. La topología
// llega cerrada desde GeneradorTerreno y este componente solamente crea la
// entidad de transición vigente.
export function generarSalidaMazmorra({
  mapa,
  planoMazmorra,
  entidadesOcupantes = [],
} = {}) {
  validarMapa(mapa);
  validarPlano(planoMazmorra, mapa);

  if (!Array.isArray(entidadesOcupantes)) {
    throw new Error("Las entidades ocupantes deben estar dentro de una lista.");
  }

  const salida = planoMazmorra.salidaEstructural;
  const posicionesOcupadas = crearConjuntoPosicionesOcupadas(entidadesOcupantes);
  const claveAcceso = crearClavePosicion(
    salida.posicionAcceso.x,
    salida.posicionAcceso.y,
  );

  if (posicionesOcupadas.has(claveAcceso)) {
    throw new Error(
      "La casilla de acceso de la salida estructural fue ocupada por otra entidad.",
    );
  }

  const portal = new PortalMapa({
    nombre: "Salida de la mazmorra",
    x: salida.posicionPortal.x,
    y: salida.posicionPortal.y,
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
    mapa,
    portal,
    posicionPortal: { ...salida.posicionPortal },
    posicionAcceso: { ...salida.posicionAcceso },
    lado: salida.lado,

    // Compatibilidad diagnóstica con el contrato anterior. La lista debe
    // permanecer vacía porque la materialización no modifica casillas.
    casillasAbiertas: [],
  };
}

function validarPlano(plano, mapa) {
  const salida = plano?.salidaEstructural;

  if (!salida || typeof salida !== "object") {
    throw new Error("Se necesita un plano con salida estructural.");
  }

  validarPosicion(salida.posicionPortal, "portal estructural");
  validarPosicion(salida.posicionAcceso, "acceso estructural");

  const alto = mapa.length;
  const ancho = mapa[0].length;
  const portal = salida.posicionPortal;
  const acceso = salida.posicionAcceso;
  const portalEnBorde =
    portal.x === 0 ||
    portal.y === 0 ||
    portal.x === ancho - 1 ||
    portal.y === alto - 1;

  if (!portalEnBorde || mapa[portal.y]?.[portal.x] !== SIMBOLO_PARED) {
    throw new Error("El portal estructural debe permanecer sobre una pared del borde.");
  }

  if (mapa[acceso.y]?.[acceso.x] !== SIMBOLO_CAMINO) {
    throw new Error("El acceso estructural de salida debe ser transitable.");
  }

  const distancia =
    Math.abs(portal.x - acceso.x) + Math.abs(portal.y - acceso.y);

  if (distancia !== 1) {
    throw new Error("El acceso estructural debe ser adyacente al portal.");
  }
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

function validarPosicion(posicion, descripcion) {
  if (
    !posicion ||
    !Number.isInteger(posicion.x) ||
    !Number.isInteger(posicion.y)
  ) {
    throw new Error(`La posición del ${descripcion} no es válida.`);
  }
}
