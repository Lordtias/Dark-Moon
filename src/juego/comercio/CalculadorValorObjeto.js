// Calcula el valor comercial de los objetos
// utilizando:
//
// - El valor base de la plantilla.
// - La cantidad de la pila.
// - La rareza del objeto.
// - El contenido de contenedores.
//
// Todavía no aplica:
//
// - Precio de compra del mercader.
// - Precio de venta del mercader.
// - Carisma del jugador.
//
// Esos factores pertenecen al futuro
// CalculadorPreciosComercio.
export function calcularValorComercialObjeto({
  objeto,
  configuracionRarezas,
  incluirContenido = true,
} = {}) {
  validarObjetoComercial(objeto);
  validarConfiguracionRarezas(configuracionRarezas);

  if (typeof incluirContenido !== "boolean") {
    throw new Error("La opción incluirContenido debe ser booleana.");
  }

  const valorPropio = calcularValorComercialPropio({
    objeto,
    configuracionRarezas,
  });

  if (!incluirContenido) {
    return valorPropio;
  }

  const valorContenido = obtenerObjetosInternos(objeto).reduce(
    (total, objetoInterno) =>
      total +
      calcularValorComercialObjeto({
        objeto: objetoInterno,

        configuracionRarezas,
        incluirContenido: true,
      }),

    0,
  );

  return valorPropio + valorContenido;
}

// Calcula el valor comercial de una unidad,
// sin multiplicar por la cantidad de la pila
// ni sumar contenido interno.
export function calcularValorComercialUnitario({
  objeto,
  configuracionRarezas,
} = {}) {
  validarObjetoComercial(objeto);
  validarConfiguracionRarezas(configuracionRarezas);

  const multiplicador = obtenerMultiplicadorValorRareza({
    rareza: objeto.rareza,

    configuracionRarezas,
  });

  return redondearPrecio(objeto.valorBase * multiplicador);
}

// Calcula solamente el valor propio del objeto,
// multiplicando el valor unitario por la cantidad.
//
// No suma el contenido de un carcaj
// u otro contenedor.
export function calcularValorComercialPropio({
  objeto,
  configuracionRarezas,
} = {}) {
  const valorUnitario = calcularValorComercialUnitario({
    objeto,
    configuracionRarezas,
  });

  return valorUnitario * obtenerCantidadObjeto(objeto);
}

// Obtiene el multiplicador declarado por la rareza.
//
// Ejemplo:
//
// común  = 1
// mágico = 1.5
// raro   = 2.5
export function obtenerMultiplicadorValorRareza({
  rareza,
  configuracionRarezas,
} = {}) {
  if (typeof rareza !== "string" || rareza.trim() === "") {
    throw new Error("Se necesita una rareza válida para calcular el valor.");
  }

  validarConfiguracionRarezas(configuracionRarezas);

  const idRareza = rareza.trim().toLowerCase();

  const configuracionRareza = configuracionRarezas[idRareza];

  if (!configuracionRareza) {
    throw new Error(
      `No existe la configuración económica ` + `de la rareza "${idRareza}".`,
    );
  }

  const multiplicador = configuracionRareza.multiplicadorValor;

  if (!Number.isFinite(multiplicador) || multiplicador <= 0) {
    throw new Error(
      `El multiplicador de valor de la rareza ` +
        `"${idRareza}" debe ser mayor que 0.`,
    );
  }

  return multiplicador;
}

// Los precios se manejan como monedas enteras.
//
// Un objeto con valor calculado entre dos monedas
// se redondea a la moneda más cercana.
function redondearPrecio(valor) {
  if (valor <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(valor));
}

function obtenerCantidadObjeto(objeto) {
  if (!Number.isInteger(objeto.cantidad) || objeto.cantidad <= 0) {
    throw new Error(
      `La cantidad de "${objeto.nombre}" ` +
        "no es válida para calcular su valor.",
    );
  }

  return objeto.cantidad;
}

function obtenerObjetosInternos(objeto) {
  if (
    !objeto.contenedorObjetos ||
    typeof objeto.contenedorObjetos.obtenerObjetos !== "function"
  ) {
    return [];
  }

  return objeto.contenedorObjetos.obtenerObjetos();
}

function validarObjetoComercial(objeto) {
  if (!objeto || typeof objeto !== "object" || Array.isArray(objeto)) {
    throw new Error("Se necesita un objeto válido para calcular su valor.");
  }

  if (typeof objeto.nombre !== "string" || objeto.nombre.trim() === "") {
    throw new Error("El objeto comercial necesita un nombre válido.");
  }

  if (typeof objeto.rareza !== "string" || objeto.rareza.trim() === "") {
    throw new Error(`"${objeto.nombre}" necesita una rareza válida.`);
  }

  if (!Number.isSafeInteger(objeto.valorBase) || objeto.valorBase < 0) {
    throw new Error(`El valor base de "${objeto.nombre}" ` + "no es válido.");
  }
}

function validarConfiguracionRarezas(configuracionRarezas) {
  if (
    !configuracionRarezas ||
    typeof configuracionRarezas !== "object" ||
    Array.isArray(configuracionRarezas)
  ) {
    throw new Error("Se necesita una configuración de rarezas válida.");
  }
}
