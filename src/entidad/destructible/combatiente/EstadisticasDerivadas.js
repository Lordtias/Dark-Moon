import { CONFIGURACION_COMBATE } from "../../../config/ConfiguracionCombate.js";

const RESISTENCIAS = ["fuego", "frio", "rayo", "veneno"];

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function obtenerObjetosEquipados(combatiente) {
  if (!combatiente.equipamiento) {
    return [];
  }

  return Object.values(combatiente.equipamiento.obtenerRanuras()).filter(
    Boolean,
  );
}

function sumarPropiedad(objetos, propiedad) {
  return objetos.reduce((total, objeto) => {
    const valor = objeto.propiedades?.[propiedad] ?? 0;

    return total + (Number.isFinite(valor) ? valor : 0);
  }, 0);
}

// Los bonos "más" se multiplican entre sí.
function multiplicarBonosMas(objetos, propiedad) {
  return objetos.reduce((multiplicador, objeto) => {
    const valor = objeto.propiedades?.[propiedad] ?? 0;

    if (!Number.isFinite(valor)) {
      return multiplicador;
    }

    return multiplicador * (1 + valor / 100);
  }, 1);
}

function calcularDanioFisico(combatiente, objetos) {
  const arma = combatiente.armaEquipada;

  const propiedadesAtaque = arma?.propiedades ?? combatiente.ataqueNatural;

  const minimoBase = propiedadesAtaque.danioFisicoMinimo;

  const maximoBase = propiedadesAtaque.danioFisicoMaximo;

  const planoLocalMinimo = propiedadesAtaque.danioFisicoLocalMinimo ?? 0;

  const planoLocalMaximo = propiedadesAtaque.danioFisicoLocalMaximo ?? 0;

  const porcentajeLocal =
    (propiedadesAtaque.danioFisicoLocalPorcentaje ?? 0) / 100;

  const minimoLocal = Math.max(
    0,
    Math.floor((minimoBase + planoLocalMinimo) * (1 + porcentajeLocal)),
  );

  const maximoLocal = Math.max(
    minimoLocal,
    Math.ceil((maximoBase + planoLocalMaximo) * (1 + porcentajeLocal)),
  );

  const danioPlanoGlobalMinimo = sumarPropiedad(
    objetos,
    "danioFisicoGlobalMinimo",
  );

  const danioPlanoGlobalMaximo = sumarPropiedad(
    objetos,
    "danioFisicoGlobalMaximo",
  );

  const atributoOfensivo = propiedadesAtaque.atributoAtaque;

  const valorAtributo = combatiente.atributos[atributoOfensivo] ?? 10;

  const coeficienteAtributo =
    CONFIGURACION_COMBATE.atributos.danioPorPuntoRespectoDiez;

  const bonoAtributo = coeficienteAtributo * (valorAtributo - 10);

  const danioAumentado =
    sumarPropiedad(objetos, "danioFisicoAumentadoPorcentaje") / 100;

  const multiplicadorAumentado = Math.max(0, 1 + bonoAtributo + danioAumentado);

  const multiplicadorMas = multiplicarBonosMas(
    objetos,
    "danioFisicoMasPorcentaje",
  );

  const multiplicadorTotal = multiplicadorAumentado * multiplicadorMas;

  const minimoFinal =
    (minimoLocal + danioPlanoGlobalMinimo) * multiplicadorTotal;

  const maximoFinal =
    (maximoLocal + danioPlanoGlobalMaximo) * multiplicadorTotal;

  return {
    minimoLocal,
    maximoLocal,

    danioPlanoGlobal: {
      minimo: danioPlanoGlobalMinimo,
      maximo: danioPlanoGlobalMaximo,
    },

    bonoAtributo,
    danioAumentado,
    multiplicadorMas,
    multiplicadorTotal,

    minimo: Math.max(0, minimoFinal),
    maximo: Math.max(minimoFinal, maximoFinal),

    promedio:
      (Math.max(0, minimoFinal) + Math.max(minimoFinal, maximoFinal)) / 2,
  };
}

export function calcularEstadisticasDerivadas(combatiente) {
  const objetos = obtenerObjetosEquipados(combatiente);

  const base = combatiente.estadisticasBase;

  const atributos = combatiente.atributos;

  const nivel = combatiente.nivel;

  const coeficientes = CONFIGURACION_COMBATE.atributos;

  const vidaMaxima = Math.max(
    1,
    base.vida +
      (nivel - 1) * base.vidaPorNivel +
      coeficientes.vidaPorConstitucion * atributos.constitucion +
      sumarPropiedad(objetos, "vidaMaxima"),
  );

  const manaMaximo = Math.max(
    0,
    base.mana +
      (nivel - 1) * base.manaPorNivel +
      coeficientes.manaPorInteligencia * atributos.inteligencia +
      sumarPropiedad(objetos, "manaMaximo"),
  );

  const regeneracionVida = Math.max(
    0,
    base.regeneracionVida +
      coeficientes.regeneracionVidaPorConstitucion *
        (atributos.constitucion - 10) +
      sumarPropiedad(objetos, "regeneracionVida") +
      vidaMaxima *
        (sumarPropiedad(objetos, "regeneracionVidaPorcentaje") / 100),
  );

  const regeneracionMana = Math.max(
    0,
    base.regeneracionMana +
      coeficientes.regeneracionManaPorSabiduria * (atributos.sabiduria - 10) +
      sumarPropiedad(objetos, "regeneracionMana") +
      manaMaximo *
        (sumarPropiedad(objetos, "regeneracionManaPorcentaje") / 100),
  );

  const resistencias = {};

  for (const resistencia of RESISTENCIAS) {
    const nombrePropiedad =
      `resistencia` + resistencia[0].toUpperCase() + resistencia.slice(1);

    let valor =
      base.resistencias[resistencia] +
      coeficientes.resistenciaElementalPorSabiduria *
        (atributos.sabiduria - 10) +
      sumarPropiedad(objetos, nombrePropiedad);

    // Constitución también protege
    // específicamente contra veneno.
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

  const arma = combatiente.armaEquipada;

  const ataqueActual = arma?.propiedades ?? combatiente.ataqueNatural;

  return {
    vidaMaxima: Math.round(vidaMaxima),
    manaMaximo: Math.round(manaMaximo),

    regeneracionVida,
    regeneracionMana,

    precision:
      base.precision +
      coeficientes.precisionPorDestreza * atributos.destreza +
      (ataqueActual.precision ?? 0) +
      sumarPropiedad(objetos, "precisionGlobal"),

    evasion:
      base.evasion +
      coeficientes.evasionPorDestreza * atributos.destreza +
      sumarPropiedad(objetos, "evasion"),

    armadura: Math.max(0, Math.round(armaduraPlana * (1 + armaduraPorcentual))),

    probabilidadCritico: limitar(
      (ataqueActual.probabilidadCritico ?? base.probabilidadCritico) +
        sumarPropiedad(objetos, "probabilidadCriticoGlobal"),
      0,
      CONFIGURACION_COMBATE.limites.criticoMaximo,
    ),

    multiplicadorCritico:
      (ataqueActual.multiplicadorCritico ?? base.multiplicadorCritico) +
      sumarPropiedad(objetos, "multiplicadorCriticoAdicional"),

    probabilidadBloqueo: limitar(
      base.probabilidadBloqueo + sumarPropiedad(objetos, "probabilidadBloqueo"),
      0,
      CONFIGURACION_COMBATE.limites.bloqueoMaximo,
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

    danioFisico: calcularDanioFisico(combatiente, objetos),
  };
}
