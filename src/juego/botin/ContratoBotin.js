import {
  LISTA_MARCOS_BOTIN,
  validarMarcoBotin,
} from "./ValidadorConfiguracionBotin.js";

// Contrato canónico de una solicitud de botín.
//
// Perfil          -> cuánto y con qué pesos generales.
// Marcos          -> qué familias pueden participar.
// Contexto        -> qué candidatos son válidos en esta situación.
// Específicos     -> drops deliberadamente ligados a la fuente.
// Garantizados    -> objetos que deben existir sin tirada de aparición.

export function normalizarSolicitudBotin({
  solicitud,
  perfilesBotin,
  configuracionObjetos,
} = {}) {
  validarObjetoPlano(solicitud, "una solicitud de botín");
  validarObjetoPlano(perfilesBotin, "los perfiles de botín");
  validarObjetoPlano(configuracionObjetos, "el catálogo de objetos");

  const perfil = normalizarId(solicitud.perfil, "perfil de recompensa");
  if (!perfilesBotin[perfil]) {
    throw new Error(`La solicitud referencia el perfil de botín inexistente "${perfil}".`);
  }

  const marcosPermitidos = normalizarListaMarcos(
    solicitud.marcosPermitidos,
    "marcos permitidos",
  );
  const contexto = normalizarContexto(solicitud.contexto ?? {});

  const marcosEfectivos = resolverMarcosEfectivos({
    marcosPermitidos,
    marcosAdicionales: contexto.marcosAdicionales,
    marcosExcluidos: contexto.marcosExcluidos,
  });

  if (marcosEfectivos.length === 0) {
    throw new Error(
      `La solicitud del perfil "${perfil}" no conserva ningún marco de botín válido.`,
    );
  }

  return {
    perfil,
    marcosPermitidos,
    marcosEfectivos,
    contexto,
    especificos: normalizarEspecificos({
      entradas: solicitud.especificos ?? [],
      configuracionObjetos,
    }),
    garantizados: normalizarGarantizados({
      entradas: solicitud.garantizados ?? [],
      configuracionObjetos,
    }),
  };
}

export function resolverMarcosEfectivos({
  marcosPermitidos,
  marcosAdicionales = [],
  marcosExcluidos = [],
} = {}) {
  const permitidos = normalizarListaMarcos(
    marcosPermitidos,
    "marcos permitidos",
  );
  const adicionales = normalizarListaMarcos(
    marcosAdicionales,
    "marcos adicionales",
    { permitirVacia: true },
  );
  const excluidos = new Set(
    normalizarListaMarcos(marcosExcluidos, "marcos excluidos", {
      permitirVacia: true,
    }),
  );

  return [...new Set([...permitidos, ...adicionales])].filter(
    (marco) => !excluidos.has(marco),
  );
}

function normalizarContexto(contexto) {
  validarObjetoPlano(contexto, "el contexto de botín");

  return {
    ...contexto,
    marcosAdicionales: normalizarListaMarcos(
      contexto.marcosAdicionales ?? [],
      "marcos adicionales del contexto",
      { permitirVacia: true },
    ),
    marcosExcluidos: normalizarListaMarcos(
      contexto.marcosExcluidos ?? [],
      "marcos excluidos del contexto",
      { permitirVacia: true },
    ),
    idsPermitidos: normalizarListaIds(contexto.idsPermitidos ?? []),
    idsExcluidos: normalizarListaIds(contexto.idsExcluidos ?? []),
    etiquetasRequeridas: normalizarListaIds(contexto.etiquetasRequeridas ?? []),
    etiquetasExcluidas: normalizarListaIds(contexto.etiquetasExcluidas ?? []),
  };
}

function normalizarEspecificos({ entradas, configuracionObjetos }) {
  if (!Array.isArray(entradas)) {
    throw new Error("Los drops específicos deben estar dentro de una lista.");
  }

  return entradas.map((entrada, indice) => {
    validarObjetoPlano(entrada, `el drop específico ${indice + 1}`);
    const idObjeto = validarIdObjeto(entrada.idObjeto, configuracionObjetos);
    const probabilidad = entrada.probabilidad;

    if (!Number.isFinite(probabilidad) || probabilidad < 0 || probabilidad > 100) {
      throw new Error(
        `La probabilidad del drop específico "${idObjeto}" debe estar entre 0 y 100.`,
      );
    }

    const cantidadMinima = validarCantidad(
      entrada.cantidadMinima ?? 1,
      `cantidad mínima de "${idObjeto}"`,
    );
    const cantidadMaxima = validarCantidad(
      entrada.cantidadMaxima ?? cantidadMinima,
      `cantidad máxima de "${idObjeto}"`,
    );

    if (cantidadMaxima < cantidadMinima) {
      throw new Error(
        `La cantidad máxima de "${idObjeto}" no puede ser menor que la mínima.`,
      );
    }

    return {
      idObjeto,
      probabilidad,
      cantidadMinima,
      cantidadMaxima,
      rarezaForzada: entrada.rarezaForzada ?? null,
    };
  });
}

function normalizarGarantizados({ entradas, configuracionObjetos }) {
  if (!Array.isArray(entradas)) {
    throw new Error("Los drops garantizados deben estar dentro de una lista.");
  }

  return entradas.map((entrada, indice) => {
    validarObjetoPlano(entrada, `el drop garantizado ${indice + 1}`);
    const idObjeto = validarIdObjeto(entrada.idObjeto, configuracionObjetos);

    return {
      idObjeto,
      cantidad: validarCantidad(
        entrada.cantidad ?? 1,
        `cantidad garantizada de "${idObjeto}"`,
      ),
      rarezaForzada: entrada.rarezaForzada ?? null,
    };
  });
}

function normalizarListaMarcos(lista, descripcion, { permitirVacia = false } = {}) {
  if (!Array.isArray(lista)) {
    throw new Error(`Los ${descripcion} deben estar dentro de una lista.`);
  }

  const normalizados = [...new Set(lista.map((marco) => validarMarcoBotin(marco)))];

  if (!permitirVacia && normalizados.length === 0) {
    throw new Error(`La solicitud necesita al menos uno de estos marcos: ${LISTA_MARCOS_BOTIN.join(", ")}.`);
  }

  return normalizados;
}

function normalizarListaIds(lista) {
  if (!Array.isArray(lista)) {
    throw new Error("Los filtros de IDs/etiquetas del contexto deben ser listas.");
  }

  return [...new Set(lista.map((valor) => normalizarId(valor, "identificador")))];
}

function validarIdObjeto(idOriginal, configuracionObjetos) {
  const idObjeto = normalizarId(idOriginal, "ID de objeto");

  if (!configuracionObjetos[idObjeto]) {
    throw new Error(`La solicitud de botín referencia el objeto inexistente "${idObjeto}".`);
  }

  return idObjeto;
}

function validarCantidad(valor, descripcion) {
  if (!Number.isInteger(valor) || valor < 1) {
    throw new Error(`La ${descripcion} debe ser un entero mayor o igual que 1.`);
  }

  return valor;
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita ${descripcion} válida.`);
  }
}

function normalizarId(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`Se necesita un ${descripcion} válido.`);
  }

  return valor.trim().toLowerCase();
}
