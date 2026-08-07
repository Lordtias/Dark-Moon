// Categorías visuales disponibles para los mensajes del registro de eventos.
export const TIPOS_MENSAJE_JUEGO = Object.freeze({
  SISTEMA: "sistema",
  POSITIVO: "positivo",
  ALERTA: "alerta",
  NEGATIVO: "negativo",
});

const TIPOS_VALIDOS = new Set(Object.values(TIPOS_MENSAJE_JUEGO));
const TIPO_PARAMETRO_CONTENIDO = "contenido";
const TIPO_PARAMETRO_ENTIDAD = "entidad";
const TIPO_PARAMETRO_TRADUCCION = "traduccion";

// Crea un mensaje ya resuelto como texto. Se conserva para compatibilidad y
// para textos técnicos que no forman parte de la localización del jugador.
export function crearMensajeJuego(texto, tipo = TIPOS_MENSAJE_JUEGO.SISTEMA) {
  if (typeof texto !== "string" || texto.trim() === "") {
    throw new Error("El mensaje del juego debe contener texto.");
  }
  validarTipo(tipo);
  return Object.freeze({ texto: texto.trim(), tipo });
}

// Contrato recomendado para cualquier mensaje visible nuevo.
// El dominio conserva significado + datos; la presentación decide el idioma.
export function crearMensajeTraducible(
  clave,
  {
    parametros = {},
    tipo = TIPOS_MENSAJE_JUEGO.SISTEMA,
    respaldo = "",
    destacado = null,
  } = {},
) {
  if (typeof clave !== "string" || clave.trim() === "") {
    throw new Error("El mensaje traducible necesita una clave válida.");
  }
  validarTipo(tipo);
  if (!parametros || typeof parametros !== "object" || Array.isArray(parametros)) {
    throw new Error("Los parámetros de un mensaje traducible deben ser un objeto.");
  }
  if (typeof respaldo !== "string") {
    throw new Error("El respaldo de un mensaje traducible debe ser texto.");
  }
  return Object.freeze({
    clave: clave.trim(),
    parametros: congelarSimple(parametros),
    respaldo: respaldo.trim(),
    destacado: normalizarDestacado(destacado),
    tipo,
  });
}

// Fragmento localizado que la presentación puede destacar tipográficamente
// antes del cuerpo del mensaje. No contiene HTML ni decisiones visuales.
export function crearDestacadoMensajeTraducible(
  clave,
  { parametros = {}, respaldo = "" } = {},
) {
  if (typeof clave !== "string" || clave.trim() === "") {
    throw new Error("El destacado traducible necesita una clave válida.");
  }
  if (!parametros || typeof parametros !== "object" || Array.isArray(parametros)) {
    throw new Error("Los parámetros del destacado deben ser un objeto.");
  }
  if (typeof respaldo !== "string") {
    throw new Error("El respaldo del destacado debe ser texto.");
  }
  return Object.freeze({
    clave: clave.trim(),
    parametros: congelarSimple(parametros),
    respaldo: respaldo.trim(),
  });
}

// Referencia de presentación a contenido canónico. El ID nunca se traduce.
export function crearParametroContenidoMensaje(
  categoria,
  id,
  { campo = "nombre", respaldo = "" } = {},
) {
  if (typeof categoria !== "string" || categoria.trim() === "") return respaldo;
  if (typeof id !== "string" || id.trim() === "") return respaldo;
  return Object.freeze({
    tipoParametroMensaje: TIPO_PARAMETRO_CONTENIDO,
    categoria: categoria.trim(),
    id: id.trim().toLowerCase(),
    campo: typeof campo === "string" && campo.trim() ? campo.trim() : "nombre",
    respaldo: typeof respaldo === "string" ? respaldo : "",
  });
}

export function crearParametroTraduccionMensaje(
  clave,
  { parametros = {}, respaldo = "" } = {},
) {
  if (typeof clave !== "string" || clave.trim() === "") return respaldo;
  return Object.freeze({
    tipoParametroMensaje: TIPO_PARAMETRO_TRADUCCION,
    clave: clave.trim(),
    parametros: congelarSimple(parametros),
    respaldo: typeof respaldo === "string" ? respaldo : "",
  });
}

// Referencia a una entidad del mundo. Se copia solamente metadata de
// presentación para no acoplar el registro a la instancia viva.
export function crearParametroEntidadMensaje(entidad, respaldo = "") {
  if (!entidad || typeof entidad !== "object") {
    return typeof respaldo === "string" ? respaldo : "";
  }
  return Object.freeze({
    tipoParametroMensaje: TIPO_PARAMETRO_ENTIDAD,
    nombre: normalizarTexto(entidad.nombre) ?? normalizarTexto(respaldo) ?? "",
    id: normalizarTexto(entidad.id),
    idPlantilla: normalizarTexto(entidad.idPlantilla),
    idVariante: normalizarTexto(entidad.idVariante),
    genero: normalizarTexto(entidad.genero),
  });
}

// Convierte texto simple, mensaje tipado/semántico o listas. Los textos
// heredados ya no se clasifican leyendo frases en español: quedan como sistema
// hasta que su productor sea migrado a un contrato semántico explícito.
export function normalizarMensajesJuego(valor, _opciones = {}) {
  if (valor === null || valor === undefined || valor === "") return [];

  if (Array.isArray(valor)) {
    return valor.flatMap((elemento) => normalizarMensajesJuego(elemento));
  }

  if (typeof valor === "object") {
    return [normalizarMensajeTipado(valor)];
  }

  if (typeof valor === "string") {
    return valor
      .split(/\r?\n/u)
      .map((linea) => linea.trim())
      .filter(Boolean)
      .map((linea) => crearMensajeJuego(linea));
  }

  throw new Error("El formato del mensaje del juego no es válido.");
}

export function esMensajeJuegoValido(valor) {
  if (valor === null || valor === undefined || valor === "") return true;
  try {
    normalizarMensajesJuego(valor);
    return true;
  } catch {
    return false;
  }
}

function normalizarMensajeTipado(mensaje) {
  const tipo = mensaje.tipo ?? TIPOS_MENSAJE_JUEGO.SISTEMA;
  if (typeof mensaje.clave === "string" && mensaje.clave.trim() !== "") {
    return crearMensajeTraducible(mensaje.clave, {
      parametros: mensaje.parametros ?? {},
      tipo,
      respaldo: mensaje.respaldo ?? "",
      destacado: mensaje.destacado ?? null,
    });
  }
  return crearMensajeJuego(mensaje.texto, tipo);
}

function normalizarDestacado(destacado) {
  if (destacado === null || destacado === undefined) return null;
  if (!destacado || typeof destacado !== "object" || Array.isArray(destacado)) {
    throw new Error("El destacado de un mensaje debe ser un objeto o null.");
  }
  return crearDestacadoMensajeTraducible(destacado.clave, {
    parametros: destacado.parametros ?? {},
    respaldo: destacado.respaldo ?? "",
  });
}

function validarTipo(tipo) {
  if (!TIPOS_VALIDOS.has(tipo)) {
    throw new Error(`El tipo de mensaje "${tipo}" no es válido.`);
  }
}

function normalizarTexto(valor) {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}

function congelarSimple(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return Object.freeze(valor.map(congelarSimple));
  return Object.freeze(
    Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => [clave, congelarSimple(contenido)]),
    ),
  );
}
