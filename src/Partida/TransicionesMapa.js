// Define los destinos generales que puede solicitar
// una interacción de transición de mapa.
//
// La entidad que ofrece la interacción no ejecuta
// directamente el cambio. Solamente construye una solicitud
// que será interpretada por ControladorPartida.
export const TIPOS_TRANSICION_MAPA = Object.freeze({
  NUEVA_EXPEDICION: "nuevaExpedicion",
  REGRESAR_CIUDAD: "regresarCiudad",
  ACTIVAR_MAPA_FIJO: "activarMapaFijo",
});

const TIPOS_TRANSICION_VALIDOS = new Set(Object.values(TIPOS_TRANSICION_MAPA));

// Crea una solicitud simple e independiente
// de la entidad o de la interfaz que la originó.
export function crearSolicitudTransicionMapa({ tipo, datos = {} } = {}) {
  validarTipoTransicion(tipo);
  validarDatosTransicion(datos);

  return {
    tipo,
    datos: {
      ...datos,
    },
  };
}

// Normaliza solicitudes recibidas desde interacciones,
// portales, NPC u objetos consumibles futuros.
export function normalizarSolicitudTransicionMapa(solicitud) {
  if (
    solicitud === null ||
    typeof solicitud !== "object" ||
    Array.isArray(solicitud)
  ) {
    throw new Error("La solicitud de transición de mapa no es válida.");
  }

  return crearSolicitudTransicionMapa({
    tipo: solicitud.tipo,
    datos: solicitud.datos ?? {},
  });
}

function validarTipoTransicion(tipo) {
  if (!TIPOS_TRANSICION_VALIDOS.has(tipo)) {
    throw new Error(`El tipo de transición de mapa "${tipo}" no es válido.`);
  }
}

function validarDatosTransicion(datos) {
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    throw new Error(
      "Los datos de una transición de mapa deben ser un objeto válido.",
    );
  }
}
