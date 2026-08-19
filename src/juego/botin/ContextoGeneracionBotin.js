import { crearGeneradorAleatorio } from "../generacion/GeneradorAleatorio.js";

// Dark Moon mantiene actualmente una única partida activa.
//
// El contexto de botín conserva dos secuencias pseudoaleatorias dedicadas y
// separadas de la generación procedural del mapa:
//
// - aleatorioEspecificosBotin decide drops específicos y sus cantidades;
// - aleatorioSeleccionBotin decide tiradas genéricas, marcos y plantillas;
// - aleatorioObjetos decide nivel, rareza, afijos, grados y valores.
//
// Mantenerlas separadas evita que agregar o modificar afijos cambie qué objeto
// fue seleccionado por el motor canónico para una misma semilla.
let contextoActual = null;

// Configura la generación de objetos para el mapa activo.
//
// Cuando en el futuro se cambie de piso, esta misma función deberá ejecutarse
// con la nueva semilla, el nuevo nivel y los mismos contratos validados.
export function configurarContextoGeneracionBotin({
  configuracionBotin,
  configuracionGeneracionObjetos,
  semillaMapa,
  nivelMapa,
} = {}) {
  validarConfiguracionBotin(configuracionBotin);
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
    configuracionBotin,
    configuracionGeneracionObjetos,
    semillaMapa: semillaNormalizada,
    nivelMapa,

    // Secuencia dedicada exclusivamente a drops específicos de la fuente.
    // Agregar o quitar un drop característico no desplaza la secuencia usada
    // por la generación genérica del perfil.
    aleatorioEspecificosBotin: crearGeneradorAleatorio(
      `${semillaNormalizada}:especificos-botin`,
    ),

    // Secuencia dedicada exclusivamente a:
    //
    // - Cantidad de tiradas genéricas.
    // - Éxito de cada tirada genérica.
    // - Marco seleccionado.
    // - Plantilla seleccionada dentro del marco.
    // - Cantidad generada cuando una plantilla la configure.
    aleatorioSeleccionBotin: crearGeneradorAleatorio(
      `${semillaNormalizada}:seleccion-botin`,
    ),

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
// Fallar de forma explícita evita que los drops creen silenciosamente objetos
// sin perfiles, rareza o afijos cuando la configuración no fue conectada.
export function obtenerContextoGeneracionBotin() {
  if (!contextoActual) {
    throw new Error(
      "El contexto de generación de botín todavía no fue configurado.",
    );
  }

  return contextoActual;
}

// Facilita pruebas aisladas y futuros reinicios completos de una partida.
export function limpiarContextoGeneracionBotin() {
  contextoActual = null;
}

function validarConfiguracionBotin(configuracion) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion) ||
    Object.keys(configuracion).length === 0
  ) {
    throw new Error("Se necesita una configuración válida de perfiles de botín.");
  }
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
