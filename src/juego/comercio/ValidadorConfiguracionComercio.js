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

  const idsFijos = validarStockFijo({
    idMercader,

    definiciones: stock.fijo,
  });

  const resumenAleatorio = validarStockAleatorio({
    idMercader,

    configuracionAleatoria: stock.aleatorio,
  });

  const espaciosGenerados = idsFijos.size + resumenAleatorio.cantidad;

  if (espaciosGenerados > stock.capacidad) {
    throw new Error(
      `El stock configurado de "${idMercader}" ocupa ` +
        `${espaciosGenerados} espacios, pero su capacidad es ` +
        `${stock.capacidad}.`,
    );
  }

  for (const idFijo of idsFijos) {
    if (resumenAleatorio.ids.has(idFijo)) {
      throw new Error(
        `El objeto "${idFijo}" aparece tanto en el stock fijo ` +
          `como en el stock aleatorio de "${idMercader}".`,
      );
    }
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

  return ids;
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

  if (!Array.isArray(configuracionAleatoria.candidatos)) {
    throw new Error(
      `Los candidatos del stock aleatorio de "${idMercader}" ` +
        "deben estar dentro de una lista.",
    );
  }

  if (
    configuracionAleatoria.cantidad > 0 &&
    configuracionAleatoria.candidatos.length === 0
  ) {
    throw new Error(
      `El mercader "${idMercader}" necesita candidatos ` +
        "para generar su stock aleatorio.",
    );
  }

  const ids = new Set();

  configuracionAleatoria.candidatos.forEach((candidato, indice) => {
    validarObjetoConfiguracion({
      valor: candidato,

      descripcion: `El candidato aleatorio ${indice} de "${idMercader}"`,
    });

    validarIdConfiguracion({
      id: candidato.id,

      descripcion: `candidato de stock de "${idMercader}"`,
    });

    if (ids.has(candidato.id)) {
      throw new Error(
        `El candidato "${candidato.id}" está repetido ` +
          `en el stock de "${idMercader}".`,
      );
    }

    validarNumeroPositivo({
      valor: candidato.peso,

      descripcion: `El peso de selección de "${candidato.id}"`,
    });

    ids.add(candidato.id);
  });

  if (
    !configuracionAleatoria.permitirRepetidos &&
    configuracionAleatoria.cantidad > ids.size
  ) {
    throw new Error(
      `El mercader "${idMercader}" intenta seleccionar ` +
        `${configuracionAleatoria.cantidad} objetos distintos, ` +
        `pero solamente tiene ${ids.size} candidatos.`,
    );
  }

  return {
    cantidad: configuracionAleatoria.cantidad,

    ids,
  };
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
