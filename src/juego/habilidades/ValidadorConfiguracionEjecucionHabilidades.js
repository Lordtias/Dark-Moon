const TIPOS_OBJETIVO = Object.freeze(["enemigo", "casilla", "propio"]);
const PATRONES_PERMITIDOS = Object.freeze(["adyacente", "lineal", "libre"]);
const TIPOS_EFECTO = Object.freeze(["danio_periodico"]);
const REGLAS_ACUMULACION = Object.freeze(["renovar", "reemplazar", "independiente"]);

// Valida únicamente los datos jugables de ETAPA 5. La progresión continúa
// validándose y normalizándose en ValidadorConfiguracionProgresoMagico.
export function validarConfiguracionEjecucionHabilidades(
  configuracionHabilidades,
) {
  validarObjeto(configuracionHabilidades, "la configuración de habilidades");
  validarEnteroPositivo(configuracionHabilidades.version, "la versión");
  validarObjeto(configuracionHabilidades.habilidades, "el catálogo de habilidades");

  const habilidades = {};

  for (const [idOriginal, definicionOriginal] of Object.entries(
    configuracionHabilidades.habilidades,
  )) {
    const id = normalizarId(idOriginal);
    validarObjeto(definicionOriginal, `la habilidad "${id}"`);

    const gradoMaximo = definicionOriginal.gradoMaximo;
    validarEnteroPositivo(gradoMaximo, `el grado máximo de "${id}"`);

    const icono = normalizarIcono(definicionOriginal.icono, id);
    const descripcion = normalizarTextoOpcional(definicionOriginal.descripcion);
    const ejecucion = definicionOriginal.ejecucion
      ? normalizarEjecucion({
          idHabilidad: id,
          gradoMaximo,
          ejecucion: definicionOriginal.ejecucion,
        })
      : null;

    habilidades[id] = {
      id,
      nombre: normalizarTexto(definicionOriginal.nombre, `nombre de "${id}"`),
      maestria: normalizarId(definicionOriginal.maestria),
      requisitoNivelMaestria: definicionOriginal.requisitoNivelMaestria,
      gradoMaximo,
      icono,
      descripcion,
      ejecucion,
    };
  }

  return congelarProfundamente({
    version: configuracionHabilidades.version,
    habilidades,
  });
}

function normalizarEjecucion({ idHabilidad, gradoMaximo, ejecucion }) {
  validarObjeto(ejecucion, `la ejecución de "${idHabilidad}"`);

  const tipoObjetivo = normalizarId(ejecucion.tipoObjetivo);
  if (!TIPOS_OBJETIVO.includes(tipoObjetivo)) {
    throw new Error(
      `La habilidad "${idHabilidad}" usa el tipo de objetivo desconocido "${tipoObjetivo}".`,
    );
  }

  const patronAtaque = normalizarId(ejecucion.patronAtaque);
  if (!PATRONES_PERMITIDOS.includes(patronAtaque)) {
    throw new Error(
      `La habilidad "${idHabilidad}" usa el patrón desconocido "${patronAtaque}".`,
    );
  }

  if (typeof ejecucion.requiereLineaVision !== "boolean") {
    throw new Error(
      `La habilidad "${idHabilidad}" debe declarar requiereLineaVision como booleano.`,
    );
  }

  if (typeof ejecucion.hostil !== "boolean") {
    throw new Error(
      `La habilidad "${idHabilidad}" debe declarar hostil como booleano.`,
    );
  }

  validarObjeto(ejecucion.grados, `los grados de "${idHabilidad}"`);
  const grados = {};

  for (let grado = 1; grado <= gradoMaximo; grado += 1) {
    const definicionGrado = ejecucion.grados[String(grado)];
    validarObjeto(
      definicionGrado,
      `la ejecución de "${idHabilidad}" en grado ${grado}`,
    );

    validarEnteroPositivo(
      definicionGrado.costoMana,
      `el coste de Maná de "${idHabilidad}" grado ${grado}`,
    );
    validarNumeroPositivo(
      definicionGrado.costoTemporalBase,
      `el coste temporal de "${idHabilidad}" grado ${grado}`,
    );
    validarEnteroPositivo(
      definicionGrado.alcance,
      `el alcance de "${idHabilidad}" grado ${grado}`,
    );

    const danio = normalizarDanio(
      definicionGrado.danio,
      idHabilidad,
      grado,
    );
    const efectos = normalizarEfectos(
      definicionGrado.efectos,
      idHabilidad,
      grado,
    );

    if (danio.length === 0 && efectos.length === 0) {
      throw new Error(
        `La habilidad "${idHabilidad}" grado ${grado} no posee daño ni efectos.`,
      );
    }

    grados[grado] = {
      costoMana: definicionGrado.costoMana,
      costoTemporalBase: definicionGrado.costoTemporalBase,
      alcance: definicionGrado.alcance,
      danio,
      efectos,
    };
  }

  const gradosRecibidos = Object.keys(ejecucion.grados);
  if (gradosRecibidos.length !== gradoMaximo) {
    throw new Error(
      `La habilidad "${idHabilidad}" debe definir exactamente ${gradoMaximo} grados jugables.`,
    );
  }

  return {
    tipoObjetivo,
    patronAtaque,
    requiereLineaVision: ejecucion.requiereLineaVision,
    hostil: ejecucion.hostil,
    grados,
  };
}

function normalizarDanio(componentes, idHabilidad, grado) {
  if (componentes === undefined) {
    return [];
  }
  if (!Array.isArray(componentes)) {
    throw new Error(
      `El daño de "${idHabilidad}" grado ${grado} debe ser un arreglo.`,
    );
  }

  return componentes.map((componente, indice) => {
    validarObjeto(
      componente,
      `el componente ${indice + 1} de "${idHabilidad}" grado ${grado}`,
    );
    validarEnteroNoNegativo(
      componente.valorBase,
      `el daño base de "${idHabilidad}" grado ${grado}`,
    );

    return {
      tipo: normalizarId(componente.tipo),
      valorBase: componente.valorBase,
    };
  });
}

function normalizarEfectos(efectos, idHabilidad, grado) {
  if (efectos === undefined) {
    return [];
  }
  if (!Array.isArray(efectos)) {
    throw new Error(
      `Los efectos de "${idHabilidad}" grado ${grado} deben ser un arreglo.`,
    );
  }

  return efectos.map((efecto, indice) => {
    validarObjeto(
      efecto,
      `el efecto ${indice + 1} de "${idHabilidad}" grado ${grado}`,
    );

    const tipo = normalizarId(efecto.tipo);
    if (!TIPOS_EFECTO.includes(tipo)) {
      throw new Error(
        `El efecto "${efecto.id}" usa el tipo desconocido "${tipo}".`,
      );
    }

    const reglaAcumulacion = normalizarId(efecto.reglaAcumulacion);
    if (!REGLAS_ACUMULACION.includes(reglaAcumulacion)) {
      throw new Error(
        `El efecto "${efecto.id}" usa la acumulación desconocida "${reglaAcumulacion}".`,
      );
    }

    validarEnteroPositivo(efecto.potenciaBase, `la potencia de "${efecto.id}"`);
    validarEnteroPositivo(efecto.duracion, `la duración de "${efecto.id}"`);
    validarEnteroPositivo(efecto.intervalo, `el intervalo de "${efecto.id}"`);

    if (efecto.duracion < efecto.intervalo) {
      throw new Error(
        `La duración de "${efecto.id}" no puede ser menor que su intervalo.`,
      );
    }

    return {
      id: normalizarId(efecto.id),
      tipo,
      tipoDanio: normalizarId(efecto.tipoDanio),
      potenciaBase: efecto.potenciaBase,
      duracion: efecto.duracion,
      intervalo: efecto.intervalo,
      reglaAcumulacion,
    };
  });
}

function normalizarIcono(icono, idHabilidad) {
  if (icono === null || icono === undefined || icono === "") {
    return null;
  }
  const ruta = normalizarTexto(icono, `icono de "${idHabilidad}"`);
  if (!ruta.toLowerCase().endsWith(".png")) {
    throw new Error(`El icono de "${idHabilidad}" debe ser un archivo PNG.`);
  }
  if (ruta.includes("..") || ruta.startsWith("/") || ruta.includes(":")) {
    throw new Error(
      `El icono de "${idHabilidad}" debe usar una ruta relativa segura.`,
    );
  }
  return ruta;
}

function normalizarTextoOpcional(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "";
  }
  return normalizarTexto(valor, "el texto opcional");
}

function normalizarTexto(valor, etiqueta) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`Debe definirse ${etiqueta}.`);
  }
  return valor.trim();
}

function normalizarId(valor) {
  return normalizarTexto(valor, "un identificador").trim().toLowerCase();
}

function validarObjeto(valor, etiqueta) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Debe definirse ${etiqueta} como un objeto.`);
  }
}

function validarEnteroPositivo(valor, etiqueta) {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`${etiqueta} debe ser un entero mayor que 0.`);
  }
}

function validarEnteroNoNegativo(valor, etiqueta) {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error(`${etiqueta} debe ser un entero mayor o igual que 0.`);
  }
}

function validarNumeroPositivo(valor, etiqueta) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${etiqueta} debe ser un número mayor que 0.`);
  }
}

function congelarProfundamente(valor) {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor)) {
    return valor;
  }
  for (const elemento of Object.values(valor)) {
    congelarProfundamente(elemento);
  }
  return Object.freeze(valor);
}
