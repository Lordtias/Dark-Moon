import { seleccionarEntradaPonderada } from "./GeneradorRarezaObjeto.js";

// Distribución inicial del nivel de un objeto
// respecto al nivel base de su fuente.
//
// Ejemplo con una fuente de nivel 2:
//
// - Nivel 1: 20 %.
// - Nivel 2: 70 %.
// - Nivel 3: 10 %.
//
// En nivel base 1, el resultado inferior se limita
// a nivel 1 y ambos pesos se acumulan:
//
// - Nivel 1: 90 %.
// - Nivel 2: 10 %.
const DISTRIBUCION_NIVEL_OBJETO = Object.freeze([
  Object.freeze({
    desplazamiento: -1,

    peso: 20,
  }),

  Object.freeze({
    desplazamiento: 0,

    peso: 70,
  }),

  Object.freeze({
    desplazamiento: 1,

    peso: 10,
  }),
]);

// Genera el nivel de una instancia de objeto
// mediante una selección ponderada reproducible.
export function generarNivelObjeto({ nivelBase, aleatorio } = {}) {
  validarNivel(nivelBase, "nivel base del objeto");

  validarAleatorio(aleatorio);

  // Al limitar el nivel mínimo a 1 pueden aparecer
  // dos entradas con el mismo nivel.
  //
  // Acumulamos sus pesos antes de seleccionar.
  const pesosPorNivel = new Map();

  for (const entrada of DISTRIBUCION_NIVEL_OBJETO) {
    const nivel = Math.max(
      1,

      nivelBase + entrada.desplazamiento,
    );

    pesosPorNivel.set(
      nivel,

      (pesosPorNivel.get(nivel) ?? 0) + entrada.peso,
    );
  }

  const opciones = [...pesosPorNivel.entries()].map(([nivel, peso]) => ({
    nivel,
    peso,
  }));

  return seleccionarEntradaPonderada({
    entradas: opciones,

    obtenerPeso: (opcion) => opcion.peso,

    aleatorio,

    descripcion: "un nivel de objeto",
  }).nivel;
}

// Determina el nivel que funciona como centro
// de la distribución.
//
// Prioridad:
//
// 1. Nivel explícito de la fuente.
// 2. Nivel del mapa.
// 3. Nivel 1 como respaldo.
//
// Esto permite que un futuro jefe de nivel superior
// al mapa genere objetos acordes a su propio nivel.
export function obtenerNivelBaseObjeto({ fuente, nivelMapa = 1 } = {}) {
  if (!fuente || typeof fuente !== "object") {
    throw new Error(
      "Se necesita una fuente válida para determinar el nivel del objeto.",
    );
  }

  validarNivel(nivelMapa, "nivel del mapa");

  if (fuente.nivel === undefined || fuente.nivel === null) {
    return nivelMapa;
  }

  validarNivel(fuente.nivel, `nivel de ${fuente.nombre ?? "la fuente"}`);

  return fuente.nivel;
}

function validarNivel(nivel, descripcion) {
  if (!Number.isInteger(nivel) || nivel < 1) {
    throw new Error(
      `El ${descripcion} debe ser un entero mayor o igual que 1.`,
    );
  }
}

function validarAleatorio(aleatorio) {
  if (!aleatorio || typeof aleatorio.siguiente !== "function") {
    throw new Error(
      "Se necesita un generador aleatorio válido para determinar el nivel del objeto.",
    );
  }
}
