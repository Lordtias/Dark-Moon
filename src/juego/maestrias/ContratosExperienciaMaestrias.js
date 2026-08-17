export const TIPOS_FUENTE_EXPERIENCIA_MAESTRIA = Object.freeze({
  MANA_CONSUMIDO: "mana_consumido",
  DANIO_APLICADO_ARMA: "danio_aplicado_arma",
  DANIO_MITIGADO_ARMADURA: "danio_mitigado_armadura",
  DANIO_MITIGADO_BLOQUEO: "danio_mitigado_bloqueo",
});

export const TIPOS_FUENTE_EXPERIENCIA_MAESTRIA_VALIDOS = Object.freeze(
  Object.values(TIPOS_FUENTE_EXPERIENCIA_MAESTRIA),
);

const CLAVES_FILTRO_FUENTE = Object.freeze([
  "familiaArma",
  "categoriaArmadura",
  "familiaSecundaria",
]);
const CONJUNTO_TIPOS = new Set(TIPOS_FUENTE_EXPERIENCIA_MAESTRIA_VALIDOS);

export function normalizarFuenteExperienciaMaestria(definicion, {
  etiqueta = "la fuente de experiencia de maestría",
} = {}) {
  validarObjetoPlano(definicion, etiqueta);
  const tipo = normalizarId(definicion.tipo, `El tipo de ${etiqueta}`);
  if (!CONJUNTO_TIPOS.has(tipo)) {
    throw new Error(`El tipo de fuente de experiencia "${tipo}" no existe.`);
  }
  if (!Number.isFinite(definicion.factor) || definicion.factor <= 0) {
    throw new Error(`El factor de ${etiqueta} debe ser mayor que 0.`);
  }

  const resultado = {
    tipo,
    factor: definicion.factor,
  };
  for (const clave of CLAVES_FILTRO_FUENTE) {
    if (definicion[clave] === undefined || definicion[clave] === null) continue;
    resultado[clave] = normalizarId(
      definicion[clave],
      `El filtro "${clave}" de ${etiqueta}`,
    );
  }

  for (const clave of Object.keys(definicion)) {
    if (clave === "tipo" || clave === "factor" || CLAVES_FILTRO_FUENTE.includes(clave)) {
      continue;
    }
    throw new Error(`La fuente de experiencia usa la clave desconocida "${clave}".`);
  }

  return Object.freeze(resultado);
}

export function normalizarEventoExperienciaMaestria(evento) {
  validarObjetoPlano(evento, "El evento de experiencia de maestría");
  const tipo = normalizarId(evento.tipo, "El tipo del evento de experiencia");
  if (!CONJUNTO_TIPOS.has(tipo)) {
    throw new Error(`El tipo de evento de experiencia "${tipo}" no existe.`);
  }
  const idEvento = normalizarTexto(evento.idEvento, "El ID del evento de experiencia");
  if (!Number.isFinite(evento.cantidad) || evento.cantidad < 0) {
    throw new Error("La cantidad del evento de experiencia debe ser numérica y no negativa.");
  }

  const resultado = {
    idEvento,
    tipo,
    cantidad: evento.cantidad,
    idComponente: normalizarTextoOpcional(evento.idComponente),
    idMaestria: normalizarIdOpcional(evento.idMaestria),
    familiaArma: normalizarIdOpcional(evento.familiaArma),
    categoriaArmadura: normalizarIdOpcional(evento.categoriaArmadura),
    familiaSecundaria: normalizarIdOpcional(evento.familiaSecundaria),
  };

  return Object.freeze(resultado);
}

export function fuenteExperienciaCoincide(fuente, evento, idMaestria) {
  if (fuente.tipo !== evento.tipo) return false;
  if (evento.idMaestria !== null && evento.idMaestria !== idMaestria) return false;
  for (const clave of CLAVES_FILTRO_FUENTE) {
    if (fuente[clave] === undefined) continue;
    if (evento[clave] !== fuente[clave]) return false;
  }
  return true;
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}

function normalizarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe contener texto.`);
  }
  return valor.trim();
}

function normalizarTextoOpcional(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  return normalizarTexto(valor, "El texto opcional");
}

function normalizarId(valor, descripcion) {
  return normalizarTexto(valor, descripcion).toLowerCase();
}

function normalizarIdOpcional(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  return normalizarId(valor, "El identificador opcional");
}
