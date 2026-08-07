// Contratos de hechos ya resueltos por la lógica canónica.
//
// Estos eventos no calculan reglas, no consumen tiempo y no modifican el
// estado. Solamente conservan información suficiente para que una capa de
// presentación pueda reproducir, en orden, lo que ya ocurrió.
export const TIPOS_EVENTO_ACCION = Object.freeze({
  ENTIDAD_MOVIDA: "entidad_movida",
  ATAQUE_RESUELTO: "ataque_resuelto",
  HABILIDAD_RESUELTA: "habilidad_resuelta",
  HOSTILIDAD_CAMBIADA: "hostilidad_cambiada",
  RECURSOS_RECUPERADOS: "recursos_recuperados",
  NIVEL_AUMENTADO: "nivel_aumentado",
  BOTIN_GENERADO: "botin_generado",
});

export const TIPOS_ACTOR_HABILIDAD = Object.freeze({
  JUGADOR: "jugador",
  ENEMIGO: "enemigo",
  NPC: "npc",
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

export function crearEventoHabilidadResuelta({
  actor,
  tipoActor,
  habilidad,
  grado,
  origenActor = null,
  posicionObjetivo = null,
  objetivoPrimario = null,
  casillasAfectadas = [],
  recorrido = [],
  impactos = [],
  recursosActor = [],
  zonaTemporal = null,
  idEjecucion = null,
} = {}) {
  validarEntidad(actor, "ejecutora de la habilidad");
  if (!Object.values(TIPOS_ACTOR_HABILIDAD).includes(tipoActor)) {
    throw new Error("El evento de habilidad necesita un tipo de actor válido.");
  }
  if (!habilidad || typeof habilidad !== "object" || Array.isArray(habilidad)) {
    throw new Error("El evento de habilidad necesita una habilidad válida.");
  }
  const idHabilidad = normalizarTexto(habilidad.id);
  const nombreHabilidad = normalizarTexto(habilidad.nombre);
  const idMaestria = normalizarTexto(habilidad.maestria);
  const gradoNormalizado = normalizarEnteroPositivo(grado);
  if (idHabilidad === null || nombreHabilidad === null || gradoNormalizado === null) {
    throw new Error("La habilidad resuelta necesita ID, nombre y grado válidos.");
  }

  const origen = origenActor ?? actor;
  validarPosicion(origen, "posición de origen de la habilidad");
  if (posicionObjetivo !== null) {
    validarPosicion(posicionObjetivo, "posición objetivo de la habilidad");
  }
  if (objetivoPrimario !== null) {
    validarEntidad(objetivoPrimario, "objetivo primario de la habilidad");
  }
  if (!Array.isArray(impactos)) {
    throw new Error("Los impactos de habilidad deben ser una lista.");
  }

  return Object.freeze({
    tipo: TIPOS_EVENTO_ACCION.HABILIDAD_RESUELTA,
    actor,
    tipoActor,
    origenActor: copiarPosicion(origen),
    posicionObjetivo: posicionObjetivo
      ? copiarPosicion(posicionObjetivo)
      : null,
    objetivoPrimario,
    posicionObjetivoPrimario: objetivoPrimario
      ? copiarPosicion(objetivoPrimario)
      : null,
    habilidad: Object.freeze({
      id: idHabilidad,
      nombre: nombreHabilidad,
      maestria: idMaestria,
      grado: gradoNormalizado,
      tipoObjetivo: normalizarTexto(habilidad.ejecucion?.tipoObjetivo),
      patronAtaque: normalizarTexto(habilidad.ejecucion?.patronAtaque),
      formaImpacto: copiarValorSimple(habilidad.formaImpacto ?? null),
      zonaTemporal: copiarValorSimple(habilidad.zonaTemporal ?? null),
    }),
    casillasAfectadas: copiarListaPosiciones(casillasAfectadas),
    recorrido: copiarRecorridoHabilidad(recorrido),
    impactos: copiarImpactosHabilidad(impactos),
    recursosActor: copiarCambiosRecursos(recursosActor),
    zonaTemporal: copiarZonaTemporalHabilidad(zonaTemporal),
    idEjecucion: normalizarTexto(idEjecucion),
    ejecucionTemporal: null,
  });
}

export function crearEventoRecursosRecuperados({
  objetivo,
  origen = "consumible",
  fuente = null,
  recursos = [],
} = {}) {
  validarEntidad(objetivo, "con recursos recuperados");
  if (!Array.isArray(recursos) || recursos.length === 0) {
    throw new Error("La recuperación necesita al menos un recurso aplicado.");
  }

  const recursosNormalizados = recursos
    .map((recurso) => copiarRecursoRecuperado(recurso))
    .filter(Boolean);
  if (recursosNormalizados.length === 0) {
    throw new Error("La recuperación necesita cantidades aplicadas válidas.");
  }

  return Object.freeze({
    tipo: TIPOS_EVENTO_ACCION.RECURSOS_RECUPERADOS,
    actor: objetivo,
    objetivo,
    origen: normalizarTexto(origen) ?? "desconocido",
    fuente: copiarDescriptorVisualObjeto(fuente),
    recursos: Object.freeze(recursosNormalizados),
    ejecucionTemporal: null,
  });
}


export function crearEventoBotinGenerado({
  fuente,
  resultadoBotin,
} = {}) {
  validarEntidad(fuente, "fuente de botín");
  if (
    !resultadoBotin ||
    typeof resultadoBotin !== "object" ||
    Array.isArray(resultadoBotin)
  ) {
    throw new Error("El evento de botín necesita un resultado canónico válido.");
  }

  const cantidadUnidades = normalizarEnteroNoNegativo(
    resultadoBotin.cantidadUnidades,
  );
  if (cantidadUnidades === null || cantidadUnidades <= 0 || !resultadoBotin.botin) {
    throw new Error("El evento de botín necesita una recompensa creada o actualizada.");
  }

  validarEntidad(resultadoBotin.botin, "botín generado");
  validarPosicion(resultadoBotin.botin, "posición del botín generado");

  return Object.freeze({
    tipo: TIPOS_EVENTO_ACCION.BOTIN_GENERADO,
    fuente,
    botin: resultadoBotin.botin,
    botinAnterior: resultadoBotin.botinAnterior ?? null,
    posicion: copiarPosicion(resultadoBotin.botin),
    botinCreado: resultadoBotin.botinCreado === true,
    botinActualizado: resultadoBotin.botinActualizado === true,
    cantidadUnidades,
    resumen: Object.freeze(
      Array.isArray(resultadoBotin.resumen)
        ? resultadoBotin.resumen.map((entrada) => Object.freeze({ ...entrada }))
        : [],
    ),
    resumenTexto: normalizarTexto(resultadoBotin.resumenTexto),
    ejecucionTemporal: null,
  });
}

export function crearEventoNivelAumentado({
  jugador,
  nivelAnterior,
  nivelActual,
  nivelesGanados = 1,
} = {}) {
  validarEntidad(jugador, "que aumentó de nivel");
  const anterior = normalizarEnteroPositivo(nivelAnterior);
  const actual = normalizarEnteroPositivo(nivelActual);
  const cantidad = normalizarEnteroPositivo(nivelesGanados);
  if (anterior === null || actual === null || cantidad === null || actual <= anterior) {
    throw new Error("El evento de nivel necesita niveles válidos y crecientes.");
  }

  return Object.freeze({
    tipo: TIPOS_EVENTO_ACCION.NIVEL_AUMENTADO,
    jugador,
    nivelAnterior: anterior,
    nivelActual: actual,
    nivelesGanados: cantidad,
    ejecucionTemporal: null,
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
    case TIPOS_EVENTO_ACCION.HABILIDAD_RESUELTA:
      return evento.actor ?? null;
    case TIPOS_EVENTO_ACCION.HOSTILIDAD_CAMBIADA:
      return evento.enemigo ?? null;
    case TIPOS_EVENTO_ACCION.RECURSOS_RECUPERADOS:
      return evento.actor ?? evento.objetivo ?? null;
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

function copiarImpactosHabilidad(impactos) {
  return Object.freeze(
    impactos.map((impacto, indice) => {
      const objetivo = impacto?.objetivoEntidad ?? null;
      if (objetivo !== null) {
        validarEntidad(objetivo, `objetivo del impacto ${indice + 1}`);
      }
      const posicion = impacto?.posicionObjetivo ?? impacto?.objetivo ?? objetivo;
      const danio = impacto?.danio;
      const vidaAntes = normalizarNumeroOpcional(
        danio?.vidaObjetivoAntes ?? impacto?.vidaObjetivoAntes,
      );
      const vidaDespues = normalizarNumeroOpcional(
        danio?.vidaObjetivoDespues ?? impacto?.vidaObjetivoDespues,
      );
      const vidaMaxima = normalizarNumeroOpcional(
        danio?.vidaObjetivoMaxima ?? impacto?.vidaObjetivoMaxima,
      );

      return Object.freeze({
        objetivo,
        posicionObjetivo: posicion && Number.isInteger(posicion.x) && Number.isInteger(posicion.y)
          ? copiarPosicion(posicion)
          : null,
        idEjecucion: normalizarTexto(impacto?.idEjecucion),
        orden: normalizarEnteroNoNegativo(impacto?.orden),
        multiplicadorDanio: Number.isFinite(impacto?.multiplicadorDanio)
          ? impacto.multiplicadorDanio
          : 1,
        impacto: impacto?.impacto === true,
        critico: impacto?.critico === true,
        objetivoDerrotado: impacto?.objetivoDerrotado === true,
        danio: Object.freeze({
          cantidad: normalizarNumeroNoNegativo(
            danio?.danio ?? danio?.danioFinal ?? impacto?.cantidadDanio,
          ),
          vidaObjetivoAntes: vidaAntes,
          vidaObjetivoDespues: vidaDespues,
          vidaObjetivoMaxima: vidaMaxima,
          componentes: copiarValorSimple(
            danio?.componentesDanio ?? danio?.componentes ?? [],
          ),
        }),
        efectos: copiarValorSimple(
          Array.isArray(impacto?.efectos)
            ? impacto.efectos.map(({ eventos: _eventos, ...efecto }) => efecto)
            : [],
        ),
        recursosObjetivo: copiarCambiosRecursos(
          impacto?.recursosObjetivo ?? [],
        ),
      });
    }),
  );
}

function copiarListaPosiciones(lista) {
  if (!Array.isArray(lista)) {
    throw new Error("Las casillas de habilidad deben ser una lista.");
  }
  return Object.freeze(
    lista.map((posicion, indice) => {
      validarPosicion(posicion, `casilla afectada ${indice + 1}`);
      return copiarPosicion(posicion);
    }),
  );
}

function copiarRecorridoHabilidad(lista) {
  if (!Array.isArray(lista)) {
    throw new Error("El recorrido de habilidad debe ser una lista.");
  }
  return Object.freeze(
    lista.map((paso, indice) => {
      validarPosicion(paso, `paso de recorrido ${indice + 1}`);
      return Object.freeze({
        x: paso.x,
        y: paso.y,
        orden: normalizarEnteroNoNegativo(paso.orden ?? indice),
      });
    }),
  );
}

function copiarZonaTemporalHabilidad(zona) {
  if (zona === null || zona === undefined) return null;
  if (typeof zona !== "object" || Array.isArray(zona)) {
    throw new Error("La zona producida por una habilidad debe ser un objeto válido.");
  }

  return Object.freeze({
    id: normalizarTexto(zona.id),
    idHabilidad: normalizarTexto(zona.idHabilidad),
    nombre: normalizarTexto(zona.nombre),
    grado: normalizarEnteroPositivo(zona.grado),
    casillas: copiarListaPosiciones(zona.casillas ?? []),
    apariencia: normalizarTexto(zona.apariencia),
    creadaEn: normalizarNumeroOpcional(zona.creadaEn),
    venceEn: normalizarNumeroOpcional(zona.venceEn),
    proximaActivacion: normalizarNumeroOpcional(zona.proximaActivacion),
  });
}

function copiarCambiosRecursos(recursos) {
  if (!Array.isArray(recursos)) {
    throw new Error("Los cambios de recursos deben ser una lista.");
  }
  return Object.freeze(
    recursos.map((recurso) => Object.freeze({
      recurso: normalizarTexto(recurso?.recurso) ?? "desconocido",
      valorAntes: normalizarNumeroNoNegativo(recurso?.valorAntes),
      valorDespues: normalizarNumeroNoNegativo(recurso?.valorDespues),
      valorMaximo: normalizarNumeroOpcional(recurso?.valorMaximo),
      cantidadReal: normalizarNumeroNoNegativo(
        recurso?.cantidadReal ?? recurso?.cantidadAplicada ?? recurso?.cantidad,
      ),
      tipoCambio: normalizarTexto(recurso?.tipoCambio) ?? "desconocido",
    })),
  );
}

function copiarValorSimple(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) {
    return Object.freeze(valor.map((item) => copiarValorSimple(item)));
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => [
        clave,
        copiarValorSimple(contenido),
      ]),
    ),
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

function copiarDescriptorVisualObjeto(descriptor) {
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) {
    return null;
  }
  const idObjeto = normalizarTexto(descriptor.idObjeto ?? descriptor.id);
  const recursoVisual = normalizarTexto(descriptor.recursoVisual);
  if (idObjeto === null || recursoVisual === null) return null;
  return Object.freeze({
    idObjeto,
    nombre: normalizarTexto(descriptor.nombre),
    recursoVisual,
  });
}

function copiarRecursoRecuperado(recurso) {
  if (!recurso || typeof recurso !== "object" || Array.isArray(recurso)) {
    return null;
  }
  const idRecurso = normalizarTexto(recurso.recurso);
  const cantidadAplicada = normalizarNumeroNoNegativo(recurso.cantidadAplicada);
  const valorAntes = normalizarNumeroNoNegativo(recurso.valorAntes);
  const valorDespues = normalizarNumeroNoNegativo(recurso.valorDespues);
  const valorMaximo = normalizarNumeroNoNegativo(recurso.valorMaximo);
  if (idRecurso === null || cantidadAplicada <= 0 || valorMaximo <= 0) {
    return null;
  }
  return Object.freeze({
    recurso: idRecurso,
    cantidadAplicada,
    valorAntes,
    valorDespues,
    valorMaximo,
    proporcionRecuperada: Math.min(1, cantidadAplicada / valorMaximo),
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

function normalizarNumeroOpcional(valor) {
  return Number.isFinite(valor) ? Math.max(0, valor) : null;
}

function normalizarEnteroNoNegativo(valor) {
  return Number.isInteger(valor) ? Math.max(0, valor) : 0;
}

function normalizarEnteroPositivo(valor) {
  return Number.isInteger(valor) && valor > 0 ? valor : null;
}
