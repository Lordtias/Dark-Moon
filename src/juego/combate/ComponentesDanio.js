import { limitar } from "../../utilidades/Numeros.js";
import { normalizarPropiedadesResistenciasEfectos } from "../efectos/ResistenciasEfectos.js";
import { CONFIGURACION_COMBATE } from "../../config/ConfiguracionCombate.js";

// Tipos de daño admitidos por la tubería común.
//
// No se incorpora daño verdadero, arcano o genérico.
export const TIPOS_DANIO = Object.freeze({
  FISICO: "fisico",
  FUEGO: "fuego",
  FRIO: "frio",
  RAYO: "rayo",
  VENENO: "veneno",
});

export const TIPOS_DANIO_VALIDOS = Object.freeze(Object.values(TIPOS_DANIO));
const PROPIEDAD_RESISTENCIA_POR_TIPO = Object.freeze({
  [TIPOS_DANIO.FUEGO]: "resistenciaFuego",
  [TIPOS_DANIO.FRIO]: "resistenciaFrio",
  [TIPOS_DANIO.RAYO]: "resistenciaRayo",
  [TIPOS_DANIO.VENENO]: "resistenciaVeneno",
});

const ETIQUETA_TIPO_DANIO = Object.freeze({
  [TIPOS_DANIO.FISICO]: "físico",
  [TIPOS_DANIO.FUEGO]: "fuego",
  [TIPOS_DANIO.FRIO]: "frío",
  [TIPOS_DANIO.RAYO]: "rayo",
  [TIPOS_DANIO.VENENO]: "veneno",
});

// Describe el contrato canónico para el daño elemental local de una fuente.
// Sirve por igual para armas, afijos y ataques naturales.
export const RANGOS_DANIO_ELEMENTAL_LOCAL = Object.freeze([
  Object.freeze({
    tipo: TIPOS_DANIO.FUEGO,
    nombre: "fuego",
    propiedadMinimo: "danioFuegoLocalMinimo",
    propiedadMaximo: "danioFuegoLocalMaximo",
  }),
  Object.freeze({
    tipo: TIPOS_DANIO.FRIO,
    nombre: "frío",
    propiedadMinimo: "danioFrioLocalMinimo",
    propiedadMaximo: "danioFrioLocalMaximo",
  }),
  Object.freeze({
    tipo: TIPOS_DANIO.RAYO,
    nombre: "rayo",
    propiedadMinimo: "danioRayoLocalMinimo",
    propiedadMaximo: "danioRayoLocalMaximo",
  }),
  Object.freeze({
    tipo: TIPOS_DANIO.VENENO,
    nombre: "veneno",
    propiedadMinimo: "danioVenenoLocalMinimo",
    propiedadMaximo: "danioVenenoLocalMaximo",
  }),
]);

function validarNumeroFinito(valor, descripcion) {
  if (!Number.isFinite(valor)) {
    throw new Error(`${descripcion} debe ser un número finito.`);
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe formar un objeto válido.`);
  }
}

function obtenerRangoElementalLocal(propiedades, configuracion, origen) {
  const minimo = propiedades[configuracion.propiedadMinimo] ?? 0;
  const maximo = propiedades[configuracion.propiedadMaximo] ?? 0;

  if (
    !Number.isFinite(minimo) ||
    !Number.isFinite(maximo) ||
    minimo < 0 ||
    maximo < minimo
  ) {
    throw new Error(
      `El rango de daño de ${configuracion.nombre} de ${origen} no es válido.`,
    );
  }

  return { minimo, maximo };
}

export function crearDescriptoresDanioElementalLocal(
  propiedades,
  { origen = "la fuente de ataque" } = {},
) {
  validarObjetoPlano(propiedades, origen);

  return RANGOS_DANIO_ELEMENTAL_LOCAL.flatMap((configuracion) => {
    const rango = obtenerRangoElementalLocal(
      propiedades,
      configuracion,
      origen,
    );
    if (rango.minimo === 0 && rango.maximo === 0) {
      return [];
    }

    return [
      {
        tipo: configuracion.tipo,
        minimoLocal: rango.minimo,
        maximoLocal: rango.maximo,
        // El afijo o ataque natural ya representa un rango terminado.
        // No se vuelve a escalar con atributos ni con Potencia de Habilidad.
        multiplicadorAtributo: 1,
        aplicaDanioPlanoGlobal: false,
        aplicaMultiplicadorGlobal: false,
        aplicaCritico: true,
      },
    ];
  });
}

export function copiarRangosDanioElementalLocal(
  propiedades,
  { origen = "la fuente de ataque" } = {},
) {
  validarObjetoPlano(propiedades, origen);
  const copia = {};

  for (const configuracion of RANGOS_DANIO_ELEMENTAL_LOCAL) {
    const rango = obtenerRangoElementalLocal(
      propiedades,
      configuracion,
      origen,
    );
    copia[configuracion.propiedadMinimo] = rango.minimo;
    copia[configuracion.propiedadMaximo] = rango.maximo;
  }

  return copia;
}

export function esTipoDanioValido(tipo) {
  return TIPOS_DANIO_VALIDOS.includes(tipo);
}

export function normalizarTipoDanio(tipo) {
  if (typeof tipo !== "string" || tipo.trim() === "") {
    throw new Error("El tipo de daño es obligatorio.");
  }
  const normalizado = tipo.trim().toLowerCase();
  if (!esTipoDanioValido(normalizado)) {
    throw new Error(`El tipo de daño "${tipo}" no es válido.`);
  }

  return normalizado;
}

export function obtenerEtiquetaTipoDanio(tipo) {
  return ETIQUETA_TIPO_DANIO[normalizarTipoDanio(tipo)];
}

// Las resistencias se normalizan al contrato inicial 0–75.
// El límite se aplica tanto al valor base como al resultado acumulado.
export function normalizarResistencia(
  valor = 0,
  descripcion = "La resistencia",
) {
  validarNumeroFinito(valor, descripcion);
  return limitar(
    valor,
    CONFIGURACION_COMBATE.resistencias.minima,
    CONFIGURACION_COMBATE.resistencias.maxima,
  );
}

export function normalizarResistencias(resistencias = {}) {
  validarObjetoPlano(resistencias, "Las resistencias");
  return {
    fuego: normalizarResistencia(
      resistencias.fuego ?? 0,
      "La resistencia al fuego",
    ),
    frio: normalizarResistencia(
      resistencias.frio ?? 0,
      "La resistencia al frío",
    ),
    rayo: normalizarResistencia(
      resistencias.rayo ?? 0,
      "La resistencia al rayo",
    ),
    veneno: normalizarResistencia(
      resistencias.veneno ?? 0,
      "La resistencia al veneno",
    ),
  };
}

// Normaliza solamente las propiedades de resistencia presentes.
export function normalizarPropiedadesResistencias(propiedades = {}) {
  validarObjetoPlano(propiedades, "Las propiedades");

  const normalizadas = { ...propiedades };
  for (const nombrePropiedad of Object.values(PROPIEDAD_RESISTENCIA_POR_TIPO)) {
    if (!Object.prototype.hasOwnProperty.call(normalizadas, nombrePropiedad)) {
      continue;
    }

    normalizadas[nombrePropiedad] = normalizarResistencia(
      normalizadas[nombrePropiedad],
      `La propiedad "${nombrePropiedad}"`,
    );
  }

  return normalizarPropiedadesResistenciasEfectos(normalizadas);
}

export function obtenerResistenciaPorTipo(resistencias, tipo) {
  const tipoNormalizado = normalizarTipoDanio(tipo);
  if (tipoNormalizado === TIPOS_DANIO.FISICO) {
    return 0;
  }

  const normalizadas = normalizarResistencias(resistencias ?? {});
  return normalizadas[tipoNormalizado];
}

// Conserva la fórmula física vigente.
export function calcularReduccionArmadura(armadura, danioFisicoEntrante) {
  validarNumeroFinito(armadura, "La Armadura");
  validarNumeroFinito(danioFisicoEntrante, "El daño físico entrante");

  if (armadura <= 0 || danioFisicoEntrante <= 0) {
    return 0;
  }

  const factor = CONFIGURACION_COMBATE.armadura.factorDanio;
  return armadura / (armadura + factor * danioFisicoEntrante);
}

export function crearDesgloseDanioVacio() {
  return Object.fromEntries(
    TIPOS_DANIO_VALIDOS.map((tipo) => [
      tipo,
      { tipo, danioBruto: 0, danioMitigado: 0, danioFinal: 0 },
    ]),
  );
}

// Resuelve un componente sin aplicar Vida al objetivo.
export function resolverComponenteDanio({
  tipo,
  danioBruto,
  armadura = 0,
  resistencias = {},
  bloqueo = {},
} = {}) {
  const tipoNormalizado = normalizarTipoDanio(tipo);
  validarNumeroFinito(danioBruto, "El daño bruto");
  validarNumeroFinito(armadura, "La Armadura");
  if (danioBruto < 0) {
    throw new Error("El daño bruto no puede ser negativo.");
  }

  const bruto = danioBruto;
  const esFisico = tipoNormalizado === TIPOS_DANIO.FISICO;
  const bloqueoActivo = esFisico && bloqueo?.activo === true;
  const mitigacionBloqueoRecibida = bloqueo?.mitigacion ?? 0;
  validarNumeroFinito(mitigacionBloqueoRecibida, "La mitigación de bloqueo");
  const mitigacionBloqueo = bloqueoActivo
    ? limitar(
        mitigacionBloqueoRecibida,
        0,
        CONFIGURACION_COMBATE.limites.mitigacionBloqueoMaxima,
      )
    : 0;
  const proporcionBloqueo = mitigacionBloqueo / 100;
  const danioMitigadoBloqueo = bruto * proporcionBloqueo;
  const danioDespuesBloqueo = Math.max(0, bruto - danioMitigadoBloqueo);

  let armaduraAplicada = 0;
  let reduccionArmadura = 0;
  let resistenciaAplicada = 0;
  let reduccionResistencia = 0;
  let danioAntesRedondeo = danioDespuesBloqueo;

  if (esFisico) {
    armaduraAplicada = Math.max(0, armadura);
    reduccionArmadura = calcularReduccionArmadura(
      armaduraAplicada,
      danioDespuesBloqueo,
    );
    danioAntesRedondeo = danioDespuesBloqueo * (1 - reduccionArmadura);
  } else {
    resistenciaAplicada = obtenerResistenciaPorTipo(
      resistencias,
      tipoNormalizado,
    );
    reduccionResistencia = resistenciaAplicada / 100;
    danioAntesRedondeo = bruto * (1 - reduccionResistencia);
  }

  const danioFinal = Math.max(0, Math.floor(danioAntesRedondeo));
  return {
    tipo: tipoNormalizado,
    etiqueta: obtenerEtiquetaTipoDanio(tipoNormalizado),
    danioBruto: bruto,
    bloqueado: bloqueoActivo,
    mitigacionBloqueo,
    danioMitigadoBloqueo,
    danioDespuesBloqueo,
    armadura: armaduraAplicada,
    factorArmadura: CONFIGURACION_COMBATE.armadura.factorDanio,
    reduccionArmadura,
    resistencia: resistenciaAplicada,
    reduccionResistencia,
    danioAntesRedondeo,
    danioMitigado: Math.max(0, bruto - danioFinal),
    danioFinal,
  };
}

// Resuelve un paquete completo y devuelve total y desglose.
export function resolverPaqueteDanio({
  componentes,
  armadura = 0,
  resistencias = {},
  bloqueo = {},
} = {}) {
  if (!Array.isArray(componentes) || componentes.length === 0) {
    throw new Error("El paquete de daño necesita al menos un componente.");
  }

  const componentesResueltos = componentes.map((componente, indice) => {
    validarObjetoPlano(componente, `El componente de daño ${indice + 1}`);
    return resolverComponenteDanio({
      tipo: componente.tipo,
      danioBruto: componente.danioBruto,
      armadura,
      resistencias,
      bloqueo,
    });
  });

  const desgloseDanio = crearDesgloseDanioVacio();
  for (const componente of componentesResueltos) {
    const acumulado = desgloseDanio[componente.tipo];
    acumulado.danioBruto += componente.danioBruto;
    acumulado.danioMitigado += componente.danioMitigado;
    acumulado.danioFinal += componente.danioFinal;
  }

  return {
    danioBruto: componentesResueltos.reduce(
      (total, componente) => total + componente.danioBruto,
      0,
    ),
    danioCalculado: componentesResueltos.reduce(
      (total, componente) => total + componente.danioFinal,
      0,
    ),
    danioMitigado: componentesResueltos.reduce(
      (total, componente) => total + componente.danioMitigado,
      0,
    ),
    bloqueado: componentesResueltos.some((componente) => componente.bloqueado),
    componentes: componentesResueltos,
    desgloseDanio,
  };
}
