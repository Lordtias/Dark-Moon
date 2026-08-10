export function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita un objeto válido para ${descripcion}.`);
  }
}

export function validarTextoNoVacio(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto no vacío.`);
  }
}

export function validarNumeroFinito(valor, descripcion) {
  if (!Number.isFinite(valor)) {
    throw new Error(`${descripcion} debe ser un número finito.`);
  }
}

export function validarNumeroPositivo(valor, descripcion) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un número mayor que 0.`);
  }
}

export function validarNumeroNoNegativo(valor, descripcion) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`${descripcion} debe ser un número mayor o igual que 0.`);
  }
}

export function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un entero mayor que 0.`);
  }
}

export function validarNumeroEnRango(valor, minimo, maximo, descripcion) {
  if (!Number.isFinite(valor) || valor < minimo || valor > maximo) {
    throw new Error(`${descripcion} debe estar entre ${minimo} y ${maximo}.`);
  }
}

export function validarColorHexadecimal(valor, descripcion) {
  if (typeof valor !== "string" || !/^#[0-9a-f]{6}$/i.test(valor)) {
    throw new Error(`${descripcion} debe usar el formato hexadecimal #RRGGBB.`);
  }
}

export function validarFraccion(valor, descripcion) {
  if (!Number.isFinite(valor) || valor <= 0 || valor > 1) {
    throw new Error(`${descripcion} debe ser mayor que 0 y menor o igual que 1.`);
  }
}

export function congelarProfundamente(valor) {
  if (valor === null || typeof valor !== "object" || Object.isFrozen(valor)) {
    return valor;
  }

  for (const contenido of Object.values(valor)) {
    congelarProfundamente(contenido);
  }

  return Object.freeze(valor);
}
