// Valida las reglas económicas generales y los perfiles
// de precio utilizados por cada mercader.
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
