import { crearGeneradorAleatorio } from "../generacion/GeneradorAleatorio.js";

// Dark Moon mantiene actualmente una única partida activa.
//
// Este contexto reúne la configuración y la secuencia
// pseudoaleatoria utilizadas exclusivamente para generar
// las instancias de objetos obtenidas como botín.
//
// Se mantiene separado de la secuencia que decide:
//
// - Si una entrada de la tabla cae.
// - Cuántas unidades entrega.
//
// Así, agregar o modificar afijos no altera qué entradas
// de botín resultan exitosas para una misma semilla.
let contextoActual = null;

// Configura la generación de objetos para el mapa activo.
//
// Cuando en el futuro se cambie de piso,
// esta misma función deberá ejecutarse con:
//
// - La nueva semilla.
// - El nuevo nivel de mapa.
export function configurarContextoGeneracionBotin({
  configuracionGeneracionObjetos,
  semillaMapa,
  nivelMapa,
} = {}) {
  validarConfiguracionGeneracion(configuracionGeneracionObjetos);

  if (
    (typeof semillaMapa !== "string" && typeof semillaMapa !== "number") ||
    String(semillaMapa).trim() === ""
  ) {
    throw new Error(
      "La generación de botín necesita una semilla de mapa válida.",
    );
  }

  if (!Number.isInteger(nivelMapa) || nivelMapa < 1) {
    throw new Error(
      "La generación de botín necesita un nivel de mapa mayor o igual que 1.",
    );
  }

  const semillaNormalizada = String(semillaMapa);

  contextoActual = {
    configuracionGeneracionObjetos,

    semillaMapa: semillaNormalizada,

    nivelMapa,

    // Secuencia dedicada a:
    //
    // - Nivel de objeto.
    // - Rareza.
    // - Cantidad de afijos.
    // - Familias.
    // - Grados.
    // - Valores.
    aleatorioObjetos: crearGeneradorAleatorio(`${semillaNormalizada}:objetos`),
  };

  return contextoActual;
}

// Devuelve el contexto preparado por ControladorPartida.
//
// Fallar de forma explícita evita que los drops
// creen silenciosamente objetos sin rareza cuando
// la configuración no fue conectada.
export function obtenerContextoGeneracionBotin() {
  if (!contextoActual) {
    throw new Error(
      "El contexto de generación de botín todavía no fue configurado.",
    );
  }

  return contextoActual;
}

// Facilita pruebas aisladas y futuros reinicios
// completos de una partida.
export function limpiarContextoGeneracionBotin() {
  contextoActual = null;
}

function validarConfiguracionGeneracion(configuracion) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error(
      "Se necesita una configuración válida de rarezas y afijos.",
    );
  }

  for (const nombreCatalogo of ["reglas", "rarezas", "prefijos", "sufijos"]) {
    const catalogo = configuracion[nombreCatalogo];

    if (
      catalogo === null ||
      typeof catalogo !== "object" ||
      Array.isArray(catalogo)
    ) {
      throw new Error(`El catálogo de ${nombreCatalogo} no es válido.`);
    }
  }
}
