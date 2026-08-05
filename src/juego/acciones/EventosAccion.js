// Contratos de hechos ya resueltos por la lógica canónica.
//
// Estos eventos no calculan reglas, no consumen tiempo y no modifican el
// estado. Solamente conservan información suficiente para que una capa de
// presentación pueda reproducir, en orden, lo que ya ocurrió.
export const TIPOS_EVENTO_ACCION = Object.freeze({
  ENTIDAD_MOVIDA: "entidad_movida",
  ATAQUE_RESUELTO: "ataque_resuelto",
  HOSTILIDAD_CAMBIADA: "hostilidad_cambiada",
});

export const ESTADOS_HOSTILIDAD_ACCION = Object.freeze({
  PASIVO: "pasivo",
  AGRESIVO: "agresivo",
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
  configuracionAtaque = null,
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
  const estadoObjetivoFinal = copiarEstadoObjetivoFinal(objetivo);

  return Object.freeze({
    tipo: TIPOS_EVENTO_ACCION.ATAQUE_RESUELTO,
    atacante,
    objetivo,
    origenAtacante: copiarPosicion(atacante),
    posicionObjetivo: posicionFinalObjetivo
      ? copiarPosicion(posicionFinalObjetivo)
      : null,
    configuracionAtaque: copiarConfiguracionAtaque(configuracionAtaque),
    ejecucionTemporal: null,
    estadoObjetivoFinal,
    resultado: copiarResultadoAtaque(resultado, estadoObjetivoFinal),
  });
}

export function crearEventoHostilidadCambiada({
  enemigo,
  estadoAnterior,
  estadoActual,
  motivo = null,
} = {}) {
  validarEntidad(enemigo, "enemigo con cambio de hostilidad");
  validarEstadoHostilidad(estadoAnterior, "anterior");
  validarEstadoHostilidad(estadoActual, "actual");

  if (estadoAnterior === estadoActual) {
    throw new Error("El cambio de hostilidad necesita estados diferentes.");
  }

  return Object.freeze({
    tipo: TIPOS_EVENTO_ACCION.HOSTILIDAD_CAMBIADA,
    enemigo,
    estadoAnterior,
    estadoActual,
    motivo: normalizarTexto(motivo),
    ejecucionTemporal: null,
  });
}

export function asociarEjecucionTemporalAEventos({
  eventos = [],
  actor,
  ejecucionTemporal,
} = {}) {
  if (!Array.isArray(eventos)) {
    throw new Error("La asociación temporal necesita una lista de eventos.");
  }
  if (!actor || typeof actor !== "object") {
    throw new Error("La asociación temporal necesita un actor válido.");
  }
  if (
    !ejecucionTemporal ||
    typeof ejecucionTemporal !== "object" ||
    ejecucionTemporal.actor !== actor
  ) {
    throw new Error(
      "La ejecución temporal debe pertenecer al actor de la acción.",
    );
  }

  const copiaEjecucion = copiarEjecucionTemporal(ejecucionTemporal);

  return eventos.map((evento) => {
    if (obtenerActorPrincipalEvento(evento) !== actor) {
      return evento;
    }

    return Object.freeze({
      ...evento,
      ejecucionTemporal: copiaEjecucion,
    });
  });
}

function obtenerActorPrincipalEvento(evento) {
  switch (evento?.tipo) {
    case TIPOS_EVENTO_ACCION.ENTIDAD_MOVIDA:
      return evento.entidad ?? null;
    case TIPOS_EVENTO_ACCION.ATAQUE_RESUELTO:
      return evento.atacante ?? null;
    case TIPOS_EVENTO_ACCION.HOSTILIDAD_CAMBIADA:
      return evento.enemigo ?? null;
    default:
      return evento?.actor ?? null;
  }
}

function validarEstadoHostilidad(estado, descripcion) {
  const estadosValidos = Object.values(ESTADOS_HOSTILIDAD_ACCION);
  if (!estadosValidos.includes(estado)) {
    throw new Error(`El estado de hostilidad ${descripcion} no es válido.`);
  }
}

function copiarEjecucionTemporal(ejecucionTemporal) {
  const tipoAccion = normalizarTexto(ejecucionTemporal.tipoAccion);
  const costoBase = normalizarEnteroPositivo(ejecucionTemporal.costoBase);
  const costoFinal = normalizarEnteroPositivo(ejecucionTemporal.costoFinal);
  const inicioAccion = normalizarEnteroNoNegativo(
    ejecucionTemporal.inicioAccion,
  );
  const proximoTurno = normalizarEnteroNoNegativo(
    ejecucionTemporal.proximoTurno,
  );

  if (tipoAccion === null || costoBase === null || costoFinal === null) {
    throw new Error(
      "La ejecución temporal necesita tipo de acción y costos válidos.",
    );
  }

  return Object.freeze({
    tipoAccion,
    costoBase,
    costoFinal,
    inicioAccion,
    proximoTurno,
  });
}

function copiarResultadoAtaque(resultado, estadoObjetivoFinal) {
  const golpes = copiarGolpes(resultado.golpes, estadoObjetivoFinal);

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
    municionUtilizada: copiarDescriptorRecursoObjeto(resultado.municionUtilizada),
    golpes,
  });
}

function copiarGolpes(golpes, estadoObjetivoFinal) {
  if (!Array.isArray(golpes)) {
    return Object.freeze([]);
  }

  const golpesNormalizados = golpes.map((golpe) => ({
    nombreFuente:
      typeof golpe?.nombreFuente === "string" ? golpe.nombreFuente : null,
    mano: typeof golpe?.mano === "string" ? golpe.mano : null,
    impacto: golpe?.impacto === true,
    bloqueado: golpe?.bloqueado === true,
    critico: golpe?.critico === true,
    danio: normalizarNumeroNoNegativo(golpe?.danio),
  }));

  const vidaFinal = estadoObjetivoFinal?.vidaActual;
  const vidaMaxima = estadoObjetivoFinal?.vidaMaxima;
  const puedeReconstruirVida =
    Number.isFinite(vidaFinal) && Number.isFinite(vidaMaxima) && vidaMaxima > 0;
  const danioTotal = golpesNormalizados.reduce(
    (total, golpe) => total + golpe.danio,
    0,
  );
  const vidaInicial = puedeReconstruirVida
    ? Math.min(vidaMaxima, Math.max(0, vidaFinal + danioTotal))
    : null;
  let danioAcumulado = 0;

  return Object.freeze(
    golpesNormalizados.map((golpe) => {
      const vidaObjetivoAntes = puedeReconstruirVida
        ? Math.max(0, vidaInicial - danioAcumulado)
        : null;
      danioAcumulado += golpe.danio;
      const vidaObjetivoDespues = puedeReconstruirVida
        ? Math.max(0, vidaInicial - danioAcumulado)
        : null;

      return Object.freeze({
        ...golpe,
        vidaObjetivoAntes,
        vidaObjetivoDespues,
        vidaObjetivoMaxima: puedeReconstruirVida ? vidaMaxima : null,
      });
    }),
  );
}

function copiarConfiguracionAtaque(configuracion) {
  if (
    !configuracion ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    return null;
  }

  const propiedades = configuracion.propiedadesControladoras ?? {};
  const fuentes = Array.isArray(configuracion.fuentesDanio)
    ? configuracion.fuentesDanio.map((fuente) => {
        const propiedadesFuente = fuente?.propiedades ?? {};
        return Object.freeze({
          nombreFuente:
            typeof fuente?.nombre === "string" ? fuente.nombre : null,
          mano: typeof fuente?.mano === "string" ? fuente.mano : null,
          idObjeto: normalizarTexto(fuente?.objeto?.id),
          recursoVisual: normalizarTexto(fuente?.objeto?.recursoVisual),
          familiaObjeto: normalizarTexto(fuente?.objeto?.familiaObjeto),
          esAtaqueNatural: fuente?.objeto === null,
          tipoAtaque: normalizarTexto(propiedadesFuente.tipoAtaque),
          patronAtaque: normalizarTexto(propiedadesFuente.patronAtaque),
          alcance: normalizarEnteroPositivo(propiedadesFuente.alcance),
          tipoMunicion: normalizarTexto(propiedadesFuente.tipoMunicion),
          elementoAtaqueBasico: normalizarTexto(
            propiedadesFuente.elementoAtaqueBasico,
          ),
        });
      })
    : [];

  return Object.freeze({
    origen: normalizarTexto(configuracion.origen),
    tipoAtaque: normalizarTexto(propiedades.tipoAtaque),
    patronAtaque: normalizarTexto(propiedades.patronAtaque),
    alcance: normalizarEnteroPositivo(propiedades.alcance),
    tipoMunicion: normalizarTexto(configuracion.tipoMunicion),
    esAtaqueDual: configuracion.esAtaqueDual === true,
    cantidadGolpes: normalizarEnteroNoNegativo(configuracion.cantidadGolpes),
    fuentes: Object.freeze(fuentes),
  });
}

function copiarDescriptorRecursoObjeto(descriptor) {
  if (
    !descriptor ||
    typeof descriptor !== "object" ||
    Array.isArray(descriptor)
  ) {
    return null;
  }
  const idObjeto = normalizarTexto(descriptor.idObjeto);
  const recursoVisual = normalizarTexto(descriptor.recursoVisual);
  if (idObjeto === null || recursoVisual === null) return null;
  return Object.freeze({
    idObjeto,
    tipoMunicion: normalizarTexto(descriptor.tipoMunicion),
    recursoVisual,
  });
}

function copiarEstadoObjetivoFinal(objetivo) {
  if (!objetivo || typeof objetivo !== "object") {
    return null;
  }

  const vidaActual = Number.isFinite(objetivo.vidaActual)
    ? Math.max(0, objetivo.vidaActual)
    : null;
  const vidaMaxima = Number.isFinite(objetivo.vidaMaxima)
    ? Math.max(0, objetivo.vidaMaxima)
    : null;

  if (vidaActual === null && vidaMaxima === null) {
    return null;
  }

  return Object.freeze({
    vidaActual,
    vidaMaxima,
    destruido:
      objetivo.estaDestruido === true || objetivo.estaVivo === false,
  });
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

function normalizarTexto(valor) {
  return typeof valor === "string" && valor.trim() !== ""
    ? valor
    : null;
}

function normalizarNumeroNoNegativo(valor) {
  return Number.isFinite(valor) ? Math.max(0, valor) : 0;
}

function normalizarEnteroNoNegativo(valor) {
  return Number.isInteger(valor) ? Math.max(0, valor) : 0;
}

function normalizarEnteroPositivo(valor) {
  return Number.isInteger(valor) && valor > 0 ? valor : null;
}
