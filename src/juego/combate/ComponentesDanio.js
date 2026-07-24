import { CONFIGURACION_COMBATE } from "../../config/ConfiguracionCombate.js";

// Tipos de daño admitidos por la tubería común.
//
// No se incorpora daño verdadero, arcano o genérico
// durante esta etapa.
export const TIPOS_DANIO = Object.freeze({
  FISICO: "fisico",
  FUEGO: "fuego",
  FRIO: "frio",
  RAYO: "rayo",
  VENENO: "veneno",
});

export const TIPOS_DANIO_VALIDOS = Object.freeze(
  Object.values(TIPOS_DANIO),
);

export const TIPOS_DANIO_ELEMENTAL = Object.freeze([
  TIPOS_DANIO.FUEGO,
  TIPOS_DANIO.FRIO,
  TIPOS_DANIO.RAYO,
  TIPOS_DANIO.VENENO,
]);

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

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

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
//
// El límite se aplica tanto al valor base como al resultado
// acumulado de atributos y equipo.
export function normalizarResistencia(valor = 0, descripcion = "La resistencia") {
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
//
// El resto de las propiedades del objeto se conserva sin cambios.
export function normalizarPropiedadesResistencias(propiedades = {}) {
  validarObjetoPlano(propiedades, "Las propiedades");

  const normalizadas = {
    ...propiedades,
  };

  for (const [tipo, nombrePropiedad] of Object.entries(
    PROPIEDAD_RESISTENCIA_POR_TIPO,
  )) {
    if (!Object.prototype.hasOwnProperty.call(normalizadas, nombrePropiedad)) {
      continue;
    }

    normalizadas[nombrePropiedad] = normalizarResistencia(
      normalizadas[nombrePropiedad],
      `La propiedad "${nombrePropiedad}"`,
    );
  }

  return normalizadas;
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
      {
        tipo,
        danioBruto: 0,
        danioMitigado: 0,
        danioFinal: 0,
      },
    ]),
  );
}

// Resuelve un componente sin aplicar Vida al objetivo.
//
// El bloqueo y la Armadura se usan únicamente para daño físico.
// Las resistencias se usan únicamente para su elemento.
// El redondeo se realiza una sola vez al final del componente.
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
  validarNumeroFinito(
    mitigacionBloqueoRecibida,
    "La mitigación de bloqueo",
  );

  const mitigacionBloqueo = bloqueoActivo
    ? limitar(
        mitigacionBloqueoRecibida,
        0,
        CONFIGURACION_COMBATE.limites.mitigacionBloqueoMaxima,
      )
    : 0;
  const proporcionBloqueo = mitigacionBloqueo / 100;
  const danioMitigadoBloqueo = bruto * proporcionBloqueo;
  const danioDespuesBloqueo = Math.max(
    0,
    bruto - danioMitigadoBloqueo,
  );

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
    reduccionArmadura,
    resistencia: resistenciaAplicada,
    reduccionResistencia,
    danioAntesRedondeo,
    danioMitigado: Math.max(0, bruto - danioFinal),
    danioFinal,
  };
}

// Resuelve un paquete completo y devuelve total y desglose.
//
// Esta función es determinista y puede probarse directamente
// desde la consola del navegador.
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
    validarObjetoPlano(
      componente,
      `El componente de daño ${indice + 1}`,
    );

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
    bloqueado: componentesResueltos.some(
      (componente) => componente.bloqueado,
    ),
    componentes: componentesResueltos,
    desgloseDanio,
  };
}
