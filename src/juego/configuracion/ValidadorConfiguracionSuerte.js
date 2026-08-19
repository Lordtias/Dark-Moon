const ATRIBUTOS_CANONICOS = Object.freeze([
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "suerte",
]);

export function validarConfiguracionSuerte(configuracionPersonaje) {
  if (
    configuracionPersonaje === null ||
    typeof configuracionPersonaje !== "object" ||
    Array.isArray(configuracionPersonaje)
  ) {
    throw new Error("La configuración del personaje no es válida.");
  }

  validarAtributosCanonicos(configuracionPersonaje.atributos);
  validarReglasSuerte(configuracionPersonaje.reglasSuerte);
  validarPesosProfesiones(configuracionPersonaje.profesiones);

  return configuracionPersonaje;
}

export function validarReglasSuerte(reglasSuerte) {
  if (
    reglasSuerte === null ||
    typeof reglasSuerte !== "object" ||
    Array.isArray(reglasSuerte)
  ) {
    throw new Error("Las reglas canónicas de Suerte no son válidas.");
  }

  validarReglaAjusteComercial(reglasSuerte.ajusteComercial);
  validarReglaHallazgoMagico(reglasSuerte.hallazgoMagico);
  return reglasSuerte;
}

function validarAtributosCanonicos(configuracionAtributos) {
  const lista = configuracionAtributos?.lista;
  if (!Array.isArray(lista)) {
    throw new Error("La configuración del personaje necesita una lista de atributos.");
  }

  const ids = lista.map((entrada) => entrada?.id);
  if (
    ids.length !== ATRIBUTOS_CANONICOS.length ||
    ATRIBUTOS_CANONICOS.some((id) => !ids.includes(id)) ||
    ids.includes("carisma")
  ) {
    throw new Error(
      "Los atributos del personaje deben usar el contrato canónico con Suerte.",
    );
  }
}

function validarPesosProfesiones(profesiones) {
  if (profesiones === null || typeof profesiones !== "object" || Array.isArray(profesiones)) {
    throw new Error("Las profesiones del personaje no son válidas.");
  }

  for (const [id, profesion] of Object.entries(profesiones)) {
    const pesos = profesion?.pesosAtributos;
    if (pesos === null || typeof pesos !== "object" || Array.isArray(pesos)) {
      throw new Error(`La profesión "${id}" necesita pesos de atributos válidos.`);
    }
    for (const atributo of ATRIBUTOS_CANONICOS) {
      if (!Number.isFinite(pesos[atributo]) || pesos[atributo] < 0) {
        throw new Error(
          `La profesión "${id}" necesita un peso válido para "${atributo}".`,
        );
      }
    }
    if (Object.prototype.hasOwnProperty.call(pesos, "carisma")) {
      throw new Error(`La profesión "${id}" todavía declara el atributo Carisma.`);
    }
  }
}

function validarReglaAjusteComercial(regla) {
  validarReglaBase(regla, "Ajuste comercial");
  if (!Number.isFinite(regla.variacionPorPunto) || regla.variacionPorPunto < 0) {
    throw new Error("La variación por punto de Ajuste comercial no es válida.");
  }
  if (regla.minimo > 0 || regla.maximo < 0 || regla.minimo > regla.maximo) {
    throw new Error("Los límites de Ajuste comercial no son válidos.");
  }
}

function validarReglaHallazgoMagico(regla) {
  validarReglaBase(regla, "Hallazgo mágico");
  if (
    !Number.isFinite(regla.variacionPesoPorPunto) ||
    regla.variacionPesoPorPunto < 0
  ) {
    throw new Error("La variación de peso por punto de Hallazgo mágico no es válida.");
  }
  if (regla.minimo < 0 || regla.maximo < regla.minimo) {
    throw new Error("Los límites de Hallazgo mágico no son válidos.");
  }
}

function validarReglaBase(regla, descripcion) {
  if (regla === null || typeof regla !== "object" || Array.isArray(regla)) {
    throw new Error(`La regla de ${descripcion} no es válida.`);
  }
  if (!Number.isInteger(regla.referencia) || regla.referencia < 0) {
    throw new Error(`La referencia de ${descripcion} no es válida.`);
  }
  if (!Number.isFinite(regla.minimo) || !Number.isFinite(regla.maximo)) {
    throw new Error(`Los límites de ${descripcion} deben ser números finitos.`);
  }
}
