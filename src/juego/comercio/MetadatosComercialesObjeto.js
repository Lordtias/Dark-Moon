// Valores predeterminados utilizados por las
// plantillas que todavía no declaran información
// económica o reglas específicas de selección.
//
// Esto permite incorporar nuevos objetos al catálogo
// sin obligar a modificar cada mercader.
export const METADATOS_COMERCIALES_PREDETERMINADOS = Object.freeze({
  valorBase: 0,
  pesoUnitario: 0,
  vendible: true,
  comercioHabilitado: true,
  pesoSeleccionComercio: 1,
  etiquetasComercio: Object.freeze([]),
});

// Agrega a una instancia de Objeto los datos
// económicos definidos en su plantilla.
//
// Se ejecuta desde FabricaObjetos para garantizar
// que armas, armaduras, consumibles, municiones,
// materiales y contenedores utilicen el mismo
// contrato comercial.
export function aplicarMetadatosComercialesObjeto({ objeto, plantilla } = {}) {
  validarObjeto(objeto);
  validarPlantilla(plantilla);

  const valorBase =
    plantilla.valorBase ?? METADATOS_COMERCIALES_PREDETERMINADOS.valorBase;

  const pesoUnitario =
    plantilla.pesoUnitario ??
    METADATOS_COMERCIALES_PREDETERMINADOS.pesoUnitario;

  const vendible =
    plantilla.vendible ?? METADATOS_COMERCIALES_PREDETERMINADOS.vendible;

  const metadatosSeleccion = obtenerMetadatosSeleccionComercialPlantilla({
    plantilla,
    nombreObjeto: objeto.nombre,
  });

  validarValorBase({
    valorBase,
    nombreObjeto: objeto.nombre,
  });

  validarPesoUnitario({
    pesoUnitario,
    nombreObjeto: objeto.nombre,
  });

  validarVendible({
    vendible,
    nombreObjeto: objeto.nombre,
  });

  // Las propiedades comerciales pertenecen
  // a la definición de la instancia y no deben
  // modificarse durante la partida.
  //
  // La cantidad sí puede cambiar, por eso los
  // valores totales se calculan mediante getters.
  Object.defineProperties(objeto, {
    valorBase: {
      value: valorBase,
      enumerable: true,
      configurable: false,
      writable: false,
    },

    pesoUnitario: {
      value: pesoUnitario,
      enumerable: true,
      configurable: false,
      writable: false,
    },

    vendible: {
      value: vendible,
      enumerable: true,
      configurable: false,
      writable: false,
    },

    comercioHabilitado: {
      value: metadatosSeleccion.habilitado,
      enumerable: true,
      configurable: false,
      writable: false,
    },

    pesoSeleccionComercio: {
      value: metadatosSeleccion.pesoSeleccion,
      enumerable: true,
      configurable: false,
      writable: false,
    },

    etiquetasComercio: {
      value: metadatosSeleccion.etiquetas,
      enumerable: true,
      configurable: false,
      writable: false,
    },

    valorBaseTotal: {
      enumerable: true,
      configurable: false,

      get() {
        return calcularValorBaseTotalObjeto(this);
      },
    },

    pesoTotal: {
      enumerable: true,
      configurable: false,

      get() {
        return calcularPesoTotalObjeto(this);
      },
    },
  });

  return objeto;
}

// Normaliza las reglas opcionales utilizadas para
// incluir una plantilla dentro del stock aleatorio.
//
// Formato opcional de la plantilla:
//
// "comercio": {
//   "habilitado": true,
//   "pesoSeleccion": 1,
//   "etiquetas": ["refugio"]
// }
//
// Si el bloque no existe:
//
// - El objeto se habilita cuando vendible es true.
// - Su peso interno es 1.
// - No posee etiquetas especiales.
export function obtenerMetadatosSeleccionComercialPlantilla({
  plantilla,
  nombreObjeto = null,
} = {}) {
  validarPlantilla(plantilla);

  const nombre = obtenerNombrePlantilla({
    plantilla,
    nombreObjeto,
  });

  const vendible =
    plantilla.vendible ?? METADATOS_COMERCIALES_PREDETERMINADOS.vendible;

  validarVendible({
    vendible,
    nombreObjeto: nombre,
  });

  const configuracionComercio = plantilla.comercio ?? {};

  if (
    configuracionComercio === null ||
    typeof configuracionComercio !== "object" ||
    Array.isArray(configuracionComercio)
  ) {
    throw new Error(
      `La configuración comercial de "${nombre}" debe ser un objeto válido.`,
    );
  }

  const habilitadoConfigurado =
    configuracionComercio.habilitado ??
    METADATOS_COMERCIALES_PREDETERMINADOS.comercioHabilitado;

  if (typeof habilitadoConfigurado !== "boolean") {
    throw new Error(
      `La opción comercio.habilitado de "${nombre}" debe ser booleana.`,
    );
  }

  const pesoSeleccion =
    configuracionComercio.pesoSeleccion ??
    METADATOS_COMERCIALES_PREDETERMINADOS.pesoSeleccionComercio;

  if (!Number.isFinite(pesoSeleccion) || pesoSeleccion <= 0) {
    throw new Error(
      `El peso de selección comercial de "${nombre}" debe ser mayor que 0.`,
    );
  }

  const etiquetas = normalizarEtiquetasComercio({
    etiquetas:
      configuracionComercio.etiquetas ??
      METADATOS_COMERCIALES_PREDETERMINADOS.etiquetasComercio,
    nombreObjeto: nombre,
  });

  return Object.freeze({
    // Un objeto no vendible nunca puede formar parte
    // del stock, aunque su bloque comercio intente
    // habilitarlo explícitamente.
    habilitado: vendible && habilitadoConfigurado,
    pesoSeleccion,
    etiquetas,
  });
}

// Calcula el valor base de toda la instancia.
//
// En objetos apilables:
//
// valorBase × cantidad
//
// En objetos contenedores, como un carcaj,
// también suma el valor de los objetos internos.
export function calcularValorBaseTotalObjeto(objeto) {
  validarObjetoComercial(objeto);

  const valorPropio = objeto.valorBase * obtenerCantidadObjeto(objeto);

  const valorContenido = obtenerObjetosInternos(objeto).reduce(
    (total, objetoInterno) =>
      total + calcularValorBaseTotalObjeto(objetoInterno),
    0,
  );

  return valorPropio + valorContenido;
}

// Calcula el peso físico total de una instancia.
//
// En objetos apilables:
//
// pesoUnitario × cantidad
//
// Los contenedores también incluyen el peso
// de todos los objetos almacenados.
export function calcularPesoTotalObjeto(objeto) {
  validarObjetoComercial(objeto);

  const pesoPropio = objeto.pesoUnitario * obtenerCantidadObjeto(objeto);

  const pesoContenido = obtenerObjetosInternos(objeto).reduce(
    (total, objetoInterno) => total + calcularPesoTotalObjeto(objetoInterno),
    0,
  );

  return normalizarPeso(pesoPropio + pesoContenido);
}

// Devuelve los objetos contenidos dentro
// de carcajes u otros contenedores futuros.
function obtenerObjetosInternos(objeto) {
  if (
    !objeto.contenedorObjetos ||
    typeof objeto.contenedorObjetos.obtenerObjetos !== "function"
  ) {
    return [];
  }

  return objeto.contenedorObjetos.obtenerObjetos();
}

function obtenerCantidadObjeto(objeto) {
  if (!Number.isInteger(objeto.cantidad) || objeto.cantidad <= 0) {
    throw new Error(
      `La cantidad comercial de ` + `"${objeto.nombre}" no es válida.`,
    );
  }

  return objeto.cantidad;
}

function normalizarEtiquetasComercio({ etiquetas, nombreObjeto }) {
  if (!Array.isArray(etiquetas)) {
    throw new Error(
      `Las etiquetas comerciales de "${nombreObjeto}" deben formar una lista.`,
    );
  }

  const normalizadas = etiquetas.map((etiqueta, indice) => {
    if (typeof etiqueta !== "string" || etiqueta.trim() === "") {
      throw new Error(
        `La etiqueta comercial ${indice + 1} de ` +
          `"${nombreObjeto}" no es válida.`,
      );
    }

    const normalizada = etiqueta.trim().toLowerCase();

    if (!/^[a-z0-9_]+$/.test(normalizada)) {
      throw new Error(
        `La etiqueta comercial "${etiqueta}" de ` +
          `"${nombreObjeto}" no es válida.`,
      );
    }

    return normalizada;
  });

  if (new Set(normalizadas).size !== normalizadas.length) {
    throw new Error(
      `Las etiquetas comerciales de "${nombreObjeto}" no pueden repetirse.`,
    );
  }

  return Object.freeze(normalizadas);
}

// Evita resultados visuales como
// 0.30000000000000004 al sumar pesos decimales.
function normalizarPeso(peso) {
  return Number(peso.toFixed(3));
}

function obtenerNombrePlantilla({ plantilla, nombreObjeto }) {
  if (typeof nombreObjeto === "string" && nombreObjeto.trim() !== "") {
    return nombreObjeto.trim();
  }

  if (typeof plantilla.nombre === "string" && plantilla.nombre.trim() !== "") {
    return plantilla.nombre.trim();
  }

  return "objeto desconocido";
}

function validarObjeto(objeto) {
  if (!objeto || typeof objeto !== "object" || Array.isArray(objeto)) {
    throw new Error("Se necesita una instancia de objeto válida.");
  }

  if (typeof objeto.nombre !== "string" || objeto.nombre.trim() === "") {
    throw new Error("El objeto necesita un nombre válido.");
  }
}

function validarObjetoComercial(objeto) {
  validarObjeto(objeto);

  validarValorBase({
    valorBase: objeto.valorBase,
    nombreObjeto: objeto.nombre,
  });

  validarPesoUnitario({
    pesoUnitario: objeto.pesoUnitario,
    nombreObjeto: objeto.nombre,
  });

  validarVendible({
    vendible: objeto.vendible,
    nombreObjeto: objeto.nombre,
  });
}

function validarPlantilla(plantilla) {
  if (!plantilla || typeof plantilla !== "object" || Array.isArray(plantilla)) {
    throw new Error("Se necesita una plantilla de objeto válida.");
  }
}

function validarValorBase({ valorBase, nombreObjeto }) {
  if (!Number.isSafeInteger(valorBase) || valorBase < 0) {
    throw new Error(
      `El valor base de "${nombreObjeto}" ` +
        "debe ser un entero igual o mayor que 0.",
    );
  }
}

function validarPesoUnitario({ pesoUnitario, nombreObjeto }) {
  if (!Number.isFinite(pesoUnitario) || pesoUnitario < 0) {
    throw new Error(
      `El peso unitario de "${nombreObjeto}" ` +
        "debe ser un número igual o mayor que 0.",
    );
  }
}

function validarVendible({ vendible, nombreObjeto }) {
  if (typeof vendible !== "boolean") {
    throw new Error(
      `La propiedad vendible de "${nombreObjeto}" ` + "debe ser booleana.",
    );
  }
}
