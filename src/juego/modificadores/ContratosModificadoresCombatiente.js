import { validarAtributoHabilidad } from "../habilidades/ContratosAtributosHabilidad.js";

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
  // Bonificaciones porcentuales globales de daño directo.
  DANO_FISICO: "danoFisico",
  DANO_MAGICO: "danoMagico",
  DANO_HABILIDAD: "danoHabilidad",
  // Bonificación porcentual contextual para un tipo elemental concreto.
  DANO_TIPO: "danoTipo",
  // Potencia general de efectos y potencia contextual de un efecto concreto.
  POTENCIA_EFECTOS: "potenciaEfectos",
  POTENCIA_EFECTO: "potenciaEfecto",
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
  COSTO_FASE_ACCION: "costoFaseAccion",
  DISPERSION: "dispersion",
  PENETRACION_ARMADURA: "penetracionArmadura",
  MULTIPLICADOR_DANIO_FUENTE: "multiplicadorDanioFuente",
  // Resistencia porcentual efectiva usada para reducir o aumentar la probabilidad de Maldiciones.
  RESISTENCIA_MENTAL: "resistenciaMental",
  // Variación decimal ya resuelta que consume el sistema de comercio.
  AJUSTE_COMERCIAL: "ajusteComercial",
  // Bonificación porcentual aplicada al peso de rarezas superiores a Común.
  HALLAZGO_MAGICO: "hallazgoMagico",
  // Contenedor canónico para modificar un atributo interno validado de una habilidad.
  ATRIBUTO_HABILIDAD: "atributoHabilidad",
});

export const OBJETIVOS_MODIFICADOR_VALIDOS = Object.freeze(
  Object.values(OBJETIVOS_MODIFICADOR),
);

export const OPERACIONES_MODIFICADOR = Object.freeze({
  // Suma/resta una magnitud plana al valor base.
  SUMAR: "sumar",
  // Porcentaje calculado exclusivamente sobre el valor base original.
  PORCENTAJE_BASE: "porcentaje_base",
  // Porcentaje aplicado al subtotal posterior a planos y porcentaje sobre base.
  PORCENTAJE_TOTAL: "porcentaje_total",
  // Porcentajes de tipo «más/menos» que se multiplican entre sí.
  PORCENTAJE_MULTIPLICATIVO: "porcentaje_multiplicativo",
  // Variación de velocidad expresada como divisor del tiempo/coste resuelto.
  PORCENTAJE_INVERSO: "porcentaje_inverso",
  // Multiplica y redondea inmediatamente antes de continuar la composición.
  MULTIPLICAR_REDONDEAR: "multiplicar_redondear",
  // Multiplica sin introducir redondeo intermedio.
  MULTIPLICAR: "multiplicar",
  // Impone un techo al resultado compuesto; Ceguera usa esta operación sobre Percepción.
  LIMITAR_MAXIMO: "limitar_maximo",
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
  // Clase funcional del actor que recibe/resuelve el modificador: jugador, enemigo, etc.
  TIPO_COMBATIENTE: "tipoCombatiente",
  // Familia del arma que controla la fuente principal del ataque (daga, arco, etc.).
  FAMILIA_ARMA: "familiaArma",
  // Mano/fuente que se está resolviendo dentro de un ataque: principal o secundaria.
  MANO: "mano",
  // Tipo canónico del ataque físico: cuerpo a cuerpo o distancia.
  TIPO_ATAQUE: "tipoAtaque",
  // Tipo de acción compuesta cuyo coste contextual se está resolviendo.
  TIPO_ACCION: "tipoAccion",
  // Fase concreta de una acción compuesta: preparación o ejecución.
  FASE_ACCION: "faseAccion",
  // Clasificación canónica de la acción ofensiva que permite contextualizar
  // posturas tácticas sin depender del ID visible de una habilidad.
  ETIQUETA_ACCION: "etiquetaAccion",
  // Indica si la resolución actual pertenece a un ataque con dos fuentes de arma.
  ES_ATAQUE_DUAL: "esAtaqueDual",
  // Categoría conjunta de las cinco piezas corporales: ligera, media, pesada o mixta.
  CATEGORIA_ARMADURA: "categoriaArmadura",
  // Familia del objeto equipado en la mano/ranura secundaria (escudo, daga, etc.).
  FAMILIA_SECUNDARIA: "familiaSecundaria",
  // Verdadero cuando las cinco ranuras corporales están ocupadas por una categoría coherente.
  CONJUNTO_ARMADURA_COMPLETO: "conjuntoArmaduraCompleto",
  // ID canónico de la habilidad cuya configuración efectiva se está resolviendo.
  ID_HABILIDAD: "idHabilidad",
  // Maestría de la habilidad (fuego, frio, rayo, veneno, etc.).
  MAESTRIA_HABILIDAD: "maestriaHabilidad",
  // Tipo de objetivo estructural de la habilidad: propio, enemigo o casilla.
  TIPO_OBJETIVO_HABILIDAD: "tipoObjetivoHabilidad",
  // Forma de impacto estructural: individual, radio, cadena o linea.
  FORMA_IMPACTO_HABILIDAD: "formaImpactoHabilidad",
  // Clave canónica del atributo interno de habilidad que se está resolviendo.
  ATRIBUTO_HABILIDAD: "atributoHabilidad",
  // Tipo elemental/físico del componente de daño que se está resolviendo.
  TIPO_DANIO: "tipoDanio",
  // Clave histórica usada por atributos internos de habilidad.
  TIPO_DANIO_HABILIDAD: "tipoDanioHabilidad",
  // Fase del daño/efecto: impacto_directo, efecto_periodico o zona.
  FASE_HABILIDAD: "faseHabilidad",
  // Efecto temporal concreto cuya potencia específica se está resolviendo.
  EFECTO_ID: "efectoId",
  // Efecto temporal concreto asociado a la resolución interna de una habilidad.
  EFECTO_ID_HABILIDAD: "efectoIdHabilidad",
  // Tipo canónico del efecto temporal asociado a la habilidad.
  TIPO_EFECTO_HABILIDAD: "tipoEfectoHabilidad",
  // Objetivo numérico modificado por un efecto temporal de la habilidad.
  OBJETIVO_MODIFICADOR_EFECTO: "objetivoModificadorEfecto",
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

// Escala la magnitud declarada de un modificador sin resolver el objetivo.
// Las operaciones multiplicativas escalan su distancia respecto del neutro 1;
// los límites máximos son estructurales y no cambian con la intensidad.
export function escalarMagnitudModificador(descriptor, escala) {
  if (
    !descriptor ||
    typeof descriptor !== "object" ||
    Array.isArray(descriptor)
  ) {
    throw new Error(
      "Se necesita un descriptor de modificador para escalar su magnitud.",
    );
  }
  const operacion = validarOperacionModificador(descriptor.operacion);
  if (!Number.isFinite(descriptor.valor)) {
    throw new Error("La magnitud del modificador debe ser un número finito.");
  }
  if (!Number.isFinite(escala) || escala < 0) {
    throw new Error("La escala del modificador debe ser un número finito no negativo.");
  }

  switch (operacion) {
    case OPERACIONES_MODIFICADOR.MULTIPLICAR:
    case OPERACIONES_MODIFICADOR.MULTIPLICAR_REDONDEAR:
      return 1 + (descriptor.valor - 1) * escala;
    case OPERACIONES_MODIFICADOR.LIMITAR_MAXIMO:
      return descriptor.valor;
    default:
      return descriptor.valor * escala;
  }
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
    if (clave === CLAVES_CONTEXTO_MODIFICADOR.ATRIBUTO_HABILIDAD && valor !== null) {
      validarAtributoHabilidad(valor);
    }
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
      valor.forEach((elemento, indice) => {
        validarValorContexto(
          elemento,
          `El valor ${indice + 1} de la condición "${clave}"`,
        );
        if (clave === CLAVES_CONTEXTO_MODIFICADOR.ATRIBUTO_HABILIDAD) {
          validarAtributoHabilidad(elemento);
        }
      });
      resultado[clave] = Object.freeze([...valor]);
    } else {
      validarValorContexto(valor, `El valor de la condición "${clave}"`);
      if (clave === CLAVES_CONTEXTO_MODIFICADOR.ATRIBUTO_HABILIDAD && valor !== null) {
        validarAtributoHabilidad(valor);
      }
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
  if (
    (operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_MULTIPLICATIVO ||
      operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_INVERSO) &&
    descriptor.valor <= -100
  ) {
    throw new Error("Un porcentaje multiplicativo/inverso debe ser mayor que -100.");
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
  if (
    objetivo === OBJETIVOS_MODIFICADOR.ATRIBUTO_HABILIDAD &&
    condiciones[CLAVES_CONTEXTO_MODIFICADOR.ATRIBUTO_HABILIDAD] === undefined
  ) {
    throw new Error(
      'Un modificador de "atributoHabilidad" debe declarar qué atributo canónico modifica.',
    );
  }

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
