import { CONFIGURACION_COMBATE } from "../../../config/ConfiguracionCombate.js";

import { obtenerConfiguracionAtaque } from "./ConfiguracionAtaque.js";

const RESISTENCIAS = ["fuego", "frio", "rayo", "veneno"];

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function sumarPropiedad(objetos, propiedad) {
  return objetos.reduce((total, objeto) => {
    const valor = objeto?.propiedades?.[propiedad] ?? 0;

    return total + (Number.isFinite(valor) ? valor : 0);
  }, 0);
}

function multiplicarBonosMas(objetos, propiedad) {
  return objetos.reduce((multiplicador, objeto) => {
    const valor = objeto?.propiedades?.[propiedad] ?? 0;

    if (!Number.isFinite(valor)) {
      return multiplicador;
    }

    return multiplicador * (1 + valor / 100);
  }, 1);
}

function obtenerObjetosEquipados(combatiente) {
  return combatiente.equipamiento?.obtenerObjetosEquipados() ?? [];
}

// Calcula Vida y Maná sin necesitar
// una instancia completa de Combatiente.
export function calcularRecursosMaximos({
  nivel,
  atributos,
  estadisticasBase,
  objetosEquipados = [],
} = {}) {
  const coeficientes = CONFIGURACION_COMBATE.atributos;

  const vidaMaxima = Math.max(
    1,

    estadisticasBase.vida +
      (nivel - 1) * estadisticasBase.vidaPorNivel +
      coeficientes.vidaPorConstitucion * atributos.constitucion +
      sumarPropiedad(objetosEquipados, "vidaMaxima"),
  );

  const manaMaximo = Math.max(
    0,

    estadisticasBase.mana +
      (nivel - 1) * estadisticasBase.manaPorNivel +
      coeficientes.manaPorInteligencia * atributos.inteligencia +
      sumarPropiedad(objetosEquipados, "manaMaximo"),
  );

  return {
    vidaMaxima: Math.round(vidaMaxima),

    manaMaximo: Math.round(manaMaximo),
  };
}

// Cada arma escala con su propio atributo
// antes de sumar su daño.
function calcularComponenteDanio(combatiente, fuente) {
  const propiedades = fuente.propiedades;

  const minimoBase = propiedades.danioFisicoMinimo;

  const maximoBase = propiedades.danioFisicoMaximo;

  const planoLocalMinimo = propiedades.danioFisicoLocalMinimo ?? 0;

  const planoLocalMaximo = propiedades.danioFisicoLocalMaximo ?? 0;

  const porcentajeLocal = (propiedades.danioFisicoLocalPorcentaje ?? 0) / 100;

  const minimoLocal = Math.max(
    0,

    Math.floor((minimoBase + planoLocalMinimo) * (1 + porcentajeLocal)),
  );

  const maximoLocal = Math.max(
    minimoLocal,

    Math.ceil((maximoBase + planoLocalMaximo) * (1 + porcentajeLocal)),
  );

  const atributoOfensivo = propiedades.atributoAtaque;

  const valorAtributo = combatiente.atributos[atributoOfensivo] ?? 10;

  const bonoAtributo =
    CONFIGURACION_COMBATE.atributos.danioPorPuntoRespectoDiez *
    (valorAtributo - 10);

  const multiplicadorAtributo = Math.max(0, 1 + bonoAtributo);

  return {
    nombre: fuente.nombre,

    atributoOfensivo,
    valorAtributo,
    minimoLocal,
    maximoLocal,
    bonoAtributo,
    multiplicadorAtributo,

    minimo: minimoLocal * multiplicadorAtributo,

    maximo: maximoLocal * multiplicadorAtributo,
  };
}

function calcularDanioFisico(combatiente, objetos, configuracionAtaque) {
  const componentes = configuracionAtaque.fuentesDanio.map((fuente) =>
    calcularComponenteDanio(combatiente, fuente),
  );

  const danioPlanoGlobalMinimo = sumarPropiedad(
    objetos,
    "danioFisicoGlobalMinimo",
  );

  const danioPlanoGlobalMaximo = sumarPropiedad(
    objetos,
    "danioFisicoGlobalMaximo",
  );

  const danioAumentadoGlobal =
    sumarPropiedad(objetos, "danioFisicoAumentadoPorcentaje") / 100;

  const multiplicadorAumentadoGlobal = Math.max(
    0,

    1 + danioAumentadoGlobal,
  );

  const multiplicadorMasGlobal = multiplicarBonosMas(
    objetos,
    "danioFisicoMasPorcentaje",
  );

  const multiplicadorGlobal =
    multiplicadorAumentadoGlobal * multiplicadorMasGlobal;

  const minimoAntesGlobal =
    componentes.reduce(
      (total, componente) => total + componente.minimo,

      0,
    ) + danioPlanoGlobalMinimo;

  const maximoAntesGlobal =
    componentes.reduce(
      (total, componente) => total + componente.maximo,

      0,
    ) + danioPlanoGlobalMaximo;

  const minimoFinal = Math.max(
    0,

    minimoAntesGlobal * multiplicadorGlobal,
  );

  const maximoFinal = Math.max(
    minimoFinal,

    maximoAntesGlobal * multiplicadorGlobal,
  );

  return {
    componentes,

    danioPlanoGlobal: {
      minimo: danioPlanoGlobalMinimo,

      maximo: danioPlanoGlobalMaximo,
    },

    danioAumentadoGlobal,
    multiplicadorMasGlobal,
    multiplicadorGlobal,
    minimo: minimoFinal,
    maximo: maximoFinal,

    promedio: (minimoFinal + maximoFinal) / 2,
  };
}

export function calcularEstadisticasDerivadas(combatiente) {
  const objetos = obtenerObjetosEquipados(combatiente);

  const base = combatiente.estadisticasBase;

  const atributos = combatiente.atributos;

  const coeficientes = CONFIGURACION_COMBATE.atributos;

  const configuracionAtaque = obtenerConfiguracionAtaque(combatiente);

  const ataqueControlador = configuracionAtaque.propiedadesControladoras;

  const recursos = calcularRecursosMaximos({
    nivel: combatiente.nivel,

    atributos,

    estadisticasBase: base,

    objetosEquipados: objetos,
  });

  const regeneracionVida = Math.max(
    0,

    base.regeneracionVida +
      coeficientes.regeneracionVidaPorConstitucion *
        (atributos.constitucion - 10) +
      sumarPropiedad(objetos, "regeneracionVida") +
      recursos.vidaMaxima *
        (sumarPropiedad(objetos, "regeneracionVidaPorcentaje") / 100),
  );

  const regeneracionMana = Math.max(
    0,

    base.regeneracionMana +
      coeficientes.regeneracionManaPorSabiduria * (atributos.sabiduria - 10) +
      sumarPropiedad(objetos, "regeneracionMana") +
      recursos.manaMaximo *
        (sumarPropiedad(objetos, "regeneracionManaPorcentaje") / 100),
  );

  const resistencias = {};

  for (const resistencia of RESISTENCIAS) {
    const nombrePropiedad = `resistencia${resistencia[0].toUpperCase()}${resistencia.slice(
      1,
    )}`;

    let valor =
      base.resistencias[resistencia] +
      coeficientes.resistenciaElementalPorSabiduria *
        (atributos.sabiduria - 10) +
      sumarPropiedad(objetos, nombrePropiedad);

    if (resistencia === "veneno") {
      valor +=
        coeficientes.resistenciaVenenoPorConstitucion *
        (atributos.constitucion - 10);
    }

    resistencias[resistencia] = limitar(
      valor,

      CONFIGURACION_COMBATE.resistencias.minima,

      CONFIGURACION_COMBATE.resistencias.maxima,
    );
  }

  const armaduraPlana = base.armadura + sumarPropiedad(objetos, "armadura");

  const armaduraPorcentual =
    sumarPropiedad(objetos, "armaduraAumentadaPorcentaje") / 100;

  return {
    ...recursos,

    regeneracionVida,
    regeneracionMana,

    precision:
      base.precision +
      coeficientes.precisionPorDestreza * atributos.destreza +
      (ataqueControlador.precision ?? 0) +
      sumarPropiedad(objetos, "precisionGlobal"),

    evasion:
      base.evasion +
      coeficientes.evasionPorDestreza * atributos.destreza +
      sumarPropiedad(objetos, "evasion"),

    armadura: Math.max(
      0,

      Math.round(armaduraPlana * (1 + armaduraPorcentual)),
    ),

    probabilidadCritico: limitar(
      (ataqueControlador.probabilidadCritico ?? base.probabilidadCritico) +
        sumarPropiedad(objetos, "probabilidadCriticoGlobal"),

      0,

      CONFIGURACION_COMBATE.limites.criticoMaximo,
    ),

    multiplicadorCritico:
      (ataqueControlador.multiplicadorCritico ?? base.multiplicadorCritico) +
      sumarPropiedad(objetos, "multiplicadorCriticoAdicional"),

    probabilidadBloqueo: limitar(
      base.probabilidadBloqueo + sumarPropiedad(objetos, "probabilidadBloqueo"),

      0,

      CONFIGURACION_COMBATE.limites.bloqueoMaximo,
    ),

    // Indica qué porcentaje del daño entrante
    // elimina un bloqueo exitoso.
    //
    // Por ahora proviene principalmente del escudo.
    mitigacionBloqueo: limitar(
      sumarPropiedad(objetos, "mitigacionBloqueo"),

      0,

      CONFIGURACION_COMBATE.limites.mitigacionBloqueoMaxima,
    ),

    potenciaEfectos:
      base.potenciaEfectos +
      coeficientes.potenciaEfectosPorSabiduria * atributos.sabiduria,

    resistenciaMental:
      base.resistenciaMental +
      coeficientes.resistenciaMentalPorSabiduria * atributos.sabiduria,

    potenciaAura:
      base.potenciaAura +
      coeficientes.potenciaAuraPorCarisma * atributos.carisma,

    resistencias,

    danioFisico: calcularDanioFisico(combatiente, objetos, configuracionAtaque),
  };
}
