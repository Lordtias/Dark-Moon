import { seleccionarEntradaPonderada } from "./GeneradorRarezaObjeto.js";

// Genera el nivel de una instancia mediante
// la distribución declarada en GeneracionObjetos.json.
//
// Ejemplo con una fuente de nivel 2 y la configuración inicial:
//
// - Nivel 1: peso 20.
// - Nivel 2: peso 70.
// - Nivel 3: peso 10.
export function generarNivelObjeto({
  nivelBase,
  configuracionNivelObjeto,
  aleatorio,
} = {}) {
  validarNivel(nivelBase, "nivel base del objeto");

  validarConfiguracionNivel(configuracionNivelObjeto);

  validarAleatorio(aleatorio);

  // Al aplicar el nivel mínimo pueden aparecer
  // varias entradas con el mismo resultado.
  //
  // Ejemplo en nivel base 1:
  //
  // - Desplazamiento -1 termina en nivel 1.
  // - Desplazamiento 0 también termina en nivel 1.
  //
  // Sus pesos se acumulan antes de seleccionar.
  const pesosPorNivel = new Map();

  for (const entrada of configuracionNivelObjeto.distribucion) {
    const nivel = Math.max(
      configuracionNivelObjeto.nivelMinimo,

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

function validarConfiguracionNivel(configuracion) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion) ||
    !Number.isInteger(configuracion.nivelMinimo) ||
    configuracion.nivelMinimo < 1 ||
    !Array.isArray(configuracion.distribucion) ||
    configuracion.distribucion.length === 0
  ) {
    throw new Error(
      "Se necesita una configuración válida para generar el nivel del objeto.",
    );
  }
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
