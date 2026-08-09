const CONFIGURACION_PREDETERMINADA = Object.freeze({
  campoVisible: false,
  descubrimiento: false,
});

// Normaliza la configuración del mapa sin introducir radio de visión. El
// alcance pertenece exclusivamente a la Percepción actual del jugador.
export function normalizarConfiguracionVisibilidad(configuracion = null) {
  if (configuracion === null || configuracion === undefined) {
    return { ...CONFIGURACION_PREDETERMINADA };
  }

  if (typeof configuracion !== "object" || Array.isArray(configuracion)) {
    throw new Error("La configuración de visibilidad del mapa no es válida.");
  }

  const campoVisible = configuracion.campoVisible ?? false;
  const descubrimiento = configuracion.descubrimiento ?? false;

  if (typeof campoVisible !== "boolean") {
    throw new Error('"campoVisible" debe ser verdadero o falso.');
  }
  if (typeof descubrimiento !== "boolean") {
    throw new Error('"descubrimiento" debe ser verdadero o falso.');
  }

  return {
    campoVisible,
    descubrimiento,
  };
}
