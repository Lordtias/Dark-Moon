// Primitivas neutrales para almacenamiento clave/valor con contenido JSON.
//
// Las políticas de cada dominio (qué hacer si no existe almacenamiento,
// versiones soportadas, estructura válida, etc.) permanecen en sus módulos.
export function validarAlmacenamientoClaveValor(almacenamiento) {
  if (
    !almacenamiento ||
    typeof almacenamiento.getItem !== "function" ||
    typeof almacenamiento.setItem !== "function" ||
    typeof almacenamiento.removeItem !== "function"
  ) {
    throw new Error("No existe un almacenamiento durable compatible.");
  }

  return almacenamiento;
}

export function guardarJsonAlmacenado({ almacenamiento, clave, valor } = {}) {
  validarClave(clave);
  validarAlmacenamientoClaveValor(almacenamiento);
  almacenamiento.setItem(clave, JSON.stringify(valor));
  return valor;
}

export function leerJsonAlmacenado({
  almacenamiento,
  clave,
  descripcion = "El contenido guardado",
} = {}) {
  validarClave(clave);
  validarAlmacenamientoClaveValor(almacenamiento);
  const contenido = almacenamiento.getItem(clave);

  if (contenido === null) {
    return null;
  }

  try {
    return JSON.parse(contenido);
  } catch (error) {
    throw new Error(`${descripcion} no contiene JSON válido. ${error.message}`);
  }
}

export function existeClaveAlmacenada({ almacenamiento, clave } = {}) {
  validarClave(clave);
  validarAlmacenamientoClaveValor(almacenamiento);
  return almacenamiento.getItem(clave) !== null;
}

export function eliminarClaveAlmacenada({ almacenamiento, clave } = {}) {
  validarClave(clave);
  validarAlmacenamientoClaveValor(almacenamiento);
  const existia = almacenamiento.getItem(clave) !== null;
  almacenamiento.removeItem(clave);
  return existia;
}

export function obtenerAlmacenamientoLocalSeguro() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function validarClave(clave) {
  if (typeof clave !== "string" || clave.trim() === "") {
    throw new Error("Se necesita una clave de almacenamiento válida.");
  }
}
