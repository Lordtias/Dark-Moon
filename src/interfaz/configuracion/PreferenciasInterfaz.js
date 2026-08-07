const RUTA_PREFERENCIAS_INTERFAZ =
  "./src/config/presentacion/PreferenciasInterfaz.json";
const VERSION_SOPORTADA = 1;

const CLAVES_PREFERENCIAS = Object.freeze([
  "velocidadAnimaciones",
  "efectosReducidos",
  "zoomInicial",
]);

export async function cargarConfiguracionPreferenciasInterfaz({
  cargarJson = cargarJsonPorFetch,
} = {}) {
  const configuracion = await cargarJson(
    RUTA_PREFERENCIAS_INTERFAZ,
    "las preferencias canónicas de interfaz",
  );

  return validarConfiguracionPreferenciasInterfaz(configuracion);
}

export function validarConfiguracionPreferenciasInterfaz(configuracion) {
  if (!esObjetoPlano(configuracion)) {
    throw new Error("Las preferencias de interfaz deben ser un objeto.");
  }

  if (configuracion.version !== VERSION_SOPORTADA) {
    throw new Error(
      `Versión de preferencias de interfaz no soportada: ${configuracion.version}.`,
    );
  }

  const preferencias = configuracion.preferencias;
  if (!esObjetoPlano(preferencias)) {
    throw new Error(
      "La configuración de interfaz debe declarar sus preferencias.",
    );
  }

  validarVelocidadAnimaciones(preferencias.velocidadAnimaciones);
  validarEfectosReducidos(preferencias.efectosReducidos);
  validarZoomInicial(preferencias.zoomInicial);

  for (const clave of CLAVES_PREFERENCIAS) {
    if (!Object.prototype.hasOwnProperty.call(preferencias, clave)) {
      throw new Error(`Falta la preferencia canónica "${clave}".`);
    }
  }

  return congelarProfundamente({
    version: configuracion.version,
    preferencias: {
      velocidadAnimaciones: {
        valorInicial: preferencias.velocidadAnimaciones.valorInicial,
        opciones: [...preferencias.velocidadAnimaciones.opciones],
      },
      efectosReducidos: {
        valorInicial: preferencias.efectosReducidos.valorInicial,
      },
      zoomInicial: {
        valorInicial: preferencias.zoomInicial.valorInicial,
        minimo: preferencias.zoomInicial.minimo,
        maximo: preferencias.zoomInicial.maximo,
        paso: preferencias.zoomInicial.paso,
      },
    },
  });
}

export function crearPreferenciasIniciales(configuracion) {
  const canonica = validarConfiguracionPreferenciasInterfaz(configuracion);

  return Object.freeze({
    velocidadAnimaciones:
      canonica.preferencias.velocidadAnimaciones.valorInicial,
    efectosReducidos: canonica.preferencias.efectosReducidos.valorInicial,
    zoomInicial: canonica.preferencias.zoomInicial.valorInicial,
  });
}

export function resolverPreferenciasInterfaz({
  configuracion,
  persistidas = null,
} = {}) {
  const canonica = validarConfiguracionPreferenciasInterfaz(configuracion);
  const iniciales = crearPreferenciasIniciales(canonica);
  const entrada = normalizarEntradaPersistida(persistidas);

  return Object.freeze({
    velocidadAnimaciones: resolverValorPreferencia({
      clave: "velocidadAnimaciones",
      valor: entrada.velocidadAnimaciones,
      respaldo: iniciales.velocidadAnimaciones,
      configuracion: canonica,
    }),
    efectosReducidos: resolverValorPreferencia({
      clave: "efectosReducidos",
      valor: entrada.efectosReducidos,
      respaldo: iniciales.efectosReducidos,
      configuracion: canonica,
    }),
    zoomInicial: resolverValorPreferencia({
      clave: "zoomInicial",
      valor: entrada.zoomInicial,
      respaldo: iniciales.zoomInicial,
      configuracion: canonica,
    }),
  });
}

export function actualizarPreferenciaInterfaz({
  configuracion,
  preferenciasActuales,
  clave,
  valor,
} = {}) {
  const canonica = validarConfiguracionPreferenciasInterfaz(configuracion);
  const actuales = resolverPreferenciasInterfaz({
    configuracion: canonica,
    persistidas: preferenciasActuales,
  });

  if (!CLAVES_PREFERENCIAS.includes(clave)) {
    throw new Error(`Preferencia de interfaz desconocida: "${clave}".`);
  }

  const valorValidado = resolverValorPreferencia({
    clave,
    valor,
    respaldo: undefined,
    configuracion: canonica,
    estricto: true,
  });

  return Object.freeze({
    ...actuales,
    [clave]: valorValidado,
  });
}

export function crearOverridesPreferenciasInterfaz({
  configuracion,
  preferencias,
} = {}) {
  const canonica = validarConfiguracionPreferenciasInterfaz(configuracion);
  const iniciales = crearPreferenciasIniciales(canonica);
  const efectivas = resolverPreferenciasInterfaz({
    configuracion: canonica,
    persistidas: preferencias,
  });
  const overrides = {};

  for (const clave of CLAVES_PREFERENCIAS) {
    if (!sonValoresEquivalentes(efectivas[clave], iniciales[clave])) {
      overrides[clave] = efectivas[clave];
    }
  }

  return Object.freeze(overrides);
}

export function obtenerOpcionesPreferenciasInterfaz(configuracion) {
  const canonica = validarConfiguracionPreferenciasInterfaz(configuracion);
  const velocidad = canonica.preferencias.velocidadAnimaciones;
  const zoom = canonica.preferencias.zoomInicial;

  return Object.freeze({
    velocidadesAnimacion: Object.freeze([...velocidad.opciones]),
    zoom: Object.freeze({
      minimo: zoom.minimo,
      maximo: zoom.maximo,
      paso: zoom.paso,
    }),
  });
}

function resolverValorPreferencia({
  clave,
  valor,
  respaldo,
  configuracion,
  estricto = false,
}) {
  if (valor === undefined) {
    if (estricto) {
      throw new Error(`La preferencia "${clave}" necesita un valor.`);
    }
    return respaldo;
  }

  let valido = false;
  let normalizado = valor;

  if (clave === "velocidadAnimaciones") {
    valido =
      typeof valor === "string" &&
      configuracion.preferencias.velocidadAnimaciones.opciones.includes(valor);
  } else if (clave === "efectosReducidos") {
    valido = typeof valor === "boolean";
  } else if (clave === "zoomInicial") {
    const perfil = configuracion.preferencias.zoomInicial;
    const numero = Number(valor);
    valido =
      Number.isFinite(numero) &&
      numero >= perfil.minimo &&
      numero <= perfil.maximo &&
      estaAlineadoConPaso(numero, perfil.minimo, perfil.paso);
    normalizado = redondearDecimal(numero);
  }

  if (valido) return normalizado;
  if (estricto) {
    throw new Error(`Valor inválido para la preferencia "${clave}".`);
  }
  return respaldo;
}

function normalizarEntradaPersistida(persistidas) {
  if (!esObjetoPlano(persistidas)) return {};
  if (esObjetoPlano(persistidas.preferencias)) {
    return persistidas.preferencias;
  }
  return persistidas;
}

function validarVelocidadAnimaciones(configuracion) {
  if (
    !esObjetoPlano(configuracion) ||
    typeof configuracion.valorInicial !== "string" ||
    !Array.isArray(configuracion.opciones) ||
    configuracion.opciones.length === 0 ||
    configuracion.opciones.some(
      (opcion) => typeof opcion !== "string" || opcion.trim() === "",
    ) ||
    new Set(configuracion.opciones).size !== configuracion.opciones.length ||
    !configuracion.opciones.includes(configuracion.valorInicial)
  ) {
    throw new Error(
      "La preferencia velocidadAnimaciones no tiene una configuración válida.",
    );
  }
}

function validarEfectosReducidos(configuracion) {
  if (
    !esObjetoPlano(configuracion) ||
    typeof configuracion.valorInicial !== "boolean"
  ) {
    throw new Error(
      "La preferencia efectosReducidos no tiene una configuración válida.",
    );
  }
}

function validarZoomInicial(configuracion) {
  if (!esObjetoPlano(configuracion)) {
    throw new Error("La preferencia zoomInicial debe ser un objeto.");
  }

  const { valorInicial, minimo, maximo, paso } = configuracion;
  if (
    ![valorInicial, minimo, maximo, paso].every(Number.isFinite) ||
    minimo <= 0 ||
    maximo < minimo ||
    paso <= 0 ||
    valorInicial < minimo ||
    valorInicial > maximo ||
    !estaAlineadoConPaso(valorInicial, minimo, paso)
  ) {
    throw new Error(
      "La preferencia zoomInicial no tiene límites o valor inicial válidos.",
    );
  }
}

function estaAlineadoConPaso(valor, minimo, paso) {
  const cantidadPasos = (valor - minimo) / paso;
  return Math.abs(cantidadPasos - Math.round(cantidadPasos)) < 1e-7;
}

function sonValoresEquivalentes(a, b) {
  return typeof a === "number" && typeof b === "number"
    ? Math.abs(a - b) < 1e-9
    : Object.is(a, b);
}

function redondearDecimal(valor) {
  return Math.round(valor * 1000000) / 1000000;
}

async function cargarJsonPorFetch(ruta, descripcion) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(
      `No se pudo cargar ${descripcion}. Código HTTP: ${respuesta.status}`,
    );
  }

  try {
    return await respuesta.json();
  } catch (error) {
    throw new Error(
      `El archivo de ${descripcion} no contiene un JSON válido. ${error.message}`,
    );
  }
}

function esObjetoPlano(valor) {
  return (
    valor !== null &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  );
}

function congelarProfundamente(valor) {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor)) {
    return valor;
  }

  for (const contenido of Object.values(valor)) {
    congelarProfundamente(contenido);
  }

  return Object.freeze(valor);
}
