import { TIPOS_INTERACCION } from "./TiposInteraccion.js";

const TIPOS_INTERACCION_VALIDOS = new Set(Object.values(TIPOS_INTERACCION));

// Obtiene todas las interacciones que un actor
// puede utilizar en su posición actual.
//
// Una entidad es considerada interactuable cuando
// implementa el método obtenerInteracciones().
//
// No necesita heredar de una clase concreta.
// Esto permite que puedan ofrecer interacciones:
//
// - Botines.
// - Cofres.
// - NPC.
// - Combatientes.
// - Altares.
// - Objetos de misión.
export function obtenerInteraccionesDisponibles({
  actor,
  interactuables,
  contexto = {},
} = {}) {
  validarActor(actor);

  if (!Array.isArray(interactuables)) {
    throw new Error(
      "Las entidades interactuables deben estar dentro de una lista.",
    );
  }

  const resultados = [];

  interactuables.forEach((entidad, ordenEntidad) => {
    if (!entidad || typeof entidad.obtenerInteracciones !== "function") {
      return;
    }

    validarPosicionEntidad(entidad);

    const distancia = calcularDistanciaInteraccion(actor, entidad);

    const interacciones = entidad.obtenerInteracciones({
      actor,
      entidad,
      contexto,
    });

    if (!Array.isArray(interacciones)) {
      throw new Error(
        `${entidad.nombre ?? "La entidad"} debe devolver ` +
          "una lista de interacciones.",
      );
    }

    interacciones.forEach((interaccion, ordenInteraccion) => {
      const normalizada = normalizarInteraccion({
        interaccion,
        entidad,
      });

      if (distancia > normalizada.alcance) {
        return;
      }

      resultados.push({
        ...normalizada,

        entidad,
        distancia,
        ordenEntidad,
        ordenInteraccion,
      });
    });
  });

  // Prioridades mayores aparecen primero.
  //
  // En caso de empate se elige:
  //
  // 1. La entidad más cercana.
  // 2. La primera entidad registrada.
  // 3. La primera interacción ofrecida.
  resultados.sort(
    (primera, segunda) =>
      segunda.prioridad - primera.prioridad ||
      primera.distancia - segunda.distancia ||
      primera.ordenEntidad - segunda.ordenEntidad ||
      primera.ordenInteraccion - segunda.ordenInteraccion,
  );

  return resultados;
}

// Devuelve únicamente la interacción
// que debe ejecutarse primero.
export function obtenerInteraccionPrioritaria(parametros) {
  return obtenerInteraccionesDisponibles(parametros)[0] ?? null;
}

// Utilizamos distancia de cuadrícula tipo Chebyshev.
//
// Una entidad en diagonal a una casilla de distancia
// puede interactuarse igual que una ubicada en horizontal
// o vertical.
export function calcularDistanciaInteraccion(origen, destino) {
  validarPosicionEntidad(origen);

  validarPosicionEntidad(destino);

  return Math.max(
    Math.abs(destino.x - origen.x),

    Math.abs(destino.y - origen.y),
  );
}

function normalizarInteraccion({ interaccion, entidad }) {
  if (
    !interaccion ||
    typeof interaccion !== "object" ||
    Array.isArray(interaccion)
  ) {
    throw new Error(
      `${entidad.nombre ?? "La entidad"} contiene ` +
        "una interacción inválida.",
    );
  }

  if (!TIPOS_INTERACCION_VALIDOS.has(interaccion.tipo)) {
    throw new Error(
      `El tipo de interacción "${interaccion.tipo}" no es válido.`,
    );
  }

  if (
    typeof interaccion.texto !== "string" ||
    interaccion.texto.trim() === ""
  ) {
    throw new Error("Toda interacción debe tener un texto válido.");
  }

  const alcance = interaccion.alcance ?? 1;

  if (!Number.isInteger(alcance) || alcance < 0) {
    throw new Error(
      "El alcance de una interacción debe ser un entero no negativo.",
    );
  }

  const prioridad = interaccion.prioridad ?? 0;

  if (!Number.isFinite(prioridad)) {
    throw new Error("La prioridad de una interacción debe ser numérica.");
  }

  return {
    ...interaccion,

    texto: interaccion.texto.trim(),

    alcance,
    prioridad,
  };
}

function validarActor(actor) {
  if (!actor || typeof actor !== "object") {
    throw new Error("Se necesita un actor válido para buscar interacciones.");
  }

  validarPosicionEntidad(actor);
}

function validarPosicionEntidad(entidad) {
  if (
    !entidad ||
    !Number.isInteger(entidad.x) ||
    !Number.isInteger(entidad.y)
  ) {
    throw new Error(
      "Toda entidad interactuable debe tener coordenadas enteras.",
    );
  }
}
