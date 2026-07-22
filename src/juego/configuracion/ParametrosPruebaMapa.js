// Nombres de los parámetros que pueden incluirse
// en la URL durante las pruebas.
//
// Ejemplo:
//
// ?mapa=cementerio&semilla=123456&botin=prueba&portal=prueba
const PARAMETRO_MAPA = "mapa";
const PARAMETRO_SEMILLA = "semilla";
const PARAMETRO_BOTIN = "botin";
const PARAMETRO_PORTAL = "portal";

// Lee los parámetros opcionales de la URL.
//
// Cuando no existen, la generación continúa
// funcionando completamente al azar.
export function leerParametrosPruebaMapa(
  urlActual = globalThis.location?.href ?? "",
) {
  if (typeof urlActual !== "string" || urlActual.trim() === "") {
    return crearResultadoVacio();
  }

  const url = new URL(
    urlActual,
    globalThis.location?.origin ?? "http://localhost",
  );

  const idMapaForzado = normalizarTexto(url.searchParams.get(PARAMETRO_MAPA));

  const textoSemilla = normalizarTexto(url.searchParams.get(PARAMETRO_SEMILLA));

  const textoBotin = normalizarTexto(url.searchParams.get(PARAMETRO_BOTIN));

  const textoPortal = normalizarTexto(url.searchParams.get(PARAMETRO_PORTAL));

  const semillaMapa =
    textoSemilla === null ? null : convertirSemilla(textoSemilla);

  // Cualquier valor no vacío activa
  // los recursos de validación correspondientes.
  const botinPrueba = textoBotin !== null;

  const portalPrueba = textoPortal !== null;

  return {
    idMapaForzado,
    semillaMapa,
    botinPrueba,
    portalPrueba,

    activo:
      idMapaForzado !== null ||
      semillaMapa !== null ||
      botinPrueba ||
      portalPrueba,
  };
}

// Convierte semillas numéricas a número.
//
// Las semillas de texto también son válidas:
//
// ?semilla=prueba-alcantarilla
function convertirSemilla(texto) {
  const esEntero = /^-?\d+$/.test(texto);

  if (esEntero) {
    const numero = Number(texto);

    if (Number.isSafeInteger(numero)) {
      return numero;
    }
  }

  return texto;
}

function normalizarTexto(valor) {
  if (typeof valor !== "string") {
    return null;
  }

  const resultado = valor.trim();

  return resultado === "" ? null : resultado;
}

function crearResultadoVacio() {
  return {
    idMapaForzado: null,
    semillaMapa: null,
    botinPrueba: false,
    portalPrueba: false,
    activo: false,
  };
}
