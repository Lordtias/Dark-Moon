const VERSION_SOPORTADA = 1;
const APARIENCIAS_MINIMAS = Object.freeze([
  "veneno",
  "fuego",
  "frio",
  "electrico",
  "generica",
]);
const CAMPOS_TEXTO = Object.freeze([
  "forma",
  "textura",
  "movimiento",
  "efectoCasilla",
  "efectoCreacion",
  "efectoRenovacion",
  "efectoActivacion",
  "efectoEntrada",
  "efectoVencimiento",
]);

export function validarPerfilesZonasTemporalesVisuales(configuracion) {
  validarObjetoPlano(configuracion, "los perfiles visuales de zonas temporales");
  if (configuracion.version !== VERSION_SOPORTADA) {
    throw new Error(
      `La versión de PerfilesZonasTemporalesVisuales debe ser ${VERSION_SOPORTADA}.`,
    );
  }

  validarObjetoPlano(configuracion.zonas, "los perfiles de zonas temporales");
  for (const apariencia of APARIENCIAS_MINIMAS) {
    if (!configuracion.zonas[apariencia]) {
      throw new Error(`Falta el perfil visual de zona "${apariencia}".`);
    }
  }

  for (const [id, perfil] of Object.entries(configuracion.zonas)) {
    validarTextoNoVacio(id, "el ID de un perfil de zona");
    validarObjetoPlano(perfil, `el perfil de zona "${id}"`);
    for (const campo of CAMPOS_TEXTO) {
      validarTextoNoVacio(perfil[campo], `${campo} de "${id}"`);
    }
    for (const campo of ["colorPrincipal", "colorSecundario", "colorDetalle"]) {
      validarColorHexadecimal(perfil[campo], `${campo} de "${id}"`);
    }
    validarFraccion(perfil.opacidadBase, `opacidadBase de "${id}"`);
    validarEnteroPositivo(perfil.densidad, `densidad de "${id}"`);
    validarNumeroPositivo(
      perfil.duracionAmbientalMs,
      `duracionAmbientalMs de "${id}"`,
    );
    validarNumeroPositivo(perfil.alturaVaporPx, `alturaVaporPx de "${id}"`);
    validarNumeroPositivo(
      perfil.tamanoParticulaPx,
      `tamanoParticulaPx de "${id}"`,
    );
  }

  return congelarProfundamente(configuracion);
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita un objeto válido para ${descripcion}.`);
  }
}

function validarTextoNoVacio(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto no vacío.`);
  }
}

function validarColorHexadecimal(valor, descripcion) {
  if (typeof valor !== "string" || !/^#[0-9a-f]{6}$/i.test(valor)) {
    throw new Error(`${descripcion} debe usar el formato hexadecimal #RRGGBB.`);
  }
}

function validarFraccion(valor, descripcion) {
  if (!Number.isFinite(valor) || valor <= 0 || valor > 1) {
    throw new Error(`${descripcion} debe ser mayor que 0 y menor o igual que 1.`);
  }
}

function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un entero mayor que 0.`);
  }
}

function validarNumeroPositivo(valor, descripcion) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un número mayor que 0.`);
  }
}

function congelarProfundamente(valor) {
  if (valor === null || typeof valor !== "object" || Object.isFrozen(valor)) {
    return valor;
  }
  for (const contenido of Object.values(valor)) {
    congelarProfundamente(contenido);
  }
  return Object.freeze(valor);
}
