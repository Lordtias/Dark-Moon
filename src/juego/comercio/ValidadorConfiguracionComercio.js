const CATEGORIAS_ARMADURA_VALIDAS = new Set(["ligera", "media", "pesada"]);

const CAMPOS_FILTRO_LISTA = Object.freeze([
  "tipos",
  "familias",
  "categoriasArmadura",
  "etiquetasRequeridas",
  "etiquetasExcluidas",
  "idsIncluidos",
  "idsExcluidos",
  "familiasExcluidas",
]);

// Valida las reglas económicas generales y los perfiles
// utilizados por cada mercader.
//
// Los nombres de las operaciones se interpretan siempre
// desde la perspectiva del jugador:
//
// - Compra: el jugador compra al mercader.
// - Venta: el jugador vende al mercader.
export function validarConfiguracionComercio(configuracion) {
  validarObjetoRaiz(configuracion, "la configuración de comercio");

  validarReglasPrecios(configuracion.reglasPrecios);

  validarMercaderes({
    mercaderes: configuracion.mercaderes,
    reglasPrecios: configuracion.reglasPrecios,
  });

  return configuracion;
}

function validarReglasPrecios(reglasPrecios) {
  validarObjetoConfiguracion({
    valor: reglasPrecios,
    descripcion: "Las reglas generales de precios",
  });

  if (
    !Number.isInteger(reglasPrecios.carismaReferencia) ||
    reglasPrecios.carismaReferencia < 0
  ) {
    throw new Error(
      "El Carisma de referencia debe ser un entero igual o mayor que 0.",
    );
  }

  validarNumeroPositivo({
    valor: reglasPrecios.variacionPorPuntoCarisma,
    descripcion: "La variación por punto de Carisma",
  });

  validarNumeroNoNegativo({
    valor: reglasPrecios.variacionMaximaCarisma,
    descripcion: "La variación máxima por Carisma",
  });

  if (reglasPrecios.variacionMaximaCarisma >= 1) {
    throw new Error("La variación máxima por Carisma debe ser menor que 1.");
  }

  if (
    !Number.isSafeInteger(reglasPrecios.precioMinimo) ||
    reglasPrecios.precioMinimo < 0
  ) {
    throw new Error("El precio mínimo debe ser un entero igual o mayor que 0.");
  }
}

function validarMercaderes({ mercaderes, reglasPrecios }) {
  validarObjetoRaiz(mercaderes, "el catálogo de mercaderes");

  const entradas = Object.entries(mercaderes);

  if (entradas.length === 0) {
    throw new Error(
      "La configuración de comercio necesita al menos un mercader.",
    );
  }

  for (const [idMercader, mercader] of entradas) {
    validarIdConfiguracion({
      id: idMercader,
      descripcion: "mercader",
    });

    validarObjetoConfiguracion({
      valor: mercader,
      descripcion: `El mercader "${idMercader}"`,
    });

    validarTexto(mercader.nombre, `nombre del mercader "${idMercader}"`);

    validarNumeroPositivo({
      valor: mercader.multiplicadorCompraJugador,
      descripcion: `El multiplicador de compra de "${idMercader}"`,
    });

    validarNumeroPositivo({
      valor: mercader.multiplicadorVentaJugador,
      descripcion: `El multiplicador de venta de "${idMercader}"`,
    });

    validarMargenesMercader({
      idMercader,
      mercader,
      reglasPrecios,
    });

    validarStockMercader({
      idMercader,
      stock: mercader.stock,
    });
  }
}

// Comprueba el caso más favorable posible para el jugador.
//
// Incluso con el máximo beneficio de Carisma, vender un
// objeto al mercader no debe entregar más oro que volver
// a comprar ese mismo objeto.
function validarMargenesMercader({ idMercader, mercader, reglasPrecios }) {
  const variacionMaxima = reglasPrecios.variacionMaximaCarisma;

  const factorCompraMinimo = 1 - variacionMaxima;
  const factorVentaMaximo = 1 + variacionMaxima;

  const costoCompraMinimo =
    mercader.multiplicadorCompraJugador * factorCompraMinimo;

  const ingresoVentaMaximo =
    mercader.multiplicadorVentaJugador * factorVentaMaximo;

  if (ingresoVentaMaximo > costoCompraMinimo) {
    throw new Error(
      `Los márgenes de "${idMercader}" permiten ` +
        "comprar y revender objetos con ganancia.",
    );
  }
}

function validarStockMercader({ idMercader, stock }) {
  validarObjetoConfiguracion({
    valor: stock,
    descripcion: `El stock de "${idMercader}"`,
  });

  if (!Number.isInteger(stock.capacidad) || stock.capacidad <= 0) {
    throw new Error(
      `La capacidad del stock de "${idMercader}" ` +
        "debe ser un entero mayor que 0.",
    );
  }

  validarNivelStock({
    idMercader,
    nivelObjeto: stock.nivelObjeto,
  });

  const cantidadFija = validarStockFijo({
    idMercader,
    definiciones: stock.fijo,
  });

  const resumenAleatorio = validarStockAleatorio({
    idMercader,
    configuracionAleatoria: stock.aleatorio,
  });

  const espaciosGenerados = cantidadFija + resumenAleatorio.cantidad;

  if (espaciosGenerados > stock.capacidad) {
    throw new Error(
      `El stock configurado de "${idMercader}" ocupa ` +
        `${espaciosGenerados} espacios, pero su capacidad es ` +
        `${stock.capacidad}.`,
    );
  }
}

function validarNivelStock({ idMercader, nivelObjeto }) {
  validarObjetoConfiguracion({
    valor: nivelObjeto,
    descripcion: `El nivel de stock de "${idMercader}"`,
  });

  const minimo = nivelObjeto.minimo;
  const maximo = nivelObjeto.maximo;

  if (!Number.isInteger(minimo) || minimo < 1) {
    throw new Error(
      `El nivel mínimo de stock de "${idMercader}" ` +
        "debe ser un entero mayor que 0.",
    );
  }

  if (!Number.isInteger(maximo) || maximo < minimo) {
    throw new Error(
      `El nivel máximo de stock de "${idMercader}" ` +
        "debe ser igual o mayor que su mínimo.",
    );
  }
}

function validarStockFijo({ idMercader, definiciones }) {
  if (!Array.isArray(definiciones)) {
    throw new Error(`El stock fijo de "${idMercader}" debe ser una lista.`);
  }

  const ids = new Set();

  definiciones.forEach((definicion, indice) => {
    validarObjetoConfiguracion({
      valor: definicion,
      descripcion: `El objeto fijo ${indice} de "${idMercader}"`,
    });

    validarIdConfiguracion({
      id: definicion.id,
      descripcion: `objeto fijo de "${idMercader}"`,
    });

    if (ids.has(definicion.id)) {
      throw new Error(
        `El objeto fijo "${definicion.id}" está repetido ` +
          `en el stock de "${idMercader}".`,
      );
    }

    if (!Number.isInteger(definicion.cantidad) || definicion.cantidad <= 0) {
      throw new Error(
        `La cantidad fija de "${definicion.id}" en ` +
          `"${idMercader}" debe ser un entero mayor que 0.`,
      );
    }

    ids.add(definicion.id);
  });

  return ids.size;
}

function validarStockAleatorio({ idMercader, configuracionAleatoria }) {
  validarObjetoConfiguracion({
    valor: configuracionAleatoria,
    descripcion: `El stock aleatorio de "${idMercader}"`,
  });

  if (
    !Number.isInteger(configuracionAleatoria.cantidad) ||
    configuracionAleatoria.cantidad < 0
  ) {
    throw new Error(
      `La cantidad de stock aleatorio de "${idMercader}" ` +
        "debe ser un entero igual o mayor que 0.",
    );
  }

  if (typeof configuracionAleatoria.permitirRepetidos !== "boolean") {
    throw new Error(
      `La opción permitirRepetidos de "${idMercader}" ` + "debe ser booleana.",
    );
  }

  if (!Array.isArray(configuracionAleatoria.grupos)) {
    throw new Error(
      `Los grupos del stock aleatorio de "${idMercader}" ` +
        "deben estar dentro de una lista.",
    );
  }

  if (
    configuracionAleatoria.cantidad > 0 &&
    configuracionAleatoria.grupos.length === 0
  ) {
    throw new Error(
      `El mercader "${idMercader}" necesita grupos ` +
        "para generar su stock aleatorio.",
    );
  }

  const idsGrupos = new Set();

  configuracionAleatoria.grupos.forEach((grupo, indice) => {
    validarGrupoComercial({
      grupo,
      indice,
      idMercader,
      idsGrupos,
    });
  });

  return {
    cantidad: configuracionAleatoria.cantidad,
    idsGrupos,
  };
}

function validarGrupoComercial({ grupo, indice, idMercader, idsGrupos }) {
  validarObjetoConfiguracion({
    valor: grupo,
    descripcion: `El grupo comercial ${indice} de "${idMercader}"`,
  });

  validarIdConfiguracion({
    id: grupo.id,
    descripcion: `grupo comercial de "${idMercader}"`,
  });

  if (idsGrupos.has(grupo.id)) {
    throw new Error(
      `El grupo comercial "${grupo.id}" está repetido ` + `en "${idMercader}".`,
    );
  }

  validarNumeroPositivo({
    valor: grupo.peso,
    descripcion: `El peso del grupo "${grupo.id}"`,
  });

  validarFiltrosGrupo({
    filtros: grupo.filtros,
    idGrupo: grupo.id,
  });

  idsGrupos.add(grupo.id);
}

function validarFiltrosGrupo({ filtros, idGrupo }) {
  validarObjetoConfiguracion({
    valor: filtros,
    descripcion: `Los filtros del grupo "${idGrupo}"`,
  });

  validarCamposDesconocidos({
    objeto: filtros,
    camposPermitidos: new Set([...CAMPOS_FILTRO_LISTA, "tiers"]),
    descripcion: `los filtros del grupo "${idGrupo}"`,
  });

  for (const campo of CAMPOS_FILTRO_LISTA) {
    if (filtros[campo] === undefined) {
      continue;
    }

    validarListaIdentificadores({
      valores: filtros[campo],
      descripcion: `${campo} del grupo "${idGrupo}"`,
    });
  }

  if (filtros.tiers !== undefined) {
    validarListaTiers({
      tiers: filtros.tiers,
      idGrupo,
    });
  }

  if (Array.isArray(filtros.categoriasArmadura)) {
    for (const categoria of filtros.categoriasArmadura) {
      if (!CATEGORIAS_ARMADURA_VALIDAS.has(categoria)) {
        throw new Error(
          `La categoría de armadura "${categoria}" del grupo ` +
            `"${idGrupo}" no es válida.`,
        );
      }
    }
  }

  const tieneFiltroInclusivo =
    tieneValores(filtros.tipos) ||
    tieneValores(filtros.tiers) ||
    tieneValores(filtros.familias) ||
    tieneValores(filtros.categoriasArmadura) ||
    tieneValores(filtros.etiquetasRequeridas) ||
    tieneValores(filtros.idsIncluidos);

  if (!tieneFiltroInclusivo) {
    throw new Error(
      `El grupo "${idGrupo}" necesita al menos un filtro inclusivo ` +
        "por tipo, tier, familia, categoría, etiqueta o ID.",
    );
  }

  validarListasSinInterseccion({
    listaA: filtros.idsIncluidos,
    descripcionA: "idsIncluidos",
    listaB: filtros.idsExcluidos,
    descripcionB: "idsExcluidos",
    idGrupo,
  });

  validarListasSinInterseccion({
    listaA: filtros.familias,
    descripcionA: "familias",
    listaB: filtros.familiasExcluidas,
    descripcionB: "familiasExcluidas",
    idGrupo,
  });

  validarListasSinInterseccion({
    listaA: filtros.etiquetasRequeridas,
    descripcionA: "etiquetasRequeridas",
    listaB: filtros.etiquetasExcluidas,
    descripcionB: "etiquetasExcluidas",
    idGrupo,
  });
}

function validarListaTiers({ tiers, idGrupo }) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    throw new Error(
      `Los tiers del grupo "${idGrupo}" deben formar una lista no vacía.`,
    );
  }

  for (const tier of tiers) {
    if (!Number.isInteger(tier) || tier < 1) {
      throw new Error(
        `Cada tier del grupo "${idGrupo}" debe ser un entero ` +
          "mayor o igual que 1.",
      );
    }
  }

  if (new Set(tiers).size !== tiers.length) {
    throw new Error(`Los tiers del grupo "${idGrupo}" no pueden repetirse.`);
  }
}

function validarListaIdentificadores({ valores, descripcion }) {
  if (!Array.isArray(valores) || valores.length === 0) {
    throw new Error(`${descripcion} debe formar una lista no vacía.`);
  }

  const normalizados = new Set();

  for (const valor of valores) {
    validarIdConfiguracion({
      id: valor,
      descripcion,
    });

    if (normalizados.has(valor)) {
      throw new Error(`El valor "${valor}" está repetido en ${descripcion}.`);
    }

    normalizados.add(valor);
  }
}

function validarListasSinInterseccion({
  listaA,
  descripcionA,
  listaB,
  descripcionB,
  idGrupo,
}) {
  if (!Array.isArray(listaA) || !Array.isArray(listaB)) {
    return;
  }

  const valoresB = new Set(listaB);
  const repetido = listaA.find((valor) => valoresB.has(valor));

  if (repetido !== undefined) {
    throw new Error(
      `El valor "${repetido}" aparece en ${descripcionA} y ` +
        `${descripcionB} del grupo "${idGrupo}".`,
    );
  }
}

function validarCamposDesconocidos({ objeto, camposPermitidos, descripcion }) {
  for (const campo of Object.keys(objeto)) {
    if (!camposPermitidos.has(campo)) {
      throw new Error(
        `El campo "${campo}" no está permitido en ${descripcion}.`,
      );
    }
  }
}

function tieneValores(valor) {
  return Array.isArray(valor) && valor.length > 0;
}

function validarObjetoRaiz(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`La raíz de ${descripcion} debe ser un objeto JSON.`);
  }
}

function validarObjetoConfiguracion({ valor, descripcion }) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}

function validarIdConfiguracion({ id, descripcion }) {
  if (typeof id !== "string" || !/^[a-z0-9_]+$/.test(id)) {
    throw new Error(
      `El ID de ${descripcion} "${id}" no es válido. ` +
        "Utilizá solamente minúsculas, números y guiones bajos.",
    );
  }
}

function validarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`El campo ${descripcion} debe ser un texto válido.`);
  }
}

function validarNumeroPositivo({ valor, descripcion }) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un número mayor que 0.`);
  }
}

function validarNumeroNoNegativo({ valor, descripcion }) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`${descripcion} debe ser un número igual o mayor que 0.`);
  }
}
