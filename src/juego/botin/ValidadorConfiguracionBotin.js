export const MARCOS_BOTIN = Object.freeze({
  EQUIPAMIENTO: "equipamiento",
  COMUNES: "comunes",
  MATERIALES: "materiales",
  DESECHABLES: "desechables",
});

export const LISTA_MARCOS_BOTIN = Object.freeze(Object.values(MARCOS_BOTIN));

const MARCOS_BOTIN_VALIDOS = new Set(LISTA_MARCOS_BOTIN);

// Valida únicamente datos declarativos. El motor no interpreta nombres de
// entidades ni perfiles concretos: cualquier perfil válido puede ser usado por
// cualquier fuente que lo solicite.
export function validarConfiguracionBotin(configuracion) {
  validarObjetoPlano(configuracion, "la configuración de perfiles de botín");

  const idsPerfiles = Object.keys(configuracion);
  if (idsPerfiles.length === 0) {
    throw new Error("La configuración de botín necesita al menos un perfil.");
  }

  const resultado = {};

  for (const [idOriginal, perfil] of Object.entries(configuracion)) {
    const idPerfil = normalizarId(idOriginal, "perfil de botín");
    validarObjetoPlano(perfil, `el perfil de botín "${idPerfil}"`);

    const tiradas = validarTiradas(perfil.tiradas, idPerfil);
    const pesosMarcos = validarPesosMarcos(perfil.pesosMarcos, idPerfil);

    resultado[idPerfil] = {
      ...perfil,
      descripcion:
        typeof perfil.descripcion === "string" ? perfil.descripcion.trim() : "",
      tiradas,
      pesosMarcos,
    };
  }

  return resultado;
}

export function validarReglasBotin(configuracion) {
  validarObjetoPlano(configuracion, "las reglas de botín");
  validarObjetoPlano(configuracion.destruccion, "las reglas de destrucción del botín");

  const probabilidadSupervivenciaContenido =
    configuracion.destruccion.probabilidadSupervivenciaContenido;

  if (
    !Number.isFinite(probabilidadSupervivenciaContenido) ||
    probabilidadSupervivenciaContenido < 0 ||
    probabilidadSupervivenciaContenido > 100
  ) {
    throw new Error(
      "La probabilidad de supervivencia del contenido debe estar entre 0 y 100.",
    );
  }

  return {
    destruccion: {
      probabilidadSupervivenciaContenido,
    },
  };
}

export function validarMarcoBotin(marco, descripcion = "marco de botín") {
  const normalizado = normalizarId(marco, descripcion);

  if (!MARCOS_BOTIN_VALIDOS.has(normalizado)) {
    throw new Error(
      `El ${descripcion} "${normalizado}" no existe. ` +
        `Valores válidos: ${LISTA_MARCOS_BOTIN.join(", ")}.`,
    );
  }

  return normalizado;
}

function validarTiradas(tiradas, idPerfil) {
  validarObjetoPlano(tiradas, `las tiradas del perfil "${idPerfil}"`);

  const cantidadMinima = tiradas.cantidadMinima;
  const cantidadMaxima = tiradas.cantidadMaxima;
  const probabilidad = tiradas.probabilidad;

  if (!Number.isInteger(cantidadMinima) || cantidadMinima < 0) {
    throw new Error(
      `El perfil "${idPerfil}" necesita una cantidad mínima de tiradas ` +
        "entera y mayor o igual que 0.",
    );
  }

  if (!Number.isInteger(cantidadMaxima) || cantidadMaxima < cantidadMinima) {
    throw new Error(
      `El perfil "${idPerfil}" necesita una cantidad máxima de tiradas ` +
        "entera y mayor o igual que la mínima.",
    );
  }

  if (!Number.isFinite(probabilidad) || probabilidad < 0 || probabilidad > 100) {
    throw new Error(
      `La probabilidad de tirada del perfil "${idPerfil}" debe estar entre 0 y 100.`,
    );
  }

  return {
    cantidadMinima,
    cantidadMaxima,
    probabilidad,
  };
}

function validarPesosMarcos(pesos, idPerfil) {
  validarObjetoPlano(pesos, `los pesos de marcos del perfil "${idPerfil}"`);

  const claves = Object.keys(pesos);
  const desconocidas = claves.filter((marco) => !MARCOS_BOTIN_VALIDOS.has(marco));

  if (desconocidas.length > 0) {
    throw new Error(
      `El perfil "${idPerfil}" contiene marcos desconocidos: ` +
        desconocidas.join(", ") +
        ".",
    );
  }

  const resultado = {};
  let total = 0;

  for (const marco of LISTA_MARCOS_BOTIN) {
    const peso = pesos[marco] ?? 0;

    if (!Number.isFinite(peso) || peso < 0) {
      throw new Error(
        `El peso del marco "${marco}" en el perfil "${idPerfil}" ` +
          "debe ser un número mayor o igual que 0.",
      );
    }

    resultado[marco] = peso;
    total += peso;
  }

  if (total <= 0) {
    throw new Error(
      `El perfil "${idPerfil}" necesita al menos un marco con peso mayor que 0.`,
    );
  }

  return resultado;
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita ${descripcion} válida.`);
  }
}

function normalizarId(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`Se necesita un ${descripcion} válido.`);
  }

  return valor.trim().toLowerCase();
}
