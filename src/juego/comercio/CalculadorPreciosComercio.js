import {
  calcularValorComercialObjeto,
  calcularValorComercialUnitario,
} from "./CalculadorValorObjeto.js";

import { validarConfiguracionComercio } from "./ValidadorConfiguracionComercio.js";

// Las operaciones se nombran desde la perspectiva
// del jugador, no desde la del mercader.
export const TIPOS_OPERACION_COMERCIO = Object.freeze({
  COMPRA: "compra",
  VENTA: "venta",
});

// Calcula cuánto debe pagar el jugador al comprar
// una cantidad concreta de un objeto.
//
// La función no mueve objetos ni descuenta oro.
// Solamente produce un resultado detallado que podrá
// utilizar posteriormente SistemaComercio.
export function calcularPrecioCompra({
  objeto,
  jugador,
  idMercader,
  configuracionRarezas,
  configuracionComercio,
  cantidad = 1,
} = {}) {
  const contexto = prepararContextoCalculo({
    objeto,
    jugador,
    idMercader,
    configuracionRarezas,
    configuracionComercio,
    cantidad,
  });

  const factorCarisma = normalizarFactor(1 - contexto.ajusteCarisma);

  const precioAntesRedondeo =
    contexto.valorComercialTotal *
    contexto.mercader.multiplicadorCompraJugador *
    factorCarisma;

  const precioTotal = redondearPrecio({
    valor: precioAntesRedondeo,

    tipoOperacion: TIPOS_OPERACION_COMERCIO.COMPRA,

    precioMinimo: contexto.reglasPrecios.precioMinimo,
  });

  return crearResultadoPrecio({
    contexto,

    tipoOperacion: TIPOS_OPERACION_COMERCIO.COMPRA,

    permitido: true,

    multiplicadorMercader: contexto.mercader.multiplicadorCompraJugador,

    factorCarisma,
    precioAntesRedondeo,
    precioTotal,

    puedePagar: contexto.jugador.oro >= precioTotal,
  });
}

// Calcula cuánto oro recibe el jugador al vender
// una cantidad concreta de un objeto.
//
// Los objetos marcados como no vendibles producen
// un resultado rechazado sin modificar la partida.
export function calcularPrecioVenta({
  objeto,
  jugador,
  idMercader,
  configuracionRarezas,
  configuracionComercio,
  cantidad = 1,
} = {}) {
  const contexto = prepararContextoCalculo({
    objeto,
    jugador,
    idMercader,
    configuracionRarezas,
    configuracionComercio,
    cantidad,
  });

  const factorCarisma = normalizarFactor(1 + contexto.ajusteCarisma);

  if (objeto.vendible !== true) {
    return crearResultadoPrecio({
      contexto,

      tipoOperacion: TIPOS_OPERACION_COMERCIO.VENTA,

      permitido: false,

      multiplicadorMercader: contexto.mercader.multiplicadorVentaJugador,

      factorCarisma,
      precioAntesRedondeo: 0,
      precioTotal: 0,
      puedePagar: null,

      mensaje: `${objeto.nombre} no se puede vender.`,
    });
  }

  const precioAntesRedondeo =
    contexto.valorComercialTotal *
    contexto.mercader.multiplicadorVentaJugador *
    factorCarisma;

  const precioTotal = redondearPrecio({
    valor: precioAntesRedondeo,

    tipoOperacion: TIPOS_OPERACION_COMERCIO.VENTA,

    precioMinimo: contexto.reglasPrecios.precioMinimo,
  });

  return crearResultadoPrecio({
    contexto,

    tipoOperacion: TIPOS_OPERACION_COMERCIO.VENTA,

    permitido: true,

    multiplicadorMercader: contexto.mercader.multiplicadorVentaJugador,

    factorCarisma,
    precioAntesRedondeo,
    precioTotal,
    puedePagar: null,
  });
}

// Convierte el atributo Carisma en una variación
// económica limitada por la configuración general.
//
// Ejemplo con referencia 10 y 2 % por punto:
//
// Carisma 6  = -8 %.
// Carisma 10 =  0 %.
// Carisma 14 = +8 %.
export function calcularAjusteCarisma({ carisma, reglasPrecios } = {}) {
  validarCarisma(carisma);
  validarReglasPrecios(reglasPrecios);

  const diferencia = carisma - reglasPrecios.carismaReferencia;

  const ajusteSinLimitar = diferencia * reglasPrecios.variacionPorPuntoCarisma;

  const limite = reglasPrecios.variacionMaximaCarisma;

  return normalizarFactor(
    Math.max(-limite, Math.min(limite, ajusteSinLimitar)),
  );
}

// Obtiene una copia del perfil económico de un mercader.
//
// El ID debe coincidir con el ID utilizado por el NPC
// dentro de la configuración de la ciudad.
export function obtenerConfiguracionMercader({
  idMercader,
  configuracionComercio,
} = {}) {
  const configuracionValidada = validarConfiguracionComercio(
    configuracionComercio,
  );

  if (typeof idMercader !== "string" || idMercader.trim() === "") {
    throw new Error("Se necesita el ID del mercader.");
  }

  const idNormalizado = idMercader.trim().toLowerCase();

  const mercader = configuracionValidada.mercaderes[idNormalizado];

  if (!mercader) {
    throw new Error(
      `No existe la configuración comercial ` +
        `del mercader "${idNormalizado}".`,
    );
  }

  return {
    id: idNormalizado,

    ...mercader,
  };
}

function prepararContextoCalculo({
  objeto,
  jugador,
  idMercader,
  configuracionRarezas,
  configuracionComercio,
  cantidad,
}) {
  validarObjeto(objeto);
  validarJugador(jugador);

  const configuracionValidada = validarConfiguracionComercio(
    configuracionComercio,
  );

  const mercader = obtenerConfiguracionMercader({
    idMercader,

    configuracionComercio: configuracionValidada,
  });

  const cantidadNormalizada = validarCantidadOperacion({
    objeto,
    cantidad,
  });

  const valorComercialUnitario = calcularValorUnitarioOperacion({
    objeto,
    configuracionRarezas,
  });

  const valorComercialTotal = valorComercialUnitario * cantidadNormalizada;

  const carisma = jugador.atributos.carisma;

  const ajusteCarisma = calcularAjusteCarisma({
    carisma,

    reglasPrecios: configuracionValidada.reglasPrecios,
  });

  return {
    objeto,
    jugador,
    mercader,

    reglasPrecios: configuracionValidada.reglasPrecios,

    cantidad: cantidadNormalizada,

    valorComercialUnitario,
    valorComercialTotal,
    carisma,
    ajusteCarisma,
  };
}

// Para pilas simples se utiliza el valor de una unidad.
//
// Para objetos no apilables y contenedores se toma el
// valor completo, incluyendo cualquier contenido interno.
function calcularValorUnitarioOperacion({ objeto, configuracionRarezas }) {
  const tieneContenedor =
    objeto.contenedorObjetos &&
    typeof objeto.contenedorObjetos.obtenerObjetos === "function";

  if (objeto.apilable === true && !tieneContenedor) {
    return calcularValorComercialUnitario({
      objeto,
      configuracionRarezas,
    });
  }

  return calcularValorComercialObjeto({
    objeto,
    configuracionRarezas,
    incluirContenido: true,
  });
}

function crearResultadoPrecio({
  contexto,
  tipoOperacion,
  permitido,
  multiplicadorMercader,
  factorCarisma,
  precioAntesRedondeo,
  precioTotal,
  puedePagar,
  mensaje = null,
}) {
  return {
    tipoOperacion,
    permitido,

    idMercader: contexto.mercader.id,

    nombreMercader: contexto.mercader.nombre,

    cantidad: contexto.cantidad,

    valorComercialUnitario: contexto.valorComercialUnitario,

    valorComercialTotal: contexto.valorComercialTotal,

    multiplicadorMercader,

    carisma: contexto.carisma,

    ajusteCarisma: contexto.ajusteCarisma,

    factorCarisma,
    precioAntesRedondeo,
    precioTotal,
    puedePagar,
    mensaje,
  };
}

function validarCantidadOperacion({ objeto, cantidad }) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new Error("La cantidad comercial debe ser un entero mayor que 0.");
  }

  const cantidadDisponible =
    Number.isInteger(objeto.cantidad) && objeto.cantidad > 0
      ? objeto.cantidad
      : 1;

  if (cantidad > cantidadDisponible) {
    throw new Error(
      `No hay ${cantidad} unidades disponibles ` + `de ${objeto.nombre}.`,
    );
  }

  if (objeto.apilable !== true && cantidad !== 1) {
    throw new Error(
      `${objeto.nombre} no es apilable ` +
        "y solamente puede comerciarse de a una unidad.",
    );
  }

  return cantidad;
}

function validarObjeto(objeto) {
  if (
    !objeto ||
    typeof objeto !== "object" ||
    Array.isArray(objeto) ||
    typeof objeto.nombre !== "string" ||
    objeto.nombre.trim() === ""
  ) {
    throw new Error("Se necesita un objeto válido para calcular precios.");
  }
}

function validarJugador(jugador) {
  if (
    !jugador ||
    typeof jugador !== "object" ||
    !jugador.atributos ||
    typeof jugador.atributos !== "object"
  ) {
    throw new Error("Se necesita un jugador válido para calcular precios.");
  }

  validarCarisma(jugador.atributos.carisma);

  if (!Number.isSafeInteger(jugador.oro) || jugador.oro < 0) {
    throw new Error("El jugador necesita una cantidad de oro válida.");
  }
}

function validarCarisma(carisma) {
  if (!Number.isFinite(carisma) || carisma < 0) {
    throw new Error("El Carisma debe ser un número igual o mayor que 0.");
  }
}

function validarReglasPrecios(reglasPrecios) {
  if (
    !reglasPrecios ||
    typeof reglasPrecios !== "object" ||
    Array.isArray(reglasPrecios)
  ) {
    throw new Error("Se necesitan reglas de precio válidas.");
  }

  if (
    !Number.isInteger(reglasPrecios.carismaReferencia) ||
    !Number.isFinite(reglasPrecios.variacionPorPuntoCarisma) ||
    !Number.isFinite(reglasPrecios.variacionMaximaCarisma)
  ) {
    throw new Error("Las reglas de Carisma para comercio no son válidas.");
  }
}

// Los precios de compra se redondean hacia arriba
// y los de venta hacia abajo.
//
// Así se conservan los márgenes del mercader y se
// evita obtener beneficios mediante redondeos repetidos.
function redondearPrecio({ valor, tipoOperacion, precioMinimo }) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error("El precio calculado no es válido.");
  }

  if (valor === 0) {
    return 0;
  }

  const redondeado =
    tipoOperacion === TIPOS_OPERACION_COMERCIO.COMPRA
      ? Math.ceil(valor)
      : Math.floor(valor);

  return Math.max(precioMinimo, redondeado);
}

function normalizarFactor(valor) {
  return Number(valor.toFixed(6));
}
