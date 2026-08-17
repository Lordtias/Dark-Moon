export const OBJETIVOS_MODIFICADOR = Object.freeze({
  VIDA_MAXIMA: "vidaMaxima",
  MANA_MAXIMO: "manaMaximo",
  REGENERACION_VIDA: "regeneracionVida",
  REGENERACION_MANA: "regeneracionMana",
  PRECISION: "precision",
  EVASION: "evasion",
  ARMADURA: "armadura",
  PROBABILIDAD_CRITICO: "probabilidadCritico",
  MULTIPLICADOR_CRITICO: "multiplicadorCritico",
  PROBABILIDAD_BLOQUEO: "probabilidadBloqueo",
  MITIGACION_BLOQUEO: "mitigacionBloqueo",
  POTENCIA_EFECTOS: "potenciaEfectos",
  POTENCIA_HABILIDAD: "potenciaHabilidad",
  RESISTENCIA_FUEGO: "resistenciaFuego",
  RESISTENCIA_FRIO: "resistenciaFrio",
  RESISTENCIA_RAYO: "resistenciaRayo",
  RESISTENCIA_VENENO: "resistenciaVeneno",
  RESISTENCIA_CONGELAMIENTO: "resistenciaCongelamiento",
  RESISTENCIA_ATURDIMIENTO: "resistenciaAturdimiento",
  RESISTENCIA_ENVENENAMIENTO: "resistenciaEnvenenamiento",
  RESISTENCIA_QUEMADURA: "resistenciaQuemadura",
  ALCANCE_ATAQUE: "alcanceAtaque",
  PERCEPCION: "percepcion",
  FACTOR_TIEMPO: "factorTiempo",
  FACTOR_MOVIMIENTO: "factorMovimiento",
  FACTOR_ATAQUE: "factorAtaque",
  FACTOR_ACCION: "factorAccion",
  FACTOR_CONSUMO: "factorConsumo",
  MULTIPLICADOR_DANIO_FUENTE: "multiplicadorDanioFuente",
});

export const OBJETIVOS_MODIFICADOR_VALIDOS = Object.freeze(
  Object.values(OBJETIVOS_MODIFICADOR),
);

export const OPERACIONES_MODIFICADOR = Object.freeze({
  SUMAR: "sumar",
  PORCENTAJE_BASE: "porcentaje_base",
  PORCENTAJE_TOTAL: "porcentaje_total",
  MULTIPLICAR_REDONDEAR: "multiplicar_redondear",
  MULTIPLICAR: "multiplicar",
});

export const OPERACIONES_MODIFICADOR_VALIDAS = Object.freeze(
  Object.values(OPERACIONES_MODIFICADOR),
);

export const AMBITOS_AFIJO = Object.freeze({
  LOCAL_OBJETO: "local_objeto",
  PORTADOR: "portador",
});

export const AMBITOS_AFIJO_VALIDOS = Object.freeze(
  Object.values(AMBITOS_AFIJO),
);

export const CLAVES_CONTEXTO_MODIFICADOR = Object.freeze({
  TIPO_COMBATIENTE: "tipoCombatiente",
  FAMILIA_ARMA: "familiaArma",
  MANO: "mano",
  TIPO_ATAQUE: "tipoAtaque",
  ES_ATAQUE_DUAL: "esAtaqueDual",
  CATEGORIA_ARMADURA: "categoriaArmadura",
  FAMILIA_SECUNDARIA: "familiaSecundaria",
  CONJUNTO_ARMADURA_COMPLETO: "conjuntoArmaduraCompleto",
});

export const CLAVES_CONTEXTO_MODIFICADOR_VALIDAS = Object.freeze(
  Object.values(CLAVES_CONTEXTO_MODIFICADOR),
);

const CONJUNTO_OBJETIVOS = new Set(OBJETIVOS_MODIFICADOR_VALIDOS);
const CONJUNTO_OPERACIONES = new Set(OPERACIONES_MODIFICADOR_VALIDAS);
const CONJUNTO_CONTEXTO = new Set(CLAVES_CONTEXTO_MODIFICADOR_VALIDAS);
const CONJUNTO_AMBITOS = new Set(AMBITOS_AFIJO_VALIDOS);

export function validarObjetivoModificador(objetivo) {
  if (typeof objetivo !== "string" || !CONJUNTO_OBJETIVOS.has(objetivo)) {
    throw new Error(`El objetivo modificable "${objetivo}" no existe.`);
  }
  return objetivo;
}

export function validarOperacionModificador(operacion) {
  if (typeof operacion !== "string" || !CONJUNTO_OPERACIONES.has(operacion)) {
    throw new Error(`La operación de modificador "${operacion}" no existe.`);
  }
  return operacion;
}

export function validarAmbitoAfijo(ambito) {
  if (typeof ambito !== "string" || !CONJUNTO_AMBITOS.has(ambito)) {
    throw new Error(`El ámbito de afijo "${ambito}" no existe.`);
  }
  return ambito;
}

export function normalizarContextoModificador(contexto = {}) {
  validarObjetoPlano(contexto, "El contexto de modificadores");
  const resultado = {};
  for (const [clave, valor] of Object.entries(contexto)) {
    if (!CONJUNTO_CONTEXTO.has(clave)) {
      throw new Error(`La clave de contexto "${clave}" no existe.`);
    }
    validarValorContexto(valor, `El valor de contexto "${clave}"`);
    resultado[clave] = valor;
  }
  return Object.freeze(resultado);
}

export function normalizarCondicionesModificador(condiciones = {}) {
  validarObjetoPlano(condiciones, "Las condiciones del modificador");
  const resultado = {};
  for (const [clave, valor] of Object.entries(condiciones)) {
    if (!CONJUNTO_CONTEXTO.has(clave)) {
      throw new Error(`La condición utiliza la clave desconocida "${clave}".`);
    }
    if (Array.isArray(valor)) {
      if (valor.length === 0) {
        throw new Error(`La condición "${clave}" no puede usar una lista vacía.`);
      }
      valor.forEach((elemento, indice) =>
        validarValorContexto(
          elemento,
          `El valor ${indice + 1} de la condición "${clave}"`,
        ),
      );
      resultado[clave] = Object.freeze([...valor]);
    } else {
      validarValorContexto(valor, `El valor de la condición "${clave}"`);
      resultado[clave] = valor;
    }
  }
  return Object.freeze(resultado);
}

export function normalizarDescriptorModificador(descriptor, {
  origenPredeterminado = "desconocido",
} = {}) {
  validarObjetoPlano(descriptor, "El descriptor de modificador");
  const objetivo = validarObjetivoModificador(descriptor.objetivo);
  const operacion = validarOperacionModificador(descriptor.operacion);
  if (!Number.isFinite(descriptor.valor)) {
    throw new Error(`El modificador de "${objetivo}" necesita un valor numérico.`);
  }
  if (
    (operacion === OPERACIONES_MODIFICADOR.MULTIPLICAR ||
      operacion === OPERACIONES_MODIFICADOR.MULTIPLICAR_REDONDEAR) &&
    descriptor.valor < 0
  ) {
    throw new Error("Un multiplicador no puede ser negativo.");
  }

  const id = normalizarTexto(
    descriptor.id ?? `${origenPredeterminado}:${objetivo}:${operacion}`,
    "El ID del modificador",
  );
  const origen = normalizarTexto(
    descriptor.origen ?? origenPredeterminado,
    "El origen del modificador",
  );
  const fuente = descriptor.fuente ?? null;
  const condiciones = normalizarCondicionesModificador(
    descriptor.condiciones ?? {},
  );

  return Object.freeze({
    id,
    objetivo,
    operacion,
    valor: descriptor.valor,
    origen,
    fuente,
    condiciones,
  });
}

export function cumpleCondicionesModificador(condiciones, contexto) {
  for (const [clave, esperado] of Object.entries(condiciones)) {
    const actual = contexto[clave];
    if (Array.isArray(esperado)) {
      if (!esperado.includes(actual)) return false;
      continue;
    }
    if (actual !== esperado) return false;
  }
  return true;
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
  const prototipo = Object.getPrototypeOf(valor);
  if (prototipo !== Object.prototype && prototipo !== null) {
    throw new Error(`${descripcion} debe ser un objeto plano.`);
  }
}

function validarValorContexto(valor, descripcion) {
  if (valor === null) return;
  const tipo = typeof valor;
  if (tipo === "string" || tipo === "boolean" || tipo === "number") {
    if (tipo === "number" && !Number.isFinite(valor)) {
      throw new Error(`${descripcion} debe ser finito.`);
    }
    return;
  }
  throw new Error(
    `${descripcion} debe ser texto, número, booleano o null.`,
  );
}

function normalizarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe contener texto.`);
  }
  return valor.trim();
}
