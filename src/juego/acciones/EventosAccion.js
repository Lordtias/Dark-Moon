// Contratos de hechos ya resueltos por la lógica canónica.
//
// Estos eventos no calculan reglas, no consumen tiempo y no modifican el
// estado. Solamente conservan información suficiente para que una capa de
// presentación pueda reproducir, en orden, lo que ya ocurrió.
export const TIPOS_EVENTO_ACCION = Object.freeze({
  ENTIDAD_MOVIDA: "entidad_movida",
  ATAQUE_RESUELTO: "ataque_resuelto",
});

export function crearEventoEntidadMovida({
  entidad,
  origen,
  destino,
} = {}) {
  validarEntidad(entidad, "movida");
  validarPosicion(origen, "origen del movimiento");
  validarPosicion(destino, "destino del movimiento");

  return Object.freeze({
    tipo: TIPOS_EVENTO_ACCION.ENTIDAD_MOVIDA,
    entidad,
    origen: copiarPosicion(origen),
    destino: copiarPosicion(destino),
  });
}

export function crearEventoAtaqueResuelto({
  atacante,
  objetivo = null,
  posicionObjetivo = null,
  resultado,
} = {}) {
  validarEntidad(atacante, "atacante");

  if (objetivo !== null) {
    validarEntidad(objetivo, "objetivo del ataque");
  }

  if (posicionObjetivo !== null) {
    validarPosicion(posicionObjetivo, "posición objetivo del ataque");
  }

  if (!resultado || typeof resultado !== "object" || Array.isArray(resultado)) {
    throw new Error("El evento de ataque necesita un resultado canónico válido.");
  }

  const posicionFinalObjetivo = posicionObjetivo ??
    (objetivo && Number.isInteger(objetivo.x) && Number.isInteger(objetivo.y)
      ? { x: objetivo.x, y: objetivo.y }
      : null);

  return Object.freeze({
    tipo: TIPOS_EVENTO_ACCION.ATAQUE_RESUELTO,
    atacante,
    objetivo,
    origenAtacante: copiarPosicion(atacante),
    posicionObjetivo: posicionFinalObjetivo
      ? copiarPosicion(posicionFinalObjetivo)
      : null,
    resultado: copiarResultadoAtaque(resultado),
  });
}

function copiarResultadoAtaque(resultado) {
  return Object.freeze({
    impacto: resultado.impacto === true,
    bloqueado: resultado.bloqueado === true,
    critico: resultado.critico === true,
    danio: normalizarNumeroNoNegativo(resultado.danio),
    objetivoDestruido: resultado.objetivoDestruido === true,
    esAtaqueDual: resultado.esAtaqueDual === true,
    golpesProgramados: normalizarEnteroNoNegativo(
      resultado.golpesProgramados,
    ),
    golpesRealizados: normalizarEnteroNoNegativo(resultado.golpesRealizados),
    golpes: copiarGolpes(resultado.golpes),
  });
}

function copiarGolpes(golpes) {
  if (!Array.isArray(golpes)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    golpes.map((golpe) =>
      Object.freeze({
        nombreFuente:
          typeof golpe?.nombreFuente === "string" ? golpe.nombreFuente : null,
        mano: typeof golpe?.mano === "string" ? golpe.mano : null,
        impacto: golpe?.impacto === true,
        bloqueado: golpe?.bloqueado === true,
        critico: golpe?.critico === true,
        danio: normalizarNumeroNoNegativo(golpe?.danio),
      }),
    ),
  );
}

function copiarPosicion(posicion) {
  return Object.freeze({ x: posicion.x, y: posicion.y });
}

function validarEntidad(entidad, descripcion) {
  if (!entidad || typeof entidad !== "object") {
    throw new Error(`El evento necesita una entidad ${descripcion} válida.`);
  }

  validarPosicion(entidad, `posición de la entidad ${descripcion}`);
}

function validarPosicion(posicion, descripcion) {
  if (!Number.isInteger(posicion?.x) || !Number.isInteger(posicion?.y)) {
    throw new Error(`La ${descripcion} debe utilizar coordenadas enteras.`);
  }
}

function normalizarNumeroNoNegativo(valor) {
  return Number.isFinite(valor) ? Math.max(0, valor) : 0;
}

function normalizarEnteroNoNegativo(valor) {
  return Number.isInteger(valor) ? Math.max(0, valor) : 0;
}
